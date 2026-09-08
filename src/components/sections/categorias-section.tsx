import { Section } from "@/components/ui/section";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CATEGORIAS, CRITERIOS, type Categoria } from "@/lib/rubrica";

/** Un acento por categoría, para distinguirlas de un vistazo. */
const ACENTO = ["text-brand-accent", "text-brand-secondary", "text-brand-primary"] as const;

export function CategoriasSection() {
  return (
    <Section
      id="categorias"
      eyebrow="Tres categorías, un solo premio"
      eyebrowTone="accent"
      title={<>Postula donde <br className="hidden sm:block" /> está tu proyecto</>}
      description="Las tres categorías comparten los mismos cinco criterios y las mismas ponderaciones. Lo que cambia es la evidencia que se te exige, según la etapa en que esté tu proyecto: por eso una idea temprana bien formulada puede superar a un emprendimiento en operación con desempeño débil."
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {CATEGORIAS.map((c, i) => (
          <CategoriaCard key={c.slug} c={c} acento={ACENTO[i] ?? ACENTO[0]} />
        ))}
      </div>

      <p className="mt-8 text-[13px] text-brand-ink-muted">
        Todos los proyectos se puntúan en una escala común de 0 a 100 y conforman un ranking único,
        del que salen el primer, segundo y tercer lugar. El puntaje mínimo para ser finalista es 60.
      </p>
    </Section>
  );
}

function CategoriaCard({ c, acento }: { c: Categoria; acento: string }) {
  return (
    <Card className="group relative flex flex-col overflow-hidden p-8 hover:-translate-y-1 hover:border-brand-primary hover:shadow-[var(--sh-lg)]">
      <span
        aria-hidden
        className="pointer-events-none absolute right-5 top-3 brand-display text-[120px] leading-none text-brand-secondary-soft"
      >
        0{c.numero}
      </span>

      <div className="relative flex flex-1 flex-col">
        <Badge
          tone={c.numero === 1 ? "accent" : c.numero === 2 ? "secondary" : "primary"}
          className="self-start"
        >
          Categoría {String(c.numero).padStart(2, "0")}
        </Badge>

        <h3 className={`brand-display mt-5 text-[24px] ${acento}`}>{c.nombre}</h3>
        <p className="mt-3 flex-1 text-[14px] leading-relaxed text-brand-ink-soft">{c.alcance}</p>

        <div className="mt-6 border-t border-dashed border-brand-line pt-5">
          <p className="brand-eyebrow">Se evalúa con</p>
          <ul className="mt-2 space-y-1">
            {CRITERIOS.map((cr) => (
              <li key={cr.slug} className="text-[12px] text-brand-ink-soft">
                {cr.nombre}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
