import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/stat";

interface ProyectoRow {
  id: string;
  codigo_ciego: string;
  evaluaciones: Array<{
    puntaje_ponderado: number | null;
    scores: Record<string, number> | null;
    estado: string;
  }>;
}

function avg(nums: number[]) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
function stdDev(nums: number[]) {
  if (nums.length < 2) return 0;
  const m = avg(nums);
  const v = avg(nums.map((n) => (n - m) ** 2));
  return Math.sqrt(v);
}

// Umbrales de dispersión entre evaluadores. Venían calibrados para la escala
// de 1 a 7 (0,4 y 0,8 sobre un rango de 6 puntos); reescalados al rango útil de
// la escala actual, que va de 25 a 100 —el mínimo posible es 25, no cero—, es
// decir 12,5 veces más ancho.
const SIGMA_CONSENSO = 5;
const SIGMA_ALTA = 10;

export default async function RankingPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/acceso");

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single();
  if (!usuario || usuario.rol !== "comite_tecnico") redirect("/app");

  // Proyectos + evaluaciones
  const { data: proyectos } = await supabase
    .from("proyectos")
    .select(`
      id,
      codigo_ciego,
      evaluaciones ( puntaje_ponderado, estado )
    `)
    .in("estado_postulacion", ["enviada", "en_revision", "preseleccionado", "finalista"]);

  const rows = ((proyectos ?? []) as unknown as ProyectoRow[]).map((p) => {
    const finalizadas = (p.evaluaciones ?? []).filter((e) => e.estado === "finalizada");
    const scores = finalizadas.map((e) => e.puntaje_ponderado ?? 0);
    const promedio = avg(scores);
    const sigma = stdDev(scores);
    return {
      id: p.id,
      codigo: p.codigo_ciego,
      n: finalizadas.length,
      promedio,
      sigma,
    };
  });

  rows.sort((a, b) => b.promedio - a.promedio);

  const totalEval = rows.reduce((a, r) => a + r.n, 0);
  const proyectosCompletos = rows.filter((r) => r.n >= 3).length;
  const altaDif = rows.filter((r) => r.sigma > SIGMA_ALTA).length;
  const promedioGlobal = avg(rows.map((r) => r.promedio));

  return (
    <div className="space-y-6 pb-20">
      <header>
        <p className="brand-eyebrow text-brand-accent">Comité Técnico</p>
        <h1 className="brand-display mt-1.5 text-[32px] leading-tight text-brand-primary md:text-[40px]">
          Ranking consolidado
        </h1>
        <p className="mt-2 text-[14px] text-brand-ink-soft">
          Promedios, dispersión (σ) y proyectos que requieren revisión.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat tone="primary" label="Proyectos completos" value={String(proyectosCompletos)} />
        <Stat tone="accent" label={`Alta dispersión (σ>${SIGMA_ALTA})`} value={String(altaDif)} />
        <Stat tone="secondary" label="Evaluaciones totales" value={String(totalEval)} />
        <Stat tone="warning" label="Promedio global" value={promedioGlobal.toFixed(1)} />
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="brand-display text-[20px] text-brand-primary">Ranking</h2>
          <Badge tone="neutral">{rows.length} proyectos</Badge>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-brand-line text-[11px] uppercase tracking-wider text-brand-ink-muted">
                <th className="px-3 py-3 font-semibold">#</th>
                <th className="px-3 py-3 font-semibold">Proyecto</th>
                <th className="px-3 py-3 font-semibold">Promedio /7</th>
                <th className="px-3 py-3 font-semibold">σ</th>
                <th className="px-3 py-3 font-semibold">N° eval</th>
                <th className="px-3 py-3 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const tag =
                  r.sigma <= SIGMA_CONSENSO
                    ? { label: "consenso", tone: "success" as const }
                    : r.sigma <= SIGMA_ALTA
                    ? { label: "revisar", tone: "warning" as const }
                    : { label: "alta dif.", tone: "accent" as const };
                return (
                  <tr key={r.id} className="border-b border-brand-line/60 hover:bg-brand-surface-soft">
                    <td className="px-3 py-3 font-[family-name:var(--font-mono)] text-brand-ink-muted">
                      {String(i + 1).padStart(2, "0")}
                    </td>
                    <td className="px-3 py-3 font-semibold text-brand-primary">{r.codigo}</td>
                    <td className="px-3 py-3 font-[family-name:var(--font-mono)] text-[15px] font-bold text-brand-ink">
                      {r.promedio.toFixed(1)}
                    </td>
                    <td className="px-3 py-3 font-[family-name:var(--font-mono)] text-brand-ink-soft">
                      {r.sigma.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-brand-ink-soft">{r.n}</td>
                    <td className="px-3 py-3">
                      <Badge tone={tag.tone}>{tag.label}</Badge>
                    </td>
                  </tr>
                );
              })}
              {!rows.length && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-[13px] text-brand-ink-muted">
                    Aún no hay proyectos evaluados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
