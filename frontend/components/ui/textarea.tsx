import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "mt-1.5 flex min-h-[90px] w-full rounded-lg border border-line/80 bg-surface2",
          "px-3.5 py-2.5 text-sm text-ink",
          "placeholder:text-muted/60",
          "transition-colors duration-150",
          "hover:border-muted/50",
          "focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20",
          "disabled:cursor-not-allowed disabled:opacity-40",
          "resize-y",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";
