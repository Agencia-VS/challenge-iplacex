/**
 * ROLE_HOME — única fuente de verdad para redirects entre dashboards.
 * super_evaluador comparte la UI de evaluador: no existe /app/super_evaluador.
 */
export const ROLE_HOME: Record<string, string> = {
  postulante:      "/app/postulante",
  evaluador:       "/app/evaluador",
  admin:           "/app/admin",
  super_evaluador: "/app/evaluador",
};

/** Devuelve la ruta home para un rol dado. Nunca genera rutas inexistentes. */
export function roleHomePath(rol: string | undefined | null): string {
  return ROLE_HOME[rol ?? "postulante"] ?? "/app/postulante";
}
