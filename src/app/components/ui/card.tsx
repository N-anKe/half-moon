import type { HTMLAttributes } from "react";
import { cn } from "./utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn("rounded-[28px] border border-white/70 bg-card p-5 shadow-soft", className)}
      {...props}
    />
  );
}
