import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "link";
type Size = "sm" | "md" | "lg" | "icon";

const variantClasses: Record<Variant, string> = {
  primary: "bg-accent text-ink hover:bg-accent/88 border border-accent shadow-[0_0_0_1px_hsl(var(--accent)/0.35)]",
  secondary: "bg-surface text-accent-ink border border-accent/40 hover:border-accent hover:bg-accent/[0.08]",
  outline: "bg-transparent text-ink border border-line hover:border-ink/60 hover:bg-ink/[0.04]",
  ghost: "bg-transparent text-ink hover:bg-ink/[0.06] border border-transparent",
  danger: "bg-transparent text-danger border border-danger/40 hover:bg-danger/[0.10]",
  link: "bg-transparent text-accent-ink underline underline-offset-4 decoration-accent/40 hover:decoration-accent-ink border-0 p-0 h-auto",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-[15px]",
  icon: "h-9 w-9 p-0",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-sm font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
