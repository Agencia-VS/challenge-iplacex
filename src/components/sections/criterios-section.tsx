import { Section } from "@/components/ui/section";
import { Card } from "@/components/ui/card";
import { criterios } from "@/lib/site";

export function CriteriosSection() {
  return (
    <Section
      id="criterios"
      eyebrow="Evaluación ciega · 2 evaluadores"
      eyebrowTone="primary"
      title="Cómo se evalúa cada proyecto"
      description="Cinco criterios ponderados. Tu proyecto no muestra equipo ni nombre del postulante hasta el Demo Day."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {criterios.map((c, i) => (
          <Card key={c.nombre} className="relative flex h-full flex-col p-6">
            <span className="brand-eyebrow">Criterio 0{i + 1}</span>
            <p className="brand-display mt-3 text-[44px] text-brand-accent">{c.peso}%</p>
            <p className="mt-2 font-[family-name:var(--font-heading)] text-[15px] font-bold text-brand-primary">
              {c.nombre}
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-brand-ink-soft">{c.descripcion}</p>
          </Card>
        ))}
      </div>
    </Section>
  );
}
