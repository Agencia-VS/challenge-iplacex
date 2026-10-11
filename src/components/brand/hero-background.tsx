import { getImageProps } from "next/image";
import type { HeroImages } from "@/lib/brand";

// Recurso local vacío: permite mostrar el degradado sin descargar la foto de PC en móvil.
const EMPTY_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'/%3E";

/** Cada formato puede incorporarse sin esperar a la entrega de la otra pieza. */
export function HeroBackground({ images }: { images: HeroImages | null }) {
  if (!images) {
    return <div aria-hidden className="pointer-events-none absolute inset-0 bg-linear-to-br from-brand-primary to-brand-accent" />;
  }

  const common = {
    alt: "",
    sizes: "(min-width: 1240px) 1176px, (min-width: 640px) calc(100vw - 64px), calc(100vw - 40px)",
    loading: "eager" as const,
    fetchPriority: "high" as const,
  };
  const { props: desktop } = getImageProps({
    ...common, ...images.desktop,
  });
  const mobile = images.mobile
    ? getImageProps({ ...common, ...images.mobile }).props
    : { ...common, src: EMPTY_IMAGE, width: 1, height: 1 };

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 bg-linear-to-br from-brand-primary to-brand-accent">
      <picture>
        <source media="(min-width: 1024px)" srcSet={desktop.srcSet} sizes={desktop.sizes} width={desktop.width} height={desktop.height} />
        {/* El navegador elige una sola imagen; Next optimiza la pieza seleccionada. */}
        <img {...mobile} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
      </picture>
      <div className={`absolute inset-0 ${images.mobile ? "bg-[linear-gradient(180deg,rgba(6,9,45,0.95),rgba(6,9,45,0.8)_65%,rgba(6,9,45,0.35))]" : ""} lg:bg-[linear-gradient(90deg,rgba(6,9,45,0.85),rgba(6,9,45,0.6)_44%,rgba(6,9,45,0.08)_78%)]`} />
    </div>
  );
}
