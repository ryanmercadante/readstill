import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center cursor-pointer rounded-lg border-0 disabled:cursor-default disabled:opacity-[0.38] [&_svg]:pointer-events-none",
  {
    variants: {
      variant: {
        default:
          "min-h-[47px] gap-[11px] bg-primary px-6 py-0 text-[12px] font-semibold text-primary-foreground hover:bg-primary-hover",
        outline:
          "min-h-[42px] gap-[9px] border border-solid border-outline bg-transparent px-4 py-[10px] text-[12px] font-[650] hover:border-foreground hover:bg-accent",
        ghost:
          "min-h-[42px] min-w-10 bg-transparent px-[6px] py-[2px] hover:enabled:bg-ghost-hover",
        link: "gap-[7px] bg-transparent p-[10px] text-[12px] underline decoration-link-underline underline-offset-4 hover:text-ring",
        text: "bg-transparent px-0 py-[10px] text-[11px] underline",
        plain: "",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Button({
  className,
  variant = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
