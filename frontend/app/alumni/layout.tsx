import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LayoutDashboard, Inbox, BookOpenCheck, LifeBuoy, UserCircle } from "lucide-react";
import { PortalShell, type NavItem } from "@/components/portal-shell";
import { verifyToken, COOKIE_NAME } from "@/lib/auth-token";
import { getProfileForShell } from "@/lib/server/get-profile";

const navItems: NavItem[] = [
  { href: "/alumni/dashboard",  label: "Capacity Desk",    icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/alumni/requests",   label: "Mentee Requests",  icon: <Inbox className="h-4 w-4" /> },
  { href: "/alumni/lms",        label: "Module Authoring", icon: <BookOpenCheck className="h-4 w-4" /> },
  { href: "/alumni/support",    label: "Support",          icon: <LifeBuoy className="h-4 w-4" /> },
  { href: "/profile/edit",      label: "Edit Profile",     icon: <UserCircle className="h-4 w-4" /> },
];

export default async function AlumniLayout({ children }: { children: React.ReactNode }) {
  const token = cookies().get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session || session.role !== "mentor") redirect("/login");

  const profile = await getProfileForShell();

  return (
    <PortalShell
      role="mentor"
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
