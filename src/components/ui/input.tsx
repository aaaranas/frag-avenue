import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * shadcn's Input, sized for touch: 44px tall and 16px text at every width
 * (smaller makes iOS Safari zoom in). `.field-input` in globals.css mirrors
 * these styles for the native selects and textareas.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "border-input bg-card text-foreground flex h-11 w-full min-w-0 rounded-md border px-3.5 py-2 text-base transition-[color,border-color,box-shadow] outline-none",
        "placeholder:text-[color:var(--fg-faint)] hover:border-[color:var(--fg-faint)]",
        "file:text-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "focus-visible:border-ring focus-visible:ring-ring/25 focus-visible:ring-[3px]",
        "aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/20",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
