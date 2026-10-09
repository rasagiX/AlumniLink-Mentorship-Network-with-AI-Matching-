"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, UserCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SignOutButton } from "@/components/sign-out-button";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

export interface PortalUser {
  name: string;
  email: string;
  /** Year + branch shown as a small badge under the role label */
  year?: number | null;
  branch?: string | null;
  /** Hex string — overrides the default initials avatar background */
  avatarColor?: string | null;
}

// ---------------------------------------------------------------------------
// Role metadata
// ---------------------------------------------------------------------------
type BadgeTone = "student" | "mentor" | "admin";

const ROLE_TONE: Record<Role, BadgeTone> = {
  student: "student",
  senior:  "student",   // reuse student tone; label differentiates
  mentor:  "mentor",
  admin:   "admin",
};

const ROLE_LABEL: Record<Role, string> = {
  student: "Student Portal",
  senior:  "Senior Portal",
  mentor:  "Alumni Mentor Portal",
  admin:   "Institutional Admin Console",
};

const YEAR_LABELS: Record<number, string> = {
  1: "1st Yr", 2: "2nd Yr", 3: "3rd Yr",
  4: "4th Yr", 5: "5th Yr", 6: "Final Yr",
};

// ---------------------------------------------------------------------------
// Initials avatar (with optional custom colour)
// ---------------------------------------------------------------------------
function InitialsAvatar({ name, color, size = "md" }: { name: string; color?: string | null; size?: "sm" | "md" }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const defaultColor = "#6366f1";
  const bg = color ?? defaultColor;

  const cls = size === "sm"
    ? "h-7 w-7 rounded-full text-xs font-semibold text-white flex items-center justify-center shrink-0"
    : "h-9 w-9 rounded-full text-sm font-semibold text-white flex items-center justify-center shrink-0";

  return (
    <div className={cls} style={{ backgroundColor: bg }}>
      {initials}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PortalShell
// ---------------------------------------------------------------------------
export function PortalShell({
  role,
  navItems,
  user,
  children,
}: {
  role: Role;
  navItems: NavItem[];
  user: PortalUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const yearLabel = user.year ? YEAR_LABELS[user.year] : null;
  const profileBadgeText = [yearLabel, user.branch].filter(Boolean).join(" · ");

  return (
    <div className="min-h-screen bg-paper">
      <div className="flex">
        {/* ── Sidebar ── */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-surface md:flex">
          {/* Logo */}
          <div className="flex items-center gap-2 border-b border-line px-5 py-5">
            <Compass className="h-5 w-5" />
            <span className="font-display text-lg font-medium">AlumniLink</span>
          </div>

          {/* Role badge + profile badge */}
          <div className="px-5 pb-2 pt-4 space-y-1.5">
            <Badge tone={ROLE_TONE[role]}>{ROLE_LABEL[role]}</Badge>
            {profileBadgeText && (
              <p className="text-[11px] text-muted font-medium tracking-wide">
                {profileBadgeText}
              </p>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-sm px-3 py-2.5 text-sm font-medium text-ink/75 transition-colors hover:bg-ink/[0.05] hover:text-ink",
                    active && "bg-ink text-paper hover:bg-ink hover:text-paper"
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User block */}
          <div className="border-t border-line px-4 py-4">
            <div className="flex items-center gap-3">
              <InitialsAvatar name={user.name} color={user.avatarColor} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="truncate text-xs text-muted">{user.email}</p>
                <div className="mt-1 flex items-center gap-2">
                  <SignOutButton />
                  <span className="text-muted">·</span>
                  <Link href="/profile/edit"
                    className="flex items-center gap-1 text-xs text-muted hover:text-ink transition-colors">
                    <UserCircle className="h-3 w-3" /> Profile
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Mobile header ── */}
        <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface px-4 md:hidden">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4" />
            <span className="font-display text-sm font-medium">AlumniLink</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={ROLE_TONE[role]} className="text-[10px]">{ROLE_LABEL[role]}</Badge>
            <Link href="/profile/edit" className="text-muted hover:text-ink">
              <InitialsAvatar name={user.name} color={user.avatarColor} size="sm" />
            </Link>
          </div>
        </div>

        {/* ── Main content ── */}
        <main className="min-h-screen flex-1 pb-24 pt-14 md:pt-0">
          <div className="mx-auto max-w-content px-5 py-6 md:px-8 md:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PageHeader
// ---------------------------------------------------------------------------
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-medium tracking-tight text-ink sm:text-[28px]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-xl text-sm text-muted">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
