import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { env } from "@/lib/env";

/**
 * Privileged Supabase client using the secret key. Bypasses Row Level Security.
 *
 * Only use for: background jobs, scheduled data-freshness refreshes, admin routes that
 * have already independently verified the caller is an admin, and webhook handlers.
 * Never use this to serve a normal user request — use lib/supabase/server.ts so RLS
 * enforces per-user access.
 */
export function createAdminClient() {
  if (!env.supabase.url || !env.supabase.secretKey) {
    throw new Error(
      "Supabase admin client is not configured. Set SUPABASE_SECRET_KEY in .env.local (server-only, see API_SETUP.md)."
    );
  }

  return createSupabaseClient<Database>(env.supabase.url, env.supabase.secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Same as createAdminClient(), but returns null instead of throwing when
 * SUPABASE_SECRET_KEY isn't configured. createAdminClient() throws *synchronously* —
 * uncaught, that propagates out of a page's Promise.all and crashes the entire page with
 * a 500 (found live-testing several cross-user reads that unconditionally needed the
 * admin client — lib/social/featured.ts, contact-info.ts, endorsements.ts,
 * recommendations-query.ts, mutual-connections.ts). Use this at any call site that can
 * degrade to an empty/default result when the admin client is unavailable, which is
 * every cross-user "read past RLS" case in this app — none of them are load-bearing for
 * a page to render at all, they're supplementary sections that should show their normal
 * empty state rather than take the whole page down.
 */
export function tryCreateAdminClient(): ReturnType<typeof createAdminClient> | null {
  try {
    return createAdminClient();
  } catch (error) {
    console.warn("[admin] admin client unavailable", error);
    return null;
  }
}
