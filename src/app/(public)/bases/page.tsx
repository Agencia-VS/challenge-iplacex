import type { Metadata } from "next";
import { Section } from "@/components/ui/section";
import { BasesCard } from "@/components/sections/bases-section";
import { Card } from "@/components/ui/card";
import { etapas } from "@/lib/site";

export const metadata: Metadata = { title: "Bases de la convocatoria" };

const historial = [
  { v: "v1.0", fecha: "Julio 2026", nota: "Publicación inicial bases convocatoria 2026." },
];

export default function BasesPage() {
  return (
    <Section
      eyebrow="Documento oficial"
      eyebrowTone="accent"
      title="Bases de la Convocatoria 2026"
      description="Toda la información legal, plazos, criterios y procedimientos de la convocatoria en un solo PDF descargable."
    >
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <BasesCard />
        <Card>
          <p className="brand-eyebrow">Historial de versiones</p>
          <ul className="mt-4 space-y-3">
            {historial.map((h) => (
              <li key={h.v} className="flex items-start gap-3 border-b border-brand-line pb-3 last:border-0">
                <span className="font-[family-name:var(--font-mono)] text-[12px] font-bold text-brand-accent">
                  {h.v}
                </span>
                <div>
                  <p className="text-[13px] font-medium text-brand-primary">{h.fecha}</p>
                  <p className="text-[12px] text-brand-ink-muted">{h.nota}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-6">
        <p className="brand-eyebrow">Plazos clave 2026</p>
        <ul className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {etapas.map((e) => (
            <li
              key={e.numero}
              className="flex items-baseline justify-between gap-3 border-b border-brand-line pb-3"
            >
              <span className="text-[13px] font-medium text-brand-primary">
                {String(e.numero).padStart(2, "0")} · {e.nombre}
              </span>
              <span className="shrink-0 font-[family-name:var(--font-mono)] text-[12px] text-brand-ink-muted">
                {e.plazo}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </Section>
  );
}
