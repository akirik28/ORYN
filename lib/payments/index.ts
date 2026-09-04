import "server-only";

import { env } from "@/lib/env";
import type { PaymentProvider } from "./provider";

export { PaymentProviderNotConfiguredError } from "./provider";
export type { PaymentProvider, CreateCheckoutInput, CreateCheckoutResult, PaymentWebhookEvent, ParsedWebhookEvent, PaymentSubscriptionStatus } from "./provider";

let cachedProvider: PaymentProvider | null | undefined;

/**
 * Unlike lib/ai/index.ts's getAIProvider (which always returns a real instance — Anthropic
 * is the one chosen AI provider, sometimes just missing its key), this can genuinely return
 * `null`: no payment provider has been chosen yet, so there is no default implementation to
 * fall back to. Every caller (the checkout Server Action, the webhook route) must handle
 * `null` explicitly as "not configured" — never assume a provider exists because this file
 * compiles.
 *
 * `env.payments.provider` names which provider is *chosen* (see that field's own comment);
 * this function is additionally where "chosen" and "actually has a built adapter" are
 * distinguished — today that's every value, since no concrete adapter exists yet. Add a
 * `case` here the same day a provider's adapter class is added, not before.
 */
export function getPaymentProvider(): PaymentProvider | null {
  if (cachedProvider !== undefined) return cachedProvider;

  switch (env.payments.provider) {
    // No case yet — see this function's own header comment. A provider name being set here
    // without a matching case is exactly "chosen but not yet built," and falls through to
    // the same `null` a genuinely unset value produces; the caller cannot tell the two apart
    // from this function alone, only from env.payments.provider being non-null despite this
    // returning null, which is why isPaymentProviderConfigured below is a separate signal.
    default:
      cachedProvider = null;
  }
  return cachedProvider;
}

/** True only when a real, built adapter is active — distinct from `integrationStatus.
 *  payments` (env.ts), which is true the moment a provider NAME is set even before its
 *  adapter exists. Callers that need to render "payment isn't available yet" should use
 *  this, not the env flag, so a mid-rollout state (name set, adapter not yet merged) reads
 *  as unconfigured rather than as a false "configured." */
export const isPaymentProviderConfigured = () => getPaymentProvider() !== null;
