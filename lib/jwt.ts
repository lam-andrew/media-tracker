/**
 * Decode a JWT's payload WITHOUT verifying its signature.
 *
 * Only for reading claims from a session we already hold (who is this request
 * for?) — never for authorization. Supabase verifies the token on every query,
 * so a forged token yields no data; see ADR 0010. Runtime-agnostic (atob +
 * TextDecoder) so it works in middleware and server code alike.
 */
export function decodeJwtPayload(
  token: string,
): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
}

/** True when the token's `exp` claim (seconds) is in the past. Missing exp = not expired. */
export function isJwtExpired(claims: Record<string, unknown> | null): boolean {
  const exp = claims?.exp;
  return typeof exp === "number" && exp * 1000 < Date.now();
}
