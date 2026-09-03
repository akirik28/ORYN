import "server-only";

import { createHash } from "node:crypto";
import { after } from "next/server";
import { headers } from "next/headers";
import { env } from "@/lib/env";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { isUndefinedTableError } from "@/lib/supabase/errors";

/**
 * Anonymous visitor counting for logged-out pages — the founder's own ask ("how many people
 * have looked at the app"). Authenticated usage is already counted via profiles/
 * product_events, so this is only ever called from public, no-auth pages.
 *
 * No IP, user agent, or any client-side identifier (cookie, header, storage) is ever stored.
 * visitor_hash is a one-way SHA-256 of PAGE_VIEW_HASH_SECRET + today's UTC date + the
 * request's IP + its user agent — both raw inputs are discarded the moment the hash is
 * computed. Including the date means the hash changes every day for the same visitor: this
 * can answer "how many distinct hashes were seen today" but can never link one visitor's
 * activity across two different days, and there's nothing set on the client to expire,
 * clear, or leak, because nothing is ever set there. See migration 0107 (proposed, not yet
 * applied) for the table and lib/admin/queries.ts's getPageViewStats for how this is read.
 *
 * Scheduled via next/server's after(), which runs once the response has already been sent —
 * a slow or failed insert can never delay or break the page it's counting. Best-effort in
 * every other sense too: no admin client configured, no hash secret configured, or the
 * table not existing yet all degrade to silently recording nothing, never to an error the
 * visitor could see or a value the app has to invent.
 *
 * headers() is called here, synchronously during render, and only awaited inside after() --
 * live-verified 2026-09-03 that calling headers() itself from inside the after() callback
 * throws ("used headers() inside after() while rendering. This is not supported"), since the
 * request context after() runs in no longer has it. Capturing the promise before scheduling
 * after() is the fix the error itself names.
 */
export function recordPageView(path: string): void {
  const headersPromise = headers();

  after(async () => {
    try {
      if (!env.pageViews.hashSecret) return; // unconfigured -- skip rather than hash with a predictable secret

      const admin = tryCreateAdminClient();
      if (!admin) return;

      const h = await headersPromise;
      const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
      const userAgent = h.get("user-agent") ?? "unknown";
      const dayBucket = new Date().toISOString().slice(0, 10); // UTC calendar day, e.g. "2026-09-03"
      const visitorHash = createHash("sha256").update(`${env.pageViews.hashSecret}:${dayBucket}:${ip}:${userAgent}`).digest("hex");

      const { error } = await admin.from("page_views").insert({ path, visitor_hash: visitorHash });
      if (error && !isUndefinedTableError(error, "page_views")) {
        console.error("[analytics] failed to record page view", { code: error.code, message: error.message });
      }
    } catch (error) {
      console.error("[analytics] failed to record page view", error);
    }
  });
}
