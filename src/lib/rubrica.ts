/**
 * Instrumento de evaluación — Challenge IPLACEX 2026.
 *
 * Traduce a código el anexo «Rúbricas de Evaluación de Proyectos» de las Bases
 * del Concurso. Las tres categorías comparten los mismos cinco criterios y las
 * mismas ponderaciones; lo único que cambia entre ellas son los descriptores de
 * desempeño, que traducen cada criterio a la evidencia exigible en esa etapa de
 * desarrollo. Eso es lo que hace comparables a los proyectos de distintas
 * categorías dentro de un ranking único.
 */

export type NivelDesempeno = 1 | 2 | 3 | 4;
export type CriterioSlug = "problema" | "propuesta-valor" | "viabilidad" | "impacto" | "comunicacion";
export type CategoriaSlug = "idea-temprana" | "implementacion" | "intraemprendimiento";
/** La preselección no tiene presentación oral, así que excluye el pitch. */
export type EtapaEvaluacion = "preseleccion" | "final";

// ─── ESCALA ──────────────────────────────────────────────────────────────────

export const NIVELES = [
  { nivel: 4, denominacion: "Destacado",     factor: 1.0,  significado: "El desempeño supera lo esperado para la etapa de desarrollo del proyecto" },
  { nivel: 3, denominacion: "Logrado",       factor: 0.75, significado: "El desempeño cumple lo esperado para la etapa de desarrollo del proyecto" },
  { nivel: 2, denominacion: "En desarrollo", factor: 0.5,  significado: "El desempeño es parcial y presenta vacíos relevantes" },
  { nivel: 1, denominacion: "Incipiente",    factor: 0.25, significado: "El desempeño no alcanza lo mínimo esperado" },
] as const;

/** Puntaje mínimo para acceder a la condición de finalista y a la premiación. */
export const PUNTAJE_APROBACION = 60;

// ─── CRITERIOS ───────────────────────────────────────────────────────────────

export type Criterio = {
  slug: CriterioSlug;
  orden: number;
  nombre: string;
  peso: number;
  evalua: string;
  /** Si se aplica en la etapa de preselección. */
  enPreseleccion: boolean;
};

// Los pesos suman 100. En preselección sólo corren los cuatro primeros, que
// suman 85, y el resultado se normaliza a 0-100 (ver `calcularPuntaje`).
export const CRITERIOS: Criterio[] = [
  { slug: "problema",        orden: 1, nombre: "Problema y oportunidad",          peso: 20, evalua: "Claridad en la identificación del problema u oportunidad y su relevancia para el usuario o beneficiario", enPreseleccion: true  },
  { slug: "propuesta-valor", orden: 2, nombre: "Propuesta de valor e innovación", peso: 25, evalua: "Grado de novedad, diferenciación y pertinencia de la solución",                                          enPreseleccion: true  },
  { slug: "viabilidad",      orden: 3, nombre: "Viabilidad",                      peso: 25, evalua: "Solidez de los datos, factibilidad técnica, económica y comercial",                                     enPreseleccion: true  },
  { slug: "impacto",         orden: 4, nombre: "Impacto y sostenibilidad",        peso: 15, evalua: "Impacto social, económico y/o ambiental; alineación con los ODS",                                       enPreseleccion: true  },
  { slug: "comunicacion",    orden: 5, nombre: "Comunicación (pitch)",            peso: 15, evalua: "Claridad, estructura y capacidad de persuasión en la presentación",                                     enPreseleccion: false },
];

// ─── CATEGORÍAS ──────────────────────────────────────────────────────────────

export type Categoria = {
  numero: 1 | 2 | 3;
  slug: CategoriaSlug;
  nombre: string;
  alcance: string;
};

export const CATEGORIAS: Categoria[] = [
  {
    numero: 1,
    slug: "idea-temprana",
    nombre: "Idea en etapa temprana (pre-negocio)",
    alcance:
      "Proyectos que aún no inician operaciones comerciales y se encuentran en fase de conceptualización, prototipado o validación exploratoria. No se espera evidencia de ventas ni de operación; se evalúa la calidad de la formulación, el sustento exploratorio y la conciencia sobre lo que resta validar.",
  },
  {
    numero: 2,
    slug: "implementacion",
    nombre: "Emprendimiento en etapa de implementación",
    alcance:
      "Proyectos en operación, con evidencia verificable de validación de mercado. Se evalúa la solidez de la evidencia real disponible, la tracción demostrada y la consistencia entre las métricas presentadas y la viabilidad declarada.",
  },
  {
    numero: 3,
    slug: "intraemprendimiento",
    nombre: "Intraemprendimiento / Innovación social",
    alcance:
      "Proyectos que introducen una mejora al interior de una organización existente, o que abordan una problemática social, comunitaria o ambiental. El eje es la pertinencia respecto del contexto declarado: la factibilidad se juzga según las condiciones reales de esa organización o comunidad, y el impacto según los beneficiarios identificados.",
  },
];

// ─── DESCRIPTORES ────────────────────────────────────────────────────────────

/**
 * Descriptor de desempeño por categoría, criterio y nivel.
 *
 * El anexo recibido sólo trae redactado el nivel 4 (Destacado): en las tres
 * tablas, las columnas de los niveles 3, 2 y 1 vienen vacías. Por eso el tipo
 * es parcial en el nivel. Mientras no lleguen, la UI cae al `significado`
 * genérico de la escala; cuando lleguen, basta con completar este mapa.
 */
export const DESCRIPTORES: Record<
  CategoriaSlug,
  Partial<Record<CriterioSlug, Partial<Record<NivelDesempeno, string>>>>
> = {
  "idea-temprana": {
    "problema": { 4: "Identifica un problema espec\u00edfico y bien delimitado, con un segmento de usuarios claramente definido. Aporta evidencia exploratoria propia (entrevistas, encuestas u observaci\u00f3n) que respalda su existencia y magnitud. Dimensiona la oportunidad con fuentes verificables." },
    "propuesta-valor": { 4: "La soluci\u00f3n responde directamente al problema y se distingue con claridad de las alternativas existentes en el mercado o el territorio. La propuesta de valor est\u00e1 formulada en t\u00e9rminos del beneficio para el usuario y se sustenta en un an\u00e1lisis de alternativas." },
    "viabilidad": { 4: "Presenta un modelo de negocio coherente (Lean Canvas o Business Model Canvas) con supuestos expl\u00edcitos. Identifica los recursos y capacidades necesarios para su puesta en marcha y define una ruta de validaci\u00f3n con hitos concretos." },
    "impacto": { 4: "Explicita el impacto social, econ\u00f3mico y/o ambiental esperado, lo vincula de forma fundada con uno o m\u00e1s ODS y propone indicadores concretos para medirlo." },
    "comunicacion": { 4: "La presentaci\u00f3n es clara, ordenada y ajustada al tiempo asignado. El relato conecta problema, soluci\u00f3n y proyecci\u00f3n de manera convincente. Responde con solvencia y precisi\u00f3n a las preguntas del jurado." },
  },
  "implementacion": {
    "problema": { 4: "Demuestra, con datos provenientes de su propia operaci\u00f3n, que el problema es real y relevante para un segmento definido. Cuantifica el mercado abordable y su posici\u00f3n actual en \u00e9l, con fuentes verificables." },
    "propuesta-valor": { 4: "La propuesta de valor est\u00e1 validada con usuarios o clientes reales y se diferencia con claridad de la competencia directa. Incorpora elementos innovadores en el producto, el proceso o el modelo de negocio, verificables en la operaci\u00f3n actual." },
    "viabilidad": { 4: "Presenta m\u00e9tricas verificables de operaci\u00f3n (ventas, clientes, recurrencia u otras pertinentes) que evidencian tracci\u00f3n sostenida. Expone una estructura de costos e ingresos consistente y una ruta de crecimiento fundamentada." },
    "impacto": { 4: "Evidencia impacto ya generado (social, econ\u00f3mico y/o ambiental) con indicadores efectivamente medidos, lo vincula de forma fundada con uno o m\u00e1s ODS y proyecta su sostenibilidad en el tiempo." },
    "comunicacion": { 4: "La presentaci\u00f3n es clara, ordenada y ajustada al tiempo asignado. Integra datos y evidencia de la operaci\u00f3n en un relato convincente. Responde con solvencia y precisi\u00f3n a las preguntas del jurado." },
  },
  "intraemprendimiento": {
    "problema": { 4: "Delimita con precisi\u00f3n un problema, ineficiencia o necesidad dentro de una organizaci\u00f3n, comunidad o territorio espec\u00edfico e identificado. Aporta evidencia levantada en ese contexto (datos internos, testimonios, diagn\u00f3stico participativo) que acredita su relevancia y a qui\u00e9nes afecta." },
    "propuesta-valor": { 4: "La soluci\u00f3n transforma de manera significativa una pr\u00e1ctica, proceso o condici\u00f3n existente en el contexto abordado. Se distingue con claridad de lo que la organizaci\u00f3n o comunidad ya realiza, y su valor est\u00e1 formulado desde la perspectiva de los beneficiarios." },
    "viabilidad": { 4: "Demuestra factibilidad de implementaci\u00f3n en el contexto real: identifica recursos requeridos, actores que deben involucrarse y condiciones institucionales o comunitarias necesarias. Presenta respaldo, compromiso o validaci\u00f3n de la organizaci\u00f3n o comunidad destinataria." },
    "impacto": { 4: "Define con precisi\u00f3n los beneficiarios y el cambio esperado, propone indicadores medibles y un mecanismo de sostenibilidad que no depende exclusivamente del impulso de sus autores. Vincula el proyecto de forma fundada con uno o m\u00e1s ODS." },
    "comunicacion": { 4: "La presentaci\u00f3n es clara, ordenada y ajustada al tiempo asignado. El relato sit\u00faa el problema en su contexto y comunica con convicci\u00f3n el cambio propuesto. Responde con solvencia y precisi\u00f3n a las preguntas del jurado." },
  },
};

// ─── CÁLCULO ─────────────────────────────────────────────────────────────────

const FACTOR: Record<NivelDesempeno, number> = { 4: 1, 3: 0.75, 2: 0.5, 1: 0.25 };

/** Criterios que corren en una etapa dada. */
export function criteriosDe(etapa: EtapaEvaluacion): Criterio[] {
  return etapa === "final" ? CRITERIOS : CRITERIOS.filter((c) => c.enPreseleccion);
}

/**
 * Puntaje en escala 0-100.
 *
 *   Puntaje = Σ [ (nivel ÷ 4) × ponderación ]
 *
 * En la etapa final los pesos suman 100, de modo que la suma ya está en escala.
 * En preselección suman 85, y el anexo pide normalizar —(obtenido ÷ 85) × 100—
 * para mantener la comparabilidad entre etapas. Dividir por la suma de los
 * pesos vigentes cubre ambos casos con una sola expresión.
 *
 * Un nivel ausente se trata como no calificado y excluye ese criterio del
 * cálculo, en vez de contarlo como cero: puntuar un criterio sin evaluar
 * hundiría el resultado en lugar de señalar que la evaluación está incompleta.
 */
export function calcularPuntaje(
  niveles: Partial<Record<CriterioSlug, NivelDesempeno>>,
  etapa: EtapaEvaluacion = "final",
): number {
  const criterios = criteriosDe(etapa).filter((c) => niveles[c.slug] != null);
  if (criterios.length === 0) return 0;
  const bruto = criterios.reduce((acc, c) => acc + FACTOR[niveles[c.slug]!] * c.peso, 0);
  const pesos = criterios.reduce((acc, c) => acc + c.peso, 0);
  return (bruto / pesos) * 100;
}

/** ¿La evaluación tiene calificados todos los criterios de la etapa? */
export function estaCompleta(
  niveles: Partial<Record<CriterioSlug, NivelDesempeno>>,
  etapa: EtapaEvaluacion = "final",
): boolean {
  return criteriosDe(etapa).every((c) => niveles[c.slug] != null);
}

/** Alcanza el puntaje mínimo de aprobación (60) para ser finalista. */
export function aprueba(puntaje: number): boolean {
  return puntaje >= PUNTAJE_APROBACION;
}

/** Descriptor del nivel para un criterio; cae al significado genérico. */
export function descriptor(
  categoria: CategoriaSlug,
  criterio: CriterioSlug,
  nivel: NivelDesempeno,
): string {
  return (
    DESCRIPTORES[categoria]?.[criterio]?.[nivel] ??
    NIVELES.find((n) => n.nivel === nivel)!.significado
  );
}
