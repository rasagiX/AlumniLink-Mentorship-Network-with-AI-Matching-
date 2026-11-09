"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserCircle, ChevronRight, Zap } from "lucide-react";
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
  year?: number | null;
  branch?: string | null;
  avatarColor?: string | null;
}

// ─── Role metadata ─────────────────────────────────────────────────────────
type BadgeTone = "student" | "mentor" | "admin";

const ROLE_TONE: Record<Role, BadgeTone> = {
  student: "student",
  senior:  "student",
  mentor:  "mentor",
  admin:   "admin",
};

const ROLE_LABEL: Record<Role, string> = {
  student: "Student Portal",
  senior:  "Senior Portal",
  mentor:  "Alumni Mentor",
  admin:   "Admin Console",
};

const ROLE_ACCENT: Record<Role, string> = {
  student: "from-[hsl(var(--role-student)/0.15)] to-[hsl(var(--role-student)/0.05)]",
  senior:  "from-[hsl(var(--role-student)/0.15)] to-[hsl(var(--role-student)/0.05)]",
  mentor:  "from-[hsl(var(--role-mentor)/0.15)]  to-[hsl(var(--role-mentor)/0.05)]",
  admin:   "from-[hsl(var(--role-admin)/0.15)]   to-[hsl(var(--role-admin)/0.05)]",
};

const YEAR_LABELS: Record<number, string> = {
  1: "1st Year", 2: "2nd Year", 3: "3rd Year",
  4: "4th Year", 5: "5th Year", 6: "Final Year",
};

// ─── Initials avatar ───────────────────────────────────────────────────────
function InitialsAvatar({
  name, color, size = "md",
}: { name: string; color?: string | null; size?: "sm" | "md" | "lg" }) {
  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  const bg = color ?? "#4f87f5";
  const cls = {
    sm: "h-7 w-7 text-[10px]",
    md: "h-9 w-9 text-xs",
    lg: "h-11 w-11 text-sm",
  }[size];

  return (
    <div
      className={cn("rounded-full font-bold text-white flex items-center justify-center shrink-0 ring-2 ring-white/10", cls)}
      style={{ backgroundColor: bg }}
    >
      {initials}
    </div>
  );
}

// ─── Mobile nav drawer (hamburger menu) ───────────────────────────────────
function MobileDrawer({
  open, onClose, role, navItems, user,
}: {
  open: boolean;
  onClose: () => void;
  role: Role;
  navItems: NavItem[];
  user: PortalUser;
}) {
  const pathname = usePathname();

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-paper/70 backdrop-blur-sm md:hidden" onClick={onClose} aria-hidden />
      {/* Drawer */}
      <aside className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-surface shadow-sheet md:hidden animate-fade-up">
        <SidebarContent role={role} navItems={navItems} user={user} pathname={pathname} />
      </aside>
    </>
  );
}

// ─── Reusable sidebar content ──────────────────────────────────────────────
function SidebarContent({
  role, navItems, user, pathname,
}: {
  role: Role; navItems: NavItem[]; user: PortalUser; pathname: string | null;
}) {
  const yearLabel = user.year ? YEAR_LABELS[user.year] : null;
  const subLabel  = [yearLabel, user.branch].filter(Boolean).join(" · ");

  return (
    <div className="flex h-full flex-col">
      {/* ── Logo ── */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-line/60">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-dim shadow-glow shrink-0">
          <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
        </div>
        <div className="leading-none">
          <p className="font-display text-base font-semibold tracking-tight text-ink">AlumniLink</p>
          <p className="text-[10px] text-muted/70 mt-0.5">Mentorship Network</p>
        </div>
      </div>

      {/* ── Role pill ── */}
      <div className={cn("mx-4 mt-4 rounded-xl bg-gradient-to-b px-4 py-3", ROLE_ACCENT[role])}>
        <Badge tone={ROLE_TONE[role]}>{ROLE_LABEL[role]}</Badge>
        {subLabel && (
          <p className="mt-1.5 text-[11px] text-muted/80 font-medium">{subLabel}</p>
        )}
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
        {navItems.map((item) => {
          const active = pathname === item.href || !!pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150",
                active
                  ? "bg-accent text-white shadow-glow"
                  : "text-muted hover:bg-surface2 hover:text-ink"
              )}
            >
              <span className={cn(
                "shrink-0 transition-transform duration-150",
                active ? "text-white" : "text-muted group-hover:text-ink group-hover:scale-110"
              )}>
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="h-3.5 w-3.5 text-white/70 shrink-0" />}
            </Link>
          );
        })}
      </nav>

      {/* ── User block ── */}
      <div className="border-t border-line/60 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-surface2/60 p-3">
          <InitialsAvatar name={user.name} color={user.avatarColor} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
            <p className="truncate text-xs text-muted/70">{user.email}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1 px-1">
          <SignOutButton />
          <span className="text-line">·</span>
          <Link
            href="/profile/edit"
            className="flex items-center gap-1 text-xs text-muted transition-colors hover:text-ink"
          >
            <UserCircle className="h-3 w-3" />
            Edit profile
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── PortalShell ────────────────────────────────────────────────────────────
export function PortalShell({
  role, navItems, user, children,
}: {
  role: Role; navItems: NavItem[]; user: PortalUser; children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  // Close drawer on route change
  React.useEffect(() => setDrawerOpen(false), [pathname]);

  return (
    <div className="min-h-screen bg-paper">
      <div className="flex">
        {/* ── Desktop sidebar ── */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line/60 bg-surface md:flex">
          <SidebarContent role={role} navItems={navItems} user={user} pathname={pathname} />
        </aside>

        {/* ── Mobile drawer ── */}
        <MobileDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          role={role}
          navItems={navItems}
          user={user}
        />

        {/* ── Mobile top bar ── */}
        <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-line/60 bg-surface/90 backdrop-blur-md px-4 md:hidden">
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface2 hover:text-ink transition-colors"
            aria-label="Open navigation"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
              <path d="M2 3.5h12M2 8h12M2 12.5h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-accent to-accent-dim shadow-glow">
              <Zap className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-display text-sm font-semibold text-ink">AlumniLink</span>
          </div>

          <Link href="/profile/edit" className="shrink-0">
            <InitialsAvatar name={user.name} color={user.avatarColor} size="sm" />
          </Link>
        </div>

        {/* ── Main content ── */}
        <main className="min-h-screen flex-1 pb-24 pt-14 md:pt-0">
          <div className="mx-auto max-w-content px-4 py-6 md:px-8 md:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

// ─── PageHeader ─────────────────────────────────────────────────────────────
export function PageHeader({
  title, description, actions, eyebrow,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-accent/80">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-xl text-sm text-muted/80">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

// ─── StatCard ────────────────────────────────────────────────────────────────
export function StatCard({
  label, value, sub, icon, tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon?: React.ReactNode;
  tone?: "default" | "accent" | "success" | "warning" | "danger";
}) {
  const toneStyles = {
    default: "border-line/60",
    accent:  "border-accent/20  bg-gradient-to-br from-accent/[0.07]  to-transparent",
    success: "border-success/20 bg-gradient-to-br from-success/[0.07] to-transparent",
    warning: "border-warning/20 bg-gradient-to-br from-warning/[0.07] to-transparent",
    danger:  "border-danger/20  bg-gradient-to-br from-danger/[0.07]  to-transparent",
  };

  return (
    <div className={cn(
      "rounded-xl border bg-surface p-5 shadow-card transition-shadow duration-200 hover:shadow-card-hover",
      toneStyles[tone]
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted/70">{label}</p>
          <p className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-ink tabular">
            {value}
          </p>
          {sub && <p className="mt-1 text-xs text-muted/70">{sub}</p>}
        </div>
        {icon && (
          <div className="shrink-0 rounded-xl bg-surface2 p-2.5 text-muted">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
