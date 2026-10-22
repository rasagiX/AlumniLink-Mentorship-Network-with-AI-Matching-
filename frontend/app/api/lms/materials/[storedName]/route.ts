import { cookies } from "next/headers";
import { BACKEND_TOKEN_COOKIE_NAME } from "@/lib/auth-token";
import { FASTAPI_V1 } from "@/lib/server/fastapi-client";

type Ctx = { params: { storedName: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const token = cookies().get(BACKEND_TOKEN_COOKIE_NAME)?.value;
  if (!token) return new Response("Please sign in again.", { status: 401 });

  const upstream = await fetch(`${FASTAPI_V1}/lms/materials/${encodeURIComponent(params.storedName)}`, {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
  });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/pdf",
      "Content-Disposition": upstream.headers.get("content-disposition") ?? "inline",
    },
  });
}
