/**
 * Tipos generados automáticamente por Supabase CLI.
 * Ejecuta `npx supabase gen types typescript --project-id <id> > src/lib/supabase/types.ts`
 * después de aplicar las migraciones Drizzle.
 *
 * Mientras tanto este stub permite que TypeScript compile sin errores.
 */
export type Database = {
  public: {
    Tables: Record<string, unknown>;
    Views: Record<string, unknown>;
    Functions: Record<string, unknown>;
    Enums: Record<string, unknown>;
  };
};
