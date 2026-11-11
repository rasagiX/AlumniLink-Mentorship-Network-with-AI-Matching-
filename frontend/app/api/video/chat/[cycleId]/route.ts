import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BACKEND_TOKEN_COOKIE_NAME } from "@/lib/auth-token";
import { extractFastAPIError } from "@/lib/fastapi-error";
import { FASTAPI_V1 } from "@/lib/server/fastapi-client";

/** GET /api/video/chat/[cycleId]?limit=50&before_id=... — paginated chat history */
export async function GET(
  _req: Request,
  { params }: { params: { cycleId: string } }
) {
  const token = cookies().get(BACKEND_TOKEN_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const url = new URL(_req.url);
  const qs = new URLSearchParams();
  const limit    = url.searchParams.get("limit");
  const beforeId = url.searchParams.get("before_id");
  if (limit)    qs.set("limit", limit);
  if (beforeId) qs.set("before_id", beforeId);

  try {
    const upstream = await fetch(
      `${FASTAPI_V1}/video/chat/${params.cycleId}?${qs.toString()}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
    );
    const data = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      return NextResponse.json({ error: extractFastAPIError(data) }, { status: upstream.status });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Couldn't reach the backend." }, { status: 503 });
  }
}
