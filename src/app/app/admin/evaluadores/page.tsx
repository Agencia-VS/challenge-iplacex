import type { Metadata } from "next";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { roleHomePath } from "@/lib/roles";
import { EvaluadoresPanel } from "@/components/app/evaluadores-panel";

export const metadata: Metadata = { title: "Evaluadores · Admin" };

type EvalRow = { evaluador_id: string; estado: string };
type Usuario = { id: string; nombre: string; email: string; rol: string };

export default async function EvaluadoresAdminPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/acceso");

  const { data: perfil } = await supabase
    .from("usuarios").select("rol").eq("id", user.id).single();
  if (perfil?.rol !== "admin") redirect(roleHomePath(perfil?.rol));

  const { data: rawEvals } = await supabase
    .from("usuarios")
    .select("id, nombre, email, rol")
    .in("rol", ["evaluador", "super_evaluador"])
    .order("nombre");

  const evaluadores = (rawEvals ?? []) as Usuario[];
  const evalIds = evaluadores.map(e => e.id);

  const { data: evCounts } = evalIds.length
    ? await supabase
        .from("evaluaciones")
        .select("evaluador_id, estado")
        .in("evaluador_id", evalIds)
    : { data: [] as EvalRow[] };

  const countMap = new Map<string, { total: number; finalizadas: number }>();
  for (const e of (evCounts ?? []) as EvalRow[]) {
    const cur = countMap.get(e.evaluador_id) ?? { total: 0, finalizadas: 0 };
    cur.total++;
    if (e.estado === "finalizada") cur.finalizadas++;
    countMap.set(e.evaluador_id, cur);
  }

  return (
    <div className="space-y-6 pb-20">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="brand-eyebrow text-brand-primary">Admin</p>
          <h1 className="brand-display mt-1.5 text-[32px] leading-tight text-brand-primary md:text-[40px]">
            Evaluadores
          </h1>
          <p className="mt-2 text-[13px] text-brand-ink-muted">
            Crea y gestiona los perfiles de evaluadores desde aquí.
          </p>
        </div>
      </header>

      <EvaluadoresPanel
        evaluadores={evaluadores.map(e => ({
          ...e,
          total: countMap.get(e.id)?.total ?? 0,
          finalizadas: countMap.get(e.id)?.finalizadas ?? 0,
        }))}
      />
    </div>
  );
}
