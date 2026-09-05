/**
 * The provider-agnostic seam, same shape and same reason PaymentProvider
 * (lib/payments/provider.ts) exists: the founder hasn't chosen an email provider yet (E2,
 * docs/PROXOLA-PLAN.md, 2026-09-05), so nothing outside lib/email/ should ever import a
 * provider SDK directly or assume one vendor's request/response shape.
 *
 * Deliberately the smallest possible surface — one method, plain text only (no HTML, no
 * attachments, no templates) — because the one real caller today (lib/email/verification.ts)
 * needs exactly one thing: put a short code in front of the student. Extend this interface
 * only when a second real caller needs something it can't already do, not speculatively.
 */
export interface EmailProvider {
  readonly name: string;
  sendEmail(input: SendEmailInput): Promise<SendEmailResult>;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  /** Plain text only. The one caller today (a verification code) needs no formatting, and
   *  inventing an HTML path with no real consumer would be exactly the premature-abstraction
   *  this whole seam exists to avoid elsewhere. */
  body: string;
}

/**
 * `error` is the provider's own failure reason (rejected address, quota, timeout, auth
 * failure) — surfaced to the caller so lib/email/verification.ts can log it and show an
 * honest "we couldn't send this" state (AGENTS.md Phase 45), never silently swallowed and
 * never presented to the student as if the code went out. Never includes the email body or
 * the code itself — the spec's own "code must not be logged" rule applies here too, and an
 * error string is exactly the kind of value that ends up in a server log.
 */
export type SendEmailResult = { success: true } | { success: false; error: string };

export class EmailProviderNotConfiguredError extends Error {
  constructor() {
    super("No email provider is configured. Set EMAIL_PROVIDER and its credentials — see API_SETUP.md.");
    this.name = "EmailProviderNotConfiguredError";
  }
}
