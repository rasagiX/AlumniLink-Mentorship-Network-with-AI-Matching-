import { NextResponse } from "next/server";
import { extractFastAPIError } from "@/lib/fastapi-error";
import { FASTAPI_V1 } from "@/lib/server/fastapi-client";

/**
 * POST /api/auth/register/alumni
 * Creates a PENDING alumni application — no account, no session cookie.
 * Returns { message, status: "pending" } on success.
 */
export async function POST(req: Request) {
  const body = await req.text();
  let upstream: Response;
  try {
    upstream = await fetch(`${FASTAPI_V1}/auth/register/alumni`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "Couldn't reach the auth service." }, { status: 503 });
  }

  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) {
    return NextResponse.json({ error: extractFastAPIError(data) }, { status: upstream.status });
  }

  // 201 with { message, status }
  return NextResponse.json(data, { status: 201 });
}
