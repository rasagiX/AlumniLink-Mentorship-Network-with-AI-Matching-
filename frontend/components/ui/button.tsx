import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "danger" | "accent";
  size?: "xs" | "sm" | "md" | "lg";
  asChild?: boolean;
}

const variantClasses: Record<string, string> = {
  default:
    "bg-ink text-paper border-transparent hover:bg-ink/90 shadow-sm",
  accent:
    "bg-accent text-paper border-transparent hover:bg-accent-dim shadow-[0_0_20px_hsl(var(--accent)/0.25)] hover:shadow-[0_0_28px_hsl(var(--accent)/0.35)]",
  outline:
    "border-line bg-transparent text-ink hover:bg-surface2 hover:border-muted/40",
  ghost:
    "border-transparent bg-transparent text-ink hover:bg-surface2",
  danger:
    "bg-[hsl(4_80%_60%)] text-white border-transparent hover:bg-[hsl(4_80%_52%)] shadow-sm",
};

const sizeClasses: Record<string, string> = {
  xs: "h-7  px-2.5 text-xs  gap-1.5 rounded-md",
  sm: "h-8  px-3   text-xs  gap-1.5 rounded-md",
  md: "h-9  px-4   text-sm  gap-2   rounded-lg",
  lg: "h-11 px-6   text-sm  gap-2   rounded-lg",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", size = "md", asChild = false, className, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center border font-medium transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
          "disabled:pointer-events-none disabled:opacity-40",
          "select-none whitespace-nowrap",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);
Button.displayName = "Button";
