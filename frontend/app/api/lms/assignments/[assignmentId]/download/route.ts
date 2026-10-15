import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BACKEND_TOKEN_COOKIE_NAME } from "@/lib/auth-token";
import { FASTAPI_V1 } from "@/lib/server/fastapi-client";

/**
 * GET /api/lms/assignments/[assignmentId]/download
 * Authenticated download of a student's submitted assignment file.
 * Available to the mentor and the submitting student.
 */
export async function GET(
  _req: Request,
  { params }: { params: { assignmentId: string } }
) {
  const token = cookies().get(BACKEND_TOKEN_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  try {
    const upstream = await fetch(
      `${FASTAPI_V1}/lms/assignments/${params.assignmentId}/download`,
      {
        headers: { Authorization: `Bearer ${token}` },
        redirect: "follow",
        cache: "no-store",
      }
    );

    if (!upstream.ok) {
      return NextResponse.json({ error: "File not found." }, { status: upstream.status });
    }

    const buffer = await upstream.arrayBuffer();
    const contentType = upstream.headers.get("content-type") ?? "application/pdf";
    const disposition =
      upstream.headers.get("content-disposition") ?? 'attachment; filename="assignment.pdf"';

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
