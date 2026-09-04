/**
 * The provider-agnostic seam, same shape and same reason AIProvider (lib/ai/provider.ts)
 * exists: the founder hasn't chosen a payment provider yet (iyzico / PayTR / Stripe all on
 * the table), so nothing outside lib/payments/ should ever import a provider SDK directly or
 * assume one provider's flow shape. Every method here is deliberately the lowest common
 * shape across all three candidates:
 *
 * - `createCheckoutSession` — every candidate is a redirect-to-a-hosted-page flow (iyzico
 *   and PayTR literally host the page; Stripe Checkout is session-based but still ends in a
 *   URL to redirect the browser to). This interface never sees a card number, full stop —
 *   that's the actual reason every candidate offers this shape, not a convenience.
 * - `parseWebhookEvent` — each provider signs/verifies its callback differently (an HMAC
 *   header, a returned hash field, Stripe's own signature scheme). That verification lives
 *   entirely inside each adapter; nothing outside lib/payments/ ever inspects a raw provider
 *   payload or a signature header. Returns `eventId` (the provider's own notification/event
 *   id — Stripe's `evt_...` or the equivalent) separately from `event` (this app's
 *   normalized meaning of it): `eventId` is the actual idempotency key
 *   (payment_events.provider_event_id, migration 0123's unique constraint), and it has to be
 *   the PROVIDER's own id, not derived from the payload's content — the guarantee this
 *   exists for is "the provider itself considers this one delivery attempt," which only the
 *   provider's own id actually encodes. `null` for an unverifiable payload (bad signature,
 *   malformed body) — see lib/payments/webhook-handler.ts for why the route logs and returns
 *   200 rather than 500 in that case, not this interface's concern.
 * - `getSubscriptionStatus` — for reconciliation/support lookups. The app's own source of
 *   truth for entitlement is never a live call to this (see lib/tier/plan-tier.ts's
 *   resolvePlanTier) — this exists for "what does the provider itself currently think," not
 *   for gating a feature.
 */
export interface PaymentProvider {
  readonly name: string;
  createCheckoutSession(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
  parseWebhookEvent(rawBody: string, headers: Headers): Promise<ParsedWebhookEvent | null>;
  getSubscriptionStatus(providerSubscriptionId: string): Promise<PaymentSubscriptionStatus>;
}

export interface ParsedWebhookEvent {
  eventId: string;
  event: PaymentWebhookEvent;
}

export interface CreateCheckoutInput {
  userId: string;
  /** Decimal TRY, matching lib/admin/finance.ts's ULTRA_PRICE_TRY/admin_finance_settings
   *  convention exactly — the one source of truth for what Ultra costs (see
   *  lib/payments/checkout.ts's own comment on where this value comes from). Converting to a
   *  provider's own minor-unit or string convention (Stripe wants integer kuruş, others want
   *  a decimal string) happens inside that provider's own adapter, never at this boundary. */
  amountTry: number;
  /** Caller-supplied, not provider-supplied — lets a caller retry "start checkout" (a
   *  double-click, a refresh before redirect) without a second adapter implementation having
   *  to invent its own de-duplication. Adapters should pass this through as the provider's
   *  own idempotency-key mechanism where one exists (Stripe's `idempotencyKey` request
   *  option); where a provider has none, the adapter is responsible for its own safe no-op
   *  behavior on a repeated key, not this interface. */
  idempotencyKey: string;
  returnUrl: string;
  cancelUrl: string;
}

export interface CreateCheckoutResult {
  checkoutUrl: string;
  /** This app's own payment_events/subscriptions-adjacent identifier for the attempt, NOT
   *  the provider's session id — a webhook arriving later is matched back to a user/attempt
   *  through this app's own records (subscriptions.provider_subscription_id, set once the
   *  provider's real id is known from the webhook), never by trusting a provider-specific id
   *  format to mean the same thing across three different providers. */
  sessionId: string;
}

/**
 * The full set of outcomes a webhook can report, normalized across three providers with
 * three different event vocabularies. `periodEnd` on the grant-shaped events is always the
 * PROVIDER's own returned value, never computed locally (proration, a retried renewal, or a
 * provider-specific grace window are all things only the provider actually knows about) —
 * an adapter that receives an event with no period end from the provider must compute a
 * documented fallback itself and say so in its own code, not silently omit the field here.
 *
 * `refunded` is the lever a refund or chargeback needs (2026-09-04 review) — distinct from
 * `subscription_canceled`, because a cancellation lets the already-paid-for period run out
 * naturally (spec's own stated intent) while a refund means the payment itself is being
 * undone and access should not continue to the original period end.
 *
 * `checkout_completed.clientReferenceId` is checkout_sessions.id (migration 0123) — the
 * opaque value CreateCheckoutResult.sessionId returned at checkout-creation time, which the
 * adapter must have handed to the provider as its own client-reference/custom-data field for
 * this to come back at all. This is how the webhook handler learns WHICH USER a completed
 * checkout belongs to; every later event for the same subscription instead resolves the
 * user through subscriptions.provider_subscription_id, which exists by then.
 */
export type PaymentWebhookEvent =
  | { kind: "checkout_completed"; clientReferenceId: string; providerSubscriptionId: string; amountTry: number; periodEnd: string }
  | { kind: "subscription_renewed"; providerSubscriptionId: string; amountTry: number; periodEnd: string }
  | { kind: "subscription_canceled"; providerSubscriptionId: string }
  | { kind: "payment_failed"; providerSubscriptionId: string | null; reason: string }
  | { kind: "refunded"; providerSubscriptionId: string };

export interface PaymentSubscriptionStatus {
  status: "active" | "past_due" | "canceled" | "not_found";
  periodEnd: string | null;
}

export class PaymentProviderNotConfiguredError extends Error {
  constructor() {
    super("No payment provider is configured. Set PAYMENT_PROVIDER and its credentials — see API_SETUP.md.");
    this.name = "PaymentProviderNotConfiguredError";
  }
}
