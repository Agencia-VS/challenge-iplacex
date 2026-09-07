import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { BrandPattern } from "@/components/brand/pattern";

export function CtaSection() {
  return (
    <section className="py-16">
      <Container>
        <div className="relative overflow-hidden rounded-[var(--r-xl)] bg-gradient-to-br from-brand-accent to-brand-accent-light p-10 text-white sm:p-16">
          <BrandPattern tone="surface" />
          <div className="relative max-w-2xl">
            <p className="brand-eyebrow text-white/80">Postulaciones abiertas hasta el 2 de octubre</p>
            <h2 className="brand-display mt-4 text-[clamp(36px,5vw,58px)]">
              Tu proyecto puede
              <span className="block">llegar al Demo Day.</span>
            </h2>
            <p className="mt-5 max-w-lg text-[15px] text-white/85">
              Postula en la categoría que corresponda a la etapa de tu proyecto. No se evalúa
              su madurez absoluta, sino qué tan bien resuelto está para donde va.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button href="/app/postular" variant="secondary" size="lg">
                Empezar postulación
              </Button>
              <Button
                href="/faq"
                variant="ghost"
                size="lg"
                className="border-white/30 text-white hover:border-white hover:bg-white/10 hover:text-white"
              >
                Tengo dudas primero
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
