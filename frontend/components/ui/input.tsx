import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-sm border border-line bg-surface px-3 text-sm placeholder:text-muted focus-visible:border-ink disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
