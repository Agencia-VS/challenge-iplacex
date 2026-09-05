/**
 * Identidad de marca — fuente única.
 *
 * Para rebrandear el proyecto basta con editar:
 *   1. este archivo (nombres, URL, paleta en hex),
 *   2. los valores hex de `:root` en `src/app/globals.css` (tokens CSS),
 *   3. `src/app/icon.svg` + `src/components/brand/mark.tsx` (isotipo).
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
 * Paleta en hexadecimal, para consumidores JS que no pueden leer variables CSS
 * —por ejemplo el patrón de fondo, que se serializa como data: URI y por tanto
 * queda fuera del alcance de `var(--brand-*)`.
 *
 * Los valores salen del logotipo oficial: azul puro sobre una escala de grises
 * cálidos. Debe mantenerse en sync con `:root` en `src/app/globals.css`.
 */
export const PALETTE = {
  primary: "#0A0A0A",
  primaryLight: "#575756",
  secondary: "#575756",
  secondaryLight: "#A7A1A0",
  accent: "#0000FF",
  accentLight: "#3D3DFF",
  surface: "#F5F4F4",
} as const;

/** Grises exactos del isotipo, en el orden en que aparecen en la grilla. */
export const GRISES = {
  medio: "#A7A1A0",
  claro: "#D1CDCD",
  tenue: "#ECEAEB",
} as const;
