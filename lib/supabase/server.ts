import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { env } from "@/lib/env";

/**
 * Server-side Supabase client for Server Components, Server Actions, and Route Handlers.
 * Reads the auth session from request cookies via next/headers.
 *
 * `setAll` can throw when called from a Server Component (cookies are read-only there).
 * That's expected and safe to ignore as long as `proxy.ts` is refreshing the session on
 * every request — see lib/supabase/proxy.ts.
 */
export async function createClient() {
  if (!env.supabase.url || !env.supabase.publishableKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local (see API_SETUP.md)."
    );
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(env.supabase.url, env.supabase.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component — ignore, proxy.ts handles session refresh.
        }
      },
    },
  });
}
