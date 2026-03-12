"use client";

import { type VariantProps, cva } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50",
  {
    defaultVariants: {
      size: "md",
      variant: "primary",
    },
    variants: {
      size: {
        lg: "px-6 py-3 text-base",
        md: "px-4 py-2",
        sm: "px-3 py-1.5 text-xs",
      },
      variant: {
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        ghost:
          "hover:bg-accent hover:text-accent-foreground hover:opacity-100",
        primary: "bg-primary text-primary-foreground",
        secondary:
          "border border-border bg-background hover:bg-accent hover:opacity-100",
      },
    },
  }
);

type ButtonVariants = VariantProps<typeof buttonVariants>;

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonVariants {}

const Button = ({
  className,
  size,
  variant,
  ...props
}: ButtonProps) => (
  <button
    className={cn(buttonVariants({ className, size, variant }))}
    {...props}
  />
);

export { Button, buttonVariants };
export type { ButtonProps };
