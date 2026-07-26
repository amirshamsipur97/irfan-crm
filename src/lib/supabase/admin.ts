import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const SERVICE_KEY_MISSING =
  "Admin key is not configured on the server — add SUPABASE_SERVICE_ROLE_KEY and redeploy.";

/**
 * Service-role client. Bypasses row-level security, so it is ONLY for
 * operations no signed-in user can do for themselves — currently just setting
 * another account's password when an admin approves it.
 *
 * Never import this from a client component, and never expose the key with a
 * NEXT_PUBLIC_ prefix. Callers must do their own permission check first: this
 * client has no notion of who is asking.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;

  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
