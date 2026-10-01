export const CONDICIONES_ACADEMICAS = ["titulado", "estudiante"] as const;
export type CondicionAcademica = (typeof CONDICIONES_ACADEMICAS)[number];

export const CONDICION_LABEL: Record<CondicionAcademica, string> = {
  titulado: "Titulado",
  estudiante: "Estudiante",
};

export function esCondicionAcademica(value: unknown): value is CondicionAcademica {
  return value === "titulado" || value === "estudiante";
}
