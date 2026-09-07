/**
 * ROLE_HOME — única fuente de verdad para redirects entre dashboards.
 *
 * El Comité Técnico y el Jurado comparten la misma pantalla de evaluación:
 * usan la misma rúbrica y se diferencian por la etapa en que se les asignan
 * proyectos —el Comité en preselección, sin pitch; el Jurado en el Demo Day—
 * y por las acciones de admisibilidad, que solo el Comité tiene.
 */
export const ROLE_HOME: Record<string, string> = {
  postulante:     "/app/postulante",
  comite_tecnico: "/app/evaluacion",
  jurado:         "/app/evaluacion",
  admin:          "/app/admin",
};

/** Roles que evalúan proyectos. */
export const ROLES_EVALUADORES = ["comite_tecnico", "jurado"] as const;

/** Etiqueta legible de cada rol, como la nombran las Bases. */
export const ETIQUETA_ROL: Record<string, string> = {
  postulante:     "Postulante",
  comite_tecnico: "Comité Técnico",
  jurado:         "Jurado Evaluador",
  admin:          "Comité Organizador",
};

/** Devuelve la ruta home para un rol dado. Nunca genera rutas inexistentes. */
export function roleHomePath(rol: string | undefined | null): string {
  return ROLE_HOME[rol ?? "postulante"] ?? "/app/postulante";
}
