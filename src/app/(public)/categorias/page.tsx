import type { Metadata } from "next";
import { CategoriasSection } from "@/components/sections/categorias-section";
import { CtaSection } from "@/components/sections/cta-section";

export const metadata: Metadata = { title: "Categorías" };

export default function CategoriasPage() {
  return (
    <>
      <CategoriasSection />
      <CtaSection />
    </>
  );
}
