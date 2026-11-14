import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "cn";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "w-full rounded-[6px] border border-solid border-input bg-[#fffefa] p-3 text-[13px] text-foreground placeholder:text-[#767165] disabled:cursor-not-allowed disabled:opacity-[0.38] aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
