import type { Metadata } from "next";
import { FaqSection } from "@/components/sections/faq-section";
import { CtaSection } from "@/components/sections/cta-section";

export const metadata: Metadata = { title: "Preguntas frecuentes" };

export default function FaqPage() {
  return (
    <>
      <FaqSection />
      <CtaSection />
    </>
  );
}
