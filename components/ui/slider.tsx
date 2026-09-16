"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & { trackClassName?: string }
>(({ className, trackClassName, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "group relative flex w-full touch-none select-none items-center",
      props.orientation === "vertical" ? "h-full flex-col" : "h-4",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track
      className={cn(
        "relative grow overflow-hidden rounded-full bg-surface-active",
        props.orientation === "vertical" ? "h-full w-1" : "h-1 w-full",
        trackClassName
      )}
    >
      <SliderPrimitive.Range className="absolute h-full rounded-full bg-foreground group-hover:bg-accent" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      className="block h-3 w-3 rounded-full bg-foreground opacity-0 shadow transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent group-hover:opacity-100"
    />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
