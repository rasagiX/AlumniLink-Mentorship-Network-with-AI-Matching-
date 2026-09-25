"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Users, ShieldCheck, ChevronUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

const ROLE_META: Record<Role, { label: string; icon: React.ElementType; home: string; tone: string }> = {
  student: { label: "Student", icon: GraduationCap, home: "/student/dashboard", tone: "role-student" },
  mentor: { label: "Mentor", icon: Users, home: "/alumni/dashboard", tone: "role-mentor" },
  admin: { label: "Admin", icon: ShieldCheck, home: "/admin/dashboard", tone: "role-admin" },
};

/**
 * Floating evaluation-mode switcher. Picking a role calls the real
 * /api/auth/demo endpoint, which signs a fresh session for that seeded
 * demo persona — this is a genuine (re-)authentication, not a client-side
 * state flip, so it exercises the same backend as a normal sign-in.
 */
export function RoleSwitcher({ currentRole }: { currentRole: Role }) {
  const [open, setOpen] = React.useState(false);
  const [switching, setSwitching] = React.useState<Role | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const router = useRouter();

  const ActiveIcon = ROLE_META[currentRole].icon;

  const handlePick = async (r: Role) => {
    if (r === currentRole) {
      setOpen(false);
      return;
    }
    setSwitching(r);
    setError(null);
    try {
      const res = await fetch("/api/auth/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: r }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not switch roles.");
      }
      setOpen(false);
      router.push(ROLE_META[r].home);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not switch roles.");
    } finally {
      setSwitching(null);
    }
  };

  return (
    <div className="fixed bottom-5 left-5 z-40 select-none">
      {open && (
        <div className="mb-2 w-64 overflow-hidden rounded-md border border-line bg-surface shadow-xl">
          <div className="border-b border-line px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted">
            Preview as
          </div>
          {(Object.keys(ROLE_META) as Role[]).map((r) => {
            const meta = ROLE_META[r];
            const Icon = meta.icon;
            const isSwitching = switching === r;
            return (
              <button
                key={r}
                onClick={() => handlePick(r)}
                disabled={!!switching}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-ink/[0.05] disabled:cursor-wait",
                  currentRole === r && "bg-ink/[0.04] font-medium"
                )}
              >
                {isSwitching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Icon className="h-4 w-4" style={{ color: `hsl(var(--${meta.tone}))` }} />
                )}
                {meta.label} Portal
                {currentRole === r && <span className="ml-auto text-[10px] text-muted">Active</span>}
              </button>
            );
          })}
          {error && <p className="border-t border-line px-3 py-2 text-[11px] text-danger">{error}</p>}
          <div className="border-t border-line px-3 py-2 text-[11px] text-muted">
            Signs in to a seeded demo account for that role through the real auth backend.
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-line bg-ink px-4 py-2.5 text-sm font-medium text-paper shadow-lg transition-transform hover:-translate-y-0.5"
      >
        <ActiveIcon className="h-4 w-4" />
        {ROLE_META[currentRole].label} view
        <ChevronUp className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>
    </div>
  );
}
