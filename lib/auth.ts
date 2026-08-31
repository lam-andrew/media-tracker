import { createClient } from "@/lib/supabase/server";

/** The signed-in user (or null). Safe to call in any server context. */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
