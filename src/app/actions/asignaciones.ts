"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { roleHomePath } from "@/lib/roles";

async function getCallerAdmin() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: perfil } = await supabase
    .from("usuarios").select("rol").eq("id", user.id).single();
  if (perfil?.rol !== "admin") return null;
  return user;
}

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Asigna (o desasigna) un evaluador a un proyecto en una etapa.
 * Si ya existe la asignación la elimina (toggle), si no existe la crea.
 */
export async function toggleAsignacion(
  proyectoId: string,
  evaluadorId: string,
  etapaId: number,
): Promise<ActionResult> {
  const caller = await getCallerAdmin();
  if (!caller) return { ok: false, error: "Sin permisos" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;

  const { data: existing } = await db
    .from("asignaciones")
    .select("id")
    .eq("proyecto_id", proyectoId)
    .eq("evaluador_id", evaluadorId)
    .eq("etapa_id", etapaId)
    .maybeSingle();

  if (existing) {
    const { error } = await db.from("asignaciones").delete().eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await db.from("asignaciones").insert({
      proyecto_id: proyectoId,
      evaluador_id: evaluadorId,
      etapa_id: etapaId,
      asignado_por: caller.id,
      estado: "pendiente",
    });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/app/admin/proyectos");
  return { ok: true };
}

/**
 * Cambia el estado de postulación de un proyecto (avanzar/descartar rondas).
 */
export async function cambiarEstadoPostulacion(
  proyectoId: string,
  nuevoEstado: string,
): Promise<ActionResult> {
  const caller = await getCallerAdmin();
  if (!caller) return { ok: false, error: "Sin permisos" };

  const ESTADOS_VALIDOS = [
    "enviada", "en_revision",
    "inadmisible", "preseleccionado", "no_preseleccionado",
    "descalificado", "finalista", "no_finalista", "premiado",
  ];
  if (!ESTADOS_VALIDOS.includes(nuevoEstado)) {
    return { ok: false, error: "Estado inválido" };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;
  const { error } = await db
    .from("proyectos")
    .update({ estado_postulacion: nuevoEstado })
    .eq("id", proyectoId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/app/admin/proyectos");
  return { ok: true };
}
