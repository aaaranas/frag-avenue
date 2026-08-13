import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-2 font-medium tracking-wide transition disabled:cursor-not-allowed disabled:opacity-60 rounded-sm";

const variants: Record<Variant, string> = {
  primary: "bg-[color:var(--fg)] text-[color:var(--bg)] hover:opacity-90 active:opacity-85",
  secondary:
    "border border-[color:var(--rule-strong)] text-[color:var(--fg)] hover:bg-[color:var(--vellum,#eeeae1)] dark:hover:bg-[color:var(--bg-elev)]",
  ghost: "text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]",
  destructive:
    "border border-red-700/40 text-red-800 hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-950/30",
};

const sizes: Record<Size, string> = {
  sm: "text-xs px-3 py-1.5",
  md: "text-sm px-5 py-2.5",
};

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export function Button({ variant = "primary", size = "md", className, ...rest }: Props) {
  return <button className={cn(base, variants[variant], sizes[size], className)} {...rest} />;
}
