import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { EvaluacionForm } from "@/components/app/evaluacion-form";
import type {
  CategoriaSlug,
  CriterioSlug,
  EtapaEvaluacion,
  NivelDesempeno,
} from "@/lib/rubrica";
import { Card } from "@/components/ui/card";
import { firmarArchivos } from "@/app/actions/entregas";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EvaluarProyectoPage({ params }: PageProps) {
  const { id } = await params;

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

  // Solo evaluadores
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single();
  if (!usuario || (usuario.rol !== "jurado" && usuario.rol !== "comite_tecnico")) {
    redirect("/app");
  }

  // Cargar proyecto (datos ciegos: NO nombre del equipo ni postulante)
  const { data: proyecto } = await supabase
    .from("proyectos")
    .select("id, codigo_ciego, video_id_youtube, video_url, categorias ( slug )")
    .eq("id", id)
    .single();
  if (!proyecto) notFound();

  // Buscar la asignacion de este evaluador para este proyecto
  const { data: asignacion } = await supabase
    .from("asignaciones")
    .select("id, etapa_id, etapas ( tipo )")
    .eq("proyecto_id", id)
    .eq("evaluador_id", user.id)
    .maybeSingle();
  if (!asignacion) redirect("/app/evaluacion");

  // Los criterios y sus ponderaciones salen de la rúbrica (src/lib/rubrica.ts),
  // no de la base: es la traducción directa del anexo de Bases.
  const categoria =
    ((proyecto.categorias as unknown as { slug: string } | null)?.slug as CategoriaSlug) ??
    "idea-temprana";

  // La preselección no tiene presentación oral: el pitch no se califica y el
  // puntaje se normaliza. El bootcamp representa la semifinal operativa y el
  // Demo Day corresponde a la evaluación final.
  const tipoEtapa = (asignacion.etapas as unknown as { tipo: string } | null)?.tipo;
  const etapaEvaluacion: EtapaEvaluacion =
    tipoEtapa === "preseleccion" ? "preseleccion"
    : tipoEtapa === "semifinal" || tipoEtapa === "bootcamp" ? "semifinal"
    : "final";

  const { data: prevEval } = await supabase
    .from("evaluaciones")
    .select("puntajes, comentario_fortalezas, comentario_mejoras")
    .eq("asignacion_id", asignacion.id)
    .maybeSingle();

  // Entrega del proyecto para la etapa que se evalúa (Video Pitch, Pitch 60s, etc.)
  const { data: entrega } = asignacion.etapa_id
    ? await supabase
        .from("entregas")
        .select("id, video_url, contexto")
        .eq("proyecto_id", id)
        .eq("etapa_id", asignacion.etapa_id)
        .maybeSingle()
    : { data: null };

  let entregaArchivos: { id: string; nombre: string; url: string }[] = [];
  if (entrega) {
    const { data: archivos } = await supabase
      .from("archivos")
      .select("id, nombre, url")
      .eq("entrega_id", entrega.id);
    const rows = (archivos ?? []) as { id: string; nombre: string; url: string }[];
    const firmadas = await firmarArchivos(rows.map((r) => r.url));
    entregaArchivos = rows.map((r) => ({ id: r.id, nombre: r.nombre, url: firmadas[r.url] ?? "" }));
  }

  const tieneEntrega = !!(entrega && (entrega.video_url || entrega.contexto || entregaArchivos.length));

  return (
    <div className="space-y-6 pb-20">
      <header>
        <p className="brand-eyebrow text-brand-accent">Evaluación 1</p>
        <h1 className="brand-display mt-1.5 text-[32px] leading-tight text-brand-primary md:text-[40px]">
          Evaluar proyecto
        </h1>
        <p className="mt-2 text-[14px] text-brand-ink-soft">
          Evaluación ciega · solo verás el código del proyecto, no el equipo detrás.
        </p>
      </header>

      {tieneEntrega && (
        <Card className="space-y-3 p-6">
          <p className="brand-eyebrow text-brand-secondary">Entrega de esta etapa</p>
          {entrega?.video_url && (
            <a
              href={entrega.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-[13px] font-medium text-brand-accent underline-offset-2 hover:underline"
            >
              ▶ Ver video de la entrega →
            </a>
          )}
          {entrega?.contexto && (
            <p className="whitespace-pre-line text-[13px] text-brand-ink-soft">{entrega.contexto}</p>
          )}
          {entregaArchivos.length > 0 && (
            <ul className="space-y-1.5">
              {entregaArchivos.map((a) => (
                <li key={a.id}>
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[13px] text-brand-ink hover:text-brand-accent hover:underline"
                  >
                    📎 {a.nombre}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <EvaluacionForm
        proyectoId={proyecto.id}
        asignacionId={asignacion.id}
        etapaId={asignacion.etapa_id}
        codigoCiego={proyecto.codigo_ciego}
        videoIdYoutube={proyecto.video_id_youtube}
        videoUrl={(proyecto as { video_url?: string | null }).video_url ?? null}
        categoria={categoria}
        etapa={etapaEvaluacion}
        initial={{
          niveles:
            (prevEval?.puntajes as Partial<Record<CriterioSlug, NivelDesempeno>> | null) ?? undefined,
          fortalezas: prevEval?.comentario_fortalezas ?? "",
          mejoras: prevEval?.comentario_mejoras ?? "",
        }}
      />
    </div>
  );
}
