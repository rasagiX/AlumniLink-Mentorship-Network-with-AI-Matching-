import { NextResponse } from "next/server";
import { BACKEND_TOKEN_COOKIE_NAME, COOKIE_NAME } from "@/lib/auth-token";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
  res.cookies.set(BACKEND_TOKEN_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return res;
}
