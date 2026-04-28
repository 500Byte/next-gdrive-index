import { Slot } from "@radix-ui/react-slot";
import { type VariantProps, cva } from "class-variance-authority";
import * as React from "react";

import { cn } from "~/lib/utils";

import Icon from "./icon";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        "default": "bg-primary stroke-primary-foreground text-primary-foreground shadow hover:bg-primary/90",
        "destructive":
          "bg-destructive stroke-destructive-foreground text-destructive-foreground shadow-sm hover:bg-destructive/90",
        "outline-destructive":
          "border border-input bg-background text-destructive stroke-destructive shadow-sm hover:bg-destructive hover:text-destructive-foreground hover:stroke-destructive-foreground",
        "ghost-destructive":
          "stroke-destructive text-destructive hover:bg-destructive dark:hover:bg-destructive/20 hover:text-destructive-foreground hover:stroke-destructive-foreground",
        "outline":
          "border border-input bg-background stroke-foreground shadow-sm hover:bg-accent hover:text-accent-foreground hover:stroke-accent-foreground",
        "secondary":
          "bg-secondary stroke-secondary-foreground text-secondary-foreground shadow-sm hover:bg-secondary/80",
        "ghost": "stroke-foreground hover:bg-accent hover:text-accent-foreground hover:stroke-accent-foreground",
        "link": "text-primary underline-offset-4 hover:underline stroke-primary",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
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
  },
);
Button.displayName = "Button";

export interface LoadingButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading: boolean;
}
const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ className, variant, size, asChild = false, children, loading, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }), "relative overflow-hidden")}
        ref={ref}
        disabled={disabled ? true : loading}
        {...props}
      >
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center transition-all duration-300 ease-in-out",
            loading ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          )}
        >
          <Icon
            name='LoaderCircle'
            className='animate-spin'
          />
        </div>

        <div
          className={cn(
            "transition-all duration-300 ease-in-out inline-flex items-center justify-center gap-2",
            loading ? "opacity-0 -translate-y-10" : "opacity-100 translate-y-0"
          )}
        >
          {children}
        </div>
      </Comp>
    );
  },
);
LoadingButton.displayName = "LoadingButton";

export { Button, LoadingButton, buttonVariants };
