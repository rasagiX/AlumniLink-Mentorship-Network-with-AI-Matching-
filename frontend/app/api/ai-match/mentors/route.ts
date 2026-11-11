import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BACKEND_TOKEN_COOKIE_NAME } from "@/lib/auth-token";
import { extractFastAPIError } from "@/lib/fastapi-error";
import { FASTAPI_V1 } from "@/lib/server/fastapi-client";

/**
 * POST /api/ai-match/mentors
 * Body: { target_role, semester, skills_and_interests, bio? }
 *
 * Proxies to FastAPI AI matching engine — vector search + LLM re-ranking.
 */
export async function POST(req: Request) {
  const token = cookies().get(BACKEND_TOKEN_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.target_role || !body?.semester) {
    return NextResponse.json({ error: "target_role and semester are required." }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${FASTAPI_V1}/ai-match/mentors`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target_role:          body.target_role,
        semester:             body.semester,
        skills_and_interests: body.skills_and_interests ?? "",
        bio:                  body.bio ?? null,
      }),
      cache: "no-store",
    });

    const data = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      return NextResponse.json(
        { error: extractFastAPIError(data) },
        { status: upstream.status }
      );
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Couldn't reach the backend." }, { status: 503 });
  }
}
