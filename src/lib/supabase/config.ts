/**
 * Estado de configuración de Supabase.
 *
 * `createServerClient` lanza excepción si la URL o la llave vienen vacías, y el
 * middleware corre en cada request: sin estas variables, toda la aplicación
 * responde 500 —incluidas las páginas públicas que no consultan la base—.
 *
 * Consultar esto antes de construir un cliente permite que el sitio público se
 * sirva con el contenido por omisión y que el área privada explique qué falta,
 * en vez de caerse. También cubre el caso de que la base esté caída, no solo el
 * de que falten las variables.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Si hay credenciales para hablar con Supabase. */
export const supabaseConfigurado = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
