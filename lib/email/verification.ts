import "server-only";

import { randomInt, createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { isUndefinedColumnError } from "@/lib/supabase/errors";
import { getEmailProvider } from "./index";

/**
 * E2 (docs/PROXOLA-PLAN.md), CEO's decision 2026-09-05 — a code for the student's own account
 * email, decoupled from Supabase Auth's own confirm-email mechanism (app/auth/confirm/
 * route.ts) and from session/login entirely, per the spec's own non-negotiable: nothing about
 * the rest of the product may block on this. See migration 0134's own header for the full
 * reasoning on why this is a separate mechanism rather than re-enabling Supabase Auth's native
 * one.
 *
 * Every result type below is a closed, honest union — no boolean collapses "sent" and "sent
 * but nobody will ever receive it" into the same value. This is the one property CEO's own
 * framing named as the reason this task was assigned: a verification that fails silently is
 * the identical failure class this session already fixed three times today elsewhere
 * (lib/plan/persist.ts's getTranslations call chief among them) — the code existing here
 * matters less than every caller being able to tell success from every distinct way this can
 * fail.
 */

const CODE_LENGTH = 6;
const CODE_TTL_MINUTES = 15;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

/** `randomInt`, not `Math.random()` — this is a security-adjacent value (guessing it is
 *  exactly the attack MAX_ATTEMPTS below exists to bound), and Node's crypto RNG is the
 *  correct primitive for that regardless of how short-lived the code is. Zero-padded so every
 *  code is exactly CODE_LENGTH digits, never a shorter string an attacker could infer from
 *  length alone. */
function generateCode(): string {
  return randomInt(0, 10 ** CODE_LENGTH).toString().padStart(CODE_LENGTH, "0");
}

/** SHA-256 hex digest — matches migration 0134's own column comment. Never compared against
 *  a stored value with `===` on the raw code; both sides of every comparison in this file are
 *  hashes, so a code is never held in a variable a moment longer than generating/sending it
 *  requires, and never appears in this file's own error paths (console.error calls below name
 *  the *reason* a step failed, never the code itself). */
function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export type SendVerificationCodeResult =
  | { sent: true }
  | { sent: false; reason: "not_configured" }
  | { sent: false; reason: "cooldown"; retryAfterSeconds: number }
  | { sent: false; reason: "send_failed"; error: string }
  /** Migration 0134 not yet applied on this environment, or the row itself couldn't be read —
   *  distinct from `not_configured` (a real infra gap, not "no provider chosen yet"). Same
   *  "unapplied migration must degrade to an honest, visible state, never a silent fake
   *  success" discipline as lib/plan/persist.ts's own carried_forward handling — the
   *  difference here is there is no pre-migration behavior to degrade TO, since this feature
   *  doesn't exist before this column does, so degrading means "unavailable," not "works,
   *  just missing one flag." */
  | { sent: false; reason: "unavailable" };

/**
 * Generates a fresh code, stores its hash (never the code), and sends it — in that order, so
 * a send failure never leaves a code the student was shown but the database doesn't recognize
 * (there is no code shown to the student by this function at all; it goes straight to the
 * provider). Cooldown is checked BEFORE generating anything, so a rapid double-click doesn't
 * burn a second code against the same email.
 *
 * `client` is caller-supplied (same shape as lib/parent/links.ts's setParentInviteEmail) —
 * the signup action passes its own admin client (no session exists yet at that point in the
 * flow); Settings' resend action passes the student's own session-scoped client. Neither
 * default is assumed here, unlike most of this codebase's read-heavy context builders, since
 * a write this security-adjacent should never silently pick a client on the caller's behalf.
 */
export async function sendVerificationCode(userId: string, email: string, client: SupabaseClient<Database>): Promise<SendVerificationCodeResult> {
  const provider = getEmailProvider();
  if (!provider) return { sent: false, reason: "not_configured" };

  const { data: profile, error: readError } = await client
    .from("profiles")
    .select("email_verification_last_sent_at")
    .eq("id", userId)
    .maybeSingle();
  if (readError) {
    if (isUndefinedColumnError(readError, "email_verification_last_sent_at")) return { sent: false, reason: "unavailable" };
    console.error("[email-verification] failed to read cooldown state", { userId, error: readError.message });
    return { sent: false, reason: "unavailable" };
  }

  const lastSentAt = profile?.email_verification_last_sent_at ? new Date(profile.email_verification_last_sent_at).getTime() : 0;
  const secondsSinceLastSend = (Date.now() - lastSentAt) / 1000;
  if (lastSentAt > 0 && secondsSinceLastSend < RESEND_COOLDOWN_SECONDS) {
    return { sent: false, reason: "cooldown", retryAfterSeconds: Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSinceLastSend) };
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString();
  const now = new Date().toISOString();

  const { error: updateError } = await client
    .from("profiles")
    .update({
      email_verification_code_hash: hashCode(code),
      email_verification_code_expires_at: expiresAt,
      email_verification_attempts: 0,
      email_verification_last_sent_at: now,
    })
    .eq("id", userId);
  if (updateError) {
    if (isUndefinedColumnError(updateError, "email_verification_code_hash")) return { sent: false, reason: "unavailable" };
    console.error("[email-verification] failed to store verification code", { userId, error: updateError.message });
    return { sent: false, reason: "unavailable" };
  }

  // Stored before sending, not after: if the send itself fails, the code is already
  // consistent with what verifyEmailCode will check against — a retry-the-resend is always
  // safe, never a state where a "sent" code silently stops matching a later attempt.
  const result = await provider.sendEmail({
    to: email,
    subject: "Your Proxola verification code",
    body: `Your verification code is ${code}. It expires in ${CODE_TTL_MINUTES} minutes. If you didn't request this, you can ignore this email.`,
  });
  if (!result.success) {
    console.error("[email-verification] provider failed to send", { userId, error: result.error });
    return { sent: false, reason: "send_failed", error: result.error };
  }
  return { sent: true };
}

export type VerifyEmailCodeResult =
  | { verified: true }
  | { verified: false; reason: "no_code_pending" }
  | { verified: false; reason: "expired" }
  | { verified: false; reason: "too_many_attempts" }
  | { verified: false; reason: "incorrect"; attemptsRemaining: number }
  | { verified: false; reason: "unavailable" };

/**
 * Checks the submitted code against the stored hash — expiry and attempt-limit are checked
 * BEFORE the hash comparison, not after, so a code that has already expired or already
 * exhausted its attempts is rejected on that basis alone, never on a coincidentally-wrong
 * guess that would misreport *why* it failed. On success, clears the code fields entirely
 * (not just flips `email_verified`) — a consumed code must never be checkable again, and a
 * stale hash sitting in the row after success would be, at best, dead data and at worst a
 * value some future edit accidentally starts trusting again.
 */
export async function verifyEmailCode(userId: string, submittedCode: string, client: SupabaseClient<Database>): Promise<VerifyEmailCodeResult> {
  const { data: profile, error: readError } = await client
    .from("profiles")
    .select("email_verification_code_hash, email_verification_code_expires_at, email_verification_attempts")
    .eq("id", userId)
    .maybeSingle();
  if (readError) {
    if (isUndefinedColumnError(readError, "email_verification_code_hash")) return { verified: false, reason: "unavailable" };
    console.error("[email-verification] failed to read verification state", { userId, error: readError.message });
    return { verified: false, reason: "unavailable" };
  }
  if (!profile?.email_verification_code_hash || !profile.email_verification_code_expires_at) {
    return { verified: false, reason: "no_code_pending" };
  }
  if (new Date(profile.email_verification_code_expires_at).getTime() < Date.now()) {
    return { verified: false, reason: "expired" };
  }
  if (profile.email_verification_attempts >= MAX_ATTEMPTS) {
    return { verified: false, reason: "too_many_attempts" };
  }

  if (hashCode(submittedCode) !== profile.email_verification_code_hash) {
    const attemptsRemaining = MAX_ATTEMPTS - (profile.email_verification_attempts + 1);
    const { error: incrementError } = await client
      .from("profiles")
      .update({ email_verification_attempts: profile.email_verification_attempts + 1 })
      .eq("id", userId);
    if (incrementError) console.error("[email-verification] failed to record a failed attempt", { userId, error: incrementError.message });
    return { verified: false, reason: "incorrect", attemptsRemaining: Math.max(attemptsRemaining, 0) };
  }

  const { error: updateError } = await client
    .from("profiles")
    .update({
      email_verified: true,
      email_verification_code_hash: null,
      email_verification_code_expires_at: null,
      email_verification_attempts: 0,
    })
    .eq("id", userId);
  if (updateError) {
    console.error("[email-verification] code matched but failed to record verification", { userId, error: updateError.message });
    return { verified: false, reason: "unavailable" };
  }
  return { verified: true };
}
