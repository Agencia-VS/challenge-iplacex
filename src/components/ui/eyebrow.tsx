import { cn } from "@/lib/cn";

type Tone = "accent" | "secondary" | "primary";

export function Eyebrow({
  tone = "accent",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  const dot = tone === "accent" ? "bg-brand-accent" : tone === "secondary" ? "bg-brand-secondary" : "bg-brand-primary";
  return (
    <span className={cn("brand-eyebrow inline-flex items-center gap-2", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
      {children}
    </span>
  );
}
