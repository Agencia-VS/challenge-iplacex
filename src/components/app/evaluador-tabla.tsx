"use client";

import { useId, useState } from "react";
import { VerticalTabs } from "@/components/app/vertical-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { coincideVertical, normalizarBusqueda } from "@/lib/verticales";

export type EvaluadorFila = {
  id: string;
  codigo: string;
  nombre?: string | null;
  categoria: string | null;
  categoriaNumero: number | null;
  etapaId: number | null;
  etapa: string;
  estado: string;
  puntaje: number | null;
  fecha?: string | null;
  href: string | null;
};

export function EvaluadorTabla({ filas }: { filas: EvaluadorFila[] }) {
  const [vertical, setVertical] = useState(0);
  const [busqueda, setBusqueda] = useState("");
  const [etapa, setEtapa] = useState("");
  const [estado, setEstado] = useState("");
  const panelId = useId();
  const etapas = [...new Map(filas.filter(f => f.etapaId !== null).map(f => [String(f.etapaId), f.etapa])).entries()];
  const porEtapa = filas.filter(f => !etapa || String(f.etapaId) === etapa);
  const prioridad: Record<string, number> = { pendiente: 0, en_progreso: 1, finalizada: 2 };
  const visibles = porEtapa.filter(f => coincideVertical(f.categoriaNumero, vertical) &&
    (!estado || f.estado === estado) && normalizarBusqueda(`${f.codigo} ${f.nombre ?? ""} ${f.categoria ?? ""}`).includes(normalizarBusqueda(busqueda)))
    .sort((a, b) => (prioridad[a.estado] ?? 0) - (prioridad[b.estado] ?? 0) || a.codigo.localeCompare(b.codigo, "es", { numeric: true }) || (a.etapaId ?? 0) - (b.etapaId ?? 0));
  const inputClass = "mt-1 block w-full rounded-lg border border-brand-line bg-brand-surface-raised px-3 py-2.5 text-sm text-brand-ink";

  return <div className="min-w-0 space-y-4">
    <VerticalTabs value={vertical} onChange={setVertical} numeros={porEtapa.map(f => f.categoriaNumero)} panelId={panelId} />
    <div className="grid gap-3 sm:grid-cols-3">
      <label className="text-xs font-medium text-brand-ink-soft">Buscar código, nombre o categoría
        <input type="search" value={busqueda} onChange={e => setBusqueda(e.target.value)} className={inputClass} placeholder="Ej. C1-0001" />
      </label>
      <label className="text-xs font-medium text-brand-ink-soft">Etapa
        <select aria-label="Etapa" value={etapa} onChange={e => setEtapa(e.target.value)} className={inputClass}>
          <option value="">Todas las etapas</option>
          {etapas.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
        </select>
      </label>
      <label className="text-xs font-medium text-brand-ink-soft">Estado de evaluación
        <select aria-label="Estado de evaluación" value={estado} onChange={e => setEstado(e.target.value)} className={inputClass}>
          <option value="">Todos los estados</option><option value="pendiente">Pendiente</option>
          <option value="en_progreso">En progreso</option><option value="finalizada">Completada</option>
        </select>
      </label>
    </div>
    <p role="status" className="text-xs text-brand-ink-muted">{visibles.length} de {filas.length} asignaciones · Pendientes primero, luego por código.</p>
    <div id={panelId} role="tabpanel" aria-label="Evaluaciones de la vertical seleccionada">
      <Card className="min-w-0 overflow-hidden p-0">
        <div className="overflow-x-auto overscroll-x-contain">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead><tr className="border-b border-brand-line text-xs uppercase tracking-wide text-brand-ink-muted">
              {["Código", "Vertical", "Etapa", "Estado", "Puntaje /100", "Fecha", "Acción"].map(t => <th key={t} scope="col" className="px-4 py-3 font-semibold">{t}</th>)}
            </tr></thead>
            <tbody>{visibles.map(f => <tr key={f.id} className="border-b border-brand-line/60 hover:bg-brand-surface-soft">
              <td className="px-4 py-4 text-brand-secondary"><span className="font-mono font-bold">{f.codigo}</span>{f.nombre && <span className="mt-1 block text-xs text-brand-ink-soft">{f.nombre}</span>}</td>
              <td className="max-w-64 px-4 py-4 text-brand-ink-soft">{f.categoria ?? "Sin categoría"}</td>
              <td className="px-4 py-4 text-brand-ink-soft">{f.etapa}</td>
              <td className="px-4 py-4"><Badge tone={f.estado === "finalizada" ? "success" : f.estado === "en_progreso" ? "secondary" : "warning"}>
                {f.estado === "finalizada" ? "Completada" : f.estado === "en_progreso" ? "En progreso" : "Pendiente"}
              </Badge></td>
              <td className="px-4 py-4 font-semibold text-brand-primary">{f.puntaje?.toFixed(1) ?? "—"}</td>
              <td className="px-4 py-4 text-brand-ink-muted">{f.fecha ? new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Santiago" }).format(new Date(f.fecha)) : "—"}</td>
              <td className="px-4 py-4">{f.href && <Button href={f.href} variant={f.estado === "finalizada" ? "ghost" : "secondary"} size="sm">{f.estado === "finalizada" ? "Ver" : "Evaluar"}</Button>}</td>
            </tr>)}
            {!visibles.length && <tr><td colSpan={7} className="px-4 py-10 text-center text-brand-ink-muted">No hay evaluaciones que coincidan con los filtros.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  </div>;
}
