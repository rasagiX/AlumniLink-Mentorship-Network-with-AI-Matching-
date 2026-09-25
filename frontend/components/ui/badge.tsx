import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "student" | "mentor" | "admin";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-ink/[0.06] text-ink border-line",
  accent: "bg-accent/[0.12] text-accent-ink border-accent/30",
  success: "bg-success/[0.10] text-success border-success/30",
  warning: "bg-warning/[0.12] text-warning border-warning/30",
  danger: "bg-danger/[0.10] text-danger border-danger/30",
  student: "bg-role-student/[0.10] text-role-student border-role-student/30",
  mentor: "bg-role-mentor/[0.10] text-role-mentor border-role-mentor/30",
  admin: "bg-role-admin/[0.10] text-role-admin border-role-admin/30",
};

export function Badge({ tone = "neutral", className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}
