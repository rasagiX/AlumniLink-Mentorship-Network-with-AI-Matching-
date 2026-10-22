import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken, COOKIE_NAME } from "@/lib/auth-token";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const token = cookies().get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  // Must be logged in; if not redirect to login
  if (!session) redirect("/login");
  // Mentors and admins don't need onboarding
  if (session.role === "mentor" || session.role === "admin") {
    redirect(session.role === "mentor" ? "/alumni/dashboard" : "/admin/dashboard");
  }
  return <>{children}</>;
}
