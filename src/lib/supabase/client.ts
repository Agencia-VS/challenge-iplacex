import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigurado } from "@/lib/supabase/config";

export { supabaseConfigurado };

/**
 * Cliente para uso en componentes "use client".
 * Usa la ANON KEY — permisos controlados por RLS.
 *
 * Lanza con un mensaje propio si falta configuración: el de la librería
 * («Your project's URL and Key are required») no dice qué variable definir.
 * Los formularios consultan `supabaseConfigurado` antes de llamar acá.
 */
export function createClient() {
  if (!supabaseConfigurado) {
    throw new Error(
      "Supabase sin configurar: falta NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  return createBrowserClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
}
