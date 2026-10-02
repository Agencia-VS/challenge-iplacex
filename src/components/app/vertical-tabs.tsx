"use client";

import { useId, type KeyboardEvent } from "react";
import { VERTICALES } from "@/lib/verticales";
import { cn } from "@/lib/cn";

export function VerticalTabs({ value, onChange, numeros, disabled = false, panelId }: {
  value: number;
  onChange: (value: number) => void;
  numeros: (number | null)[];
  disabled?: boolean;
  panelId: string;
}) {
  const prefix = useId();
  function navegar(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % VERTICALES.length;
    else if (event.key === "ArrowLeft") next = (index + VERTICALES.length - 1) % VERTICALES.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = VERTICALES.length - 1;
    else return;
    event.preventDefault();
    onChange(VERTICALES[next].id);
    document.getElementById(`${prefix}-${next}`)?.focus();
  }
  return <div role="tablist" aria-label="Vertical de los proyectos" className="flex max-w-full gap-2 overflow-x-auto pb-2">
    {VERTICALES.map((tab, index) => <button key={tab.id} id={`${prefix}-${index}`} type="button" role="tab"
      aria-selected={value === tab.id} aria-controls={panelId} tabIndex={value === tab.id ? 0 : -1}
      disabled={disabled} onKeyDown={(event) => navegar(event, index)} onClick={() => onChange(tab.id)}
      className={cn("shrink-0 rounded-lg border px-4 py-2.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-secondary disabled:opacity-50",
        value === tab.id ? "border-brand-primary bg-brand-primary text-white" : "border-brand-line bg-brand-surface-raised text-brand-ink-soft")}>
      {tab.label} <span className="ml-2 text-xs opacity-75">{tab.id === 0 ? numeros.length : numeros.filter(n => n === tab.id).length}</span>
    </button>)}
  </div>;
}
