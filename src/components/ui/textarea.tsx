import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * shadcn's Textarea, styled by the shared `.field-input` utility so it matches
 * `Field` and the hand-built selects (see field.tsx).
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn("field-input min-h-20 resize-y", className)}
      {...props}
    />
  );
}

export { Textarea };
