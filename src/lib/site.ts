/**
 * Contenido del concurso.
 *
 * Las categorías, los criterios y la escala de evaluación viven en
 * `src/lib/rubrica.ts`, que es la traducción directa del anexo de Bases; acá
 * sólo se re-exporta lo que consume la UI pública para no duplicar la fuente.
 *
 * TODO(bases): el cronograma, las cápsulas y las preguntas frecuentes siguen
 * siendo los de la convocatoria anterior. Se reemplazan cuando lleguen las
 * Bases completas de Challenge IPLACEX.
 */
import { CRITERIOS } from "@/lib/rubrica";

export type NavLink = { href: string; label: string };

export const publicNav: NavLink[] = [
  { href: "/", label: "Inicio" },
  { href: "/categorias", label: "Categorías" },
  { href: "/metodologia", label: "Metodología" },
  { href: "/bases", label: "Bases" },
  { href: "/faq", label: "FAQ" },
];


export type Etapa = {
  numero: number;
  nombre: string;
  descripcion: string;
  plazo: string;
  estado: "completed" | "active" | "upcoming";
  badge?: string;
};

// Tipo de etapa según el enum `tipo_etapa` en la DB (src/lib/db/schema.ts).
export type TipoEtapa =
  | "postulacion"
  | "preseleccion"
  | "bootcamp"
  | "semifinal"
  | "seleccion_finalistas"
  | "demo_day";

// Fila de la tabla `etapas` tal como la devuelve Supabase (snake_case).
export type EtapaDB = {
  numero: number;
  tipo: TipoEtapa;
  nombre: string;
  descripcion: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  semana_inicio: number | null;
  semana_fin: number | null;
};

// Rótulos de cupos/rangos curados en código (la tabla `etapas` no tiene columna
// para esto). Se mapean por tipo de etapa.
export const BADGE_POR_TIPO: Partial<Record<TipoEtapa, string>> = {
  postulacion: "Cierre 23:59",
  bootcamp: "75% mínimo",
  semifinal: "Con pitch",
  seleccion_finalistas: "Top 10",
  demo_day: "Final",
};

const MESES_CORTOS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

// Día y mes en UTC. Consistente con el resto de la app (Vercel corre en UTC) y
// determinista, sin saltos de día por conversión de zona. Las fechas del funnel
// se guardan a mediodía UTC para que el día calendario no dependa del offset.
function partesFecha(iso: string): { dia: number; mes: number } {
  const d = new Date(iso);
  return { dia: d.getUTCDate(), mes: d.getUTCMonth() + 1 };
}

// "11 sep". Mapa de meses propio para un formato limpio ("sep", no "sept.").
function fechaCorta(iso: string): string {
  const { dia, mes } = partesFecha(iso);
  return `${dia} ${MESES_CORTOS[mes - 1] ?? ""}`.trim();
}

// Rango; si ambas fechas caen en el mismo mes se muestra el mes una sola vez:
// "26 – 30 oct"; si no, "20 jul – 28 ago".
function rangoFechas(inicio: string, fin: string): string {
  const a = partesFecha(inicio);
  const b = partesFecha(fin);
  if (a.mes === b.mes) return `${a.dia} – ${b.dia} ${MESES_CORTOS[b.mes - 1] ?? ""}`.trim();
  return `${fechaCorta(inicio)} – ${fechaCorta(fin)}`;
}

/**
 * Texto legible del plazo, según el tipo de etapa (replica el formato original):
 *  - postulacion        → "Hasta {fin}"
 *  - formacion, mentoria → rango "{inicio} – {fin}"
 *  - demo_day           → "Semana {inicio}"
 *  - resto              → solo la fecha de cierre "{fin}"
 * Si falta la fecha de fin, cae a la de inicio o al número de semana.
 */
export function formatPlazo(
  tipo: TipoEtapa,
  inicio: string | null,
  fin: string | null,
  semanaInicio: number | null = null,
): string {
  if (tipo === "bootcamp" && inicio && fin) {
    return rangoFechas(inicio, fin);
  }
  if (tipo === "demo_day" && inicio) {
    return `Semana ${fechaCorta(inicio)}`;
  }
  if (tipo === "postulacion" && fin) {
    return `Hasta ${fechaCorta(fin)}`;
  }
  if (fin) return fechaCorta(fin);
  if (inicio) return fechaCorta(inicio);
  if (semanaInicio != null) return `Semana ${semanaInicio}`;
  return "";
}

/** Estado del funnel calculado contra la fecha actual. */
export function estadoEtapa(
  inicio: string | null,
  fin: string | null,
  now: Date,
): Etapa["estado"] {
  const t = now.getTime();
  if (fin && new Date(fin).getTime() < t) return "completed";
  if (inicio && new Date(inicio).getTime() <= t && (!fin || new Date(fin).getTime() >= t)) {
    return "active";
  }
  return "upcoming";
}

/** Convierte una fila de la DB al modelo `Etapa` que consume el funnel. */
export function mapEtapaDB(e: EtapaDB, now: Date): Etapa {
  const estado = estadoEtapa(e.fecha_inicio, e.fecha_fin, now);
  return {
    numero: e.numero,
    nombre: e.nombre,
    descripcion: e.descripcion ?? "",
    plazo: formatPlazo(e.tipo, e.fecha_inicio, e.fecha_fin, e.semana_inicio),
    estado,
    badge: BADGE_POR_TIPO[e.tipo] ?? (estado === "active" ? "En curso" : undefined),
  };
}

// Cronograma oficial 2026, según las Bases del Concurso. Se usa como respaldo
// cuando la tabla `etapas` de Supabase está vacía. La organización se reserva
// el derecho de mover las fechas, así que la fuente real es la base de datos:
// esto es solo el valor por omisión.
export const etapas: Etapa[] = [
  { numero: 1, nombre: "Lanzamiento y apertura", descripcion: "Se abren las postulaciones en la plataforma, único canal válido.", plazo: "14 sep", estado: "upcoming" },
  { numero: 2, nombre: "Cierre de postulaciones", descripcion: "La plataforma cierra automáticamente a las 23:59.", plazo: "2 oct", estado: "upcoming", badge: "23:59" },
  { numero: 3, nombre: "Preselección", descripcion: "El Comité Técnico revisa admisibilidad y evalúa sin pitch: corren cuatro criterios y el puntaje se normaliza.", plazo: "9 oct", estado: "upcoming", badge: "Sin pitch" },
  { numero: 4, nombre: "Bootcamp y mentorías", descripcion: "Formación y acompañamiento. Exige asistir al menos al 75% de las sesiones.", plazo: "12 oct – 6 nov", estado: "upcoming", badge: "75% mínimo" },
  // TODO(bases): la fecha de la semifinal, quiénes evalúan y con qué criterios
  // están pendientes de envío por la Dirección de Formación General.
  { numero: 5, nombre: "Semifinal", descripcion: "Instancia de evaluación con pitch. Su resultado pondera en la selección de los diez finalistas.", plazo: "Por definir", estado: "upcoming", badge: "Con pitch" },
  { numero: 6, nombre: "Notificación de finalistas", descripcion: "Se publican los diez proyectos que llegan al Demo Day.", plazo: "6 nov", estado: "upcoming", badge: "Top 10" },
  { numero: 7, nombre: "Demo Day y premiación", descripcion: "Pitch ante el jurado de siete integrantes y entrega de premios.", plazo: "12 nov", estado: "upcoming", badge: "Final" },
];

export type Criterio = {
  nombre: string;
  peso: number;
  descripcion: string;
};

export const criterios: Criterio[] = CRITERIOS.map((c) => ({
  nombre: c.nombre,
  peso: c.peso,
  descripcion: c.evalua,
}));

export type SesionBootcamp = {
  numero: number;
  titulo: string;
  resumen: string;
  duracion: string;
  videoUrl?: string;      // YouTube link
};

// TODO(bases): el temario del bootcamp no viene definido en las Bases. Estos
// títulos son un marcador de posición hasta que la Dirección de Formación
// General entregue el programa de sesiones y sus fechas.
export const sesionesBootcamp: SesionBootcamp[] = [
  { numero: 1, titulo: "Define tu problema", resumen: "Cómo delimitar un problema y su segmento de usuarios.", duracion: "12 min" },
  { numero: 2, titulo: "Propuesta de valor", resumen: "Diferenciación frente a las alternativas existentes.", duracion: "14 min" },
  { numero: 3, titulo: "Viabilidad", resumen: "Modelo de negocio, recursos y ruta de validación.", duracion: "15 min" },
  { numero: 4, titulo: "Impacto y ODS", resumen: "Cómo vincular el proyecto con los ODS e indicarlo con indicadores.", duracion: "11 min" },
  { numero: 5, titulo: "Pitch", resumen: "Estructura y persuasión para el Demo Day.", duracion: "10 min" },
];

export const faqs = [
  { q: "¿Quiénes pueden postular?", a: "Estudiantes con matrícula vigente, egresados y titulados de Iplacex, mayores de 18 años. El representante del equipo debe ser de Iplacex. Se admiten hasta dos integrantes externos, que no pueden recibir el premio en dinero." },
  { q: "¿Cuántos integrantes puede tener el equipo?", a: "Hasta cinco. Cada persona puede participar en un solo proyecto: figurar en dos es causal de inadmisibilidad." },
  { q: "¿Cómo elijo mi categoría?", a: "Según la etapa en que esté tu proyecto: idea temprana sin ventas, emprendimiento en implementación que acredite ventas o clientes, o intraemprendimiento e innovación social con una organización o territorio identificado. El Comité Técnico puede reclasificarla y te notifica por correo." },
  { q: "¿Cómo se evalúa?", a: "Con cinco criterios de ponderación fija —problema 20%, propuesta de valor 25%, viabilidad 25%, impacto 15% y comunicación 15%— en una escala de cuatro niveles. El puntaje va de 0 a 100 y el mínimo para ser finalista es 60. En la preselección no hay pitch, así que corren solo los cuatro primeros criterios y el resultado se normaliza." },
  { q: "¿Las categorías compiten entre sí?", a: "Sí: hay un ranking único y los premios no se reparten por categoría. Aun así, los dos mejores de cada categoría tienen cupo asegurado en el Demo Day; los otros cuatro cupos salen del ranking general." },
  { q: "¿La postulación tiene costo?", a: "No. Postular es gratuito, y la plataforma es el único canal válido: no se aceptan postulaciones por correo ni por ningún otro medio." },
] as const;

export const stats = {
  categorias: 3,
  etapas: 7,
  evaluadoresPorProyecto: 2,
  criterios: CRITERIOS.length,
  sesionesBootcamp: 5,
  nivelesDesempeno: 4,
  puntajeAprobacion: 60,
} as const;
