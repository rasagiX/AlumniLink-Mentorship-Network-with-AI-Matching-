import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LayoutDashboard, Users, GraduationCap, CalendarDays, LifeBuoy, UserCircle, BookOpenCheck } from "lucide-react";
import { PortalShell, type NavItem } from "@/components/portal-shell";
import { verifyToken, COOKIE_NAME } from "@/lib/auth-token";
import { getProfileForShell } from "@/lib/server/get-profile";

const navItems: NavItem[] = [
  { href: "/student/senior/dashboard",  label: "Dashboard",           icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/student/senior/juniors",    label: "My Juniors",          icon: <GraduationCap className="h-4 w-4" /> },
  { href: "/student/senior/my-alumni",  label: "My Alumni Mentor",    icon: <Users className="h-4 w-4" /> },
  { href: "/student/senior/sessions",   label: "Sessions",            icon: <CalendarDays className="h-4 w-4" /> },
  { href: "/student/directory",         label: "Alumni Directory",    icon: <Users className="h-4 w-4" /> },
  { href: "/student/seniors",           label: "Seniors Directory",   icon: <BookOpenCheck className="h-4 w-4" /> },
  { href: "/student/senior/support",    label: "Support",             icon: <LifeBuoy className="h-4 w-4" /> },
  { href: "/profile/edit",              label: "Edit Profile",        icon: <UserCircle className="h-4 w-4" /> },
];

export default async function SeniorNestedLayout({ children }: { children: React.ReactNode }) {
  const token = cookies().get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session || session.role !== "senior") redirect("/login");

  const profile = await getProfileForShell();

  return (
    <PortalShell
      role="senior"
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
