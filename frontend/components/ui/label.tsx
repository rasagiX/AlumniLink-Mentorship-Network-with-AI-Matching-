import * as React from "react";
import { cn } from "@/lib/utils";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export function Label({ className, children, ...props }: LabelProps) {
  return (
    <label
      className={cn(
        "block text-xs font-semibold uppercase tracking-widest text-muted/80",
        className
      )}
      {...props}
    >
      {children}
    </label>
  );
}
