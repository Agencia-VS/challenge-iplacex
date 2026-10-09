import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { HeroBackground } from "@/components/brand/hero-background";
import { HERO_IMAGES } from "@/lib/brand";

export function Hero() {
  return (
    <section className="pt-10 pb-6">
      <Container>
        <div className="relative overflow-hidden rounded-[var(--r-xl)] bg-brand-primary px-6 py-12 text-white sm:px-12 sm:py-20">
          <HeroBackground images={HERO_IMAGES} />

          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] font-[family-name:var(--font-heading)]">
              <span className="h-1.5 w-1.5 animate-[brand-blink_2s_ease-in-out_infinite] rounded-full bg-white" />
              Postulaciones abiertas
            </span>

            <h1 className="brand-display mt-7 text-[clamp(36px,6.5vw,80px)]">
              Challenge
              <span className="block">Iplacex</span>
            </h1>

            <p className="mt-7 max-w-xl text-[16px] leading-relaxed text-white/90">
              Concurso de Emprendimiento e Innovación abierto a estudiantes y titulados de
              Iplacex. Tres categorías según la etapa en que se encuentre tu emprendimiento
              o proyecto, una misma vara de evaluación y un ranking único.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Button href="/app/postular" variant="inverse" size="lg">
                Postular ahora
              </Button>
              <Button href="/metodologia" variant="ghost" size="lg" className="border-white/50 text-white hover:bg-white/10 hover:text-white hover:border-white focus-visible:ring-white focus-visible:ring-offset-brand-primary">
                Conocer metodología
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
