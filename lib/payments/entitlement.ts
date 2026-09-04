import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { PaymentWebhookEvent } from "./provider";

/**
 * Applies one already-idempotency-checked webhook event's effect on entitlement. Callers
 * (lib/payments/webhook-handler.ts) must insert into `payment_events` first and only reach
 * this function on a fresh insert — this function itself does not re-check for a duplicate,
 * by design: that guard belongs in exactly one place (the database's own
 * unique(provider, provider_event_id) constraint via the insert), not re-derived here too.
 *
 * Every write here goes through `createAdminClient()` (service-role) — `plan_tier` and
 * `paid_ultra_expires_at` are both guarded by profiles_guard_protected_columns against any
 * other caller (migration 0121/0123), and `subscriptions` has no client write policy at all.
 * This is the one legitimate writer of both.
 */
export async function applyPaymentEvent(event: PaymentWebhookEvent, userId: string, providerName: string): Promise<void> {
  const admin = createAdminClient();

  switch (event.kind) {
    case "checkout_completed":
    case "subscription_renewed": {
      // Read-then-write, same discipline as setUserPlanTier (app/(app)/admin/actions.ts) —
      // a bare blind UPDATE is exactly the shape that let the founder's own raw SQL affect
      // zero rows without anyone noticing. `.select("id")` on both the upsert and the
      // profile update makes a zero-rows-affected write detectable rather than silently
      // treated as success.
      const { data: subRow, error: subError } = await admin
        .from("subscriptions")
        .upsert(
          {
            user_id: userId,
            provider: providerName,
            provider_subscription_id: event.providerSubscriptionId,
            status: "active",
            current_period_end: event.periodEnd,
          },
          { onConflict: "user_id" }
        )
        .select("id");
      if (subError || !subRow || subRow.length === 0) {
        console.error("[payments] failed to upsert subscription", { userId, kind: event.kind, error: subError });
        throw new Error("Failed to record subscription state.");
      }

      const { data: updated, error: profileError } = await admin.from("profiles").update({ paid_ultra_expires_at: event.periodEnd }).eq("id", userId).select("id");
      if (profileError) {
        console.error("[payments] failed to extend paid_ultra_expires_at", { userId, error: profileError });
        throw new Error("Failed to grant entitlement.");
      }
      if (!updated || updated.length === 0) {
        console.error("[payments] paid_ultra_expires_at update matched zero rows", { userId });
        throw new Error("Entitlement update matched no profile.");
      }
      return;
    }

    case "subscription_canceled": {
      // Status only — paid_ultra_expires_at is deliberately untouched. The already-paid-for
      // period runs out on its own; see that column's own comment (types/database.ts) for
      // why this is a status-visibility write, not an entitlement write.
      const { error } = await admin.from("subscriptions").update({ status: "canceled" }).eq("provider_subscription_id", event.providerSubscriptionId);
      if (error) console.error("[payments] failed to mark subscription canceled", { providerSubscriptionId: event.providerSubscriptionId, error });
      return;
    }

    case "payment_failed": {
      if (!event.providerSubscriptionId) return; // a failed one-off charge with nothing to attribute yet — nothing to update
      const { error } = await admin.from("subscriptions").update({ status: "past_due" }).eq("provider_subscription_id", event.providerSubscriptionId);
      if (error) console.error("[payments] failed to mark subscription past_due", { providerSubscriptionId: event.providerSubscriptionId, error });
      return;
    }

    case "refunded": {
      // The refund lever (2026-09-04 review): unlike cancellation, a refund undoes the
      // payment itself, so access must not continue to the original period end. Sets
      // paid_ultra_expires_at to now() rather than null — "expired as of right now" is a
      // more honest record than "never had one," and resolvePlanTier treats a past
      // timestamp and a null one identically (isExpiryActive), so the entitlement effect is
      // the same either way.
      const { data: sub } = await admin.from("subscriptions").select("user_id").eq("provider_subscription_id", event.providerSubscriptionId).maybeSingle();
      if (!sub) {
        console.error("[payments] refund event for unknown subscription", { providerSubscriptionId: event.providerSubscriptionId });
        return;
      }
      const now = new Date().toISOString();
      const [{ error: subError }, { error: profileError }] = await Promise.all([
        admin.from("subscriptions").update({ status: "canceled" }).eq("provider_subscription_id", event.providerSubscriptionId),
        admin.from("profiles").update({ paid_ultra_expires_at: now }).eq("id", sub.user_id),
      ]);
      if (subError) console.error("[payments] failed to mark refunded subscription canceled", { error: subError });
      if (profileError) console.error("[payments] failed to revoke entitlement on refund", { userId: sub.user_id, error: profileError });
      return;
    }
  }
}
