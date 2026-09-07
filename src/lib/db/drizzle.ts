import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * Pool de conexiones Postgres apuntando a Supabase (connection pooler).
 * En serverless Next.js se usa la URL con puerto 6543 (Transaction mode).
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1, // serverless: 1 conexión por instancia
});

export const db = drizzle(pool, { schema });
