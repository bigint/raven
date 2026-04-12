"use client";

import { Button as BaseButton } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes, Ref } from "react";
import { cn } from "../cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap",
  {
    defaultVariants: {
      size: "md",
      variant: "primary"
    },
    variants: {
      size: {
        lg: "h-9 px-3.5 text-sm",
        md: "h-8 px-3 text-sm",
        sm: "h-[26px] px-2.5 text-xs"
      },
      variant: {
        destructive:
          "bg-primary text-primary-foreground hover:opacity-90 font-semibold",
        ghost: "text-muted-foreground hover:bg-accent hover:text-foreground",
        primary: "bg-primary text-primary-foreground hover:opacity-90",
        secondary:
          "border border-border bg-background text-foreground hover:bg-accent hover:border-input"
      }
    }
  }
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

const Button = ({
  className,
  variant,
  size,
  type = "button",
  ref,
  ...props
}: ButtonProps & { ref?: Ref<HTMLButtonElement> }) => (
  <BaseButton
    className={cn(buttonVariants({ className, size, variant }))}
    ref={ref}
    type={type}
    {...props}
  />
);

export type { ButtonProps };
export { Button, buttonVariants };
