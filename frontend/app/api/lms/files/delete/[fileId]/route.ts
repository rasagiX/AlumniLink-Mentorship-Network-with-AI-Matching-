import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BACKEND_TOKEN_COOKIE_NAME } from "@/lib/auth-token";
import { extractFastAPIError } from "@/lib/fastapi-error";
import { FASTAPI_V1 } from "@/lib/server/fastapi-client";

export async function DELETE(_req: Request, { params }: { params: { fileId: string } }) {
  const token = cookies().get(BACKEND_TOKEN_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  try {
    const upstream = await fetch(`${FASTAPI_V1}/lms/files/${params.fileId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (upstream.status === 204) return new NextResponse(null, { status: 204 });
    const data = await upstream.json().catch(() => null);
    return NextResponse.json({ error: extractFastAPIError(data) }, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: "Couldn't reach the backend." }, { status: 503 });
  }
}
