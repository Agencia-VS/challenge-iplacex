import type { Metadata } from "next";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { roleHomePath } from "@/lib/roles";
import { ProyectosPanel } from "@/components/app/proyectos-panel";
import type { ProyectoPanelRow, EvaluadorSimple } from "@/components/app/proyectos-panel";
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
      asignaciones ( evaluador_id, etapa_id )
    `)
    .order("created_at", { ascending: false });

  // Evaluadores disponibles
  const { data: rawEvaluadores } = await supabase
    .from("usuarios")
    .select("id, nombre, email, rol")
    .in("rol", ["jurado", "comite_tecnico"])
    .order("nombre");

  // Etapa de evaluación: activa hoy, o la próxima si todavía no comenzó
  // Así el admin puede asignar evaluadores antes de que arranque la ronda
  const { data: etapa } = await supabase
    .from("etapas")
    .select("id, nombre, fecha_inicio, convocatoria_id")
    .in("tipo", ["preseleccion", "demo_day"])
    .gte("fecha_fin", new Date().toISOString())   // no ha terminado aún
    .order("fecha_inicio", { ascending: true })   // la más próxima primero
    .limit(1)
    .maybeSingle();

  // Config de la convocatoria activa (para estados y transiciones personalizadas)
  type ConvocatoriaConfig = {
    estadosBadge?: Record<string, EstadoBadgeConfig> | null;
    transicionesEstado?: Record<string, TransicionEstado[]> | null;
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
    asignaciones: { evaluador_id: string; etapa_id: number }[] | null;
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
  }));

  const evaluadores: EvaluadorSimple[] = ((rawEvaluadores ?? []) as {
    id: string; nombre: string; email: string; rol: string;
  }[]).map(e => ({
    id: e.id,
    nombre: e.nombre ?? e.email,
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
        etapaEvalId={etapa?.id ?? null}
        etapaFutura={etapa ? new Date(etapa.fecha_inicio as string) > new Date() : false}
        etapaNombre={(etapa as { nombre?: string } | null)?.nombre ?? null}
        estadoBadge={resolveEstadoBadge(convConfig?.estadosBadge)}
        transiciones={resolveTransiciones(convConfig?.transicionesEstado)}
      />
    </div>
  );
}
