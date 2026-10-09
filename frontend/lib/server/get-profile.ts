import "server-only";
import { BACKEND_TOKEN_COOKIE_NAME } from "@/lib/auth-token";
import { FASTAPI_V1 } from "@/lib/server/fastapi-client";
import { cookies } from "next/headers";

export interface ProfileData {
  year: number | null;
  branch: string | null;
  avatar_color: string | null;
}

/**
 * Fetch the minimal profile fields needed for the sidebar.
 * Returns nulls on error so layouts never crash.
 */
export async function getProfileForShell(): Promise<ProfileData> {
  const token = cookies().get(BACKEND_TOKEN_COOKIE_NAME)?.value;
  if (!token) return { year: null, branch: null, avatar_color: null };
  try {
    const res = await fetch(`${FASTAPI_V1}/profile/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return { year: null, branch: null, avatar_color: null };
    const data = await res.json();
    return {
      year: data.year ?? null,
      branch: data.branch ?? null,
      avatar_color: data.avatar_color ?? null,
    };
  } catch {
    return { year: null, branch: null, avatar_color: null };
  }
}
