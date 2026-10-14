import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * Arte vectorial original del manual, con su espacio libre institucional.
 */
export function BrandLogo({
  className,
  variant = "dark",
}: {
  className?: string;
  variant?: "dark" | "light";
}) {
  return (
    <span className={cn("inline-flex shrink-0 p-[18px]", className)}>
      <Image
        src={variant === "light" ? "/brand/iplacex-white.svg" : "/brand/iplacex-color.svg"}
        alt="Iplacex enovus"
        width={678.3}
        height={187.63}
        className="block h-auto w-[160px] min-w-[150px]"
        unoptimized
      />
    </span>
  );
}
