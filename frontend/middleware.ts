import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth-token";

const ROLE_PREFIX: Record<string, string> = {
  "/student": "student",
  "/alumni": "mentor",
  "/admin": "admin",
};

const ROLE_HOME: Record<string, string> = {
  student: "/student/dashboard",
  mentor: "/alumni/dashboard",
  admin: "/admin/dashboard",
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const prefix = Object.keys(ROLE_PREFIX).find((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!prefix) return NextResponse.next();

  const requiredRole = ROLE_PREFIX[prefix];
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;

  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (session.role !== requiredRole) {
    return NextResponse.redirect(new URL(ROLE_HOME[session.role], req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/student/:path*", "/alumni/:path*", "/admin/:path*"],
};
