import { cn } from "@/lib/cn";
import { BrandMark } from "@/components/brand/mark";
import { BRAND } from "@/lib/brand";

/**
 * Logotipo completo: isotipo a la izquierda y, a la derecha, el wordmark con
 * la bajada alineada a la derecha bajo él, como en el logotipo oficial.
 */
export function BrandLogo({
  className,
  variant = "dark",
}: {
  className?: string;
  variant?: "dark" | "light";
}) {
  const ink = variant === "dark" ? "text-brand-ink" : "text-white";
  const bajada = variant === "dark" ? "text-brand-ink-soft" : "text-white/70";
  return (
    <span className={cn("inline-flex items-center gap-2.5 leading-none", ink, className)}>
      <BrandMark variant={variant} className="h-8 w-auto shrink-0" />
      <span className="flex flex-col items-end">
        <span
          className={cn(
            "font-[family-name:var(--font-display)] text-[19px] font-extrabold tracking-[-0.02em]",
            ink,
          )}
        >
          {BRAND.shortName}
        </span>
        <span
          className={cn(
            "-mt-0.5 font-[family-name:var(--font-heading)] text-[11px] font-medium tracking-[0.02em]",
            bajada,
          )}
        >
          {BRAND.shortTagline}
        </span>
      </span>
    </span>
  );
}
