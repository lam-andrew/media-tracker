import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { decodeJwtPayload, isJwtExpired } from "@/lib/jwt";

export interface SessionUser {
  id: string;
  email: string | null;
}

/**
 * Who this request is for — read from the session cookie's JWT with NO network
 * round-trip. Cached per request, so layout, page, and actions share one read.
 *
 * This is safe because authorization never rests on it: every database call
 * carries the real token and Supabase verifies it (RLS), so a forged cookie
 * yields no data. Reserve `getUser()` (verified; one network hop) for the few
 * places identity itself must be proven, e.g. before admin-client actions.
 * See ADR 0010.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return null;
  const claims = decodeJwtPayload(session.access_token);
  if (!claims || isJwtExpired(claims) || typeof claims.sub !== "string") {
    return null;
  }
  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
  };
});

/**
 * The verified signed-in user — a network round-trip to Supabase Auth. Use only
 * where identity must be proven server-side (admin-client actions, account
 * settings). Everywhere on the hot path, use `getSessionUser` instead.
 */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
