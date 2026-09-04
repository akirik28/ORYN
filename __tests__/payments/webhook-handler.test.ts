import { beforeEach, describe, expect, test, vi } from "vitest";
import { MockSupabaseClient, type MockRow } from "../stubs/mock-supabase-table";
import { FakePaymentProvider } from "./fake-provider";

const { providerRef, adminRef } = vi.hoisted(() => ({
  providerRef: { current: null as FakePaymentProvider | null },
  adminRef: { current: null as MockSupabaseClient | null },
}));

vi.mock("@/lib/payments/index", () => ({ getPaymentProvider: () => providerRef.current }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => adminRef.current }));

import { handlePaymentWebhook } from "@/lib/payments/webhook-handler";

const USER_ID = "11111111-1111-1111-1111-111111111111";
const SUB_ID = "sub_live_1";

function freshTables(): Record<string, { rows: MockRow[]; uniqueConstraints?: { name: string; columns: string[] }[] }> {
  return {
    profiles: { rows: [{ id: USER_ID, paid_ultra_expires_at: null }] },
    checkout_sessions: { rows: [{ id: "cs_1", user_id: USER_ID }] },
    subscriptions: { rows: [], uniqueConstraints: [{ name: "subscriptions_user_id_key", columns: ["user_id"] }] },
    payment_events: { rows: [], uniqueConstraints: [{ name: "payment_events_provider_provider_event_id_key", columns: ["provider", "provider_event_id"] }] },
  };
}

let tables: ReturnType<typeof freshTables>;

beforeEach(() => {
  tables = freshTables();
  adminRef.current = new MockSupabaseClient(tables);
  providerRef.current = new FakePaymentProvider();
});

describe("handlePaymentWebhook — checkout_completed grants the entitlement", () => {
  test("a fresh checkout_completed event sets paid_ultra_expires_at and creates a subscription row", async () => {
    const periodEnd = "2027-01-01T00:00:00.000Z";
    providerRef.current!.queueEvent({ kind: "checkout_completed", clientReferenceId: "cs_1", providerSubscriptionId: SUB_ID, amountTry: 399.99, periodEnd });

    const outcome = await handlePaymentWebhook("raw", new Headers());

    expect(outcome).toBe("processed");
    expect(tables.profiles.rows[0]!.paid_ultra_expires_at).toBe(periodEnd);
    expect(tables.subscriptions.rows).toHaveLength(1);
    expect(tables.subscriptions.rows[0]).toMatchObject({ user_id: USER_ID, provider: "fake", provider_subscription_id: SUB_ID, status: "active", current_period_end: periodEnd });
  });

  test("an unresolvable clientReferenceId (no matching checkout_sessions row) grants nothing", async () => {
    providerRef.current!.queueEvent({ kind: "checkout_completed", clientReferenceId: "cs_does_not_exist", providerSubscriptionId: SUB_ID, amountTry: 399.99, periodEnd: "2027-01-01T00:00:00.000Z" });

    const outcome = await handlePaymentWebhook("raw", new Headers());

    expect(outcome).toBe("user_unresolved");
    expect(tables.profiles.rows[0]!.paid_ultra_expires_at).toBeNull();
    expect(tables.subscriptions.rows).toHaveLength(0);
  });
});

describe("handlePaymentWebhook — idempotency: the same event twice must never grant twice", () => {
  test("delivering the identical eventId a second time is reported as a duplicate, not processed again", async () => {
    const periodEnd = "2027-01-01T00:00:00.000Z";
    const event = { kind: "checkout_completed" as const, clientReferenceId: "cs_1", providerSubscriptionId: SUB_ID, amountTry: 399.99, periodEnd };
    const eventId = providerRef.current!.queueEvent(event);

    const first = await handlePaymentWebhook("raw", new Headers());
    expect(first).toBe("processed");
    expect(tables.payment_events.rows).toHaveLength(1);

    providerRef.current!.requeueEvent(eventId, event);
    const second = await handlePaymentWebhook("raw", new Headers());

    expect(second).toBe("duplicate");
    expect(tables.payment_events.rows).toHaveLength(1); // no second row -- the constraint rejected it
    expect(tables.subscriptions.rows).toHaveLength(1); // still exactly one subscription
  });

  /**
   * The proof CEO asked for: with the unique constraint removed, the exact same event
   * delivered twice DOES double-process — the insert succeeds both times, so the code
   * proceeds to applyPaymentEvent twice. This is what makes the test above meaningful: it
   * demonstrates the guard is actually load-bearing, not a check that would have passed
   * anyway. Restored to a real constraint immediately after, for every test that follows.
   */
  test("[proof] with the unique constraint removed, the same event DOES grant twice -- confirming the guard above is real", async () => {
    tables.payment_events.uniqueConstraints = []; // the constraint, deliberately dropped for this one test
    const periodEnd = "2027-01-01T00:00:00.000Z";
    const event = { kind: "checkout_completed" as const, clientReferenceId: "cs_1", providerSubscriptionId: SUB_ID, amountTry: 399.99, periodEnd };
    const eventId = providerRef.current!.queueEvent(event);

    const first = await handlePaymentWebhook("raw", new Headers());
    providerRef.current!.requeueEvent(eventId, event);
    const second = await handlePaymentWebhook("raw", new Headers());

    expect(first).toBe("processed");
    expect(second).toBe("processed"); // WITHOUT the constraint, this is "processed" again, not "duplicate"
    expect(tables.payment_events.rows).toHaveLength(2); // both events recorded -- the log itself doesn't dedupe

    tables.payment_events.uniqueConstraints = [{ name: "payment_events_provider_provider_event_id_key", columns: ["provider", "provider_event_id"] }];
  });
});

describe("handlePaymentWebhook — renewal extends the expiry", () => {
  test("subscription_renewed pushes paid_ultra_expires_at forward to the provider's own new period end", async () => {
    tables.subscriptions.rows.push({ id: "s1", user_id: USER_ID, provider: "fake", provider_subscription_id: SUB_ID, status: "active", current_period_end: "2027-01-01T00:00:00.000Z" });
    const newPeriodEnd = "2027-02-01T00:00:00.000Z";
    providerRef.current!.queueEvent({ kind: "subscription_renewed", providerSubscriptionId: SUB_ID, amountTry: 399.99, periodEnd: newPeriodEnd });

    const outcome = await handlePaymentWebhook("raw", new Headers());

    expect(outcome).toBe("processed");
    expect(tables.profiles.rows[0]!.paid_ultra_expires_at).toBe(newPeriodEnd);
    expect(tables.subscriptions.rows).toHaveLength(1); // updated in place, not a second row
    expect(tables.subscriptions.rows[0]!.current_period_end).toBe(newPeriodEnd);
  });
});

describe("handlePaymentWebhook — cancellation and a failed payment touch status only, never the expiry", () => {
  test("subscription_canceled sets status=canceled and leaves paid_ultra_expires_at exactly as it was", async () => {
    const originalExpiry = "2027-01-01T00:00:00.000Z";
    tables.profiles.rows[0]!.paid_ultra_expires_at = originalExpiry;
    tables.subscriptions.rows.push({ id: "s1", user_id: USER_ID, provider: "fake", provider_subscription_id: SUB_ID, status: "active", current_period_end: originalExpiry });
    providerRef.current!.queueEvent({ kind: "subscription_canceled", providerSubscriptionId: SUB_ID });

    const outcome = await handlePaymentWebhook("raw", new Headers());

    expect(outcome).toBe("processed");
    expect(tables.subscriptions.rows[0]!.status).toBe("canceled");
    expect(tables.profiles.rows[0]!.paid_ultra_expires_at).toBe(originalExpiry); // untouched -- access continues to period end
  });

  test("payment_failed sets status=past_due and leaves paid_ultra_expires_at exactly as it was", async () => {
    const originalExpiry = "2027-01-01T00:00:00.000Z";
    tables.profiles.rows[0]!.paid_ultra_expires_at = originalExpiry;
    tables.subscriptions.rows.push({ id: "s1", user_id: USER_ID, provider: "fake", provider_subscription_id: SUB_ID, status: "active", current_period_end: originalExpiry });
    providerRef.current!.queueEvent({ kind: "payment_failed", providerSubscriptionId: SUB_ID, reason: "card_declined" });

    const outcome = await handlePaymentWebhook("raw", new Headers());

    expect(outcome).toBe("processed");
    expect(tables.subscriptions.rows[0]!.status).toBe("past_due");
    expect(tables.profiles.rows[0]!.paid_ultra_expires_at).toBe(originalExpiry);
  });

  test("payment_failed with no providerSubscriptionId (a failed one-off charge) resolves to no user, not an error", async () => {
    providerRef.current!.queueEvent({ kind: "payment_failed", providerSubscriptionId: null, reason: "card_declined" });
    const outcome = await handlePaymentWebhook("raw", new Headers());
    expect(outcome).toBe("user_unresolved");
  });
});

describe("handlePaymentWebhook — refunded is the actionable revocation lever", () => {
  test("a refund immediately expires the entitlement, unlike a plain cancellation", async () => {
    const futurePeriodEnd = "2099-01-01T00:00:00.000Z"; // still far in the future -- proves this is a real revocation, not a coincidental lapse
    tables.profiles.rows[0]!.paid_ultra_expires_at = futurePeriodEnd;
    tables.subscriptions.rows.push({ id: "s1", user_id: USER_ID, provider: "fake", provider_subscription_id: SUB_ID, status: "active", current_period_end: futurePeriodEnd });
    providerRef.current!.queueEvent({ kind: "refunded", providerSubscriptionId: SUB_ID });

    const before = Date.now();
    const outcome = await handlePaymentWebhook("raw", new Headers());

    expect(outcome).toBe("processed");
    expect(tables.subscriptions.rows[0]!.status).toBe("canceled");
    const revokedAt = new Date(tables.profiles.rows[0]!.paid_ultra_expires_at as string).getTime();
    expect(revokedAt).toBeGreaterThanOrEqual(before);
    expect(revokedAt).toBeLessThan(new Date(futurePeriodEnd).getTime()); // no longer the far-future date
  });
});

describe("handlePaymentWebhook — an unverifiable payload is logged and swallowed, not a 500", () => {
  test("a provider that rejects the payload (parseWebhookEvent returns null) reports unverifiable and writes nothing", async () => {
    // FakePaymentProvider's queue is empty -- parseWebhookEvent returns null exactly like a
    // real adapter would on a bad signature.
    const outcome = await handlePaymentWebhook("raw", new Headers());
    expect(outcome).toBe("unverifiable");
    expect(tables.payment_events.rows).toHaveLength(0);
  });
});

describe("handlePaymentWebhook — no provider configured", () => {
  test("reports not_configured rather than throwing or silently succeeding", async () => {
    providerRef.current = null;
    const outcome = await handlePaymentWebhook("raw", new Headers());
    expect(outcome).toBe("not_configured");
  });
});
