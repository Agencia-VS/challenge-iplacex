"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { proyectoAsignable } from "@/lib/verticales";

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

export async function asignarProyectosMasivamente(input: {
  proyectoIds: string[]; evaluadorIds: string[]; etapaId: number;
}): Promise<{ ok: true; creadas: number; existentes: number } | { ok: false; error: string }> {
  const caller = await getCallerAdmin();
  if (!caller) return { ok: false, error: "Solo un administrador puede asignar proyectos." };
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!input || !Array.isArray(input.proyectoIds) || !Array.isArray(input.evaluadorIds) ||
      !Number.isSafeInteger(input.etapaId) || input.etapaId <= 0 ||
      input.proyectoIds.length > 500 || input.evaluadorIds.length > 50 ||
      [...input.proyectoIds, ...input.evaluadorIds].some(id => typeof id !== "string" || !uuid.test(id))) {
    return { ok: false, error: "La selección de proyectos, evaluadores o etapa no es válida." };
  }
  const proyectoIds = [...new Set(input.proyectoIds)];
  const evaluadorIds = [...new Set(input.evaluadorIds)];
  const total = proyectoIds.length * evaluadorIds.length;
  if (!total || total > 1000) {
    return { ok: false, error: "Selecciona proyectos y evaluadores (máximo 1.000 asignaciones por envío)." };
  }

  const db = createAdminClient();
  const [{ data: etapa, error: etapaError }, { data: proyectos, error: proyectosError }, { data: evaluadores, error: evaluadoresError }] = await Promise.all([
    db.from("etapas").select("id, tipo, convocatoria_id").eq("id", input.etapaId).single(),
    db.from("proyectos").select("id, convocatoria_id, estado_postulacion").in("id", proyectoIds),
    db.from("usuarios").select("id, rol").in("id", evaluadorIds),
  ]);
  if (etapaError || proyectosError || evaluadoresError) {
    return { ok: false, error: "No pudimos verificar la selección. No se realizaron asignaciones." };
  }
  if (!etapa || !["preseleccion", "bootcamp", "demo_day"].includes(etapa.tipo)) {
    return { ok: false, error: "Selecciona una etapa de evaluación válida." };
  }
  if (proyectos?.length !== proyectoIds.length || proyectos.some(p =>
    p.convocatoria_id !== etapa.convocatoria_id || !proyectoAsignable(p.estado_postulacion))) {
    return { ok: false, error: "Hay proyectos no disponibles o de otra convocatoria. Actualiza la tabla y vuelve a seleccionarlos." };
  }
  if (evaluadores?.length !== evaluadorIds.length || evaluadores.some(e => !["jurado", "comite_tecnico"].includes(e.rol))) {
    return { ok: false, error: "Hay usuarios que ya no son evaluadores. Actualiza la tabla antes de continuar." };
  }

  const filas = proyectoIds.flatMap(proyecto_id => evaluadorIds.map(evaluador_id => ({
    proyecto_id, evaluador_id, etapa_id: etapa.id, asignado_por: caller.id, estado: "pendiente",
  })));
  // Una sola sentencia atómica. ON CONFLICT DO NOTHING preserva asignaciones
  // y evaluaciones existentes, incluso ante reintentos o admins concurrentes.
  const { data: nuevas, error } = await db.from("asignaciones")
    .upsert(filas, { onConflict: "proyecto_id,evaluador_id,etapa_id", ignoreDuplicates: true })
    .select("id");
  if (error || !nuevas) return { ok: false, error: "No se pudo completar la asignación. Puedes reintentar sin duplicar asignaciones." };
  revalidatePath("/app/admin/proyectos");
  revalidatePath("/app/evaluacion");
  revalidatePath("/app/evaluacion/proyectos");
  revalidatePath("/app/evaluacion/mis-evaluaciones");
  return { ok: true, creadas: nuevas.length, existentes: total - nuevas.length };
}

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
