import { NextResponse } from "next/server";
import { extractFastAPIError } from "@/lib/fastapi-error";
import { attachSessionCookie, FASTAPI_V1, type FastAPITokenResponse } from "@/lib/server/fastapi-client";

// Signs in to a seeded demo persona — a genuine login against FastAPI, not
// a client-side state flip. See backend/scripts/seed.py for the accounts.
export async function POST(req: Request) {
  const body = await req.text();

  let upstream: Response;
  try {
    upstream = await fetch(`${FASTAPI_V1}/auth/demo-login`, {
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
  const res = NextResponse.json({ user });
  return await attachSessionCookie(res, access_token, user);
}
