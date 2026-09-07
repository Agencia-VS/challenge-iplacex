import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Container({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mx-auto w-full max-w-[1240px] px-5 sm:px-8", className)} {...rest} />;
}
