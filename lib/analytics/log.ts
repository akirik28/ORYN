import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Privacy-conscious product events (spec Phase 52) — structural signals only
 * (event name + small identifiers), never free-text student content. Writes via the
 * admin client since product_events has no RLS policy for the regular client (see
 * migration 0019 — same "system-generated only" posture as notifications).
 *
 * Fire-and-forget by design: a logging failure must never break the user-facing action
 * that triggered it, so this swallows its own errors rather than propagating them.
 */
export async function logEvent(userId: string, eventName: string, metadata?: Record<string, unknown>): Promise<void> {
  try {
    const admin = createAdminClient();
    // supabase-js resolves `{ error }` rather than throwing on a Postgres-level failure, so
    // the try/catch alone only ever caught a network exception — this destructure is what
    // actually delivers "swallows its own errors" for a real query failure too.
    const { error } = await admin.from("product_events").insert({ user_id: userId, event_name: eventName, metadata: metadata ?? {} });
    if (error) console.error(`[analytics] failed to log "${eventName}"`, error);
  } catch (error) {
    console.error(`[analytics] failed to log "${eventName}"`, error);
  }
}
