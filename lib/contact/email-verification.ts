import "server-only";

import { randomInt, createHash } from "node:crypto";
import { createTranslator } from "use-intl/core";
import type { Locale } from "@/lib/i18n/config";
import enMessages from "@/messages/en.json";
import trMessages from "@/messages/tr.json";

/**
 * E2 (docs/PROXOLA-PLAN.md): verifying the email a student already gave us
 * (contact_info.email), not collecting a new one. CEO's own explicit provider-side framing
 * for why this landed here specifically: the most expensive mistake in this class of work
 * is a hung/retried call to an external send API, the same shape the advisor streaming
 * timeout (ADVISOR_STREAM_TIMEOUT_MS, lib/ai/anthropic-provider.ts) and generateText's own
 * NON_STREAMING_TIMEOUT_MS fix already closed for the AI provider. This file can't apply
 * that same fix directly — no email provider is chosen yet, so there is no real SDK call to
 * bound — but it is written so that whoever adds the first concrete EmailProvider adapter
 * has nowhere else to put a timeout/maxRetries decision: lib/email/provider.ts's own header
 * already documents that requirement for that exact reason.
 */

/** 6 digits, not fewer — CEO's own "deneme sayısı sınırlı" (attempts must be limited) reads
 *  as a request for real entropy behind the attempt cap, not just the cap itself: a 4-digit
 *  code has only 10,000 possibilities, cheap to brute-force even against a 5-attempt limit
 *  if an attacker can open many separate verification rows (each with its own 5 attempts).
 *  crypto.randomInt, not Math.random — this is a security code, not a UI id. */
const CODE_LENGTH = 6;
const CODE_MIN = 10 ** (CODE_LENGTH - 1);
const CODE_MAX = 10 ** CODE_LENGTH;

/** 15 minutes — long enough that a student who has to switch to their email app and back
 *  doesn't lose the code, short enough that a stale, unused code sitting in
 *  email_verifications isn't a standing usable credential for long. */
export const EMAIL_VERIFICATION_CODE_TTL_MS = 15 * 60 * 1000;

/** 5 — CEO's "deneme sayısı sınırlı" made concrete. Generous enough for a genuine typo or
 *  two, tight enough that combined with 6-digit entropy (1,000,000 possibilities) a single
 *  code's attempts are not a meaningful attack surface. */
export const EMAIL_VERIFICATION_MAX_ATTEMPTS = 5;

/** 60 seconds between sends to the same address — not a security control (RLS/ownership
 *  already scope this to the caller's own account), a cost control: this is exactly the
 *  "provider-side risk" this file's own header names. Without it, a student mashing
 *  "resend" mints a new billed send on every click once a real provider is wired in. */
export const EMAIL_VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;

export function generateVerificationCode(): string {
  return randomInt(CODE_MIN, CODE_MAX).toString();
}

/** SHA-256, not a comparison against a stored plaintext code — CEO's own "kod
 *  loglanmamalı" (the code must never be logged) is stated about logging specifically, but
 *  the same reasoning extends to storage: a compromised database row must not itself be a
 *  working code, the same posture every password column in this codebase already takes.
 *  Deliberately unsalted: the code itself is already high-entropy (1 in 900,000, since the
 *  first digit is non-zero) and single-use within a 15-minute window — a rainbow table
 *  covering "every 6-digit code" is trivial regardless of salting, so a salt would add
 *  complexity without closing a real gap this specific threat model has. */
export function hashVerificationCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function isVerificationCodeExpired(expiresAt: string, now: Date = new Date()): boolean {
  return new Date(expiresAt).getTime() <= now.getTime();
}

export function hasExceededVerificationAttempts(attempts: number): boolean {
  return attempts >= EMAIL_VERIFICATION_MAX_ATTEMPTS;
}

export function isWithinResendCooldown(lastSentAt: string, now: Date = new Date()): boolean {
  return now.getTime() - new Date(lastSentAt).getTime() < EMAIL_VERIFICATION_RESEND_COOLDOWN_MS;
}

/** Same request-scope-free translator construction as lib/parent/invite-email.ts's own
 *  translatorFor, for the identical reason documented there: this content can be built from
 *  a Server Action (real request scope) today, but must not become a landmine the day a
 *  background job or route handler calls it instead. */
export function translatorFor(locale: Locale) {
  const messages = locale === "tr" ? trMessages : enMessages;
  return createTranslator({ locale, messages, namespace: "emailVerification" });
}

export interface VerificationEmailContent {
  subject: string;
  body: string;
}

/** Pure — no I/O, no secret, takes the code as a plain argument rather than generating one
 *  itself, so a test can assert on exact content without needing to intercept crypto.
 *  Plain text, matching buildParentInviteEmail's own established posture (see that
 *  function's header) — no HTML template exists in this codebase to target yet. */
export function buildVerificationEmail(params: { locale: Locale; code: string }): VerificationEmailContent {
  const t = translatorFor(params.locale);
  return {
    subject: t("emailSubject"),
    body: [t("emailBodyIntro"), "", params.code, "", t("emailBodyExpiry", { minutes: EMAIL_VERIFICATION_CODE_TTL_MS / 60_000 }), "", t("emailBodyIgnore")].join("\n"),
  };
}
