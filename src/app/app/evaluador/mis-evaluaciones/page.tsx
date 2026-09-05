import type { Metadata } from "next";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Mis evaluaciones" };

type EvalRow = {
  id: string;
  estado: string;
  puntaje_ponderado: number | null;
  updated_at: string;
  finalizada_at: string | null;
  proyecto: { codigo_ciego: string; categorias: { nombre: string } | null } | null;
};

export default async function MisEvaluacionesPage() {
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
  if (!perfil || (perfil.rol !== "evaluador" && perfil.rol !== "super_evaluador")) {
    redirect("/app");
  }

  const { data: raw } = await supabase
    .from("evaluaciones")
    .select(`
      id, estado, puntaje_ponderado, updated_at, finalizada_at,
      proyecto:proyecto_id ( codigo_ciego, categorias ( nombre ) )
    `)
    .eq("evaluador_id", user.id)
    .order("updated_at", { ascending: false });

  const evals = (raw ?? []) as unknown as EvalRow[];
  const completadas = evals.filter(e => e.estado === "finalizada").length;

  return (
    <div className="space-y-6 pb-20">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="brand-eyebrow text-brand-secondary">Evaluación</p>
          <h1 className="brand-display mt-1.5 text-[32px] leading-tight text-brand-primary md:text-[40px]">
            Mis evaluaciones
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="secondary">{completadas} completadas</Badge>
          <Badge tone="neutral">{evals.length} total</Badge>
        </div>
      </header>

      {evals.length === 0 ? (
        <Card variant="ghost" className="flex flex-col items-center gap-4 py-20 text-center">
          <span className="text-[56px]">📊</span>
          <div>
            <p className="text-[17px] font-semibold text-brand-primary">Aún no hay evaluaciones</p>
            <p className="mt-1 text-[13px] text-brand-ink-muted">
              Aquí aparecerán las evaluaciones que registres.
            </p>
          </div>
          <Button href="/app/evaluador/proyectos" variant="tertiary">
            Ver proyectos asignados →
          </Button>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-brand-line text-[11px] uppercase tracking-wider text-brand-ink-muted">
                  <th className="px-6 py-3 font-semibold">Proyecto</th>
                  <th className="px-6 py-3 font-semibold">Categoría</th>
                  <th className="px-6 py-3 font-semibold">Puntaje</th>
                  <th className="px-6 py-3 font-semibold">Estado</th>
                  <th className="px-6 py-3 font-semibold">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {evals.map(e => {
                  const tone =
                    e.estado === "finalizada" ? ("success" as const)
                    : e.estado === "en_progreso" ? ("secondary" as const)
                    : ("warning" as const);
                  const label =
                    e.estado === "finalizada" ? "Completada"
                    : e.estado === "en_progreso" ? "En progreso"
                    : "Pendiente";
                  return (
                    <tr key={e.id} className="border-b border-brand-line/60 hover:bg-brand-surface-soft">
                      <td className="px-6 py-4 font-[family-name:var(--font-mono)] font-bold text-brand-secondary">
                        {e.proyecto?.codigo_ciego ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-brand-ink-soft">
                        {(e.proyecto?.categorias as { nombre: string } | null)?.nombre ?? "—"}
                      </td>
                      <td className="px-6 py-4 font-bold text-brand-primary">
                        {e.puntaje_ponderado != null ? e.puntaje_ponderado.toFixed(1) : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <Badge tone={tone}>{label}</Badge>
                      </td>
                      <td className="px-6 py-4 text-brand-ink-muted">
                        {new Date(e.finalizada_at ?? e.updated_at).toLocaleDateString("es-CL", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
