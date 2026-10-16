"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { calcularPuntaje, criteriosDe, estaCompleta, type CriterioSlug, type NivelDesempeno, type EtapaEvaluacion } from "@/lib/rubrica";
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

  if (
    !input ||
    typeof input.proyectoId !== "string" ||
    typeof input.asignacionId !== "string" ||
    !Number.isSafeInteger(input.etapaId) ||
    typeof input.finalizar !== "boolean" ||
    !input.niveles ||
    typeof input.niveles !== "object" ||
    Array.isArray(input.niveles) ||
    typeof input.fortalezas !== "string" ||
    typeof input.mejoras !== "string" ||
    input.fortalezas.length > 500 ||
    input.mejoras.length > 500
  ) {
    return { ok: false, error: "Los datos de la evaluación no son válidos" };
  }

  // El servidor resuelve la asignación y su etapa; no confía en los ids ni en
  // la rúbrica recibida desde el navegador.
  const { data: asignacion, error: asignacionError } = await supabase
    .from("asignaciones")
    .select("id, proyecto_id, etapa_id, etapas ( tipo )")
    .eq("id", input.asignacionId)
    .eq("evaluador_id", user.id)
    .maybeSingle();

  if (asignacionError || !asignacion) {
    return { ok: false, error: "No tienes una asignación válida para evaluar" };
  }
  if (asignacion.proyecto_id !== input.proyectoId || asignacion.etapa_id !== input.etapaId) {
    return { ok: false, error: "La asignación no coincide con el proyecto y la etapa" };
  }

  const etapaInfo = asignacion.etapas as unknown as { tipo: string } | null;
  const tipoEtapa = etapaInfo?.tipo;
  const etapaReal: EtapaEvaluacion | null =
    tipoEtapa === "preseleccion" ? "preseleccion"
    : tipoEtapa === "bootcamp" || tipoEtapa === "semifinal" ? "semifinal"
    : tipoEtapa === "demo_day" ? "final"
    : null;

  if (!etapaReal || input.etapa !== etapaReal) {
    return { ok: false, error: "La rúbrica no corresponde a la etapa asignada" };
  }

  const slugsPermitidos = new Set(criteriosDe(etapaReal).map((criterio) => criterio.slug));
  const nivelesPermitidos = new Set<number>([1, 2, 3, 4]);
  const nivelesEntrada = Object.entries(input.niveles);
  if (nivelesEntrada.some(([slug, nivel]) =>
    !slugsPermitidos.has(slug as CriterioSlug) ||
    typeof nivel !== "number" ||
    !nivelesPermitidos.has(nivel)
  )) {
    return { ok: false, error: "Hay niveles de desempeño inválidos para esta etapa" };
  }

  // Bootcamp se puede guardar como progreso, pero solo se finaliza cuando la
  // entrega de esa misma etapa está enviada.
  if (input.finalizar && (tipoEtapa === "bootcamp" || tipoEtapa === "semifinal")) {
    const { data: entrega, error: entregaError } = await supabase
      .from("entregas")
      .select("estado")
      .eq("proyecto_id", asignacion.proyecto_id)
      .eq("etapa_id", asignacion.etapa_id)
      .maybeSingle();

    if (entregaError) {
      return { ok: false, error: "No se pudo verificar el estado de la entrega Bootcamp" };
    }
    if (entrega?.estado !== "enviada") {
      return { ok: false, error: "La evaluación solo se puede finalizar cuando la entrega Bootcamp está enviada" };
    }
  }

  if (input.finalizar && !estaCompleta(input.niveles, etapaReal)) {
    return { ok: false, error: "Faltan criterios por calificar" };
  }

  const puntajeFinal = calcularPuntaje(input.niveles, etapaReal);
  const payload = {
    asignacion_id: asignacion.id,
    proyecto_id: asignacion.proyecto_id,
    evaluador_id: user.id,
    etapa_id: asignacion.etapa_id,
    puntajes: input.niveles,
    puntaje_ponderado: puntajeFinal,
    comentario_fortalezas: input.fortalezas,
    comentario_mejoras: input.mejoras,
    estado: input.finalizar ? "finalizada" : "en_progreso",
    ...(input.finalizar && { finalizada_at: new Date().toISOString() }),
  };

  const { error } = await supabase
    .from("evaluaciones")
    .upsert(payload, { onConflict: "asignacion_id" });

  if (error) return { ok: false, error: error.message };

  await supabase
    .from("asignaciones")
    .update({ estado: input.finalizar ? "finalizada" : "en_progreso" })
    .eq("id", asignacion.id)
    .eq("evaluador_id", user.id);

  revalidatePath("/app/evaluacion");
  revalidatePath("/app/evaluacion/proyectos");
  revalidatePath("/app/evaluacion/mis-evaluaciones");
  return { ok: true, proyectoId: asignacion.proyecto_id };
}
