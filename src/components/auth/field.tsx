import type { InputHTMLAttributes } from "react";

export function Field({
  label,
  ...rest
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="brand-eyebrow text-brand-ink-soft">{label}</span>
      <input
        {...rest}
        className="mt-2 block w-full rounded-[var(--r-sm)] border border-brand-line bg-brand-surface-soft px-3.5 py-3 text-[14px] outline-none transition-all placeholder:text-brand-ink-muted focus:border-brand-accent focus:bg-brand-surface-raised focus:ring-2 focus:ring-brand-accent-soft"
      />
    </label>
  );
}
