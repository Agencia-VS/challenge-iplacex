import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Tone = "accent" | "secondary" | "primary" | "neutral" | "success" | "warning";

const tones: Record<Tone, string> = {
  accent: "bg-brand-accent-soft text-brand-accent",
  secondary: "bg-brand-secondary-soft text-brand-secondary",
  primary: "bg-brand-primary text-white",
  neutral: "bg-brand-surface text-brand-ink-muted border border-brand-line",
  success: "bg-emerald-100 text-st-success",
  warning: "bg-amber-100 text-st-warning",
};

export function Badge({
  tone = "primary",
  className,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide font-[family-name:var(--font-heading)]",
        tones[tone],
        className,
      )}
      {...rest}
    />
  );
}
