import * as React from "react";
import { cn } from "@/lib/utils";

type Tone =
  | "default"
  | "student"
  | "mentor"
  | "admin"
  | "success"
  | "danger"
  | "warning"
  | "accent";

const toneClasses: Record<Tone, string> = {
  default: "bg-surface2 text-ink/80 border-line/60",
  student: "bg-[hsl(213_94%_62%/0.12)] text-[hsl(213_94%_75%)] border-[hsl(213_94%_62%/0.25)]",
  mentor:  "bg-[hsl(175_55%_48%/0.12)] text-[hsl(175_55%_65%)] border-[hsl(175_55%_48%/0.25)]",
  admin:   "bg-[hsl(250_55%_68%/0.12)] text-[hsl(250_55%_78%)] border-[hsl(250_55%_68%/0.25)]",
  success: "bg-[hsl(152_48%_50%/0.12)] text-[hsl(152_48%_65%)] border-[hsl(152_48%_50%/0.25)]",
  danger:  "bg-[hsl(4_80%_60%/0.12)]  text-[hsl(4_80%_72%)]   border-[hsl(4_80%_60%/0.25)]",
  warning: "bg-[hsl(40_92%_58%/0.12)] text-[hsl(40_92%_70%)]  border-[hsl(40_92%_58%/0.25)]",
  accent:  "bg-[hsl(213_94%_62%/0.12)] text-[hsl(213_94%_75%)] border-[hsl(213_94%_62%/0.25)]",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ tone = "default", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase",
        toneClasses[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
