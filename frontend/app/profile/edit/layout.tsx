import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken, COOKIE_NAME } from "@/lib/auth-token";

export default async function ProfileEditLayout({ children }: { children: React.ReactNode }) {
  const token = cookies().get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  // Any logged-in role can edit their profile; unauthenticated users go to login
  if (!session) redirect("/login");
  return <>{children}</>;
}
