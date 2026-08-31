import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

/**
 * Service-role client that bypasses RLS. For admin/maintenance tasks only
 * (e.g. one-off data migrations run from scripts) — never the normal app path,
 * which uses the session-scoped client in `server.ts`. Never expose to the browser.
 */
let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase admin env not set (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).",
    );
  }
  cached = createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false },
  });
  return cached;
}
