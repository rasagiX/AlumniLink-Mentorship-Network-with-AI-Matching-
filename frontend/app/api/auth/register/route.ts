import { NextResponse } from "next/server";
import { extractFastAPIError } from "@/lib/fastapi-error";
import { attachSessionCookie, FASTAPI_V1, type FastAPITokenResponse } from "@/lib/server/fastapi-client";

// Proxies to the FastAPI backend, which owns the actual user table
// (Postgres) and the mentor-roster gating logic. This route's only job is
// to relay the request and, on success, turn FastAPI's access_token into
// this app's httpOnly session cookie.
export async function POST(req: Request) {
  const body = await req.text();

  let upstream: Response;
  try {
    upstream = await fetch(`${FASTAPI_V1}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: "Couldn't reach the auth service. Is the FastAPI backend running?" },
      { status: 503 }
    );
  }

  const data = await upstream.json().catch(() => null);

  if (!upstream.ok) {
    return NextResponse.json({ error: extractFastAPIError(data) }, { status: upstream.status });
  }

  const { access_token, user } = data as FastAPITokenResponse;
  const res = NextResponse.json({ user }, { status: upstream.status });
  return await attachSessionCookie(res, access_token, user);
}
