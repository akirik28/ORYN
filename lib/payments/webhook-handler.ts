import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUniqueViolation } from "@/lib/supabase/errors";
import { getPaymentProvider } from "./index";
import { applyPaymentEvent } from "./entitlement";
import type { PaymentWebhookEvent } from "./provider";

/** payment_events' auto-generated constraint name for unique(provider, provider_event_id)
 *  (migration 0123) — Postgres's default `<table>_<col1>_<col2>_key` naming, same convention
 *  lib/parent/links.ts's own isUniqueViolation call already relies on. */
const PAYMENT_EVENTS_DEDUPE_CONSTRAINT = "payment_events_provider_provider_event_id_key";

export type WebhookOutcome = "processed" | "duplicate" | "unverifiable" | "not_configured" | "user_unresolved";

/**
 * The whole point of this function: a webhook arriving twice, or arriving out of order, must
 * never grant twice. The mechanism is the insert below and payment_events' own
 * unique(provider, provider_event_id) constraint (migration 0123) — not an in-memory check,
 * not a re-derived "have I seen this id" condition, because either of those can be wrong in
 * ways a database constraint structurally cannot be. Insert first; a unique-violation on that
 * insert IS the duplicate signal, checked before the entitlement path is ever reached.
 *
 * Returns a status this app can log/count, not an HTTP status directly — app/api/webhooks/
 * payment/route.ts owns the actual response, and always answers the provider with 200 except
 * for "not_configured" (a webhook arriving at all when nothing is configured is a real
 * server-side misconfiguration, not something to hide from the provider's retry logic the
 * way an unverifiable payload is).
 *
 * `unverifiable` (a bad signature or malformed body) is deliberately handled the same way as
 * a processed event from the CALLER's perspective — logged, 200 returned — so a prober
 * sending malformed payloads to guess at this endpoint's validation logic learns nothing from
 * the response shape. The distinction still exists in `outcome` for this app's own logging.
 */
export async function handlePaymentWebhook(rawBody: string, headers: Headers): Promise<WebhookOutcome> {
  const provider = getPaymentProvider();
  if (!provider) {
    console.error("[payments] webhook received but no payment provider is configured");
    return "not_configured";
  }

  const parsed = await provider.parseWebhookEvent(rawBody, headers);
  if (!parsed) {
    console.error("[payments] webhook payload failed verification", { provider: provider.name });
    return "unverifiable";
  }

  const admin = createAdminClient();
  const { event, eventId } = parsed;

  const { error: insertError } = await admin.from("payment_events").insert({
    provider: provider.name,
    provider_event_id: eventId,
    kind: event.kind,
    payload: event as unknown as Record<string, unknown>,
  });

  if (insertError) {
    if (isUniqueViolation(insertError, PAYMENT_EVENTS_DEDUPE_CONSTRAINT)) {
      // Already processed. Deliberately does not re-check what the FIRST processing did —
      // re-deriving that here would be exactly the second place the sweep this whole design
      // exists to avoid. The database saying "you already have this row" is the complete
      // answer; there is nothing left to verify.
      return "duplicate";
    }
    console.error("[payments] failed to record payment event", { provider: provider.name, eventId, error: insertError });
    throw new Error("Failed to record payment event.");
  }

  const userId = await resolveUserId(admin, event);
  if (!userId) {
    console.error("[payments] could not resolve a user for payment event", { provider: provider.name, eventId, kind: event.kind });
    return "user_unresolved";
  }

  await applyPaymentEvent(event, userId, provider.name);
  return "processed";
}

/**
 * checkout_completed resolves through checkout_sessions (migration 0123) — the ONE event
 * type with no subscriptions row yet, by definition (this event is what creates it). Every
 * other kind resolves through subscriptions.provider_subscription_id, which does exist by
 * then; a null providerSubscriptionId (payment_failed's one nullable case, a failed one-off
 * charge with nothing to attribute yet) has nothing to look up and correctly resolves to no
 * user rather than guessing.
 */
async function resolveUserId(admin: SupabaseClient<Database>, event: PaymentWebhookEvent): Promise<string | null> {
  if (event.kind === "checkout_completed") {
    const { data } = await admin.from("checkout_sessions").select("user_id").eq("id", event.clientReferenceId).maybeSingle();
    return data?.user_id ?? null;
  }

  const providerSubscriptionId = event.providerSubscriptionId;
  if (!providerSubscriptionId) return null;

  const { data } = await admin.from("subscriptions").select("user_id").eq("provider_subscription_id", providerSubscriptionId).maybeSingle();
  return data?.user_id ?? null;
}
