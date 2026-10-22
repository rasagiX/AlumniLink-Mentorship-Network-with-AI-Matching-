import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BACKEND_TOKEN_COOKIE_NAME } from "@/lib/auth-token";
import { extractFastAPIError } from "@/lib/fastapi-error";
import { FASTAPI_V1 } from "@/lib/server/fastapi-client";

/**
 * POST /api/video/ticket  { cycleId }
 *
 * The FastAPI bearer token lives in an httpOnly cookie, so browser JS can't
 * read it to authenticate a WebSocket. This route reads the cookie
 * server-side, asks FastAPI for a short-lived signaling ticket (FastAPI also
 * verifies the caller really belongs to this class), and returns it together
 * with the WebSocket URL and ICE servers.
 *
 * Set FASTAPI_PUBLIC_WS_URL (e.g. "wss://api.example.com") when the backend
 * is reached through a different address from the browser than from this
 * server (Docker network names, reverse proxies). If unset, it's derived from
 * FASTAPI_BASE_URL (http→ws, https→wss).
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
        { error: extractFastAPIError(data, "Couldn't join the class.") },
        { status: upstream.status }
      );
    }

    // Build the public WebSocket URL the browser will connect to directly.
    const wsBase = (
      process.env.FASTAPI_PUBLIC_WS_URL ||
      (process.env.FASTAPI_BASE_URL || "http://localhost:8000").replace(/^http/, "ws")
    ).replace(/\/$/, "");

    return NextResponse.json({
      ticket:     data.ticket,
      wsUrl:      `${wsBase}${data.ws_path}`,
      iceServers: data.ice_servers,
      me:         data.me,
      peer: { name: data.peer_name ?? null, role: data.peer_role ?? null },
    });
  } catch {
    return NextResponse.json({ error: "Couldn't reach the backend." }, { status: 503 });
  }
}
