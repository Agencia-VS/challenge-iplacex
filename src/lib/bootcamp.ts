/**
 * Asistencia al bootcamp.
 *
 * Las Bases exigen asistir al menos al 75% de las sesiones; bajo ese umbral el
 * proyecto queda descalificado. Como la descalificación tiene consecuencias
 * duras, el cálculo distingue entre lo que ya ocurrió y lo que todavía puede
 * ocurrir: mientras queden sesiones por delante, un proyecto puede estar bajo
 * el umbral sin estar perdido.
 */

/** Porcentaje mínimo de asistencia exigido por las Bases. */
export const ASISTENCIA_MINIMA = 75;

export type RegistroAsistencia = {
  sesionId: number;
  presente: boolean;
};

export type ResumenAsistencia = {
  /** Sesiones ya realizadas y registradas. */
  registradas: number;
  /** De esas, a cuántas asistió. */
  asistidas: number;
  /** Total de sesiones del bootcamp. */
  total: number;
  /** Asistencia sobre el total del bootcamp, que es lo que exigen las Bases. */
  porcentaje: number;
  /** Asistencia sobre lo ya realizado, útil para ver cómo va en curso. */
  porcentajeALaFecha: number;
  /** Cumple el mínimo con lo ya asistido. */
  cumple: boolean;
  /**
   * Ya no puede alcanzar el mínimo aunque asista a todas las sesiones que
   * quedan. Solo entonces la descalificación es inevitable.
   */
  irrecuperable: boolean;
  /** Cuántas de las sesiones restantes necesita para llegar al mínimo. */
  faltanPorAsistir: number;
};

/** Redondea a un decimal, evitando el ruido de la coma flotante. */
function pct(parte: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((parte / total) * 1000) / 10;
}

export function resumenAsistencia(
  registros: RegistroAsistencia[],
  totalSesiones: number,
  minimo: number = ASISTENCIA_MINIMA,
): ResumenAsistencia {
  const registradas = registros.length;
  const asistidas = registros.filter((r) => r.presente).length;
  const restantes = Math.max(0, totalSesiones - registradas);

  // Cuántas sesiones hay que asistir en total para alcanzar el mínimo.
  const necesarias = Math.ceil((minimo / 100) * totalSesiones);
  const faltanPorAsistir = Math.max(0, necesarias - asistidas);

  return {
    registradas,
    asistidas,
    total: totalSesiones,
    porcentaje: pct(asistidas, totalSesiones),
    porcentajeALaFecha: pct(asistidas, registradas),
    cumple: totalSesiones > 0 && asistidas >= necesarias,
    irrecuperable: totalSesiones > 0 && faltanPorAsistir > restantes,
    faltanPorAsistir,
  };
}

/**
 * Si corresponde descalificar al proyecto. Solo cuando ya no puede alcanzar el
 * mínimo: descalificar antes castigaría a quien todavía puede recuperarse.
 */
export function debeDescalificarse(resumen: ResumenAsistencia): boolean {
  return resumen.irrecuperable;
}
