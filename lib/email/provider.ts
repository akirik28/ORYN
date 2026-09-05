/**
 * The provider-agnostic seam, same shape and same reason PaymentProvider
 * (lib/payments/provider.ts) exists: the founder hasn't chosen a transactional-email
 * provider yet (Resend / Postmark / SES all plausible), so nothing outside lib/email/
 * should ever import a provider SDK directly or assume a delivery shape.
 *
 * Deliberately the smallest possible interface — plain-text subject/body, one recipient.
 * E2's own verification-code email is exactly this shape (lib/parent/invite-email.ts's
 * ParentInviteEmailContent already established plain-text-only as this codebase's posture
 * everywhere no send infrastructure exists yet); nothing here should grow HTML templates,
 * attachments, or multi-recipient sends until a real feature actually needs one, since a
 * richer interface invented ahead of a real provider is exactly the premature-abstraction
 * lib/env.ts's own header warns against for this same "provider not yet chosen" shape.
 *
 * `send` returns a result object, never throws for an ordinary delivery failure (a bounced
 * address, a provider outage) — the one thing every caller of this interface (starting
 * with E2's sendEmailVerificationCode) must be able to do is degrade honestly without
 * crashing the request that triggered the send, per this repo's own Phase 8/34 rule that an
 * external provider failure must never take down the feature that depends on it.
 */
export interface SendEmailRequest {
  to: string;
  subject: string;
  body: string;
}

export interface SendEmailResult {
  success: boolean;
  /** Present only when success is false — never the provider's raw error object, which may
   *  carry request metadata this interface has no business exposing to a caller three
   *  layers away from the actual HTTP response. */
  error?: string;
}

export interface EmailProvider {
  readonly name: string;
  send(request: SendEmailRequest): Promise<SendEmailResult>;
}

/** Thrown by a caller that needs to distinguish "no provider is configured at all" from an
 *  ordinary send failure — mirrors AIProviderNotConfiguredError's (lib/ai/provider.ts) own
 *  reasoning: "nobody has set this up yet" is a deployment fact worth its own type, not a
 *  string that happens to say so. */
export class EmailProviderNotConfiguredError extends Error {
  constructor() {
    super("No email provider is configured.");
    this.name = "EmailProviderNotConfiguredError";
  }
}
