/**
 * A real, in-memory implementation of PaymentProvider (lib/payments/provider.ts) — the only
 * way to exercise checkout -> webhook -> idempotent insert -> grant end-to-end without real
 * provider credentials, same carve-out lib/dev/fixtures.ts already has for a different
 * reason. Lives in __tests__/, not lib/payments/, specifically so it is structurally
 * unreachable from production code — nothing outside a test file has any reason to import
 * from __tests__/, unlike a file living in lib/ that a careless import could reach for real.
 *
 * Deliberately NOT a mock/spy (vi.fn()-based) — it has real, if fake, state (an in-memory
 * map of "subscriptions" this fake provider itself thinks exist) so a webhook payload it
 * produces is something parseWebhookEvent can genuinely round-trip, the same way a real
 * provider's checkout page and webhook agree with each other because they're both backed by
 * the same real subscription object on the provider's side.
 */
import type { CreateCheckoutInput, CreateCheckoutResult, ParsedWebhookEvent, PaymentProvider, PaymentSubscriptionStatus, PaymentWebhookEvent } from "@/lib/payments/provider";

let counter = 0;
const nextId = (prefix: string) => `${prefix}_${(counter++).toString().padStart(4, "0")}`;

export class FakePaymentProvider implements PaymentProvider {
  readonly name = "fake";

  /** Queued events this fake "provider" will hand back on the next parseWebhookEvent calls,
   *  in order — tests push onto this directly rather than going through a real HTTP round
   *  trip, since the thing under test is the app's own handling, not a real network call. */
  private queuedEvents: { eventId: string; event: PaymentWebhookEvent }[] = [];

  /** In-memory "what does the provider itself think" state, read by getSubscriptionStatus —
   *  mutated by whatever a test simulates happening on the provider's side. */
  private subscriptions = new Map<string, PaymentSubscriptionStatus>();

  async createCheckoutSession(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    return { checkoutUrl: `https://fake-provider.test/checkout/${input.idempotencyKey}`, sessionId: input.idempotencyKey };
  }

  async parseWebhookEvent(_rawBody: string, _headers: Headers): Promise<ParsedWebhookEvent | null> {
    return this.queuedEvents.shift() ?? null;
  }

  async getSubscriptionStatus(providerSubscriptionId: string): Promise<PaymentSubscriptionStatus> {
    return this.subscriptions.get(providerSubscriptionId) ?? { status: "not_found", periodEnd: null };
  }

  /** Test-side helper: queue a webhook this fake provider will "deliver" on the next
   *  parseWebhookEvent call. Also updates the in-memory subscription state so
   *  getSubscriptionStatus stays consistent with what was just delivered, the same way a
   *  real provider's own webhook and status endpoint agree. */
  queueEvent(event: PaymentWebhookEvent, eventId: string = nextId("evt")): string {
    this.queuedEvents.push({ eventId, event });
    if ("providerSubscriptionId" in event && event.providerSubscriptionId) {
      const periodEnd = "periodEnd" in event ? event.periodEnd : (this.subscriptions.get(event.providerSubscriptionId)?.periodEnd ?? null);
      const status = event.kind === "subscription_canceled" || event.kind === "refunded" ? "canceled" : event.kind === "payment_failed" ? "past_due" : "active";
      this.subscriptions.set(event.providerSubscriptionId, { status, periodEnd });
    }
    return eventId;
  }

  /** Deliver the SAME event a second time with the SAME eventId — the actual scenario
   *  payment_events' unique(provider, provider_event_id) constraint exists to make safe. */
  requeueEvent(eventId: string, event: PaymentWebhookEvent): void {
    this.queuedEvents.push({ eventId, event });
  }
}
