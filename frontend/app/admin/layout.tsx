import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LayoutDashboard, Users2, Landmark, ShieldCheck, AlertTriangle } from "lucide-react";
import { PortalShell, type NavItem } from "@/components/portal-shell";
import { verifyToken, COOKIE_NAME } from "@/lib/auth-token";

const navItems: NavItem[] = [
  { href: "/admin/dashboard", label: "Command Center", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/admin/pairs", label: "Pairings Monitor", icon: <Users2 className="h-4 w-4" /> },
  { href: "/admin/payroll", label: "Payroll Console", icon: <Landmark className="h-4 w-4" /> },
  { href: "/admin/accreditation", label: "Accreditation", icon: <ShieldCheck className="h-4 w-4" /> },
  { href: "/admin/disputes", label: "Disputes", icon: <AlertTriangle className="h-4 w-4" /> },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const token = cookies().get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session || session.role !== "admin") redirect("/login");

  return (
    <PortalShell role="admin" navItems={navItems} user={{ name: session.name, email: session.email }}>
      {children}
    </PortalShell>
  );
}
