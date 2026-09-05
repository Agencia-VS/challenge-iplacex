"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { toggleAsignacion, cambiarEstadoPostulacion } from "@/app/actions/asignaciones";
import {
  ESTADO_BADGE_DEFAULT,
  TRANSICIONES_DEFAULT,
  type EstadoBadgeConfig,
  type TransicionEstado,
} from "@/lib/estados";

export interface EvaluadorSimple {
  id: string;
  nombre: string;
  rol: string;
}

export interface AsignacionSimple {
  evaluador_id: string;
  etapa_id: number;
}

export interface ProyectoPanelRow {
  id: string;
  codigo_ciego: string;
  nombre_proyecto: string | null;
  estado_postulacion: string;
  created_at: string;
  enviada_at: string | null;
  categoria: string | null;
  postulante: string | null;
  asignaciones: AsignacionSimple[];
}

export function ProyectosPanel({
  proyectos,
  evaluadores,
  etapaEvalId,
  etapaFutura = false,
  etapaNombre = null,
  estadoBadge = ESTADO_BADGE_DEFAULT,
  transiciones = TRANSICIONES_DEFAULT,
}: {
  proyectos: ProyectoPanelRow[];
  evaluadores: EvaluadorSimple[];
  etapaEvalId: number | null;
  etapaFutura?: boolean;
  etapaNombre?: string | null;
  estadoBadge?: Record<string, EstadoBadgeConfig>;
  transiciones?: Record<string, TransicionEstado[]>;
}) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle(proyectoId: string, evaluadorId: string) {
    if (!etapaEvalId) return;
    const key = `${proyectoId}-${evaluadorId}`;
    setLoadingKey(key);
    setError(null);
    const res = await toggleAsignacion(proyectoId, evaluadorId, etapaEvalId);
    setLoadingKey(null);
    if (!res.ok) setError(res.error);
    else router.refresh();
  }

  async function handleEstado(proyectoId: string, estado: string) {
    setLoadingKey(`estado-${proyectoId}`);
    setError(null);
    const res = await cambiarEstadoPostulacion(proyectoId, estado);
    setLoadingKey(null);
    if (!res.ok) setError(res.error);
    else router.refresh();
  }

  if (proyectos.length === 0) {
    return (
      <Card variant="ghost" className="flex flex-col items-center gap-4 py-20 text-center">
        <span className="text-[56px]">📭</span>
        <div>
          <p className="text-[17px] font-semibold text-brand-primary">0 postulaciones</p>
          <p className="mt-1 text-[13px] text-brand-ink-muted">
            Aún no hay proyectos registrados en esta convocatoria.
          </p>
        </div>
      </Card>
    );
  }

  const enviados = proyectos.filter(p => p.estado_postulacion !== "borrador").length;

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-[var(--r-md)] border border-st-danger/30 bg-st-danger/5 px-4 py-3 text-[13px] text-st-danger">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Badge tone="secondary">{enviados} enviados</Badge>
        <Badge tone="neutral">{proyectos.length} total</Badge>
        {etapaEvalId && etapaFutura && (
          <Badge tone="accent">Asignando para: {etapaNombre ?? "Próxima evaluación"}</Badge>
        )}
        {etapaEvalId && !etapaFutura && (
          <Badge tone="secondary">{etapaNombre ?? "Evaluación activa"}</Badge>
        )}
        {!etapaEvalId && (
          <Badge tone="warning">Sin etapa de evaluación configurada</Badge>
        )}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-brand-line text-[11px] uppercase tracking-wider text-brand-ink-muted">
                <th className="px-5 py-3 font-semibold">Código</th>
                <th className="px-5 py-3 font-semibold">Proyecto</th>
                <th className="px-5 py-3 font-semibold">Postulante</th>
                <th className="px-5 py-3 font-semibold">Categoría</th>
                <th className="px-5 py-3 font-semibold">Estado</th>
                <th className="px-5 py-3 font-semibold">Evaluadores</th>
                <th className="px-5 py-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {proyectos.map((p) => {
                const conf = estadoBadge[p.estado_postulacion] ?? { label: p.estado_postulacion, tone: "neutral" as const };
                const asignados = new Set(p.asignaciones.map(a => a.evaluador_id));
                const isExpanded = expandedId === p.id;
                const siguientes = transiciones[p.estado_postulacion] ?? [];

                return (
                  <>
                    <tr
                      key={p.id}
                      className={cn(
                        "border-b border-brand-line/60 transition-colors",
                        isExpanded ? "bg-brand-surface-soft" : "hover:bg-brand-surface-soft/50",
                      )}
                    >
                      <td className="px-5 py-3 font-[family-name:var(--font-mono)] text-[12px] font-bold text-brand-secondary">
                        {p.codigo_ciego}
                      </td>
                      <td className="px-5 py-3 font-semibold text-brand-ink">
                        {p.nombre_proyecto ?? (
                          <span className="italic text-brand-ink-muted">Sin nombre</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-brand-ink-soft">
                        {p.postulante ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-brand-ink-soft">
                        {p.categoria ?? "—"}
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={conf.tone}>{conf.label}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-[family-name:var(--font-mono)] text-[12px] text-brand-ink-muted">
                          {asignados.size} / {evaluadores.length}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : p.id)}
                          className="text-[12px] font-medium text-brand-accent hover:underline"
                        >
                          {isExpanded ? "Cerrar ▲" : "Gestionar ▼"}
                        </button>
                      </td>
                    </tr>

                    {/* Panel expandido */}
                    {isExpanded && (
                      <tr key={`${p.id}-expanded`} className="bg-brand-surface-soft">
                        <td colSpan={7} className="px-6 py-5">
                          <div className="grid gap-6 md:grid-cols-2">
                            {/* Asignar evaluadores */}
                            <div>
                              <p className="brand-eyebrow mb-3 text-brand-ink-soft">
                                Asignar evaluadores
                                {etapaFutura && etapaEvalId && (
                                  <span className="ml-2 text-brand-accent">(ronda aún no iniciada)</span>
                                )}
                              </p>
                              {evaluadores.length === 0 ? (
                                <p className="text-[12px] text-brand-ink-muted">
                                  No hay evaluadores registrados.{" "}
                                  <a href="/app/admin/evaluadores" className="text-brand-accent underline">
                                    Crear evaluadores →
                                  </a>
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {evaluadores.map((ev) => {
                                    const assigned = asignados.has(ev.id);
                                    const key = `${p.id}-${ev.id}`;
                                    const isLoading = loadingKey === key;
                                    return (
                                      <label
                                        key={ev.id}
                                        className={cn(
                                          "flex cursor-pointer items-center gap-3 rounded-[var(--r-sm)] border px-3.5 py-2.5 transition-all",
                                          assigned
                                            ? "border-brand-secondary bg-brand-secondary/5"
                                            : "border-brand-line bg-brand-surface-raised hover:border-brand-secondary/50",
                                          isLoading && "cursor-not-allowed opacity-50",
                                        )}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={assigned}
                                          disabled={isLoading}
                                          onChange={() => handleToggle(p.id, ev.id)}
                                          className="accent-brand-secondary"
                                        />
                                        <span className="flex-1 text-[13px] text-brand-ink">
                                          {ev.nombre}
                                        </span>
                                        <Badge tone={ev.rol === "comite_tecnico" ? "secondary" : "neutral"}>
                                          {ev.rol === "comite_tecnico" ? "Comité" : "Jurado"}
                                        </Badge>
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Cambiar estado */}
                            <div>
                              <p className="brand-eyebrow mb-3 text-brand-ink-soft">
                                Avanzar en el funnel
                              </p>
                              {siguientes.length === 0 ? (
                                <p className="text-[12px] text-brand-ink-muted">
                                  {p.estado_postulacion === "borrador"
                                    ? "El postulante aún no ha enviado la postulación."
                                    : "No hay acciones disponibles para este estado."}
                                </p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {siguientes.map((s) => (
                                    <Button
                                      key={s.estado}
                                      variant={s.danger ? "ghost" : "secondary"}
                                      size="sm"
                                      disabled={loadingKey === `estado-${p.id}`}
                                      onClick={() => handleEstado(p.id, s.estado)}
                                      className={s.danger ? "border-st-danger/40 text-st-danger hover:bg-st-danger/5" : ""}
                                    >
                                      {loadingKey === `estado-${p.id}` ? "…" : s.label}
                                    </Button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
