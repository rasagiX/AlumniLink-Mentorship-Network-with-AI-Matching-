import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LayoutDashboard, Users2, ShieldCheck, AlertTriangle, LifeBuoy, UserCircle } from "lucide-react";
import { PortalShell, type NavItem } from "@/components/portal-shell";
import { verifyToken, COOKIE_NAME } from "@/lib/auth-token";
import { getProfileForShell } from "@/lib/server/get-profile";

const navItems: NavItem[] = [
  { href: "/admin/dashboard",    label: "Command Center",   icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/admin/pairs",        label: "Pairings Monitor", icon: <Users2 className="h-4 w-4" /> },
  { href: "/admin/accreditation",label: "Accreditation",    icon: <ShieldCheck className="h-4 w-4" /> },
  { href: "/admin/disputes",     label: "Disputes",         icon: <AlertTriangle className="h-4 w-4" /> },
  { href: "/admin/support",      label: "Support Tickets",  icon: <LifeBuoy className="h-4 w-4" /> },
  { href: "/profile/edit",       label: "Edit Profile",     icon: <UserCircle className="h-4 w-4" /> },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const token = cookies().get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session || session.role !== "admin") redirect("/login");

  const profile = await getProfileForShell();

  return (
    <PortalShell
      role="admin"
      navItems={navItems}
      user={{
        name: session.name,
        email: session.email,
        year: profile.year,
        branch: profile.branch,
        avatarColor: profile.avatar_color,
      }}
    >
      {children}
    </PortalShell>
  );
}
