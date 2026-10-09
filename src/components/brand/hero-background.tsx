import { getImageProps } from "next/image";
import type { HeroImages } from "@/lib/brand";

/** Fondo neutro hasta recibir las piezas de DAM; luego, selección nativa por pantalla. */
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
    ...common, src: images.desktop, width: 2400, height: 1200,
  });
  const { props: mobile } = getImageProps({
    ...common, src: images.mobile, width: 1080, height: 1600,
  });

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <picture>
        <source media="(max-width: 767px)" srcSet={mobile.srcSet} sizes={mobile.sizes} width={1080} height={1600} />
        {/* getImageProps conserva la optimización de Next y picture evita descargar ambas piezas. */}
        <img {...desktop} alt="" className="absolute inset-0 h-full w-full object-cover object-center md:object-right" />
      </picture>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,9,45,0.95),rgba(6,9,45,0.8)_65%,rgba(6,9,45,0.35))] md:bg-[linear-gradient(90deg,rgba(6,9,45,0.96),rgba(6,9,45,0.86)_50%,rgba(6,9,45,0.12))]" />
    </div>
  );
}
