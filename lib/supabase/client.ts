import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { env } from "@/lib/env";

/**
 * Browser-side Supabase client. Uses the publishable key only — never the secret key.
 * Throws early if Supabase env vars are missing so misconfiguration fails loudly in dev
 * instead of silently producing broken auth.
 */
export function createClient() {
  if (!env.supabase.url || !env.supabase.publishableKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local (see API_SETUP.md)."
    );
  }

  return createBrowserClient<Database>(env.supabase.url, env.supabase.publishableKey);
}
