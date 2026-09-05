import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "surface" | "neutral" | "primary" | "ghost";

const variants: Record<Variant, string> = {
  surface: "bg-brand-surface-raised border border-brand-line",
  neutral: "bg-brand-surface-soft border border-brand-line",
  primary: "bg-brand-primary text-white border border-transparent",
  ghost: "bg-transparent border border-dashed border-brand-line-strong",
};

export function Card({
  variant = "surface",
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { variant?: Variant }) {
  return (
    <div
      className={cn(
        "rounded-[var(--r-lg)] p-6 sm:p-7 transition-all duration-200",
        variants[variant],
        className,
      )}
      {...rest}
    />
  );
}
