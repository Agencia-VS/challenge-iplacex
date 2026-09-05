"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { roleHomePath } from "@/lib/roles";

export type CrearEvaluadorInput = {
  nombre: string;
  email: string;
  password: string;
  rol: "jurado" | "comite_tecnico" | "admin";
};

export type ActionResult =
  | { ok: true; userId: string }
  | { ok: false; error: string };

export async function crearEvaluador(input: CrearEvaluadorInput): Promise<ActionResult> {
  // 1. Verificar que quien llama es admin
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  );

  const { data: { user: caller } } = await supabase.auth.getUser();
  if (!caller) return { ok: false, error: "No autenticado" };

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", caller.id)
    .single();

  if (perfil?.rol !== "admin") {
    return { ok: false, error: "Solo administradores pueden crear evaluadores" };
  }

  // 2. Validaciones básicas
  const nombre = input.nombre.trim();
  const email = input.email.trim().toLowerCase();
  const { password, rol } = input;

  if (!nombre) return { ok: false, error: "El nombre es requerido" };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Email inválido" };
  }
  if (password.length < 8) {
    return { ok: false, error: "La contraseña debe tener al menos 8 caracteres" };
  }
  if (!["jurado", "comite_tecnico", "admin"].includes(rol)) {
    return { ok: false, error: "Rol inválido" };
  }

  // 3. Crear usuario en Auth con service role (sin email de confirmación)
  const adminClient = createAdminClient();
  const { data: newUser, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // usuario interno — no necesita confirmar
    user_metadata: { full_name: nombre, rol },
  });

  if (authError) {
    // Supabase devuelve "User already registered" si el email existe
    if (authError.message.includes("already")) {
      return { ok: false, error: "Ya existe un usuario con ese email" };
    }
    return { ok: false, error: authError.message };
  }

  // 4. El trigger handle_new_user crea la fila en public.usuarios con rol='postulante'
  //    Actualizamos a continuación al rol correcto + nombre
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (adminClient as any)
    .from("usuarios")
    .update({ rol, nombre })
    .eq("id", newUser.user.id);

  if (updateError) {
    // El usuario Auth fue creado pero falló el update de rol — loguear para revisión manual
    console.error("crearEvaluador: usuario creado pero fallo update rol", updateError);
    return { ok: false, error: "Usuario creado pero no se pudo asignar el rol. Contáctate con soporte." };
  }

  revalidatePath("/app/admin/evaluadores");
  return { ok: true, userId: newUser.user.id };
}

export async function eliminarEvaluador(userId: string): Promise<ActionResult> {
  // Verificar admin
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  );

  const { data: { user: caller } } = await supabase.auth.getUser();
  if (!caller) return { ok: false, error: "No autenticado" };

  const { data: perfil } = await supabase
    .from("usuarios").select("rol").eq("id", caller.id).single();
  if (perfil?.rol !== "admin") return { ok: false, error: "Sin permisos" };

  // No permitir auto-eliminación
  if (userId === caller.id) return { ok: false, error: "No puedes eliminarte a ti mismo" };

  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/app/admin/evaluadores");
  return { ok: true, userId };
}
