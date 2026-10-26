import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { roleHomePath } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProyectosPanel } from "@/components/app/proyectos-panel";
import type { ProyectoPanelRow, EvaluadorSimple, EtapaEvaluacionSimple, EntregaPanelRow, ArchivoEntregaPanelRow, ProyectosPanelVista } from "@/components/app/proyectos-panel";
import { resolveEstadoBadge, resolveTransiciones, type EstadoBadgeConfig, type TransicionEstado } from "@/lib/estados";

export async function AdminProyectosContent({ vistaInicial }: { vistaInicial: ProyectosPanelVista }) {
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
      id, convocatoria_id, codigo_ciego, nombre_proyecto, estado_postulacion, created_at, enviada_at,
      categorias ( nombre, numero ),
      postulante:postulante_id ( nombre, email ),
      asignaciones ( evaluador_id, etapa_id, estado ),
      evaluaciones ( etapa_id, puntaje_ponderado, estado )
    `)
    .order("created_at", { ascending: false });

  type RawEntrega = {
    id: string;
    proyecto_id: string;
    etapa_id: number;
    estado: string | null;
    enviada_at: string | null;
    video_url: string | null;
    contexto: string | null;
  };
  type RawArchivoEntrega = {
    id: string;
    proyecto_id: string;
    entrega_id: string | null;
    nombre: string;
    url: string;
    tamano: number | null;
  };

  // Solo el panel admin puede leer estas entregas y firmar sus archivos.
  const proyectoIds = ((rawProyectos ?? []) as { id: string }[]).map((p) => p.id);
  const admin = createAdminClient();
  let rawEntregas: RawEntrega[] = [];
  let rawArchivos: RawArchivoEntrega[] = [];
  if (proyectoIds.length > 0) {
    const [{ data: entregasData }, { data: archivosData }] = await Promise.all([
      admin.from("entregas")
        .select("id, proyecto_id, etapa_id, estado, enviada_at, video_url, contexto")
        .in("proyecto_id", proyectoIds),
      admin.from("archivos")
        .select("id, proyecto_id, entrega_id, nombre, url, tamano")
        .in("proyecto_id", proyectoIds)
        .not("entrega_id", "is", null),
    ]);
    rawEntregas = (entregasData ?? []) as RawEntrega[];
    rawArchivos = (archivosData ?? []) as RawArchivoEntrega[];
  }

  const urlsFirmadas: Record<string, string> = {};
  for (let inicio = 0; inicio < rawArchivos.length; inicio += 100) {
    const grupo = rawArchivos.slice(inicio, inicio + 100);
    const { data: firmadas } = await admin.storage
      .from("archivos")
      .createSignedUrls(grupo.map((archivo) => archivo.url), 60 * 60);
    (firmadas ?? []).forEach((archivo) => {
      if (archivo.path && archivo.signedUrl) urlsFirmadas[archivo.path] = archivo.signedUrl;
    });
  }

  const archivosPorEntrega = new Map<string, ArchivoEntregaPanelRow[]>();
  rawArchivos.forEach((archivo) => {
    if (!archivo.entrega_id) return;
    const archivos = archivosPorEntrega.get(archivo.entrega_id) ?? [];
    archivos.push({
      id: archivo.id,
      nombre: archivo.nombre,
      tamano: archivo.tamano,
      url: urlsFirmadas[archivo.url] ?? "",
    });
    archivosPorEntrega.set(archivo.entrega_id, archivos);
  });
  const entregasPorProyecto = new Map<string, EntregaPanelRow[]>();
  rawEntregas.forEach((entrega) => {
    const entregas = entregasPorProyecto.get(entrega.proyecto_id) ?? [];
    entregas.push({
      etapa_id: entrega.etapa_id,
      estado: entrega.estado,
      enviada_at: entrega.enviada_at,
      video_url: entrega.video_url,
      contexto: entrega.contexto,
      archivos: archivosPorEntrega.get(entrega.id) ?? [],
    });
    entregasPorProyecto.set(entrega.proyecto_id, entregas);
  });

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
    .in("tipo", ["preseleccion", "bootcamp", "semifinal", "demo_day"])
    .order("fecha_inicio", { ascending: true });

  type RawEtapa = {
    id: number;
    nombre: string | null;
    tipo: string;
    fecha_inicio: string | null;
    fecha_fin: string | null;
    convocatoria_id: number;
  };

  const ahora = new Date().getTime();
  const etapasEvaluacion: EtapaEvaluacionSimple[] = ((rawEtapas ?? []) as RawEtapa[]).map((item) => ({
    id: item.id,
    nombre: item.nombre ?? (item.tipo === "demo_day" ? "Demo Day" : item.tipo === "bootcamp" || item.tipo === "semifinal" ? "Bootcamp y mentorías" : "Preselección"),
    tipo: item.tipo,
    fecha_inicio: item.fecha_inicio,
    fecha_fin: item.fecha_fin,
    convocatoria_id: item.convocatoria_id,
    futura: Boolean(item.fecha_inicio && new Date(item.fecha_inicio).getTime() > ahora),
  }));

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
    convocatoria_id: number;
    categorias: { nombre: string; numero: number } | null;
    postulante: { nombre: string; email: string } | null;
    asignaciones: { evaluador_id: string; etapa_id: number; estado: string | null }[] | null;
    evaluaciones: { etapa_id: number | null; puntaje_ponderado: number | null; estado: string }[] | null;
  };

  const proyectos: ProyectoPanelRow[] = ((rawProyectos ?? []) as unknown as RawProy[]).map(p => ({
    id: p.id,
    convocatoria_id: p.convocatoria_id,
    categoria_numero: p.categorias?.numero ?? null,
    codigo_ciego: p.codigo_ciego,
    nombre_proyecto: p.nombre_proyecto,
    estado_postulacion: p.estado_postulacion,
    created_at: p.created_at,
    enviada_at: p.enviada_at,
    categoria: p.categorias?.nombre ?? null,
    postulante: p.postulante?.nombre ?? p.postulante?.email ?? null,
    asignaciones: p.asignaciones ?? [],
    evaluaciones: p.evaluaciones ?? [],
    entregas: entregasPorProyecto.get(p.id) ?? [],
  }));

  const evaluadores: EvaluadorSimple[] = ((rawEvaluadores ?? []) as {
    id: string; nombre: string; email: string; rol: string;
  }[]).map(e => ({
    id: e.id,
    nombre: e.nombre ?? e.email,
    email: e.email,
    rol: e.rol,
  }));

  const titulo = vistaInicial === "postulaciones" ? "Postulaciones" : vistaInicial === "rondas" ? "Rondas y evaluaciones" : "Entregas";
  const descripcion = vistaInicial === "postulaciones"
    ? "Busca y ordena las postulaciones por estado, vertical y convocatoria."
    : vistaInicial === "rondas"
    ? "Revisa el avance de cada ronda, el ranking y las asignaciones de evaluadores."
    : "Consulta las entregas por ronda, incluidos archivos y videos pitch públicos.";

  return (
    <div className="space-y-6 pb-20">
      <header>
        <p className="brand-eyebrow text-brand-primary">Admin</p>
        <h1 className="brand-display mt-1.5 text-[32px] leading-tight text-brand-primary md:text-[40px]">
          {titulo}
        </h1>
        <p className="mt-2 text-[14px] text-brand-ink-muted">
          {descripcion}
        </p>
      </header>

      <ProyectosPanel
        vistaInicial={vistaInicial}
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
