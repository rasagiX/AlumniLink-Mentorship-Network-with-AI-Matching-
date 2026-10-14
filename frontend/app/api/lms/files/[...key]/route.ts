import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BACKEND_TOKEN_COOKIE_NAME } from "@/lib/auth-token";
import { FASTAPI_V1 } from "@/lib/server/fastapi-client";

/**
 * GET /api/lms/files/[...key]
 * Proxy the authenticated file download from backend.
 * Backend will redirect to R2 presigned URL or serve locally.
 */
export async function GET(_req: Request, { params }: { params: { key: string[] } }) {
  const token = cookies().get(BACKEND_TOKEN_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const key = params.key.join("/");
  try {
    const upstream = await fetch(`${FASTAPI_V1}/lms/files/${key}`, {
      headers: { Authorization: `Bearer ${token}` },
      redirect: "follow",
      cache: "no-store",
    });

    if (!upstream.ok) {
      return NextResponse.json({ error: "File not found." }, { status: upstream.status });
    }

    // Stream the response (works for both local serve and R2 redirect)
    const buffer = await upstream.arrayBuffer();
    const contentType = upstream.headers.get("content-type") ?? "application/pdf";
    const disposition = upstream.headers.get("content-disposition") ?? 'attachment; filename="file.pdf"';

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": disposition,
      },
    });
  } catch {
    return NextResponse.json({ error: "Couldn't reach the backend." }, { status: 503 });
  }
}
