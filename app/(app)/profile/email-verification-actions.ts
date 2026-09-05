"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { resolveLocale } from "@/lib/i18n/locale";
import { getEmailProvider } from "@/lib/email";
import {
  generateVerificationCode,
  hashVerificationCode,
  buildVerificationEmail,
  translatorFor,
  isVerificationCodeExpired,
  hasExceededVerificationAttempts,
  isWithinResendCooldown,
  EMAIL_VERIFICATION_MAX_ATTEMPTS,
  EMAIL_VERIFICATION_CODE_TTL_MS,
} from "@/lib/contact/email-verification";

/**
 * E2 (docs/PROXOLA-PLAN.md) — sends a verification code to contact_info.email, the address
 * the student already gave us. Writes to email_verifications go through the admin client on
 * purpose: that table's own RLS (migration 0134) grants the owner SELECT only, specifically
 * so a student's own browser console can't insert a row claiming an email already verified.
 * A missing admin credential degrades to the same honest "can't verify right now" a missing
 * email provider produces — never a silent fake success (Phase 34).
 */
export async function sendEmailVerificationCode(): Promise<{ success?: true; error?: string }> {
  const session = await requireUser();
  const userId = session.userId!;
  const locale = await resolveLocale();
  const t = translatorFor(locale);

  const supabase = await createClient();
  const { data: contact } = await supabase.from("contact_info").select("email, email_verified_at").eq("user_id", userId).maybeSingle();
  const email = contact?.email?.trim();
  if (!email) {
    return { error: t("genericError") };
  }
  if (contact?.email_verified_at) {
    // Already verified — nothing to send. Not an error the student needs to see; the UI's
    // own honest verified/not-verified state already covers this, so a caller reaching here
    // means the button rendered when it shouldn't have, not a real failure to report.
    return { success: true };
  }

  const admin = tryCreateAdminClient();
  if (!admin) {
    console.error("[email-verification] admin client not configured, cannot send code", { userId });
    return { error: t("genericError") };
  }

  // Resend cooldown (lib/contact/email-verification.ts's own header: a cost control, not a
  // security one — RLS already scopes this table to the caller's own rows).
  const { data: lastAttempt } = await admin
    .from("email_verifications")
    .select("created_at")
    .eq("user_id", userId)
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastAttempt && isWithinResendCooldown(lastAttempt.created_at)) {
    return { error: t("resendCooldownNotice") };
  }

  const provider = getEmailProvider();
  if (!provider) {
    // Phase 34/72: no provider chosen yet — say so honestly rather than pretending to send.
    return { error: t("notConfiguredNotice") };
  }

  const code = generateVerificationCode();
  const { subject, body } = buildVerificationEmail({ locale, code });

  // Sent BEFORE the row is written -- if the send itself fails, there is nothing to verify
  // against yet, so a failed send correctly leaves no new attempt on file (the caller can
  // just retry, immediately, with no stale row consuming part of an attempt/cooldown budget
  // for a code that was never actually delivered).
  const sendResult = await provider.send({ to: email, subject, body });
  if (!sendResult.success) {
    console.error("[email-verification] provider send failed", { userId, provider: provider.name, error: sendResult.error });
    return { error: t("genericError") };
  }

  const { error: insertError } = await admin.from("email_verifications").insert({
    user_id: userId,
    email,
    code_hash: hashVerificationCode(code),
    expires_at: new Date(Date.now() + EMAIL_VERIFICATION_CODE_TTL_MS).toISOString(),
  });
  if (insertError) {
    // The email already went out — this is a real, if unlikely, failure mode (a DB write
    // failing right after a successful send). Reported as a generic error since there is no
    // student-actionable difference between "we couldn't send" and "we sent it but can't
    // check it yet" from where they're standing — both mean "verification isn't working
    // right now."
    console.error("[email-verification] code sent but failed to persist", { userId, error: insertError.message });
    return { error: t("genericError") };
  }

  return { success: true };
}

export async function verifyEmailCode(code: string): Promise<{ success?: true; error?: string }> {
  const session = await requireUser();
  const userId = session.userId!;
  const locale = await resolveLocale();
  const t = translatorFor(locale);

  const trimmedCode = code.trim();
  if (!/^\d{6}$/.test(trimmedCode)) {
    return { error: t("invalidCode", { remaining: EMAIL_VERIFICATION_MAX_ATTEMPTS }) };
  }

  const admin = tryCreateAdminClient();
  if (!admin) {
    console.error("[email-verification] admin client not configured, cannot verify code", { userId });
    return { error: t("genericError") };
  }

  const { data: attempt } = await admin
    .from("email_verifications")
    .select("id, email, code_hash, expires_at, attempts, verified_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!attempt) {
    return { error: t("noCodeToConfirm") };
  }
  if (attempt.verified_at) {
    return { success: true };
  }
  if (isVerificationCodeExpired(attempt.expires_at)) {
    return { error: t("codeExpired") };
  }
  if (hasExceededVerificationAttempts(attempt.attempts)) {
    return { error: t("tooManyAttempts") };
  }

  if (hashVerificationCode(trimmedCode) !== attempt.code_hash) {
    const nextAttempts = attempt.attempts + 1;
    const { error: attemptsError } = await admin.from("email_verifications").update({ attempts: nextAttempts }).eq("id", attempt.id);
    if (attemptsError) {
      console.error("[email-verification] failed to record a failed attempt", { userId, error: attemptsError.message });
    }
    const remaining = EMAIL_VERIFICATION_MAX_ATTEMPTS - nextAttempts;
    return { error: remaining > 0 ? t("invalidCode", { remaining }) : t("tooManyAttempts") };
  }

  const now = new Date().toISOString();
  const { error: markVerifiedError } = await admin.from("email_verifications").update({ verified_at: now }).eq("id", attempt.id);
  if (markVerifiedError) {
    console.error("[email-verification] failed to mark attempt row verified", { userId, error: markVerifiedError.message });
  }

  // The real, load-bearing write: contact_info.email_verified_at is what every other reader
  // (parent linking, notifications, recovery — see this migration's own header) actually
  // checks. Scoped to this exact email so a code verified for an address the student has
  // since changed away from can never mark the NEW address verified — matching migration
  // 0134's own clear-on-change trigger from the other direction.
  const { error: contactError } = await admin.from("contact_info").update({ email_verified_at: now }).eq("user_id", userId).eq("email", attempt.email);
  if (contactError) {
    console.error("[email-verification] verified the code but failed to update contact_info", { userId, error: contactError.message });
    return { error: t("genericError") };
  }

  revalidatePath("/profile");
  return { success: true };
}
