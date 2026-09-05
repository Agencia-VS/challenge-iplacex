import type { Metadata } from "next";
import { FunnelSection } from "@/components/sections/funnel-section";
import { CriteriosSection } from "@/components/sections/criterios-section";
import { BootcampSection } from "@/components/sections/bootcamp-section";
import { CtaSection } from "@/components/sections/cta-section";

export const metadata: Metadata = { title: "Metodología" };

export default function MetodologiaPage() {
  return (
    <>
      <FunnelSection />
      <BootcampSection />
      <CriteriosSection />
      <CtaSection />
    </>
  );
}
