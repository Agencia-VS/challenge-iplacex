import { cn } from "@/lib/cn";
import { PALETTE } from "@/lib/brand";

/**
 * Patrón de marca: la misma primitiva del isotipo —un cuadro dentro de una
 * grilla— repetida en tablero. Deja aire alrededor de cada tesela para que la
 * grilla se lea como retícula y no como bloque sólido.
 *
 * Pensado como recurso de fondo, siempre a baja opacidad. Decorativo y no
 * interactivo: se marca `aria-hidden` y se desactivan los eventos de puntero.
 */
const TONOS = {
  primary: PALETTE.primary,
  secondary: PALETTE.secondaryLight,
  accent: PALETTE.accent,
  surface: PALETTE.surface,
} as const;

/** Cuadro de 76 dentro de una celda de 100, es decir 24 de aire. */
const TESELA = "M0 0H76V76H0Z";
const RATIO_CELDA = 1;

function teselaUrl(color: string) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
    `<path d="${TESELA}" fill="${color}"/>` +
    `</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export function BrandPattern({
  className,
  tone = "secondary",
  /** Ancho de una celda del patrón, en px. */
  scale = 96,
  opacity = 0.08,
}: {
  className?: string;
  tone?: keyof typeof TONOS;
  scale?: number;
  opacity?: number;
}) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0", className)}
      style={{
        backgroundImage: teselaUrl(TONOS[tone]),
        backgroundSize: `${scale}px ${Math.round(scale * RATIO_CELDA)}px`,
        opacity,
      }}
    />
  );
}
