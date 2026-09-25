import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/auth-token";

export async function GET() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ user: null });
  const session = await verifyToken(token);
  if (!session) return NextResponse.json({ user: null });
  return NextResponse.json({ user: { id: session.sub, name: session.name, email: session.email, role: session.role } });
}
