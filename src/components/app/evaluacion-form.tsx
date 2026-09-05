"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { guardarEvaluacion } from "@/app/actions/postulaciones";
import {
  NIVELES,
  PUNTAJE_APROBACION,
  calcularPuntaje,
  criteriosDe,
  descriptor,
  estaCompleta,
  type CategoriaSlug,
  type Criterio,
  type CriterioSlug,
  type EtapaEvaluacion,
  type NivelDesempeno,
} from "@/lib/rubrica";

export interface EvaluacionFormProps {
  proyectoId: string;
  asignacionId: string;
  etapaId: number;
  codigoCiego: string;
  videoIdYoutube: string | null;
  videoUrl?: string | null;
  /** Decide qué descriptores de desempeño se muestran. */
  categoria: CategoriaSlug;
  /** La preselección no evalúa el pitch y normaliza el puntaje. */
  etapa: EtapaEvaluacion;
  initial?: {
    niveles?: Partial<Record<CriterioSlug, NivelDesempeno>>;
    fortalezas?: string;
    mejoras?: string;
  };
}

function getDriveEmbedUrl(url: string): string | null {
  // https://drive.google.com/file/d/FILE_ID/view  →  /preview
  const m = url.match(/\/file\/d\/([^/]+)/);
  return m ? `https://drive.google.com/file/d/${m[1]}/preview` : null;
}

export function EvaluacionForm({
  proyectoId,
  asignacionId,
  etapaId,
  codigoCiego,
  videoIdYoutube,
  videoUrl,
  categoria,
  etapa,
  initial = {},
}: EvaluacionFormProps) {
  const router = useRouter();
  const criterios = useMemo(() => criteriosDe(etapa), [etapa]);

  // Sin nivel por defecto: el anexo pide asignar el que describe el desempeño
  // observado, y precargar uno sesga al evaluador hacia ese valor.
  const [niveles, setNiveles] = useState<Partial<Record<CriterioSlug, NivelDesempeno>>>(
    () => initial.niveles ?? {},
  );
  const [fortalezas, setFortalezas] = useState(initial.fortalezas ?? "");
  const [mejoras, setMejoras] = useState(initial.mejoras ?? "");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const puntajeFinal = useMemo(() => calcularPuntaje(niveles, etapa), [niveles, etapa]);
  const completa = useMemo(() => estaCompleta(niveles, etapa), [niveles, etapa]);
  const faltan = criterios.filter((c) => niveles[c.slug] == null).length;

  async function submit(finalizar: boolean) {
    setLoading(true);
    setFeedback(null);
    const res = await guardarEvaluacion({
      proyectoId,
      asignacionId,
      etapaId,
      niveles,
      etapa,
      fortalezas,
      mejoras,
      finalizar,
    });
    setLoading(false);
    if (!res.ok) {
      setFeedback({ kind: "err", msg: res.error });
      return;
    }
    setFeedback({
      kind: "ok",
      msg: finalizar ? "✅ Evaluación enviada" : "💾 Progreso guardado",
    });
    if (finalizar) setTimeout(() => router.push("/app/evaluador"), 1200);
    else router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr,360px]">
      {/* ─── Columna principal ─────────────────────────────────────────── */}
      <div className="space-y-5">
        {/* Video */}
        <Card className="overflow-hidden p-0">
          <div className="aspect-video w-full bg-brand-ink">
            {videoIdYoutube ? (
              <iframe
                src={`https://www.youtube.com/embed/${videoIdYoutube}`}
                className="h-full w-full"
                title="Video pitch"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : videoUrl && videoUrl.includes("drive.google.com") ? (
              <iframe
                src={getDriveEmbedUrl(videoUrl) ?? videoUrl}
                className="h-full w-full"
                title="Video pitch"
                allow="autoplay"
                allowFullScreen
              />
            ) : videoUrl ? (
              <div className="grid h-full place-items-center gap-3">
                <span className="text-[13px] text-white/60">Video en enlace externo</span>
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-[var(--r-sm)] bg-brand-accent px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-accent/90"
                >
                  Ver video →
                </a>
              </div>
            ) : (
              <div className="grid h-full place-items-center text-[13px] text-white/60">
                Sin video adjunto
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-brand-line px-6 py-4">
            <div>
              <p className="brand-eyebrow text-brand-ink-muted">Proyecto en ciego</p>
              <p className="brand-display mt-0.5 text-[20px] text-brand-primary">{codigoCiego}</p>
            </div>
            <Badge tone="warning">Evaluación 1</Badge>
          </div>
        </Card>

        {/* Criterios */}
        <Card>
          <p className="brand-eyebrow">Paso 1</p>
          <h2 className="brand-display mt-1 text-[22px] text-brand-primary">Evaluación por criterios</h2>
          <p className="mt-1 text-[13px] text-brand-ink-muted">
            Asigna el nivel que mejor describa el desempeño observado en su conjunto. Si el proyecto
            se sitúa entre dos niveles, asigna el inferior y fundaméntalo en los comentarios. Evalúa
            cada criterio de forma independiente.
          </p>

          <div className="mt-5 space-y-5">
            {criterios.map((c) => (
              <CriterioNiveles
                key={c.slug}
                criterio={c}
                categoria={categoria}
                value={niveles[c.slug]}
                onChange={(v) => setNiveles((prev) => ({ ...prev, [c.slug]: v }))}
              />
            ))}
          </div>
        </Card>

        {/* Comentarios */}
        <Card>
          <p className="brand-eyebrow">Paso 2</p>
          <h2 className="brand-display mt-1 text-[22px] text-brand-primary">Comentarios cualitativos</h2>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="brand-eyebrow text-brand-ink-soft">Fortalezas</label>
              <textarea
                value={fortalezas}
                onChange={(e) => setFortalezas(e.target.value)}
                rows={5}
                maxLength={500}
                placeholder="¿Qué destaca del proyecto?"
                className="block w-full resize-y rounded-[var(--r-sm)] border border-brand-line bg-brand-surface-soft px-3.5 py-3 text-[14px] outline-none placeholder:text-brand-ink-muted focus:border-brand-accent focus:bg-brand-surface-raised focus:ring-2 focus:ring-brand-accent-soft"
              />
              <p className="text-right font-[family-name:var(--font-mono)] text-[11px] text-brand-ink-muted">
                {fortalezas.length} / 500
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="brand-eyebrow text-brand-ink-soft">Áreas de mejora</label>
              <textarea
                value={mejoras}
                onChange={(e) => setMejoras(e.target.value)}
                rows={5}
                maxLength={500}
                placeholder="¿Qué falta o se puede fortalecer?"
                className="block w-full resize-y rounded-[var(--r-sm)] border border-brand-line bg-brand-surface-soft px-3.5 py-3 text-[14px] outline-none placeholder:text-brand-ink-muted focus:border-brand-accent focus:bg-brand-surface-raised focus:ring-2 focus:ring-brand-accent-soft"
              />
              <p className="text-right font-[family-name:var(--font-mono)] text-[11px] text-brand-ink-muted">
                {mejoras.length} / 500
              </p>
            </div>
          </div>
        </Card>

        {feedback && (
          <div
            className={cn(
              "rounded-[var(--r-md)] px-4 py-3 text-[13px] font-medium",
              feedback.kind === "ok"
                ? "border border-st-success/30 bg-st-success/5 text-st-success"
                : "border border-st-danger/30 bg-st-danger/5 text-st-danger",
            )}
          >
            {feedback.msg}
          </div>
        )}
      </div>

      {/* ─── Sticky resumen ────────────────────────────────────────────── */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Card variant="primary" className="text-white">
          <p className="brand-eyebrow text-white/70">
            {etapa === "preseleccion" ? "Puntaje normalizado" : "Puntaje final ponderado"}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="brand-display text-[64px] leading-none">
              {completa ? puntajeFinal.toFixed(1) : "—"}
            </span>
            <span className="text-[14px] text-white/60">/ 100</span>
          </div>
          {/* La barra arranca en 25: es el mínimo posible, no el cero. */}
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full bg-brand-accent transition-all"
              style={{ width: `${completa ? Math.min(100, puntajeFinal) : 0}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-white/50">
            {completa
              ? puntajeFinal >= PUNTAJE_APROBACION
                ? `Sobre el mínimo de ${PUNTAJE_APROBACION} para ser finalista`
                : `Bajo el mínimo de ${PUNTAJE_APROBACION} para ser finalista`
              : `Faltan ${faltan} ${faltan === 1 ? "criterio" : "criterios"} por calificar`}
          </p>

          <div className="mt-5 space-y-2 border-t border-white/15 pt-4">
            {criterios.map((c) => {
              const n = niveles[c.slug];
              return (
                <div key={c.slug} className="flex items-center justify-between gap-3 text-[12px]">
                  <span className="text-white/70">{c.nombre}</span>
                  <span className="shrink-0 font-[family-name:var(--font-mono)] font-bold">
                    {n ? `N${n}` : "—"} <span className="text-white/40">×{c.peso}%</span>
                  </span>
                </div>
              );
            })}
            {etapa === "preseleccion" && (
              <p className="pt-1 text-[11px] leading-relaxed text-white/50">
                En preselección no hay presentación oral: corren cuatro criterios que suman 85, y el
                puntaje se normaliza a 100 para poder compararlo con las etapas siguientes.
              </p>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <Button
              type="button"
              variant="primary"
              onClick={() => submit(true)}
              disabled={loading || !completa}
            >
              {loading ? "Enviando…" : "✅ Enviar evaluación"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => submit(false)} disabled={loading} className="text-white border-white/20 hover:bg-white/5">
              💾 Guardar progreso
            </Button>
          </div>
        </Card>
      </aside>
    </div>
  );
}

function CriterioNiveles({
  criterio,
  categoria,
  value,
  onChange,
}: {
  criterio: Criterio;
  categoria: CategoriaSlug;
  value?: NivelDesempeno;
  onChange: (v: NivelDesempeno) => void;
}) {
  return (
    <fieldset className="rounded-[var(--r-md)] border border-brand-line bg-brand-surface-soft p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <legend className="text-[14px] font-semibold text-brand-primary">{criterio.nombre}</legend>
          <p className="mt-0.5 text-[12px] leading-relaxed text-brand-ink-soft">{criterio.evalua}</p>
        </div>
        <Badge tone="neutral">{criterio.peso}%</Badge>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {NIVELES.map((n) => {
          const activo = value === n.nivel;
          return (
            <button
              key={n.nivel}
              type="button"
              onClick={() => onChange(n.nivel)}
              aria-pressed={activo}
              className={cn(
                "rounded-[var(--r-sm)] border-2 p-3 text-left transition-all",
                activo
                  ? "border-brand-primary bg-brand-surface-raised shadow-[var(--sh-sm)]"
                  : "border-brand-line bg-brand-surface-raised hover:border-brand-primary-light",
              )}
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-[13px] font-semibold text-brand-primary">
                  {n.nivel} · {n.denominacion}
                </span>
                <span className="font-[family-name:var(--font-mono)] text-[11px] text-brand-ink-muted">
                  ×{n.factor.toFixed(2).replace(".", ",")}
                </span>
              </span>
              <span className="mt-1 block text-[11px] leading-relaxed text-brand-ink-soft">
                {descriptor(categoria, criterio.slug, n.nivel)}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
