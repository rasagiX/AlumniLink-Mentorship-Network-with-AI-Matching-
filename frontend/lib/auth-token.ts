import { SignJWT, jwtVerify } from "jose";
import type { Role } from "./types";

export const COOKIE_NAME = "alumnilink_session";
export const BACKEND_TOKEN_COOKIE_NAME = "alumnilink_backend_token";
const encoder = new TextEncoder();

function secretKey() {
  // Must be identical to SECRET_KEY in the FastAPI backend's .env — tokens
  // are minted there (see lib/server/fastapi-client.ts) and only ever
  // verified here, never re-signed.
  const secret = process.env.JWT_SECRET || "dev-only-insecure-secret-change-me-before-deploying";
  return encoder.encode(secret);
}

export interface SessionPayload {
  sub: string;
  name: string;
  email: string;
  role: Role;
}

/**
 * Creates the frontend session token after FastAPI has authenticated a user.
 * This deliberately uses the frontend's own secret: the FastAPI access token
 * remains private in a separate cookie and is only used when proxying an API
 * request back to FastAPI. Keeping the two token domains separate means the
 * services do not need to share signing keys.
 */
export async function createSessionToken(session: SessionPayload): Promise<string> {
  return new SignJWT({ name: session.name, email: session.email, role: session.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

/**
 * Pure-verification helper safe to call from Edge middleware as well as
 * Node route handlers / server components — it never touches a database or
 * the FastAPI backend, everything needed (id, name, email, role) is
 * embedded directly in the token FastAPI issued.
 */
export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub || !payload.role) return null;
    return {
      sub: payload.sub as string,
      name: payload.name as string,
      email: payload.email as string,
      role: payload.role as Role,
    };
  } catch {
    return null;
  }
}
