"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { calcularPuntaje, estaCompleta, type CriterioSlug, type NivelDesempeno, type EtapaEvaluacion } from "@/lib/rubrica";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) =>
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          ),
      },
    },
  );
}

// Extraer ID de YouTube
function extractYoutubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export type PostulacionInput = {
  proyectoId?: string;
  categoriaNumero: 1 | 2 | 3;
  nombreProyecto: string;
  descripcionBreve: string;
  problemaResuelve: string;
  solucion: string;
  estadoProyecto: string;
  equipoNombre: string;
  equipoIntegrantes: number;
  equipoDescripcion: string;
  videoUrl: string;
  enviar: boolean; // true = enviar / false = guardar borrador
};

export type ActionResult =
  | { ok: true; proyectoId: string }
  | { ok: false; error: string };

export async function guardarPostulacion(input: PostulacionInput): Promise<ActionResult> {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  if (input.enviar) {
    if (!input.nombreProyecto?.trim()) return { ok: false, error: "Nombre del proyecto requerido" };
    if (!input.descripcionBreve?.trim()) return { ok: false, error: "Descripción requerida" };
    if (!input.videoUrl?.trim()) return { ok: false, error: "Video pitch requerido" };
  }

  const videoIdYoutube = extractYoutubeId(input.videoUrl);

  // Buscar convocatoria y categoría actuales
  const { data: convocatoria } = await supabase
    .from("convocatorias")
    .select("id")
    .eq("estado", "abierta")
    .single();

  if (!convocatoria) return { ok: false, error: "No hay convocatoria activa" };

  const { data: categoria } = await supabase
    .from("categorias")
    .select("id")
    .eq("convocatoria_id", convocatoria.id)
    .eq("numero", input.categoriaNumero)
    .single();

  if (!categoria) return { ok: false, error: "Categoría inválida" };

  // codigo_ciego es asignado por el trigger assign_codigo_ciego en la DB
  // enviada_at es asignado por el trigger set_enviada_at en la DB
  const payload = {
    convocatoria_id: convocatoria.id,
    categoria_id: categoria.id,
    postulante_id: user.id,
    nombre_proyecto: input.nombreProyecto || null,
    descripcion_breve: input.descripcionBreve || null,
    problema_resuelve: input.problemaResuelve || null,
    solucion: input.solucion || null,
    estado_proyecto: input.estadoProyecto || null,
    equipo_nombre: input.equipoNombre || null,
    equipo_integrantes: input.equipoIntegrantes,
    equipo_descripcion: input.equipoDescripcion || null,
    video_url: input.videoUrl || null,
    video_id_youtube: videoIdYoutube,
    estado_postulacion: input.enviar ? "enviada" : "borrador",
  };

  if (input.proyectoId) {
    const { error } = await supabase
      .from("proyectos")
      .update(payload)
      .eq("id", input.proyectoId)
      .eq("postulante_id", user.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/app/postulante");
    return { ok: true, proyectoId: input.proyectoId };
  }

  // INSERT: el trigger de la DB genera codigo_ciego automaticamente
  const { data, error } = await supabase
    .from("proyectos")
    .insert(payload)
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/app/postulante");
  return { ok: true, proyectoId: data.id };
}

// Guardar evaluacion

export type EvaluacionInput = {
  proyectoId: string;
  asignacionId: string;   // FK a asignaciones
  etapaId: number;        // FK a etapas
  /** Nivel de desempeño por criterio, 1 a 4. */
  niveles: Partial<Record<CriterioSlug, NivelDesempeno>>;
  /** La preselección excluye el pitch y normaliza el puntaje. */
  etapa: EtapaEvaluacion;
  fortalezas: string;
  mejoras: string;
  finalizar: boolean;
};

export async function guardarEvaluacion(input: EvaluacionInput): Promise<ActionResult> {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  // Una evaluación sólo se finaliza con todos los criterios de la etapa
  // calificados; guardar progreso parcial sí está permitido.
  if (input.finalizar && !estaCompleta(input.niveles, input.etapa)) {
    return { ok: false, error: "Faltan criterios por calificar" };
  }

  // Los criterios y sus ponderaciones vienen de la rúbrica, no de la base:
  // así no hay forma de que la suma de pesos se desvíe de 100.
  const puntajeFinal = calcularPuntaje(input.niveles, input.etapa);

  const payload = {
    asignacion_id: input.asignacionId,              // FK a asignaciones
    proyecto_id: input.proyectoId,
    evaluador_id: user.id,
    etapa_id: input.etapaId,                        // FK a etapas
    puntajes: input.niveles,                        // { slug: nivel 1-4 }
    puntaje_ponderado: puntajeFinal,                // escala 0-100
    comentario_fortalezas: input.fortalezas,
    comentario_mejoras: input.mejoras,
    estado: input.finalizar ? "finalizada" : "en_progreso",
    ...(input.finalizar && { finalizada_at: new Date().toISOString() }),
  };

  // UPSERT usando asignacion_id como conflict target (1 evaluación por asignación)
  const { error } = await supabase
    .from("evaluaciones")
    .upsert(payload, { onConflict: "asignacion_id" });

  if (error) return { ok: false, error: error.message };

  // Actualizar la asignación también para reflejar el progreso en el dashboard
  await supabase
    .from("asignaciones")
    .update({ estado: input.finalizar ? "finalizada" : "en_progreso" })
    .eq("id", input.asignacionId);

  revalidatePath("/app/evaluador");
  return { ok: true, proyectoId: input.proyectoId };
}
