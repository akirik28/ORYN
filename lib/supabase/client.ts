import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/**
 * Browser-side Supabase client. Uses the publishable key only — never the secret key.
 * Throws early if Supabase env vars are missing so misconfiguration fails loudly in dev
 * instead of silently producing broken auth.
 *
 * Reads the two `NEXT_PUBLIC_` vars directly rather than importing `lib/env`, on purpose:
 * this module is imported by a Client Component (features/messaging/conversation-thread.tsx),
 * so anything it imports joins the browser bundle graph — and `lib/env` names every
 * server secret in the app (SUPABASE_SECRET_KEY, ANTHROPIC_API_KEY, TAVILY_API_KEY,
 * CRON_SECRET). Next.js only ever inlines `NEXT_PUBLIC_*`, so no secret VALUE was
 * reaching the browser (verified with a build-time sentinel: neither a fake
 * SUPABASE_SECRET_KEY nor ANTHROPIC_API_KEY value appears anywhere in `.next/static`) —
 * but shipping a module whose whole job is describing secrets to every visitor is a
 * standing hazard that costs nothing to remove. Keeping the client's env access to
 * exactly the two public values makes the boundary structural instead of dependent on
 * bundler behavior.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local (see API_SETUP.md)."
    );
  }

  return createBrowserClient<Database>(url, publishableKey);
}
