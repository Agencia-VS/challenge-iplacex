"use client";

import { useId, useState } from "react";
import { VerticalTabs } from "@/components/app/vertical-tabs";
import { Badge } from "@/components/ui/badge";
import { coincideVertical } from "@/lib/verticales";

export type RankingVerticalRow = { id: string; codigo: string; categoria: string | null; categoriaNumero: number | null; promedio: number; sigma: number; n: number };

export function RankingVerticales({ rows }: { rows: RankingVerticalRow[] }) {
  const [vertical, setVertical] = useState(0);
  const panelId = useId();
  // Asignar el puesto ANTES del filtro: los tabs no alteran el ranking global.
  const visibles = rows.map((row, index) => ({ ...row, puesto: index + 1 }))
    .filter(row => coincideVertical(row.categoriaNumero, vertical));
  return <div className="mt-5 space-y-3">
    <VerticalTabs value={vertical} onChange={setVertical} numeros={rows.map(r => r.categoriaNumero)} panelId={panelId} />
    <p className="text-xs text-brand-ink-muted">Los puestos corresponden al ranking general y se conservan al filtrar por vertical.</p>
    <div id={panelId} role="tabpanel" aria-label="Ranking por vertical" className="overflow-x-auto">
      <table className="w-full min-w-[650px] text-left text-sm">
        <thead><tr className="border-b border-brand-line text-xs uppercase text-brand-ink-muted">
          {["Puesto general", "Código", "Vertical", "Promedio /100", "σ", "N° eval", "Estado"].map(label => <th key={label} scope="col" className="px-3 py-3 font-semibold">{label}</th>)}
        </tr></thead>
        <tbody>{visibles.map(r => <tr key={r.id} className="border-b border-brand-line/60 hover:bg-brand-surface-soft">
          <td className="px-3 py-3 font-mono">{r.puesto}</td><td className="px-3 py-3 font-semibold text-brand-primary">{r.codigo}</td>
          <td className="px-3 py-3 text-brand-ink-soft">{r.categoria ?? "Sin categoría"}</td>
          <td className="px-3 py-3 font-bold">{r.promedio.toFixed(1)}</td><td className="px-3 py-3">{r.sigma.toFixed(2)}</td><td className="px-3 py-3">{r.n}</td>
          <td className="px-3 py-3"><Badge tone={r.sigma <= 5 ? "success" : r.sigma <= 10 ? "warning" : "accent"}>{r.sigma <= 5 ? "consenso" : r.sigma <= 10 ? "revisar" : "alta dif."}</Badge></td>
        </tr>)}
        {!visibles.length && <tr><td colSpan={7} className="px-3 py-8 text-center text-brand-ink-muted">No hay proyectos evaluados en esta vertical.</td></tr>}
        </tbody>
      </table>
    </div>
  </div>;
}
