import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con SERVICE ROLE KEY.
 * SOLO para operaciones admin server-side (seeds, triggers, migraciones).
 * NUNCA exponer al cliente ni al browser.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
