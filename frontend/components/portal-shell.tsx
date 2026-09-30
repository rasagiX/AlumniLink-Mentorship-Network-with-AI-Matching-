"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { RoleSwitcher } from "@/components/role-switcher";
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
}

const ROLE_TONE: Record<Role, "student" | "mentor" | "admin"> = {
  student: "student",
  mentor: "mentor",
  admin: "admin",
};

const ROLE_LABEL: Record<Role, string> = {
  student: "Student Portal",
  mentor: "Alumni Mentor Portal",
  admin: "Institutional Admin Console",
};

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

  return (
    <div className="min-h-screen bg-paper">
      <div className="flex">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-surface md:flex">
          <div className="flex items-center gap-2 border-b border-line px-5 py-5">
            <Compass className="h-5 w-5" />
            <span className="font-display text-lg font-medium">AlumniLink</span>
          </div>
          <div className="px-5 pb-3 pt-4">
            <Badge tone={ROLE_TONE[role]}>{ROLE_LABEL[role]}</Badge>
          </div>
          <nav className="flex-1 space-y-0.5 px-3 py-2">
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
          <div className="flex items-center gap-3 border-t border-line px-4 py-4">
            <Avatar name={user.name} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted">{user.email}</p>
              <SignOutButton />
            </div>
          </div>
        </aside>
        <main className="min-h-screen flex-1 pb-24">
          <div className="mx-auto max-w-content px-5 py-6 md:px-8 md:py-8">{children}</div>
        </main>
      </div>
      <RoleSwitcher currentRole={role} />
    </div>
  );
}

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
        <h1 className="font-display text-2xl font-medium tracking-tight text-ink sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1 max-w-xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
