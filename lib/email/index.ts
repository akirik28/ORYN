import "server-only";

import { env } from "@/lib/env";
import type { EmailProvider } from "./provider";

export { EmailProviderNotConfiguredError } from "./provider";
export type { EmailProvider, SendEmailRequest, SendEmailResult } from "./provider";

let cachedProvider: EmailProvider | null | undefined;

/**
 * Same shape as lib/payments/index.ts's getPaymentProvider, for the identical reason: no
 * email provider has been chosen yet, so unlike lib/ai/index.ts's getAIProvider (which
 * always returns a real instance), this can genuinely return `null`. Every caller
 * (starting with lib/contact/email-verification.ts's sendEmailVerificationCode) must
 * handle `null` explicitly as "not configured" — never assume a provider exists because
 * this file compiles.
 */
export function getEmailProvider(): EmailProvider | null {
  if (cachedProvider !== undefined) return cachedProvider;

  switch (env.email.provider) {
    // No case yet — a provider name being set here without a matching case is "chosen but
    // not yet built," and falls through to the same `null` an unset value produces. Add a
    // case the same day a provider's adapter class is added, not before.
    default:
      cachedProvider = null;
  }
  return cachedProvider;
}

/** True only once a real, built adapter is active — see lib/payments/index.ts's
 *  isPaymentProviderConfigured for why this is a separate signal from a bare env-var
 *  presence check. */
export const isEmailProviderConfigured = () => getEmailProvider() !== null;
