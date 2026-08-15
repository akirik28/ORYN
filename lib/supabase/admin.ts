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
