"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { calcularPuntaje, estaCompleta, type CriterioSlug, type NivelDesempeno, type EtapaEvaluacion } from "@/lib/rubrica";
import { validarAdmisibilidad, type Calidad } from "@/lib/admisibilidad";
import { rutCanonico } from "@/lib/rut";

/** Tope del resumen ejecutivo, en palabras, según las Bases. */
const MAX_PALABRAS_RESUMEN = 200;

function contarPalabras(texto: string): number {
  return texto.trim().split(/\s+/).filter(Boolean).length;
}

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

export type IntegranteInput = {
  rut: string;
  nombre: string;
  correo: string;
  calidad: Calidad;
  carrera: string;
  sede: string;
  /** Declaradas por el postulante; no se verifican contra registros internos. */
  declaraMayorDeEdad: boolean;
  declaraMatriculaVigente: boolean;
  esRepresentante: boolean;
};

export type PostulacionInput = {
  proyectoId?: string;
  categoriaNumero: 1 | 2 | 3;
  nombreProyecto: string;
  resumenEjecutivo: string;
  problema: string;
  segmentoUsuarios: string;
  solucion: string;
  ods: number[];
  declaracionAutoria: boolean;
  equipoNombre: string;
  integrantes: IntegranteInput[];
  enviar: boolean; // true = enviar / false = guardar borrador
};

export type ActionResult =
  | { ok: true; proyectoId: string }
  | { ok: false; error: string };

export async function guardarPostulacion(input: PostulacionInput): Promise<ActionResult> {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  // Al enviar se exige la postulación completa. El borrador puede quedar a
  // medias: solo se guarda lo que haya.
  if (input.enviar) {
    if (!input.nombreProyecto?.trim()) return { ok: false, error: "Falta el nombre del proyecto" };
    if (!input.resumenEjecutivo?.trim()) return { ok: false, error: "Falta el resumen ejecutivo" };
    if (contarPalabras(input.resumenEjecutivo) > MAX_PALABRAS_RESUMEN) {
      return { ok: false, error: `El resumen ejecutivo supera las ${MAX_PALABRAS_RESUMEN} palabras` };
    }
    if (!input.problema?.trim()) return { ok: false, error: "Falta el problema u oportunidad" };
    if (!input.segmentoUsuarios?.trim()) return { ok: false, error: "Falta el segmento de usuarios" };
    if (!input.solucion?.trim()) return { ok: false, error: "Falta la solución" };
    if (!input.ods?.length) return { ok: false, error: "Debes vincular al menos un ODS" };
    if (!input.declaracionAutoria) {
      return { ok: false, error: "Debes aceptar la declaración de autoría y las bases" };
    }
  }

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
  // Las validaciones de admisibilidad corren en el servidor aunque el
  // formulario ya las muestre: el cliente es una conveniencia, no una garantía.
  if (input.enviar) {
    const problemas = validarAdmisibilidad(
      input.integrantes.map((i) => ({
        rut: i.rut,
        nombre: i.nombre,
        correo: i.correo,
        calidad: i.calidad,
        carrera: i.carrera,
        sede: i.sede,
        esRepresentante: i.esRepresentante,
        declaraMayorDeEdad: i.declaraMayorDeEdad,
        declaraMatriculaVigente: i.declaraMatriculaVigente,
      })),
      { proyectoId: input.proyectoId },
    );
    if (problemas.length > 0) return { ok: false, error: problemas[0].mensaje };
  }

  // codigo_ciego es asignado por el trigger assign_codigo_ciego en la DB
  // enviada_at es asignado por el trigger set_enviada_at en la DB
  const payload = {
    convocatoria_id: convocatoria.id,
    categoria_id: categoria.id,
    postulante_id: user.id,
    nombre_proyecto: input.nombreProyecto || null,
    resumen_ejecutivo: input.resumenEjecutivo || null,
    problema: input.problema || null,
    segmento_usuarios: input.segmentoUsuarios || null,
    solucion: input.solucion || null,
    ods: input.ods?.length ? input.ods : null,
    declaracion_autoria: input.declaracionAutoria,
    equipo_nombre: input.equipoNombre || null,
    estado_postulacion: input.enviar ? "enviada" : "borrador",
  };

  if (input.proyectoId) {
    const { error } = await supabase
      .from("proyectos")
      .update(payload)
      .eq("id", input.proyectoId)
      .eq("postulante_id", user.id);
    if (error) return { ok: false, error: error.message };
    const errIntegrantes = await guardarIntegrantes(supabase, input.proyectoId, input.integrantes);
    if (errIntegrantes) return { ok: false, error: errIntegrantes };
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

  const errIntegrantes = await guardarIntegrantes(supabase, data.id, input.integrantes);
  if (errIntegrantes) return { ok: false, error: errIntegrantes };

  revalidatePath("/app/postulante");
  return { ok: true, proyectoId: data.id };
}

/**
 * Reemplaza los integrantes del proyecto. El formulario siempre envía la lista
 * completa, así que se borra y se reinserta en vez de reconciliar fila por fila.
 *
 * El índice único (convocatoria_id, rut) de la base es el que hace cumplir que
 * una persona no figure en dos proyectos, y su violación llega hasta acá.
 */
async function guardarIntegrantes(
  supabase: Awaited<ReturnType<typeof getSupabase>>,
  proyectoId: string,
  integrantes: IntegranteInput[],
): Promise<string | null> {
  await supabase.from("integrantes").delete().eq("proyecto_id", proyectoId);
  const filas = integrantes
    .filter((i) => i.rut.trim() && i.nombre.trim())
    .map((i) => ({
      proyecto_id: proyectoId,
      // Se guarda canónico para que la deduplicación no dependa del formato.
      rut: rutCanonico(i.rut),
      nombre: i.nombre.trim(),
      correo: i.correo.trim().toLowerCase(),
      calidad: i.calidad,
      carrera: i.carrera?.trim() || null,
      sede: i.sede?.trim() || null,
      es_representante: i.esRepresentante,
      declara_mayor_edad: i.declaraMayorDeEdad,
      declara_matricula_vigente: i.calidad === "estudiante" ? i.declaraMatriculaVigente : null,
      // convocatoria_id lo rellena el trigger set_integrante_convocatoria.
      convocatoria_id: 0,
    }));
  if (filas.length === 0) return null;
  const { error } = await supabase.from("integrantes").insert(filas);
  if (!error) return null;
  if (error.code === "23505") {
    return "Uno de los integrantes ya participa en otro proyecto. Cada persona puede postular a uno solo.";
  }
  return error.message;
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

  revalidatePath("/app/evaluacion");
  return { ok: true, proyectoId: input.proyectoId };
}
