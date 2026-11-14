import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { cn } from "cn";

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  thumbProps,
  ...props
}: SliderPrimitive.Root.Props & { thumbProps?: SliderPrimitive.Thumb.Props }) {
  const _values = Array.isArray(value)
    ? value
    : Array.isArray(defaultValue)
      ? defaultValue
      : [typeof value === "number" ? value : typeof defaultValue === "number" ? defaultValue : min];

  return (
    <SliderPrimitive.Root
      className={cn(
        "inline-block h-[25px] w-full my-[5px] cursor-pointer bg-transparent data-disabled:cursor-default data-disabled:opacity-[0.38]",
        className,
      )}
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      thumbAlignment="edge"
      {...props}
    >
      <SliderPrimitive.Control className="relative flex h-full touch-none items-center select-none">
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="relative h-2 w-full overflow-hidden rounded-[4px] border border-solid border-slider-border bg-slider-track"
        >
          <SliderPrimitive.Indicator data-slot="slider-range" className="h-full bg-ring" />
        </SliderPrimitive.Track>
        {Array.from({ length: _values.length }, (_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={index}
            index={index}
            {...thumbProps}
            className="size-[15px] rounded-full bg-ring has-focus-visible:outline-2 has-focus-visible:outline-ring has-focus-visible:outline-offset-[5px]"
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider };
