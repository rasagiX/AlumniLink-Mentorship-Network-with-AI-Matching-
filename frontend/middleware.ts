import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth-token";

const ROLE_HOME: Record<string, string> = {
  student: "/student/dashboard",
  mentor:  "/alumni/dashboard",
  admin:   "/admin/dashboard",
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isStudentRoute = pathname === "/student" || pathname.startsWith("/student/");
  const isAlumniRoute  = pathname === "/alumni"  || pathname.startsWith("/alumni/");
  const isAdminRoute   = pathname === "/admin"   || pathname.startsWith("/admin/");
  // Live video classes: only the student and mentor of a class get in (the
  // backend enforces *which* class; this keeps signed-out visitors out).
  const isVideoRoute   = pathname === "/video-class" || pathname.startsWith("/video-class/");

  if (!isStudentRoute && !isAlumniRoute && !isAdminRoute && !isVideoRoute) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;

  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", isVideoRoute ? pathname + req.nextUrl.search : pathname);
    return NextResponse.redirect(loginUrl);
  }

  const { role } = session;

  if (isVideoRoute) {
    if (role === "admin") return NextResponse.redirect(new URL(ROLE_HOME.admin, req.url));
    return NextResponse.next();
  }
  if (isStudentRoute) {
    if (role !== "student") return NextResponse.redirect(new URL(ROLE_HOME[role] ?? "/login", req.url));
    return NextResponse.next();
  }
  if (isAlumniRoute) {
    if (role !== "mentor") return NextResponse.redirect(new URL(ROLE_HOME[role] ?? "/login", req.url));
    return NextResponse.next();
  }
  if (isAdminRoute) {
    if (role !== "admin") return NextResponse.redirect(new URL(ROLE_HOME[role] ?? "/login", req.url));
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/student/:path*", "/alumni/:path*", "/admin/:path*", "/video-class/:path*"],
};
