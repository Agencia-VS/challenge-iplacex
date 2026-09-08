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

export interface EtapaEvaluacionSimple {
  id: number;
  nombre: string;
  tipo: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  convocatoria_id: number;
}

export interface AsignacionSimple {
  evaluador_id: string;
  etapa_id: number;
}

export interface EvaluacionSimple {
  etapa_id: number | null;
  puntaje_ponderado: number | null;
  estado: string;
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
  evaluaciones: EvaluacionSimple[];
}

type RankingRow = {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  estado: string;
  n: number;
  esperado: number;
  promedio: number | null;
  sigma: number;
  completa: boolean;
  elegible: boolean;
  puesto: number | null;
  pasa: boolean;
  exclusion: string;
};

function promedio(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function desviacion(values: number[]) {
  if (values.length < 2) return 0;
  const media = promedio(values) ?? 0;
  return Math.sqrt(
    values.reduce((sum, value) => sum + (value - media) ** 2, 0) / values.length,
  );
}

function csvCell(value: string | number | null) {
  const text = value === null ? "" : String(value);
  return '"' + text.replaceAll('"', '""') + '"';
}

export function ProyectosPanel({
  proyectos,
  evaluadores,
  etapasEvaluacion,
  etapaEvalId,
  etapaFutura = false,
  etapaNombre = null,
  estadoBadge = ESTADO_BADGE_DEFAULT,
  transiciones = TRANSICIONES_DEFAULT,
  evaluacionesEsperadas = 2,
}: {
  proyectos: ProyectoPanelRow[];
  evaluadores: EvaluadorSimple[];
  etapasEvaluacion: EtapaEvaluacionSimple[];
  etapaEvalId: number | null;
  etapaFutura?: boolean;
  etapaNombre?: string | null;
  evaluacionesEsperadas?: number;
  estadoBadge?: Record<string, EstadoBadgeConfig>;
  transiciones?: Record<string, TransicionEstado[]>;
}) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingKeys, setLoadingKeys] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [assignmentOverrides, setAssignmentOverrides] = useState<Record<string, boolean>>({});
  const [selectedEtapaId, setSelectedEtapaId] = useState<number | null>(etapaEvalId);

  const etapaSeleccionada = etapasEvaluacion.find((item) => item.id === selectedEtapaId) ?? null;
  const activeEtapaId = etapaSeleccionada?.id ?? etapaEvalId;
  const activeEtapaNombre = etapaSeleccionada?.nombre ?? etapaNombre;
  const activeEtapaFutura = etapaSeleccionada?.fecha_inicio
    ? new Date(etapaSeleccionada.fecha_inicio).getTime() > Date.now()
    : etapaFutura;

  async function handleToggle(proyectoId: string, evaluadorId: string) {
    if (activeEtapaId === null) return;
    const proyecto = proyectos.find((item) => item.id === proyectoId);
    const baseAssigned = proyecto?.asignaciones.some(
      (assignment) =>
        assignment.etapa_id === activeEtapaId && assignment.evaluador_id === evaluadorId,
    ) ?? false;
    const key = [proyectoId, evaluadorId, activeEtapaId].join("-");
    const currentAssigned = assignmentOverrides[key] ?? baseAssigned;

    setLoadingKeys((prev) => ({ ...prev, [key]: true }));
    setError(null);
    setSuccess(null);
    setAssignmentOverrides((prev) => ({ ...prev, [key]: !currentAssigned }));

    const res = await toggleAsignacion(proyectoId, evaluadorId, activeEtapaId);
    setLoadingKeys((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    if (!res.ok) {
      setAssignmentOverrides((prev) => ({ ...prev, [key]: currentAssigned }));
      setError(res.error);
      return;
    }

    const evaluador = evaluadores.find((item) => item.id === evaluadorId);
    const accion = currentAssigned ? "Se quitó" : "Se asignó";
    const ronda = activeEtapaNombre ? " para " + activeEtapaNombre : "";
    setSuccess(accion + " " + (evaluador?.nombre ?? "el evaluador") + ronda + ".");
  }

  async function handleEstado(proyectoId: string, estado: string) {
    if (
      estado === "descalificado" &&
      typeof window !== "undefined" &&
      !window.confirm("¿Confirmas la descalificación por plagio? El proyecto saldrá del ranking elegible.")
    ) {
      return;
    }

    setLoadingKeys((prev) => ({ ...prev, [`estado-${proyectoId}`]: true }));
    setError(null);
    setSuccess(null);
    const res = await cambiarEstadoPostulacion(proyectoId, estado);
    setLoadingKeys((prev) => {
      const next = { ...prev };
      delete next[`estado-${proyectoId}`];
      return next;
    });
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
  const esperado = Math.max(1, evaluacionesEsperadas || 2);
  const esPreseleccion = etapaSeleccionada?.tipo === "preseleccion";
  const estadosExcluidos = new Set([
    "borrador",
    "inadmisible",
    "no_preseleccionado",
    "descalificado",
  ]);

  const rankingBase = proyectos.map((p) => {
    const scores = (p.evaluaciones ?? [])
      .filter((evaluacion) =>
        activeEtapaId !== null &&
        evaluacion.etapa_id === activeEtapaId &&
        evaluacion.estado === "finalizada" &&
        typeof evaluacion.puntaje_ponderado === "number",
      )
      .map((evaluacion) => evaluacion.puntaje_ponderado as number);
    const media = promedio(scores);
    const completa = scores.length >= esperado;
    const elegible = scores.length > 0 && completa && !estadosExcluidos.has(p.estado_postulacion);

    return {
      id: p.id,
      codigo: p.codigo_ciego,
      nombre: p.nombre_proyecto ?? "Sin nombre",
      categoria: p.categoria ?? "Sin categoría",
      estado: p.estado_postulacion,
      n: scores.length,
      esperado,
      promedio: media,
      sigma: desviacion(scores),
      completa,
      elegible,
      puesto: null,
      pasa: false,
      exclusion: estadosExcluidos.has(p.estado_postulacion)
        ? "Excluido"
        : scores.length === 0
        ? "Sin evaluación"
        : !completa
        ? "Evaluación incompleta"
        : "Fuera del cupo",
    } satisfies RankingRow;
  });

  const rankingOrdenado = [...rankingBase].sort((a, b) => {
    if (a.elegible !== b.elegible) return a.elegible ? -1 : 1;
    if ((a.promedio ?? -1) !== (b.promedio ?? -1)) {
      return (b.promedio ?? -1) - (a.promedio ?? -1);
    }
    if (a.n !== b.n) return b.n - a.n;
    return a.codigo.localeCompare(b.codigo);
  });

  const puestos = new Map(
    rankingOrdenado
      .filter((row) => row.elegible)
      .map((row, index) => [row.id, index + 1]),
  );

  const rankingRows: RankingRow[] = rankingOrdenado.map((row) => {
    const puesto = puestos.get(row.id) ?? null;
    const pasa = Boolean(esPreseleccion && puesto !== null && puesto <= 10);
    return {
      ...row,
      puesto,
      pasa,
      exclusion: pasa
        ? "Pasa a bootcamp"
        : row.elegible && esPreseleccion
        ? "Fuera del cupo"
        : row.elegible
        ? "Elegible"
        : row.exclusion,
    };
  });

  const rankingPorProyecto = new Map(rankingRows.map((row) => [row.id, row]));
  const proyectosOrdenados = [...proyectos].sort((a, b) => {
    const aRow = rankingPorProyecto.get(a.id);
    const bRow = rankingPorProyecto.get(b.id);
    if ((aRow?.puesto ?? Infinity) !== (bRow?.puesto ?? Infinity)) {
      return (aRow?.puesto ?? Infinity) - (bRow?.puesto ?? Infinity);
    }
    return a.codigo_ciego.localeCompare(b.codigo_ciego);
  });

  function exportarRanking() {
    if (activeEtapaId === null) return;
    const encabezados = [
      "Puesto",
      "Código ciego",
      "Proyecto",
      "Categoría",
      "Estado",
      "Puntaje ponderado",
      "Evaluaciones completas",
      "Evaluaciones esperadas",
      "Dispersión",
      esPreseleccion ? "Resultado preselección" : "Resultado de etapa",
    ];
    const filas = rankingRows.map((row) => [
      row.puesto ?? "",
      row.codigo,
      row.nombre,
      row.categoria,
      row.estado,
      row.promedio === null ? "" : row.promedio.toFixed(1).replace(".", ","),
      row.n,
      row.esperado,
      row.promedio === null ? "" : row.sigma.toFixed(2).replace(".", ","),
      row.exclusion,
    ]);
    const csv = "\uFEFF" + [encabezados, ...filas]
      .map((fila) => fila.map((valor) => csvCell(valor)).join(";"))
      .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    const nombreEtapa = (activeEtapaNombre ?? "etapa")
      .toLowerCase()
      .replaceAll(/[^a-z0-9áéíóúñ]+/gi, "-")
      .replace(/(^-|-$)/g, "");
    enlace.href = url;
    enlace.download = "ranking-" + (nombreEtapa || "etapa") + "-" + new Date().toISOString().slice(0, 10) + ".csv";
    enlace.click();
    URL.revokeObjectURL(url);
  }

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


      {etapasEvaluacion.length > 0 && (
        <Card variant="ghost" className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="brand-eyebrow text-brand-ink-soft">Etapa de evaluación</p>
            <p className="mt-1 text-[12px] text-brand-ink-muted">
              Elige la ronda en la que quieres distribuir los proyectos.
            </p>
          </div>
          <select
            value={activeEtapaId ?? ""}
            onChange={(event) => {
              const nextId = event.target.value ? Number(event.target.value) : null;
              setSelectedEtapaId(nextId);
              setError(null);
              setSuccess(null);
            }}
            className="min-w-[220px] rounded-[var(--r-sm)] border border-brand-line bg-brand-surface-raised px-3 py-2 text-[13px] text-brand-ink outline-none transition-colors focus:border-brand-secondary"
            aria-label="Etapa de evaluación"
          >
            {etapasEvaluacion.map((etapa) => (
              <option key={etapa.id} value={etapa.id}>
                {etapa.nombre}
              </option>
            ))}
          </select>
        </Card>
      )}
      {etapasEvaluacion.length === 0 && (
        <div role="alert" className="rounded-[var(--r-md)] border border-st-warning/30 bg-st-warning/5 px-4 py-3 text-[13px] text-st-warning">
          No hay etapas de evaluación configuradas. Crea una etapa de preselección o demo day para comenzar las asignaciones.
        </div>
      )}

      <div className="flex items-center gap-2">
        <Badge tone="secondary">{enviados} enviados</Badge>
        <Badge tone="neutral">{proyectos.length} total</Badge>
        {activeEtapaId !== null && activeEtapaFutura && (
          <Badge tone="accent">Asignando para: {activeEtapaNombre ?? "Próxima evaluación"}</Badge>
        )}
        {activeEtapaId !== null && !activeEtapaFutura && (
          <Badge tone="secondary">{activeEtapaNombre ?? "Evaluación activa"}</Badge>
        )}
        {activeEtapaId === null && (
          <Badge tone="warning">Sin etapa de evaluación configurada</Badge>
        )}
      </div>

      {activeEtapaId !== null && (
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="brand-eyebrow text-brand-accent">Ranking de la etapa</p>
              <h2 className="brand-display mt-1 text-[22px] text-brand-primary">
                {esPreseleccion ? "Selección para el bootcamp" : activeEtapaNombre ?? "Evaluación"}
              </h2>
              <p className="mt-1 max-w-2xl text-[12px] text-brand-ink-muted">
                Ordenado por el promedio de las evaluaciones finalizadas. Los proyectos descalificados o con evaluación incompleta no ocupan un puesto elegible.
              </p>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={exportarRanking}>
              Exportar a Excel
            </Button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[var(--r-sm)] border border-brand-line bg-brand-surface-soft px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-brand-ink-muted">Cupo</p>
              <p className="mt-1 font-[family-name:var(--font-mono)] text-lg font-bold text-brand-primary">
                {esPreseleccion ? "10 proyectos" : "Selección manual"}
              </p>
            </div>
            <div className="rounded-[var(--r-sm)] border border-brand-line bg-brand-surface-soft px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-brand-ink-muted">Evaluaciones completas</p>
              <p className="mt-1 font-[family-name:var(--font-mono)] text-lg font-bold text-brand-primary">
                {rankingRows.filter((row) => row.elegible).length}
              </p>
            </div>
            <div className="rounded-[var(--r-sm)] border border-brand-line bg-brand-surface-soft px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-brand-ink-muted">Pasan por puntaje</p>
              <p className="mt-1 font-[family-name:var(--font-mono)] text-lg font-bold text-brand-secondary">
                {esPreseleccion ? Math.min(10, rankingRows.filter((row) => row.elegible).length) : "—"}
              </p>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-brand-line text-[11px] uppercase tracking-wider text-brand-ink-muted">
                  <th className="px-3 py-3 font-semibold">Puesto</th>
                  <th className="px-3 py-3 font-semibold">Código</th>
                  <th className="px-3 py-3 font-semibold">Proyecto</th>
                  <th className="px-3 py-3 font-semibold">Puntaje</th>
                  <th className="px-3 py-3 font-semibold">Evaluaciones</th>
                  <th className="px-3 py-3 font-semibold">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {rankingRows.map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b border-brand-line/60",
                      row.pasa && "bg-brand-secondary/5",
                    )}
                  >
                    <td className="px-3 py-3 font-[family-name:var(--font-mono)] font-bold text-brand-primary">
                      {row.puesto ?? "—"}
                    </td>
                    <td className="px-3 py-3 font-[family-name:var(--font-mono)] text-brand-secondary">
                      {row.codigo}
                    </td>
                    <td className="px-3 py-3 font-medium text-brand-ink">
                      {row.nombre}
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-[family-name:var(--font-mono)] text-[15px] font-bold text-brand-ink">
                        {row.promedio === null ? "—" : row.promedio.toFixed(1) + " / 100"}
                      </span>
                      {row.promedio !== null && row.n > 1 && (
                        <span className="ml-2 text-[11px] text-brand-ink-muted">
                          σ {row.sigma.toFixed(1)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-brand-ink-soft">
                      {row.n}/{row.esperado}
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={row.pasa ? "success" : row.elegible ? "secondary" : "neutral"}>
                        {row.exclusion}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {!rankingRows.length && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-[13px] text-brand-ink-muted">
                      Aún no hay proyectos para ordenar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-brand-line text-[11px] uppercase tracking-wider text-brand-ink-muted">
                <th className="px-5 py-3 font-semibold">Puesto</th>
                <th className="px-5 py-3 font-semibold">Código</th>
                <th className="px-5 py-3 font-semibold">Proyecto</th>
                <th className="px-5 py-3 font-semibold">Postulante</th>
                <th className="px-5 py-3 font-semibold">Categoría</th>
                <th className="px-5 py-3 font-semibold">Puntaje</th>
                <th className="px-5 py-3 font-semibold">Estado</th>
                <th className="px-5 py-3 font-semibold">Evaluadores</th>
                <th className="px-5 py-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {proyectosOrdenados.map((p) => {
                const conf = estadoBadge[p.estado_postulacion] ?? { label: p.estado_postulacion, tone: "neutral" as const };
                const ranking = rankingPorProyecto.get(p.id);
                const asignacionesEtapa = activeEtapaId === null
                  ? []
                  : p.asignaciones.filter((a) => a.etapa_id === activeEtapaId);
                const asignados = new Set(
                  evaluadores
                    .filter((ev) => {
                      const baseAssigned = asignacionesEtapa.some((a) => a.evaluador_id === ev.id);
                      if (activeEtapaId === null) return false;
                      const key = [p.id, ev.id, activeEtapaId].join("-");
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
                      <td className="px-5 py-3 font-[family-name:var(--font-mono)] text-[13px] font-bold text-brand-primary">
                        {ranking?.puesto ?? "—"}
                      </td>
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
                        {ranking?.promedio === null || ranking?.promedio === undefined
                          ? <span className="text-brand-ink-muted">—</span>
                          : (
                            <span className="font-[family-name:var(--font-mono)] font-bold text-brand-ink">
                              {ranking.promedio.toFixed(1)}
                            </span>
                          )}
                        {ranking && <span className="ml-1 text-[10px] text-brand-ink-muted">/100</span>}
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
                        <td colSpan={9} className="px-6 py-5">
                          <div className="grid gap-6 md:grid-cols-2">
                            {/* Asignar evaluadores */}
                            <div>
                              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="brand-eyebrow text-brand-ink-soft">Asignar evaluadores</p>
                                  <p className="mt-1 text-[12px] text-brand-ink-muted">
                                    {activeEtapaNombre ? "Ronda: " + activeEtapaNombre : "Selecciona los evaluadores para la ronda actual."}
                                    {activeEtapaFutura && activeEtapaId !== null && (
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
                                    const key = activeEtapaId === null ? "" : [p.id, ev.id, activeEtapaId].join("-");
                                    const isLoading = Boolean(loadingKeys[key]);
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
                                          disabled={isLoading || activeEtapaId === null}
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
                                      disabled={loadingKeys[`estado-${p.id}`]}
                                      onClick={() => handleEstado(p.id, s.estado)}
                                      className={s.danger ? "border-st-danger/40 text-st-danger hover:bg-st-danger/5" : ""}
                                    >
                                      {loadingKeys[`estado-${p.id}`] ? "…" : s.label}
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