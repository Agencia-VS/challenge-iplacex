/**
 * RUT chileno: normalización y dígito verificador.
 *
 * Se usa para deduplicar integrantes entre postulaciones —una persona solo
 * puede participar en un proyecto— así que la comparación tiene que ser sobre
 * una forma canónica: sin puntos, sin guion, con la K en mayúscula. "12.345.678-5",
 * "12345678-5" y "123456785" son la misma persona.
 */

/** Deja solo dígitos y el verificador, en mayúscula. */
export function normalizarRut(rut: string): string {
  return rut.replace(/[^0-9kK]/g, "").toUpperCase();
}

/** Dígito verificador por módulo 11, con los multiplicadores 2..7 cíclicos. */
export function digitoVerificador(cuerpo: string): string {
  let suma = 0;
  let multiplicador = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  const resto = 11 - (suma % 11);
  if (resto === 11) return "0";
  if (resto === 10) return "K";
  return String(resto);
}

/** ¿El RUT es válido, incluido su dígito verificador? */
export function esRutValido(rut: string): boolean {
  const limpio = normalizarRut(rut);
  if (limpio.length < 2) return false;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  // La K solo es válida como verificador, nunca dentro del cuerpo.
  if (!/^\d+$/.test(cuerpo)) return false;
  return digitoVerificador(cuerpo) === dv;
}

/** Forma canónica para comparar y almacenar: "123456785". */
export function rutCanonico(rut: string): string {
  return normalizarRut(rut);
}

/** Forma legible: "12.345.678-5". */
export function formatearRut(rut: string): string {
  const limpio = normalizarRut(rut);
  if (limpio.length < 2) return limpio;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  return `${cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${dv}`;
}
