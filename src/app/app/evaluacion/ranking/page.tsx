import { RankingVerticales } from "@/components/app/ranking-verticales";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/stat";

interface ProyectoRow {
  id: string;
  codigo_ciego: string;
  categorias: { nombre: string; numero: number } | null;
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
      categorias ( nombre, numero ),
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
      categoria: p.categorias?.nombre ?? null,
      categoriaNumero: p.categorias?.numero ?? null,
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

        <RankingVerticales rows={rows} />
      </Card>
    </div>
  );
}
