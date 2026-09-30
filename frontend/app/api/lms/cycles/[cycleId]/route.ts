import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BACKEND_TOKEN_COOKIE_NAME } from "@/lib/auth-token";
import { extractFastAPIError } from "@/lib/fastapi-error";
import { FASTAPI_V1 } from "@/lib/server/fastapi-client";

/** GET /api/lms/cycles/[cycleId] — mentor: cycle detail with modules */
export async function GET(_req: Request, { params }: { params: { cycleId: string } }) {
  const token = cookies().get(BACKEND_TOKEN_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  try {
    const upstream = await fetch(`${FASTAPI_V1}/lms/cycles/${params.cycleId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await upstream.json().catch(() => null);
    if (!upstream.ok) return NextResponse.json({ error: extractFastAPIError(data) }, { status: upstream.status });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Couldn't reach the backend service." }, { status: 503 });
  }
}
