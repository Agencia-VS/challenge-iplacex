import { cn } from "@/lib/cn";
import { GRISES, PALETTE } from "@/lib/brand";

/**
 * Isotipo Iplacex — grilla de 3 × 3 cuadros.
 *
 * La grilla no es regular: las columnas se angostan hacia la derecha
 * (51 → 46 → 41) y cada una se desplaza en vertical, lo que produce una
 * perspectiva leve, como un plano inclinado. Las medidas están tomadas del
 * logotipo oficial, así que se declaran una a una en lugar de generarse con
 * un bucle: cualquier regularización rompería el gesto.
 *
 * El único cuadro saturado es el superior derecho, en azul puro.
 */
type Celda = { x: number; y: number; w: number; h: number; tono: keyof typeof GRISES | "accent" };

const CELDAS: Celda[] = [
  { x:   0, y:   0, w: 51, h: 51, tono: "medio"  },
  { x:  58, y:   5, w: 46, h: 48, tono: "tenue"  },
  { x: 110, y:   9, w: 41, h: 45, tono: "accent" },
  { x:   0, y:  57, w: 51, h: 49, tono: "claro"  },
  { x:  58, y:  58, w: 46, h: 47, tono: "medio"  },
  { x: 110, y:  59, w: 41, h: 45, tono: "claro"  },
  { x:   0, y: 112, w: 51, h: 51, tono: "tenue"  },
  { x:  58, y: 111, w: 46, h: 48, tono: "claro"  },
  { x: 110, y: 109, w: 41, h: 46, tono: "tenue"  },
];

/** Sobre fondo oscuro los grises se apagan; se reemplazan por blanco con alfa. */
const SOBRE_OSCURO: Record<keyof typeof GRISES, string> = {
  medio: "rgba(255,255,255,0.75)",
  claro: "rgba(255,255,255,0.45)",
  tenue: "rgba(255,255,255,0.22)",
};

export function BrandMark({
  className,
  variant = "dark",
}: {
  className?: string;
  variant?: "dark" | "light";
}) {
  return (
    <svg
      viewBox="0 0 151 163"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      focusable="false"
      className={cn("block", className)}
    >
      {CELDAS.map(({ x, y, w, h, tono }) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={w}
          height={h}
          fill={
            tono === "accent"
              ? PALETTE.accent
              : variant === "light"
                ? SOBRE_OSCURO[tono]
                : GRISES[tono]
          }
        />
      ))}
    </svg>
  );
}
