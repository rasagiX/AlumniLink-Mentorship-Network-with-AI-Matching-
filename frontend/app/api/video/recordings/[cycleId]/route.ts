import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BACKEND_TOKEN_COOKIE_NAME } from "@/lib/auth-token";
import { extractFastAPIError } from "@/lib/fastapi-error";
import { FASTAPI_V1 } from "@/lib/server/fastapi-client";

/** GET /api/video/recordings/[cycleId] — list all recordings */
export async function GET(
  _req: Request,
  { params }: { params: { cycleId: string } }
) {
  const token = cookies().get(BACKEND_TOKEN_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  try {
    const upstream = await fetch(`${FASTAPI_V1}/video/recordings/${params.cycleId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      return NextResponse.json({ error: extractFastAPIError(data) }, { status: upstream.status });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Couldn't reach the backend." }, { status: 503 });
  }
}

/** POST /api/video/recordings/[cycleId] — upload recording blob */
export async function POST(
  req: Request,
  { params }: { params: { cycleId: string } }
) {
  const token = cookies().get(BACKEND_TOKEN_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  try {
    // Forward the multipart/form-data body as-is
    const formData = await req.formData();
    const upstream = await fetch(`${FASTAPI_V1}/video/recordings/${params.cycleId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
      cache: "no-store",
    });
    const data = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      return NextResponse.json({ error: extractFastAPIError(data) }, { status: upstream.status });
    }
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Couldn't reach the backend." }, { status: 503 });
  }
}
