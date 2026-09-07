import { Hero } from "@/components/sections/hero";
import { CategoriasSection } from "@/components/sections/categorias-section";
import { BasesSection } from "@/components/sections/bases-section";
import { FunnelSection } from "@/components/sections/funnel-section";
import { CriteriosSection } from "@/components/sections/criterios-section";
import { BootcampSection } from "@/components/sections/bootcamp-section";
import { FaqSection } from "@/components/sections/faq-section";
import { CtaSection } from "@/components/sections/cta-section";

export default function HomePage() {
  return (
    <>
      <Hero />
      <CategoriasSection />
      <BasesSection />
      <FunnelSection />
      <CriteriosSection />
      <BootcampSection />
      <FaqSection />
      <CtaSection />
    </>
  );
}
