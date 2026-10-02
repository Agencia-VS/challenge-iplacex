import type { Metadata } from "next";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EvaluadorTabla } from "@/components/app/evaluador-tabla";

export const metadata: Metadata = { title: "Proyectos asignados" };

type Asignacion = {
  id: string;
  estado: string;
  etapa_id: number;
  proyecto: {
    id: string;
    codigo_ciego: string;
    categorias: { nombre: string; numero: number } | null;
  } | null;
  etapa: { nombre: string } | null;
};

type Evaluacion = {
  asignacion_id: string;
  proyecto_id: string;
  estado: string;
  puntaje_ponderado: number | null;
  updated_at: string;
  finalizada_at: string | null;
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
      id, estado, etapa_id,
      proyecto:proyecto_id ( id, codigo_ciego, categorias ( nombre, numero ) ),
      etapa:etapa_id ( nombre )
    `)
    .eq("evaluador_id", user.id)
    .order("created_at", { ascending: false });

  const asignaciones = (asignacionesRaw ?? []) as unknown as Asignacion[];
  const proyectoIds = asignaciones.map(a => a.proyecto?.id).filter((id): id is string => !!id);

  const { data: evaluacionesRaw } = proyectoIds.length
    ? await supabase
        .from("evaluaciones")
        .select("asignacion_id, proyecto_id, estado, puntaje_ponderado, updated_at, finalizada_at")
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
        <EvaluadorTabla filas={asignaciones.map(a => ({
          id: a.id, codigo: a.proyecto?.codigo_ciego ?? "—",
          categoria: a.proyecto?.categorias?.nombre ?? null,
          categoriaNumero: a.proyecto?.categorias?.numero ?? null,
          etapaId: a.etapa_id, etapa: a.etapa?.nombre ?? "Etapa sin nombre",
          estado: evalMap.get(a.id)?.estado ?? "pendiente",
          puntaje: evalMap.get(a.id)?.puntaje_ponderado ?? null,
          fecha: evalMap.get(a.id)?.finalizada_at ?? evalMap.get(a.id)?.updated_at,
          href: a.proyecto ? `/app/evaluacion/proyectos/${a.proyecto.id}?asignacion=${encodeURIComponent(a.id)}` : null,
        }))} />
      )}
    </div>
  );
}
