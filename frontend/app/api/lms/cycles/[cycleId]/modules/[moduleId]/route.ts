import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BACKEND_TOKEN_COOKIE_NAME } from "@/lib/auth-token";
import { extractFastAPIError } from "@/lib/fastapi-error";
import { FASTAPI_V1 } from "@/lib/server/fastapi-client";

type Ctx = { params: { cycleId: string; moduleId: string } };

/** PUT /api/lms/cycles/[cycleId]/modules/[moduleId] — mentor: edit a module */
export async function PUT(req: Request, { params }: Ctx) {
  const token = cookies().get(BACKEND_TOKEN_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const body = await req.text();
  try {
    const upstream = await fetch(
      `${FASTAPI_V1}/lms/cycles/${params.cycleId}/modules/${params.moduleId}`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body,
        cache: "no-store",
      }
    );
    const data = await upstream.json().catch(() => null);
    if (!upstream.ok) return NextResponse.json({ error: extractFastAPIError(data) }, { status: upstream.status });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Couldn't reach the backend service." }, { status: 503 });
  }
}

/** DELETE /api/lms/cycles/[cycleId]/modules/[moduleId] — mentor: remove a module */
export async function DELETE(_req: Request, { params }: Ctx) {
  const token = cookies().get(BACKEND_TOKEN_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  try {
    const upstream = await fetch(
      `${FASTAPI_V1}/lms/cycles/${params.cycleId}/modules/${params.moduleId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    );
    if (upstream.status === 204) return new NextResponse(null, { status: 204 });
    const data = await upstream.json().catch(() => null);
    return NextResponse.json({ error: extractFastAPIError(data) }, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: "Couldn't reach the backend service." }, { status: 503 });
  }
}
