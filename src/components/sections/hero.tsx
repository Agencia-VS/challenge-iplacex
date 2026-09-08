import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { BrandPattern } from "@/components/brand/pattern";
import { stats } from "@/lib/site";

export function Hero() {
  return (
    <section className="pt-10 pb-6">
      <Container>
        <div className="relative overflow-hidden rounded-[var(--r-xl)] bg-brand-primary px-7 py-14 text-white sm:px-12 sm:py-20">
          <BrandPattern />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 top-1/2 hidden h-[420px] w-[420px] -translate-y-1/2 lg:block"
            style={{
              background:
                "conic-gradient(from 120deg, var(--brand-accent) 0%, transparent 25%, var(--brand-secondary) 50%, transparent 75%, var(--brand-accent) 100%)",
              filter: "blur(60px)",
              opacity: 0.35,
            }}
          />

          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-accent px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] font-[family-name:var(--font-heading)]">
              <span className="h-1.5 w-1.5 animate-[brand-blink_2s_ease-in-out_infinite] rounded-full bg-white" />
              Postulaciones abiertas
            </span>

            <h1 className="brand-display mt-7 text-[clamp(44px,7vw,84px)]">
              Challenge
              <span className="block text-brand-accent">Iplacex</span>
            </h1>

            <p className="mt-7 max-w-xl text-[16px] leading-relaxed text-white/75">
              Concurso de Emprendimiento e Innovación abierto a estudiantes, egresados y
              titulados de Iplacex. Tres categorías según la etapa en que esté tu proyecto,
              una misma vara de evaluación y un ranking único.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Button href="/app/postular" size="lg">
                Postular ahora
              </Button>
              <Button href="/metodologia" variant="ghost" size="lg" className="border-white/25 text-white hover:bg-white/10 hover:text-white hover:border-white">
                Conocer metodología
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

function HeroStat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="brand-display text-[44px] text-brand-accent">{value}</p>
      <p className="mt-1 text-[12px] text-white/65">{label}</p>
    </div>
  );
}
