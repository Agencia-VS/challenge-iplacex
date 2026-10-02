import { EvaluadorTabla } from "@/components/app/evaluador-tabla";
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
  asignacion_id: string;
  etapa_id: number | null;
  etapa: { nombre: string } | null;
  estado: string;
  puntaje_ponderado: number | null;
  updated_at: string;
  finalizada_at: string | null;
  proyecto: { id: string; codigo_ciego: string; categorias: { nombre: string; numero: number } | null } | null;
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
  if (!perfil || (perfil.rol !== "jurado" && perfil.rol !== "comite_tecnico")) {
    redirect("/app");
  }

  const { data: raw } = await supabase
    .from("evaluaciones")
    .select(`
      id, asignacion_id, etapa_id, estado, puntaje_ponderado, updated_at, finalizada_at,
      etapa:etapa_id ( nombre ),
      proyecto:proyecto_id ( id, codigo_ciego, categorias ( nombre, numero ) )
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
          <Button href="/app/evaluacion/proyectos" variant="tertiary">
            Ver proyectos asignados →
          </Button>
        </Card>
      ) : (
        <EvaluadorTabla filas={evals.map(e => ({
          id: e.id, codigo: e.proyecto?.codigo_ciego ?? "—",
          categoria: e.proyecto?.categorias?.nombre ?? null, categoriaNumero: e.proyecto?.categorias?.numero ?? null,
          etapaId: e.etapa_id, etapa: e.etapa?.nombre ?? "Etapa sin nombre", estado: e.estado,
          puntaje: e.puntaje_ponderado, fecha: e.finalizada_at ?? e.updated_at,
          href: e.proyecto && e.asignacion_id ? `/app/evaluacion/proyectos/${e.proyecto.id}?asignacion=${encodeURIComponent(e.asignacion_id)}` : null,
        }))} />
      )}
    </div>
  );
}
