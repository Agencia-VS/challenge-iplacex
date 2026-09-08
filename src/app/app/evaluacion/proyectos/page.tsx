import type { Metadata } from "next";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Proyectos asignados" };

type Asignacion = {
  id: string;
  estado: string;
  proyecto: {
    id: string;
    codigo_ciego: string;
    categorias: { nombre: string } | null;
  } | null;
  etapa: { nombre: string } | null;
};

type Evaluacion = {
  asignacion_id: string;
  proyecto_id: string;
  estado: string;
  puntaje_ponderado: number | null;
};

export default async function ProyectosEvaluadorPage() {
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

  const { data: asignacionesRaw } = await supabase
    .from("asignaciones")
    .select(`
      id, estado,
      proyecto:proyecto_id ( id, codigo_ciego, categorias ( nombre ) ),
      etapa:etapa_id ( nombre )
    `)
    .eq("evaluador_id", user.id)
    .order("created_at", { ascending: false });

  const asignaciones = (asignacionesRaw ?? []) as unknown as Asignacion[];
  const proyectoIds = asignaciones.map(a => a.proyecto?.id).filter((id): id is string => !!id);

  const { data: evaluacionesRaw } = proyectoIds.length
    ? await supabase
        .from("evaluaciones")
        .select("asignacion_id, proyecto_id, estado, puntaje_ponderado")
        .in("proyecto_id", proyectoIds)
        .eq("evaluador_id", user.id)
    : { data: [] as Evaluacion[] };

  const evalMap = new Map(
    ((evaluacionesRaw ?? []) as Evaluacion[]).map(e => [e.asignacion_id, e]),
  );

  return (
    <div className="space-y-6 pb-20">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="brand-eyebrow text-brand-secondary">Evaluación</p>
          <h1 className="brand-display mt-1.5 text-[32px] leading-tight text-brand-primary md:text-[40px]">
            Proyectos asignados
          </h1>
        </div>
        <Badge tone="neutral">
          {asignaciones.length} proyecto{asignaciones.length !== 1 ? "s" : ""}
        </Badge>
      </header>

      {asignaciones.length === 0 ? (
        <Card variant="ghost" className="flex flex-col items-center gap-4 py-20 text-center">
          <span className="text-[56px]">📁</span>
          <div>
            <p className="text-[17px] font-semibold text-brand-primary">Sin proyectos asignados</p>
            <p className="mt-1 text-[13px] text-brand-ink-muted">
              El administrador te asignará proyectos cuando comience la ronda de evaluación.
            </p>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <ul className="divide-y divide-brand-line">
            {asignaciones.map(a => {
              const ev = evalMap.get(a.proyecto?.id ?? "");
              const tone =
                ev?.estado === "finalizada" ? ("success" as const)
                : ev?.estado === "en_progreso" ? ("secondary" as const)
                : ("warning" as const);
              const badgeLabel =
                ev?.estado === "finalizada" ? "Completada"
                : ev?.estado === "en_progreso" ? "En progreso"
                : "Pendiente";

              return (
                <li key={a.id} className="flex items-center justify-between gap-4 px-6 py-4">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--r-sm)] bg-brand-secondary-soft font-[family-name:var(--font-mono)] text-[12px] font-bold text-brand-secondary">
                      {a.proyecto?.codigo_ciego ?? "—"}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-brand-ink">
                        {a.proyecto?.categorias?.nombre ?? "Categoría"}
                      </p>
                      <p className="text-[11px] text-brand-ink-muted">
                        {a.etapa?.nombre ?? "Ronda 1"}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Badge tone={tone}>{badgeLabel}</Badge>
                    {a.proyecto && (
                      <Button
                        href={`/app/evaluacion/proyectos/${a.proyecto.id}?asignacion=${encodeURIComponent(a.id)}`}
                        variant={ev?.estado === "finalizada" ? "ghost" : "secondary"}
                        size="sm"
                      >
                        {ev?.estado === "finalizada" ? "Ver" : "Evaluar →"}
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
