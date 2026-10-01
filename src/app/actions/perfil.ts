"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { esCondicionAcademica, type CondicionAcademica } from "@/lib/perfil";

type Resultado =
  | { ok: true; condicion: CondicionAcademica }
  | { ok: false; error: string };

export async function guardarCondicionAcademica(value: unknown, expectedUserId: string): Promise<Resultado> {
  if (!esCondicionAcademica(value)) {
    return { ok: false, error: "Selecciona Titulado o Estudiante para continuar." };
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { ok: false, error: "Tu sesión expiró. Vuelve a iniciar sesión para guardar tu respuesta." };
  }
  if (user.id !== expectedUserId) {
    return { ok: false, error: "La cuenta activa cambió. Recarga la página antes de responder." };
  }

  // El ID proviene de la sesión verificada. RLS sigue aplicando y el filtro
  // NULL hace el guardado atómico: dos pestañas no sobrescriben la respuesta.
  const { data, error } = await supabase
    .from("usuarios")
    .update({ condicion_academica: value })
    .eq("id", user.id)
    .is("condicion_academica", null)
    .select("condicion_academica")
    .maybeSingle();

  if (error) {
    return { ok: false, error: "No pudimos guardar tu respuesta. Inténtalo nuevamente." };
  }

  let condicion: unknown = data?.condicion_academica;
  if (!data) {
    // Otra pestaña pudo responder antes. Solo confirmar éxito si hay un valor
    // persistido; una fila inexistente o invisible por RLS nunca es éxito.
    const { data: actual, error: readError } = await supabase
      .from("usuarios")
      .select("condicion_academica")
      .eq("id", user.id)
      .single();
    if (readError) {
      return { ok: false, error: "No pudimos consultar tu perfil. Inténtalo nuevamente." };
    }
    condicion = actual?.condicion_academica;
  }

  if (!esCondicionAcademica(condicion)) {
    return { ok: false, error: "No se confirmó el guardado. Inténtalo nuevamente." };
  }

  revalidatePath("/app/perfil");
  return { ok: true, condicion };
}
