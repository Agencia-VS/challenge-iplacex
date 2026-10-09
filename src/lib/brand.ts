/**
 * Identidad de marca — fuente única.
 *
 * Para rebrandear el proyecto basta con editar:
 *   1. este archivo (nombres, URL, paleta en hex),
 *   2. los valores hex de `:root` en `src/app/globals.css` (tokens CSS),
 *   3. los archivos oficiales en `public/brand/` y los íconos de `src/app/`.
 *
 * El contenido del programa —categorías, etapas, criterios, rúbricas— es otra
 * capa y vive en `src/lib/site.ts` y `src/lib/rubrica.ts`.
 */

export const BRAND = {
  /** Palabra que va en el logotipo. */
  shortName: "Iplacex",
  /** Bajada del logotipo, bajo `shortName`. */
  shortTagline: "enovus",
  /** Nombre del producto. */
  name: "Challenge IPLACEX",
  /** Organización que respalda el programa. */
  org: "Iplacex",
  /** Nombre completo, para <title> y Open Graph. */
  fullName: "Challenge IPLACEX 2026",
  edition: "2026",
  tagline: "Concurso de Emprendimiento e Innovación",
  description:
    "Concurso de Emprendimiento e Innovación de Iplacex. Postula tu proyecto en una de las tres categorías, súmate como evaluador o conoce a los finalistas.",
  ogDescription:
    "Tres categorías, cinco criterios y una rúbrica por etapa de desarrollo. La plataforma de Iplacex para evaluar emprendimiento e innovación con criterios comparables.",
  /** TODO: confirmar el dominio definitivo con la contraparte. */
  url: "https://challenge.iplacex.cl",
  locale: "es_CL",
  /** Dominio para los placeholders de email en los formularios. */
  emailDomain: "iplacex.cl",
  /** Unidades responsables, según las Bases del Concurso. */
  unidad: "Dirección de Formación General",
  subUnidad:
    "Coordinación Extracurricular de Emprendimiento e Innovación y de Vinculación con el Medio",
} as const;

/**
 * Interfaz: azules oscuros de la pág. 9 del manual 2026, según solicitud DAM.
 * El azul del archivo de logo oficial se conserva intacto.
 * Mantener en sync con `:root` en `src/app/globals.css`.
 */
export const PALETTE = {
  primary: "#06092D",
  primaryLight: "#000080",
  secondary: "#575757",
  secondaryLight: "#979797",
  accent: "#000080",
  accentLight: "#06092D",
  surface: "#F5F5F5",
} as const;

export type HeroImages = { desktop: string; mobile: string };

/** Activar al recibir los dos fondos aprobados. No solicitar archivos inexistentes. */
export const HERO_IMAGES: HeroImages | null = null;
