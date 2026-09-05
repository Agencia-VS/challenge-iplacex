import type { Metadata } from "next";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { roleHomePath } from "@/lib/roles";
import { ESTADO_BADGE_DEFAULT, type EstadoBadgeTone } from "@/lib/estados";

export const metadata: Metadata = { title: "Mi proceso" };
export const dynamic = "force-dynamic";

function toStatTone(tone: EstadoBadgeTone): "primary" | "accent" | "secondary" | "warning" {
  const map: Record<EstadoBadgeTone, "primary" | "accent" | "secondary" | "warning"> = {
    accent:  "accent",
    secondary:    "secondary",
    primary:  "primary",
    neutral:   "primary",
    success: "secondary",
    warning: "warning",
  };
  return map[tone];
}

export default async function PostulanteDashboard() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("nombre, rol")
    .eq("id", user.id)
    .single();

  if (perfil?.rol && perfil.rol !== "postulante") {
    redirect(roleHomePath(perfil.rol));
  }

  const nombre = perfil?.nombre ?? user.email?.split("@")[0] ?? "Postulante";

  // Convocatoria activa (más reciente no cerrada)
  const { data: convocatoria } = await supabase
    .from("convocatorias")
    .select("id, fecha_cierre")
    .neq("estado", "cerrada")
    .order("ano", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Proyecto del postulante en la convocatoria activa
  const { data: proyecto } = convocatoria
    ? await supabase
        .from("proyectos")
        .select(`
          id, nombre_proyecto, estado_postulacion,
          descripcion_breve, problema_resuelve, solucion,
          equipo_nombre, equipo_integrantes, video_url
        `)
        .eq("postulante_id", user.id)
        .eq("convocatoria_id", convocatoria.id)
        .maybeSingle()
    : { data: null };

  // Etapas de la convocatoria activa
  const { data: etapasDB } = convocatoria
    ? await supabase
        .from("etapas")
        .select("id, numero, nombre, tipo, fecha_inicio, fecha_fin, semana_inicio, semana_fin")
        .eq("convocatoria_id", convocatoria.id)
        .order("numero", { ascending: true })
    : { data: [] };

  // Total de cápsulas en la convocatoria activa
  const { count: totalCapsulas } = convocatoria
    ? await supabase
        .from("capsulas")
        .select("id", { count: "exact", head: true })
        .eq("convocatoria_id", convocatoria.id)
    : { count: 0 };

  // Etapa activa: la que contiene la fecha de hoy
  const now = new Date();
  const etapaActiva = etapasDB?.find(e => {
    if (!e.fecha_inicio || !e.fecha_fin) return false;
    return new Date(e.fecha_inicio) <= now && new Date(e.fecha_fin) >= now;
  }) ?? etapasDB?.[0] ?? null;

  // Días restantes para cierre de convocatoria
  const diasRestantes = convocatoria?.fecha_cierre
    ? Math.max(0, Math.ceil(
        (new Date(convocatoria.fecha_cierre).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      ))
    : null;

  // Estado de la postulación
  const estadoPostulacion = proyecto?.estado_postulacion ?? "borrador";
  const estadoConf = ESTADO_BADGE_DEFAULT[estadoPostulacion] ?? { label: estadoPostulacion, tone: "neutral" as EstadoBadgeTone };

  // Secciones del formulario y progreso (4 secciones, cada una = 25%)
  const secciones = [
    { label: "Información general",      done: !!(proyecto?.nombre_proyecto && proyecto?.descripcion_breve) },
    { label: "Descripción del problema", done: !!proyecto?.problema_resuelve },
    { label: "Solución propuesta",       done: !!proyecto?.solucion },
    { label: "Equipo",                   done: !!(proyecto?.equipo_nombre && proyecto?.equipo_integrantes) },
  ];
  const progreso = Math.round((secciones.filter(s => s.done).length / secciones.length) * 100);

  return (
    <div className="space-y-10">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="brand-eyebrow text-brand-accent">Bienvenido/a de vuelta</p>
          <h1 className="brand-display mt-1.5 text-[36px] leading-tight text-brand-primary md:text-[44px]">
            Hola, {nombre.split(" ")[0]} 👋
          </h1>
          <p className="mt-2 max-w-lg text-[14px] text-brand-ink-soft">
            Revisa el estado de tu postulación, continúa donde lo dejaste y accede a los recursos de formación.
          </p>
        </div>
        <Button href="/app/postulante/postular">Continuar postulación →</Button>
      </header>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Estado postulación"
          value={estadoConf.label}
          tone={toStatTone(estadoConf.tone)}
          detail={`${progreso}% completado`}
        />
        <Stat
          label="Etapa actual"
          value={etapaActiva ? String(etapaActiva.numero).padStart(2, "0") : "—"}
          tone="accent"
          detail={etapaActiva?.nombre ?? "Sin etapa activa"}
        />
        <Stat
          label="Cápsulas"
          value={totalCapsulas !== null ? String(totalCapsulas) : "—"}
          tone="secondary"
          detail="Disponibles en el programa"
        />
        <Stat
          label="Días restantes"
          value={diasRestantes !== null ? String(diasRestantes) : "—"}
          tone="primary"
          detail="Para cierre de postulaciones"
        />
      </div>

      {/* Cards */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Mi postulación */}
        <Card variant="surface" className="col-span-2 flex flex-col gap-5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="brand-eyebrow">Mi postulación</p>
              <h2 className="mt-1 text-[18px] font-semibold text-brand-ink">
                {proyecto?.nombre_proyecto ?? (
                  <span className="italic text-brand-ink-muted">Sin título</span>
                )}
              </h2>
            </div>
            <Badge tone={estadoConf.tone}>{estadoConf.label}</Badge>
          </div>

          {/* Progress bar */}
          <div>
            <div className="mb-1.5 flex justify-between text-[12px] text-brand-ink-muted">
              <span>Progreso del formulario</span>
              <span className="font-semibold text-brand-ink">{progreso}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-brand-line-strong">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-accent to-brand-accent-light transition-all"
                style={{ width: `${progreso}%` }}
              />
            </div>
          </div>

          {/* Secciones */}
          <ul className="space-y-2 text-[13px]">
            {secciones.map((s) => (
              <li key={s.label} className="flex items-center gap-2.5 text-brand-ink-soft">
                <span
                  className={`grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] font-bold ${
                    s.done ? "bg-st-success text-white" : "border border-brand-line-strong bg-brand-surface-soft text-brand-ink-muted"
                  }`}
                >
                  {s.done ? "✓" : "–"}
                </span>
                {s.label}
              </li>
            ))}
          </ul>

          <Button variant="secondary" href="/app/postulante/postulacion" className="self-start">
            Editar postulación
          </Button>
        </Card>

        {/* Timeline */}
        <Card variant="neutral" className="flex flex-col gap-4 p-6">
          <p className="brand-eyebrow">Timeline</p>
          {etapasDB && etapasDB.length > 0 ? (
            <ul className="space-y-4">
              {etapasDB.slice(0, 4).map((e, i) => {
                const inicio = e.fecha_inicio ? new Date(e.fecha_inicio) : null;
                const fin = e.fecha_fin ? new Date(e.fecha_fin) : null;
                const isActive = inicio && fin && inicio <= now && fin >= now;
                const isCompleted = fin && fin < now;
                return (
                  <li key={e.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                          isActive
                            ? "bg-brand-accent text-white"
                            : isCompleted
                              ? "bg-st-success text-white"
                              : "border border-brand-line bg-brand-surface-raised text-brand-ink-muted"
                        }`}
                      >
                        {e.numero}
                      </span>
                      {i < 3 && <div className="mt-1 h-6 w-px bg-brand-line" />}
                    </div>
                    <div className="pb-1">
                      <p className="text-[12px] font-semibold text-brand-ink leading-tight">{e.nombre}</p>
                      <p className="mt-0.5 text-[11px] text-brand-ink-muted">
                        {e.semana_inicio && e.semana_fin
                          ? `Sem ${e.semana_inicio}–${e.semana_fin}`
                          : e.semana_inicio
                            ? `Sem ${e.semana_inicio}`
                            : ""}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-[13px] text-brand-ink-muted">No hay etapas configuradas.</p>
          )}
          <Button variant="ghost" href="/metodologia" className="mt-auto self-start text-[12px]">
            Ver todas las etapas →
          </Button>
        </Card>
      </div>
    </div>
  );
}
