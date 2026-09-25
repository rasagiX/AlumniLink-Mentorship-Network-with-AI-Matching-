import "server-only";
import type { NextResponse } from "next/server";
import {
  BACKEND_TOKEN_COOKIE_NAME,
  COOKIE_NAME,
  createSessionToken,
  type SessionPayload,
} from "@/lib/auth-token";

export const FASTAPI_V1 = `${process.env.FASTAPI_BASE_URL || "http://localhost:8000"}/api/v1`;

export interface FastAPIUser {
  id: string;
  name: string;
  email: string;
  role: "student" | "mentor" | "admin";
}

export interface FastAPITokenResponse {
  access_token: string;
  token_type: string;
  user: FastAPIUser;
}

/**
 * Stores FastAPI's bearer token separately from the JWT that protects Next.js
 * routes. The app session contains only identity claims and is signed locally.
 */
export async function attachSessionCookie(
  res: NextResponse,
  accessToken: string,
  user: FastAPIUser
) {
  const sessionToken = await createSessionToken({
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  } satisfies SessionPayload);
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  } as const;
  res.cookies.set(COOKIE_NAME, sessionToken, cookieOptions);
  res.cookies.set(BACKEND_TOKEN_COOKIE_NAME, accessToken, cookieOptions);
  return res;
}
