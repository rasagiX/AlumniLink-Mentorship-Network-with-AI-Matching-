import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BACKEND_TOKEN_COOKIE_NAME } from "@/lib/auth-token";
import { extractFastAPIError } from "@/lib/fastapi-error";
import { FASTAPI_V1 } from "@/lib/server/fastapi-client";

/**
 * POST /api/video/ticket  { cycleId }
 *
 * Returns signaling ticket, chat ticket, WebSocket URLs, ICE servers.
 */
export async function POST(req: Request) {
  const token = cookies().get(BACKEND_TOKEN_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { cycleId?: unknown } | null;
  const cycleId = typeof body?.cycleId === "string" ? body.cycleId : "";
  if (!cycleId) return NextResponse.json({ error: "Missing class id." }, { status: 400 });

  try {
    const upstream = await fetch(`${FASTAPI_V1}/video/ticket`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ cycle_id: cycleId }),
      cache: "no-store",
    });
    const data = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      return NextResponse.json(
        { error: extractFastAPIError(data) },
        { status: upstream.status }
      );
    }

    const wsBase = (
      process.env.FASTAPI_PUBLIC_WS_URL ||
      (process.env.FASTAPI_BASE_URL || "http://localhost:8000").replace(/^http/, "ws")
    ).replace(/\/$/, "");

    return NextResponse.json({
      ticket:      data.ticket,
      chatTicket:  data.chat_ticket,
      wsUrl:       `${wsBase}${data.ws_path}`,
      chatWsUrl:   `${wsBase}${data.chat_ws_path}`,
      iceServers:  data.ice_servers,
      me:          data.me,
      peer: { name: data.peer_name ?? null, role: data.peer_role ?? null },
    });
  } catch {
    return NextResponse.json({ error: "Couldn't reach the backend." }, { status: 503 });
  }
}
