import "server-only";

import { env } from "@/lib/env";
import type { EmailProvider } from "./provider";

export { EmailProviderNotConfiguredError } from "./provider";
export type { EmailProvider, SendEmailInput, SendEmailResult } from "./provider";

let cachedProvider: EmailProvider | null | undefined;

/**
 * Same shape and reasoning as lib/payments/index.ts's getPaymentProvider — this can
 * genuinely return `null`: no email provider has been chosen yet, so there is no default
 * implementation to fall back to (unlike lib/ai/index.ts's getAIProvider, where Anthropic
 * IS the chosen provider, sometimes just missing its key). Every caller (today: only
 * lib/email/verification.ts) must handle `null` explicitly as "not configured" — never
 * assume a provider exists because this file compiles.
 *
 * `env.email.provider` names which provider is *chosen*; this function is additionally where
 * "chosen" and "actually has a built adapter" are distinguished — today that's every value,
 * since no concrete adapter exists yet. Add a `case` here the same day a provider's adapter
 * class is added, not before.
 */
export function getEmailProvider(): EmailProvider | null {
  if (cachedProvider !== undefined) return cachedProvider;

  switch (env.email.provider) {
    // No case yet — see this function's own header comment. A provider name being set here
    // without a matching case is exactly "chosen but not yet built," and falls through to
    // the same `null` a genuinely unset value produces; the caller cannot tell the two apart
    // from this function alone, only from env.email.provider being non-null despite this
    // returning null, which is why isEmailProviderConfigured below is a separate signal.
    default:
      cachedProvider = null;
  }
  return cachedProvider;
}

/** True only when a real, built adapter is active — distinct from `integrationStatus.email`
 *  (env.ts), which is true the moment a provider NAME is set even before its adapter exists.
 *  Callers that need to render "email sending isn't available yet" should use this, not the
 *  env flag, so a mid-rollout state (name set, adapter not yet merged) reads as unconfigured
 *  rather than as a false "configured." */
export const isEmailProviderConfigured = () => getEmailProvider() !== null;
