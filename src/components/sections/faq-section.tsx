import { Section } from "@/components/ui/section";
import { Card } from "@/components/ui/card";
import { faqs } from "@/lib/site";

export function FaqSection() {
  return (
    <Section
      id="faq"
      eyebrow="Preguntas frecuentes"
      eyebrowTone="accent"
      title="Resolvemos tus dudas antes de postular"
    >
      <div className="grid gap-3">
        {faqs.map((f, i) => (
          <Card key={f.q} className="p-0">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-5 p-6">
                <span className="flex items-start gap-4">
                  <span className="brand-display text-[20px] text-brand-accent">0{i + 1}</span>
                  <span className="font-[family-name:var(--font-heading)] text-[15px] font-bold text-brand-primary">
                    {f.q}
                  </span>
                </span>
                <span
                  aria-hidden
                  className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-brand-line-strong text-brand-primary transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="px-6 pb-6 pl-[68px] text-[14px] leading-relaxed text-brand-ink-soft">{f.a}</p>
            </details>
          </Card>
        ))}
      </div>
    </Section>
  );
}
