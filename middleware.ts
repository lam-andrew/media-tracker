import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { decodeJwtPayload, isJwtExpired } from "@/lib/jwt";

/**
 * Gates access on every request: signed-out visitors see the landing page at
 * "/" and are sent to /login elsewhere; signed-in visitors are kept out of
 * /login and /welcome.
 *
 * Deliberately reads the session from the cookie instead of calling
 * `auth.getUser()` — that is a network round-trip to Supabase (~80–190ms from
 * Vercel) paid on every navigation, prefetch, and action. `getSession()` only
 * calls out when the access token has expired and needs refreshing (~hourly);
 * the refreshed cookies flow back through `setAll`. Authorization is enforced
 * by RLS at the database with the real token, so a forged cookie only gets
 * past this redirect, never to data. See ADR 0010.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const t0 = performance.now();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const claims = session?.access_token
    ? decodeJwtPayload(session.access_token)
    : null;
  const user =
    claims && !isJwtExpired(claims) && typeof claims.sub === "string";
  // Observability: how long the session check cost this request (Server-Timing
  // in devtools or `curl -sI`). Should be ~0ms except on an hourly token refresh.
  const timing = `session;dur=${(performance.now() - t0).toFixed(1)}`;

  const path = request.nextUrl.pathname;
  const isPublic =
    path.startsWith("/login") ||
    path.startsWith("/auth") ||
    path.startsWith("/welcome");

  // Signed-out visitors at the root see the landing page (URL stays "/").
  if (!user && path === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/welcome";
    const rewrite = NextResponse.rewrite(url);
    response.cookies.getAll().forEach((c) => rewrite.cookies.set(c));
    rewrite.headers.set("Server-Timing", timing);
    return rewrite;
  }
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const redirect = NextResponse.redirect(url);
    redirect.headers.set("Server-Timing", timing);
    return redirect;
  }
  if (user && (path.startsWith("/login") || path.startsWith("/welcome"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    const redirect = NextResponse.redirect(url);
    redirect.headers.set("Server-Timing", timing);
    return redirect;
  }

  response.headers.set("Server-Timing", timing);
  return response;
}

export const config = {
  // Run on everything except Next internals and static image assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
