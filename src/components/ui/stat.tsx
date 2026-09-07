import { cn } from "@/lib/cn";

type Tone = "primary" | "accent" | "secondary" | "warning";

const toneClass: Record<Tone, string> = {
  primary: "text-brand-primary",
  accent: "text-brand-accent",
  secondary: "text-brand-secondary",
  warning: "text-st-warning",
};

export function Stat({
  label,
  value,
  detail,
  tone = "primary",
  className,
}: {
  label: string;
  value: string | number;
  detail?: string;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--r-md)] border border-brand-line bg-brand-surface-raised p-5 transition-transform duration-200 hover:-translate-y-0.5",
        className,
      )}
    >
      <span
        className={cn(
          "absolute inset-y-0 left-0 w-1",
          tone === "accent" && "bg-brand-accent",
          tone === "secondary" && "bg-brand-secondary",
          tone === "primary" && "bg-brand-primary",
          tone === "warning" && "bg-st-warning",
        )}
      />
      <p className="brand-eyebrow">{label}</p>
      <p className={cn("mt-2 brand-display text-[38px]", toneClass[tone])}>{value}</p>
      {detail && <p className="mt-1 text-[12px] text-brand-ink-muted">{detail}</p>}
    </div>
  );
}
