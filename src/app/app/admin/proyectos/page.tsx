import type { Metadata } from "next";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { roleHomePath } from "@/lib/roles";
import { ProyectosPanel } from "@/components/app/proyectos-panel";
import type { ProyectoPanelRow, EvaluadorSimple, EtapaEvaluacionSimple } from "@/components/app/proyectos-panel";
import { resolveEstadoBadge, resolveTransiciones, type EstadoBadgeConfig, type TransicionEstado } from "@/lib/estados";

export const metadata: Metadata = { title: "Proyectos · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminProyectosPage() {
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

  // Proyectos con asignaciones embebidas
  const { data: rawProyectos } = await supabase
    .from("proyectos")
    .select(`
      id, codigo_ciego, nombre_proyecto, estado_postulacion, created_at, enviada_at,
      categorias ( nombre ),
      postulante:postulante_id ( nombre, email ),
      asignaciones ( evaluador_id, etapa_id, estado ),
      evaluaciones ( etapa_id, puntaje_ponderado, estado )
    `)
    .order("created_at", { ascending: false });

  // Evaluadores disponibles
  const { data: rawEvaluadores } = await supabase
    .from("usuarios")
    .select("id, nombre, email, rol")
    .in("rol", ["jurado", "comite_tecnico"])
    .order("nombre");

  // Cargamos las rondas que requieren asignación de evaluadores:
  // preselección, evaluación del bootcamp y Demo Day.
  const { data: rawEtapas } = await supabase
    .from("etapas")
    .select("id, nombre, tipo, fecha_inicio, fecha_fin, convocatoria_id")
    .in("tipo", ["preseleccion", "bootcamp", "demo_day"])
    .order("fecha_inicio", { ascending: true });

  type RawEtapa = {
    id: number;
    nombre: string | null;
    tipo: string;
    fecha_inicio: string | null;
    fecha_fin: string | null;
    convocatoria_id: number;
  };

  const etapasEvaluacion: EtapaEvaluacionSimple[] = ((rawEtapas ?? []) as RawEtapa[]).map((item) => ({
    id: item.id,
    nombre: item.nombre ?? (item.tipo === "demo_day" ? "Demo day" : "Preselección"),
    tipo: item.tipo,
    fecha_inicio: item.fecha_inicio,
    fecha_fin: item.fecha_fin,
    convocatoria_id: item.convocatoria_id,
  }));

  const ahora = Date.now();
  const etapa =
    etapasEvaluacion.find((item) => {
      const inicio = item.fecha_inicio ? new Date(item.fecha_inicio).getTime() : null;
      const fin = item.fecha_fin ? new Date(item.fecha_fin).getTime() : null;
      return (inicio === null || inicio <= ahora) && (fin === null || fin >= ahora);
    }) ??
    etapasEvaluacion.find((item) => {
      const inicio = item.fecha_inicio ? new Date(item.fecha_inicio).getTime() : null;
      return inicio === null || inicio > ahora;
    }) ??
    etapasEvaluacion[0] ??
    null;

  // Config de la convocatoria activa (para estados y transiciones personalizadas)
  type ConvocatoriaConfig = {
    estadosBadge?: Record<string, EstadoBadgeConfig> | null;
    transicionesEstado?: Record<string, TransicionEstado[]> | null;
    nEvaluadoresPorProyecto?: number;
  };
  let convConfig: ConvocatoriaConfig | null = null;
  if (etapa) {
    const { data: conv } = await supabase
      .from("convocatorias")
      .select("config")
      .eq("id", (etapa as { convocatoria_id: number }).convocatoria_id)
      .maybeSingle();
    convConfig = (conv as { config?: ConvocatoriaConfig } | null)?.config ?? null;
  }

  type RawProy = {
    id: string;
    codigo_ciego: string;
    nombre_proyecto: string | null;
    estado_postulacion: string;
    created_at: string;
    enviada_at: string | null;
    categorias: { nombre: string } | null;
    postulante: { nombre: string; email: string } | null;
    asignaciones: { evaluador_id: string; etapa_id: number; estado: string | null }[] | null;
    evaluaciones: { etapa_id: number | null; puntaje_ponderado: number | null; estado: string }[] | null;
  };

  const proyectos: ProyectoPanelRow[] = ((rawProyectos ?? []) as unknown as RawProy[]).map(p => ({
    id: p.id,
    codigo_ciego: p.codigo_ciego,
    nombre_proyecto: p.nombre_proyecto,
    estado_postulacion: p.estado_postulacion,
    created_at: p.created_at,
    enviada_at: p.enviada_at,
    categoria: p.categorias?.nombre ?? null,
    postulante: p.postulante?.nombre ?? p.postulante?.email ?? null,
    asignaciones: p.asignaciones ?? [],
    evaluaciones: p.evaluaciones ?? [],
  }));

  const evaluadores: EvaluadorSimple[] = ((rawEvaluadores ?? []) as {
    id: string; nombre: string; email: string; rol: string;
  }[]).map(e => ({
    id: e.id,
    nombre: e.nombre ?? e.email,
    email: e.email,
    rol: e.rol,
  }));

  return (
    <div className="space-y-6 pb-20">
      <header>
        <p className="brand-eyebrow text-brand-primary">Admin</p>
        <h1 className="brand-display mt-1.5 text-[32px] leading-tight text-brand-primary md:text-[40px]">
          Proyectos
        </h1>
        <p className="mt-2 text-[14px] text-brand-ink-muted">
          Gestiona los proyectos postulados: asigna evaluadores y avanza el funnel de selección.
        </p>
      </header>

      <ProyectosPanel
        proyectos={proyectos}
        evaluadores={evaluadores}
        etapasEvaluacion={etapasEvaluacion}
        etapaEvalId={etapa?.id ?? null}
        etapaFutura={Boolean(etapa?.fecha_inicio && new Date(etapa.fecha_inicio).getTime() > ahora)}
        etapaNombre={(etapa as { nombre?: string } | null)?.nombre ?? null}
        evaluacionesEsperadas={convConfig?.nEvaluadoresPorProyecto ?? 2}
        estadoBadge={resolveEstadoBadge(convConfig?.estadosBadge)}
        transiciones={resolveTransiciones(convConfig?.transicionesEstado)}
      />
    </div>
  );
}
