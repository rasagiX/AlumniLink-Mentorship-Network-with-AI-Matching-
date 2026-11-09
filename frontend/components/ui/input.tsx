import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "mt-1.5 flex h-10 w-full rounded-lg border border-line/80 bg-surface2",
          "px-3.5 py-2 text-sm text-ink",
          "placeholder:text-muted/60",
          "transition-colors duration-150",
          "hover:border-muted/50",
          "focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20",
          "disabled:cursor-not-allowed disabled:opacity-40",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
