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
    nombre_proyecto: string | null;
    resumen_ejecutivo: string | null;
    problema: string | null;
    segmento_usuarios: string | null;
    solucion: string | null;
    ods: number[] | null;
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

type EntregaAsignada = {
  id: string;
  proyecto_id: string;
  etapa_id: number;
  estado: string | null;
  enviada_at: string | null;
  video_url: string | null;
  contexto: string | null;
};

type ArchivoAsignado = {
  id: string;
  entrega_id: string;
  nombre: string;
  url: string;
  tamano: number | null;
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
      proyecto:proyecto_id (
        id, codigo_ciego, nombre_proyecto, resumen_ejecutivo, problema,
        segmento_usuarios, solucion, ods, categorias ( nombre, numero )
      ),
      etapa:etapa_id ( nombre )
    `)
    .eq("evaluador_id", user.id)
    .order("created_at", { ascending: false });

  const asignaciones = (asignacionesRaw ?? []) as unknown as Asignacion[];
  const proyectoIds = asignaciones.map(a => a.proyecto?.id).filter((id): id is string => !!id);
  const etapaIds = [...new Set(asignaciones.map((a) => a.etapa_id))];

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

  const { data: entregasRaw } = proyectoIds.length && etapaIds.length
    ? await supabase
        .from("entregas")
        .select("id, proyecto_id, etapa_id, estado, enviada_at, video_url, contexto")
        .in("proyecto_id", proyectoIds)
        .in("etapa_id", etapaIds)
    : { data: [] as EntregaAsignada[] };
  const entregas = (entregasRaw ?? []) as EntregaAsignada[];
  const entregaIds = entregas.map((entrega) => entrega.id);

  const { data: archivosRaw } = entregaIds.length
    ? await supabase
        .from("archivos")
        .select("id, entrega_id, nombre, url, tamano")
        .in("entrega_id", entregaIds)
    : { data: [] as ArchivoAsignado[] };
  const archivos = (archivosRaw ?? []) as ArchivoAsignado[];

  const urlsFirmadas: Record<string, string> = {};
  for (let inicio = 0; inicio < archivos.length; inicio += 100) {
    const grupo = archivos.slice(inicio, inicio + 100);
    const { data: firmadas } = await supabase.storage
      .from("archivos")
      .createSignedUrls(grupo.map((archivo) => archivo.url), 60 * 60);
    (firmadas ?? []).forEach((archivo) => {
      if (archivo.path && archivo.signedUrl) urlsFirmadas[archivo.path] = archivo.signedUrl;
    });
  }

  const archivosPorEntrega = new Map<string, { nombre: string; tamano: number | null; url: string }[]>();
  archivos.forEach((archivo) => {
    const grupo = archivosPorEntrega.get(archivo.entrega_id) ?? [];
    grupo.push({ nombre: archivo.nombre, tamano: archivo.tamano, url: urlsFirmadas[archivo.url] ?? "" });
    archivosPorEntrega.set(archivo.entrega_id, grupo);
  });
  const entregaPorAsignacion = new Map<string, EntregaAsignada>();
  entregas.forEach((entrega) => {
    entregaPorAsignacion.set(`${entrega.proyecto_id}:${entrega.etapa_id}`, entrega);
  });

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
        <EvaluadorTabla filas={asignaciones.map((a) => {
          const entrega = entregaPorAsignacion.get(`${a.proyecto?.id ?? ""}:${a.etapa_id}`);
          const entregaExport = entrega ? {
            estado: entrega.estado,
            fecha: entrega.enviada_at,
            videoUrl: entrega.video_url,
            contexto: entrega.contexto,
            archivos: archivosPorEntrega.get(entrega.id) ?? [],
          } : null;

          return {
            id: a.id,
            codigo: a.proyecto?.codigo_ciego ?? "—",
            nombre: a.proyecto?.nombre_proyecto ?? null,
            categoria: a.proyecto?.categorias?.nombre ?? null,
            categoriaNumero: a.proyecto?.categorias?.numero ?? null,
            resumen: a.proyecto?.resumen_ejecutivo ?? null,
            problema: a.proyecto?.problema ?? null,
            segmento: a.proyecto?.segmento_usuarios ?? null,
            solucion: a.proyecto?.solucion ?? null,
            ods: a.proyecto?.ods ?? [],
            etapaId: a.etapa_id,
            etapa: a.etapa?.nombre ?? "Etapa sin nombre",
            estado: evalMap.get(a.id)?.estado ?? "pendiente",
            puntaje: evalMap.get(a.id)?.puntaje_ponderado ?? null,
            fecha: evalMap.get(a.id)?.finalizada_at ?? evalMap.get(a.id)?.updated_at,
            entrega: entregaExport,
            href: a.proyecto ? `/app/evaluacion/proyectos/${a.proyecto.id}?asignacion=${encodeURIComponent(a.id)}` : null,
          };
        })} />
      )}
    </div>
  );
}
