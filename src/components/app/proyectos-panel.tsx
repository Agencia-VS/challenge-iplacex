"use client";

import { Fragment, useState } from "react";
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
  email: string;
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
  const [success, setSuccess] = useState<string | null>(null);
  const [assignmentOverrides, setAssignmentOverrides] = useState<Record<string, boolean>>({});

  async function handleToggle(proyectoId: string, evaluadorId: string) {
    if (!etapaEvalId) return;
    const proyecto = proyectos.find((item) => item.id === proyectoId);
    const baseAssigned = proyecto?.asignaciones.some(
      (assignment) =>
        assignment.etapa_id === etapaEvalId && assignment.evaluador_id === evaluadorId,
    ) ?? false;
    const key = [proyectoId, evaluadorId, etapaEvalId].join("-");
    const currentAssigned = assignmentOverrides[key] ?? baseAssigned;

    setLoadingKey(key);
    setError(null);
    setSuccess(null);
    setAssignmentOverrides((prev) => ({ ...prev, [key]: !currentAssigned }));

    const res = await toggleAsignacion(proyectoId, evaluadorId, etapaEvalId);
    setLoadingKey(null);
    if (!res.ok) {
      setAssignmentOverrides((prev) => ({ ...prev, [key]: currentAssigned }));
      setError(res.error);
      return;
    }

    const evaluador = evaluadores.find((item) => item.id === evaluadorId);
    const accion = currentAssigned ? "Se quitó" : "Se asignó";
    const ronda = etapaNombre ? " para " + etapaNombre : "";
    setSuccess(accion + " " + (evaluador?.nombre ?? "el evaluador") + ronda + ".");
    router.refresh();
  }
  async function handleEstado(proyectoId: string, estado: string) {
    setLoadingKey(`estado-${proyectoId}`);
    setError(null);
    setSuccess(null);
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
        <div role="alert" className="rounded-[var(--r-md)] border border-st-danger/30 bg-st-danger/5 px-4 py-3 text-[13px] text-st-danger">
          {error}
        </div>
      )}
      {success && (
        <div role="status" className="rounded-[var(--r-md)] border border-st-success/30 bg-st-success/5 px-4 py-3 text-[13px] text-st-success">
          ✓ {success}
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
                const asignacionesEtapa = etapaEvalId === null
                  ? []
                  : p.asignaciones.filter((a) => a.etapa_id === etapaEvalId);
                const asignados = new Set(
                  evaluadores
                    .filter((ev) => {
                      const baseAssigned = asignacionesEtapa.some((a) => a.evaluador_id === ev.id);
                      if (etapaEvalId === null) return false;
                      const key = [p.id, ev.id, etapaEvalId].join("-");
                      return assignmentOverrides[key] ?? baseAssigned;
                    })
                    .map((ev) => ev.id),
                );
                const asignadosEvaluadores = evaluadores
                  .filter((ev) => asignados.has(ev.id));
                const isExpanded = expandedId === p.id;
                const siguientes = transiciones[p.estado_postulacion] ?? [];

                return (
                  <Fragment key={p.id}>
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
                        {asignadosEvaluadores.length === 0 ? (
                          <span className="text-[12px] text-brand-ink-muted">Pendientes</span>
                        ) : (
                          <div className="max-w-[220px] space-y-1">
                            {asignadosEvaluadores.slice(0, 2).map((ev) => (
                              <span key={ev.id} className="block truncate text-[12px] text-brand-ink">
                                {ev.nombre}
                              </span>
                            ))}
                            {asignadosEvaluadores.length > 2 && (
                              <span className="block text-[11px] text-brand-ink-muted">
                                +{asignadosEvaluadores.length - 2} más
                              </span>
                            )}
                          </div>
                        )}
                        <p className="mt-1 font-[family-name:var(--font-mono)] text-[11px] text-brand-ink-muted">
                          {asignados.size} / {evaluadores.length} asignados
                        </p>
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
                              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="brand-eyebrow text-brand-ink-soft">Asignar evaluadores</p>
                                  <p className="mt-1 text-[12px] text-brand-ink-muted">
                                    {etapaNombre ? "Ronda: " + etapaNombre : "Selecciona los evaluadores para la ronda actual."}
                                    {etapaFutura && etapaEvalId && (
                                      <span className="ml-2 text-brand-accent">(aún no iniciada)</span>
                                    )}
                                  </p>
                                </div>
                                <Badge tone={asignados.size === evaluadores.length && evaluadores.length > 0 ? "success" : "neutral"}
                                >
                                  {asignados.size} / {evaluadores.length} asignados
                                </Badge>
                              </div>
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
                                    const key = etapaEvalId === null ? "" : [p.id, ev.id, etapaEvalId].join("-");
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
                                          disabled={isLoading || etapaEvalId === null}
                                          onChange={() => handleToggle(p.id, ev.id)}
                                          aria-label={(assigned ? "Quitar asignación de " : "Asignar a ") + ev.nombre}
                                          className="accent-brand-secondary"
                                        />
                                        <span className="min-w-0 flex-1">
                                          <span className="block truncate text-[13px] text-brand-ink">
                                            {ev.nombre}
                                          </span>
                                          <span className="block truncate text-[11px] text-brand-ink-muted">
                                            {ev.email}
                                          </span>
                                          <span className="mt-0.5 block text-[10px] uppercase tracking-wide text-brand-ink-muted">
                                            {ev.rol === "comite_tecnico" ? "Comité técnico" : "Jurado"}
                                          </span>
                                        </span>
                                        <Badge tone={assigned ? "success" : "neutral"}
                                        >
                                          {assigned ? "Asignado" : "Disponible"}
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
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
