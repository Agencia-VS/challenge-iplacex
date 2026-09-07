import type { HTMLAttributes } from "react";
import { Container } from "./container";
import { Eyebrow } from "./eyebrow";
import { cn } from "@/lib/cn";

export function Section({
  id,
  eyebrow,
  eyebrowTone,
  title,
  description,
  align = "left",
  spacing = "lg",
  children,
  containerClassName,
  ...rest
}: Omit<HTMLAttributes<HTMLElement>, "title"> & {
  id?: string;
  eyebrow?: string;
  eyebrowTone?: "accent" | "secondary" | "primary";
  title?: React.ReactNode;
  description?: React.ReactNode;
  align?: "left" | "center";
  spacing?: "md" | "lg" | "xl";
  containerClassName?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        spacing === "md" && "py-14",
        spacing === "lg" && "py-20",
        spacing === "xl" && "py-28",
      )}
      {...rest}
    >
      <Container className={containerClassName}>
        {(eyebrow || title || description) && (
          <header
            className={cn(
              "mb-10 max-w-3xl",
              align === "center" && "mx-auto text-center",
            )}
          >
            {eyebrow && (
              <Eyebrow tone={eyebrowTone} className={align === "center" ? "justify-center" : ""}>
                {eyebrow}
              </Eyebrow>
            )}
            {title && (
              <h2 className="brand-display mt-4 text-[clamp(32px,5vw,52px)] text-brand-primary">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-4 text-[16px] text-brand-ink-soft">{description}</p>
            )}
          </header>
        )}
        {children}
      </Container>
    </section>
  );
}
