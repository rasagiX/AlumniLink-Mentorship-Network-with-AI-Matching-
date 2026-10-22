import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BACKEND_TOKEN_COOKIE_NAME } from "@/lib/auth-token";
import { extractFastAPIError } from "@/lib/fastapi-error";
import { attachSessionCookie, FASTAPI_V1, type FastAPITokenResponse } from "@/lib/server/fastapi-client";

/**
 * POST /api/profile/set-year
 * Onboarding step — sets the user's year + branch, backend auto-promotes
 * student → senior if year >= 3 and issues a fresh JWT.
 * We re-attach session cookies so the portal updates without re-login.
 */
export async function POST(req: Request) {
  const token = cookies().get(BACKEND_TOKEN_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const body = await req.text();
  try {
    const upstream = await fetch(`${FASTAPI_V1}/profile/me/set-year`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body,
      cache: "no-store",
    });
    const data = await upstream.json().catch(() => null);
    if (!upstream.ok)
      return NextResponse.json({ error: extractFastAPIError(data) }, { status: upstream.status });

    const { access_token, user } = data as FastAPITokenResponse;
    const res = NextResponse.json({ user });
    return await attachSessionCookie(res, access_token, user);
  } catch {
    return NextResponse.json({ error: "Couldn't reach the backend." }, { status: 503 });
  }
}
