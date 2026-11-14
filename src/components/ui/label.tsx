import * as React from "react";
import { cn } from "cn";

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label data-slot="label" className={cn("block text-[11px] font-[650]", className)} {...props} />
  );
}

export { Label };
