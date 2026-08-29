import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client (service role). For use in server actions and route
 * handlers only — never import this into client components; the service-role key
 * must never reach the browser. Created lazily so a missing env var fails at call
 * time, not at build/import time. See ADR 0004 (RLS off for the single-user MVP).
 */
let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase server env not set (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).",
    );
  }
  cached = createClient(url, serviceKey, { auth: { persistSession: false } });
  return cached;
}
