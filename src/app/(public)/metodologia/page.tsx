import type { Metadata } from "next";
import { FunnelSection } from "@/components/sections/funnel-section";
import { CriteriosSection } from "@/components/sections/criterios-section";
import { CapsulasSection } from "@/components/sections/capsulas-section";
import { CtaSection } from "@/components/sections/cta-section";

export const metadata: Metadata = { title: "Metodología" };

export default function MetodologiaPage() {
  return (
    <>
      <FunnelSection />
      <CapsulasSection />
      <CriteriosSection />
      <CtaSection />
    </>
  );
}
