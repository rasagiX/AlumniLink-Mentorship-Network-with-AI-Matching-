import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BACKEND_TOKEN_COOKIE_NAME } from "@/lib/auth-token";
import { extractFastAPIError } from "@/lib/fastapi-error";
import { FASTAPI_V1 } from "@/lib/server/fastapi-client";

/** POST /api/lms/modules/[moduleId]/submit — student: submit assignment */
export async function POST(req: Request, { params }: { params: { moduleId: string } }) {
  const token = cookies().get(BACKEND_TOKEN_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const body = await req.text();
  try {
    const upstream = await fetch(`${FASTAPI_V1}/lms/modules/${params.moduleId}/submit`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body,
      cache: "no-store",
    });
    const data = await upstream.json().catch(() => null);
    if (!upstream.ok) return NextResponse.json({ error: extractFastAPIError(data) }, { status: upstream.status });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Couldn't reach the backend service." }, { status: 503 });
  }
}
