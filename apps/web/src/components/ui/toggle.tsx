import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const toggleVariants = cva(
  "flex items-center gap-[7px] min-h-9 rounded-[5px] border-0 bg-transparent px-[13px] py-2 text-[11px] font-[650] text-toggle-foreground aria-pressed:bg-control aria-pressed:text-foreground aria-pressed:shadow-toggle hover:enabled:text-foreground disabled:cursor-default disabled:opacity-[0.38] [&_svg]:pointer-events-none",
  {
    variants: {
      variant: {
        default: "",
        outline: "border border-solid border-input",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Toggle({
  className,
  variant = "default",
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={cn(toggleVariants({ variant, className }))}
      {...props}
    />
  );
}

export { Toggle, toggleVariants };
