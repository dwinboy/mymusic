import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-[background-color,color,box-shadow,transform,filter] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Gold as a surface rather than a filled shape: a highlight along the
        // top and a shade at the bottom is what makes a button look like an
        // object you can press. bg-accent stays underneath so the button is
        // still correct if the gradient doesn't paint.
        //
        // Hover brightens rather than swapping gradients — browsers don't
        // interpolate between two gradients, so a swap would snap while
        // everything else on the button eases.
        primary:
          "bg-accent text-accent-foreground [background-image:linear-gradient(180deg,color-mix(in_srgb,var(--color-accent)_86%,white)_0%,var(--color-accent)_52%,color-mix(in_srgb,var(--color-accent)_95%,black)_100%)] hover:brightness-[1.06] active:scale-[0.98]",
        secondary:
          "bg-surface text-foreground border border-border-strong hover:bg-surface-hover active:scale-[0.98]",
        ghost: "text-foreground hover:bg-surface active:scale-[0.98]",
        outline:
          "border border-border-strong text-foreground hover:bg-surface active:scale-[0.98]",
        danger: "bg-danger text-white hover:brightness-110 active:scale-[0.98]",
        link: "text-foreground-muted hover:text-foreground underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10 rounded-full",
        "icon-sm": "h-8 w-8 rounded-full",
        "icon-lg": "h-14 w-14 rounded-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
