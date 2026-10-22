import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BACKEND_TOKEN_COOKIE_NAME } from "@/lib/auth-token";
import { extractFastAPIError } from "@/lib/fastapi-error";
import { FASTAPI_V1 } from "@/lib/server/fastapi-client";

type Ctx = { params: { cycleId: string; moduleId: string } };

/** POST — mentor upload a file for a module (multipart/form-data) */
export async function POST(req: Request, { params }: Ctx) {
  const token = cookies().get(BACKEND_TOKEN_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const body = await req.arrayBuffer();
  const contentType = req.headers.get("content-type") ?? "multipart/form-data";

  try {
    const upstream = await fetch(
      `${FASTAPI_V1}/lms/cycles/${params.cycleId}/modules/${params.moduleId}/materials`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "content-type": contentType },
        body,
        cache: "no-store",
      }
    );
    const data = await upstream.json().catch(() => null);
    if (!upstream.ok) return NextResponse.json({ error: extractFastAPIError(data) }, { status: upstream.status });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Couldn't reach the backend." }, { status: 503 });
  }
}
