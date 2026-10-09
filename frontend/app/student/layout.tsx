import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LayoutDashboard, Users, BookOpenCheck, LifeBuoy, GraduationCap, UserCircle } from "lucide-react";
import { PortalShell, type NavItem } from "@/components/portal-shell";
import { verifyToken, COOKIE_NAME } from "@/lib/auth-token";
import { getProfileForShell } from "@/lib/server/get-profile";

const navItems: NavItem[] = [
  { href: "/student/dashboard",  label: "Dashboard",         icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/student/directory",  label: "Mentor Directory",  icon: <Users className="h-4 w-4" /> },
  { href: "/student/seniors",    label: "Seniors Directory", icon: <GraduationCap className="h-4 w-4" /> },
  { href: "/student/lms",        label: "My Cohort (LMS)",   icon: <BookOpenCheck className="h-4 w-4" /> },
  { href: "/student/support",    label: "Support",           icon: <LifeBuoy className="h-4 w-4" /> },
  { href: "/profile/edit",       label: "Edit Profile",      icon: <UserCircle className="h-4 w-4" /> },
];

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const token = cookies().get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session || session.role !== "student") redirect("/login");

  const profile = await getProfileForShell();

  return (
    <PortalShell
      role="student"
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
