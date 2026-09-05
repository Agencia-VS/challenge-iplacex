import type { Metadata } from "next";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Panel Evaluador" };

export default async function EvaluadorDashboard() {
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
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("nombre, rol")
    .eq("id", user.id)
    .single();

  if (perfil?.rol && perfil.rol !== "jurado" && perfil.rol !== "comite_tecnico") {
    redirect(`/app/${perfil.rol}`);
  }

  const nombre = perfil?.nombre ?? user.email?.split("@")[0] ?? "Evaluador";
  const esComiteTecnico = perfil?.rol === "comite_tecnico";

  // Proyectos asignados al evaluador
  const { data: rawAsignaciones } = await supabase
    .from("asignaciones")
    .select(`
      id,
      proyectos ( id, codigo_ciego, nombre_proyecto, categorias ( nombre ) )
    `)
    .eq("evaluador_id", user.id)
    .order("created_at", { ascending: false });

  type AsigRow = {
    id: string;
    proyectos: {
      id: string;
      codigo_ciego: string;
      nombre_proyecto: string | null;
      categorias: { nombre: string } | null;
    } | null;
  };

  const asignaciones = (rawAsignaciones ?? []) as unknown as AsigRow[];

  // Obtener el estado REAL de cada evaluación (no el de asignaciones)
  const proyectoIds = asignaciones
    .map(a => a.proyectos?.id)
    .filter((id): id is string => !!id);

  const { data: evalsRaw } = proyectoIds.length
    ? await supabase
        .from("evaluaciones")
        .select("proyecto_id, estado")
        .in("proyecto_id", proyectoIds)
        .eq("evaluador_id", user.id)
    : { data: [] as { proyecto_id: string; estado: string }[] };

  const evalMap = new Map(
    (evalsRaw ?? []).map(e => [e.proyecto_id, e.estado]),
  );

  const totalAsignados = asignaciones.length;
  const completadas = asignaciones.filter(a =>
    evalMap.get(a.proyectos?.id ?? "") === "finalizada",
  ).length;
  const pendientes = totalAsignados - completadas;

  return (
    <div className="space-y-10">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="brand-eyebrow text-brand-secondary">
            {esComiteTecnico ? "Comité Técnico" : "Jurado Evaluador"}
          </p>
          <h1 className="brand-display mt-1.5 text-[36px] leading-tight text-brand-primary md:text-[44px]">
            Hola, {nombre.split(" ")[0]}
          </h1>
          <p className="mt-2 max-w-lg text-[14px] text-brand-ink-soft">
            Revisa los proyectos asignados y registra tus evaluaciones antes del cierre de ronda.
          </p>
        </div>
        <Button href="/app/evaluacion/proyectos" variant="tertiary">
          Ver proyectos asignados →
        </Button>
      </header>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Proyectos asignados" value={String(totalAsignados)} tone="secondary" detail="Esta ronda" />
        <Stat label="Evaluaciones completas" value={`${completadas} / ${totalAsignados}`} tone={pendientes > 0 ? "warning" : "secondary"} detail={pendientes > 0 ? `${pendientes} pendientes` : "¡Al día!"} />
        <Stat label="Pendientes" value={String(pendientes)} tone="accent" detail={pendientes === 0 ? "Todo listo" : "Por completar"} />
      </div>

      {/* Tabla de proyectos asignados */}
      <Card variant="surface" className="overflow-hidden p-0">
        <div className="border-b border-brand-line px-6 py-4">
          <p className="brand-eyebrow">Proyectos asignados</p>
          <h2 className="mt-1 text-[17px] font-semibold text-brand-ink">
            {esComiteTecnico ? "Etapa activa — Todos los proyectos" : "Etapa activa — Tus asignaciones"}
          </h2>
        </div>
        {asignaciones.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="text-[48px]">📋</span>
            <p className="text-[14px] font-semibold text-brand-primary">Sin proyectos asignados</p>
            <p className="text-[12px] text-brand-ink-muted">
              El administrador aún no te ha asignado proyectos para evaluar.
            </p>
          </div>
        ) : (
        <ul className="divide-y divide-brand-line">
          {asignaciones.map((a) => {
            const p = a.proyectos;
            if (!p) return null;
            const evEstado = evalMap.get(p.id) ?? "pendiente";
            return (
              <li key={a.id} className="flex items-center justify-between gap-4 px-6 py-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--r-sm)] bg-brand-secondary-soft font-[family-name:var(--font-mono)] text-[11px] font-bold text-brand-secondary">
                    {p.codigo_ciego}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-brand-ink">
                      {p.nombre_proyecto ?? <span className="italic text-brand-ink-muted">Sin nombre</span>}
                    </p>
                    <p className="text-[11px] text-brand-ink-muted">
                      {(p.categorias as { nombre: string } | null)?.nombre ?? "—"}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge
                    tone={
                      evEstado === "finalizada"
                        ? "success"
                        : evEstado === "en_progreso"
                          ? "secondary"
                          : "warning"
                    }
                  >
                    {evEstado === "finalizada"
                      ? "Finalizada"
                      : evEstado === "en_progreso"
                        ? "En progreso"
                        : "Pendiente"}
                  </Badge>
                  <Button
                    href={`/app/evaluacion/proyectos/${p.id}`}
                    variant={evEstado === "finalizada" ? "ghost" : "secondary"}
                    size="sm"
                  >
                    {evEstado === "finalizada" ? "Ver" : "Evaluar"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
        )}
      </Card>
    </div>
  );
}
