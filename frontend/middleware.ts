import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth-token";

const ROLE_HOME: Record<string, string> = {
  student: "/student/dashboard",
  senior:  "/student/senior/dashboard",
  mentor:  "/alumni/dashboard",
  admin:   "/admin/dashboard",
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Route groups that need auth
  const isStudentRoute = pathname === "/student" || pathname.startsWith("/student/");
  const isAlumniRoute  = pathname === "/alumni"  || pathname.startsWith("/alumni/");
  const isAdminRoute   = pathname === "/admin"   || pathname.startsWith("/admin/");

  if (!isStudentRoute && !isAlumniRoute && !isAdminRoute) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;

  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = session.role;

  // /student/senior/* is the merged senior portal — accessible by seniors only
  if (pathname.startsWith("/student/senior")) {
    if (role !== "senior") {
      return NextResponse.redirect(new URL(ROLE_HOME[role] ?? "/login", req.url));
    }
    return NextResponse.next();
  }

  // Regular /student/* — accessible by students only
  if (isStudentRoute) {
    if (role !== "student") {
      return NextResponse.redirect(new URL(ROLE_HOME[role] ?? "/login", req.url));
    }
    return NextResponse.next();
  }

  // /alumni/* — mentor only
  if (isAlumniRoute) {
    if (role !== "mentor") {
      return NextResponse.redirect(new URL(ROLE_HOME[role] ?? "/login", req.url));
    }
    return NextResponse.next();
  }

  // /admin/* — admin only
  if (isAdminRoute) {
    if (role !== "admin") {
      return NextResponse.redirect(new URL(ROLE_HOME[role] ?? "/login", req.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/student/:path*", "/alumni/:path*", "/admin/:path*"],
};
