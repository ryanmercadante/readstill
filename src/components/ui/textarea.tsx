import * as React from "react";
import { cn } from "cn";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-[220px] w-full resize-y rounded-[6px] border border-solid border-input bg-control p-3 font-serif text-[17px] leading-[1.8] text-foreground placeholder:text-placeholder disabled:cursor-not-allowed disabled:opacity-[0.38] aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
