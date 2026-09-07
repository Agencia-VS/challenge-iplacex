import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "tertiary" | "outline";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap rounded-[var(--r-sm)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-surface focus-visible:ring-brand-accent disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-accent text-white shadow-[0_2px_0_var(--brand-primary)] hover:bg-brand-accent-light hover:-translate-y-px hover:shadow-[0_3px_0_var(--brand-primary)] active:translate-y-px active:shadow-[0_1px_0_var(--brand-primary)]",
  secondary: "bg-brand-primary text-white hover:bg-brand-primary-light",
  tertiary: "bg-brand-secondary text-white hover:bg-brand-secondary-light",
  ghost:
    "bg-transparent text-brand-ink-soft border border-brand-line-strong hover:text-brand-primary hover:border-brand-primary hover:bg-brand-surface-raised",
  outline: "bg-brand-surface-raised text-brand-primary border border-brand-line-strong hover:border-brand-primary",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-[12px]",
  md: "h-11 px-5 text-[13px]",
  lg: "h-12 px-6 text-[14px]",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

type AnchorProps = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps> & { href: string };

type ButtonProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & { href?: never };

export function Button(props: AnchorProps | ButtonProps) {
  const { variant = "primary", size = "md", className, children, ...rest } = props;
  const classes = cn(base, variants[variant], sizes[size], className);

  if ("href" in rest && typeof rest.href === "string") {
    const { href, ...anchorRest } = rest as { href: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">;
    return (
      <Link href={href} className={classes} {...anchorRest}>
        {children}
      </Link>
    );
  }
  return (
    <button className={classes} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}
