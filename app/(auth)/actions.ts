"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProductSettings } from "@/lib/admin/queries";
import {
  SignUpSchema,
  SignInSchema,
  RequestPasswordResetSchema,
  UpdatePasswordSchema,
  type AuthFormState,
} from "@/lib/validation/auth";
import { requireUser } from "@/lib/security/dal";
import { env } from "@/lib/env";
import { isSafeRedirectTarget } from "@/lib/security/safe-redirect";
import { resolveLocale } from "@/lib/i18n/locale";
import { getLegalCopy, LEGAL_REVIEW_STATUS } from "@/lib/legal/content";
import { setParentInviteEmail } from "@/lib/parent/links";
import { sendVerificationCode } from "@/lib/email/verification";
import { logEvent } from "@/lib/analytics/log";

async function getOrigin() {
  const originHeader = (await headers()).get("origin");
  return originHeader || env.app.url;
}

export async function signUp(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  // Checked first, before validating anything the visitor typed -- gates account creation
  // itself, not just this form's own affordance. An existing student signing back in
  // (signIn() below) is a completely separate action and is never touched by this.
  const { signupsEnabled } = await getProductSettings(createAdminClient());
  if (!signupsEnabled) {
    const t = await getTranslations("auth.signup");
    return { message: t("signupsClosedMessage"), variant: "error" };
  }

  const parsed = SignUpSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
    parentEmail: formData.get("parentEmail"),
    acceptedTerms: formData.get("acceptedTerms"),
  });

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors as Record<string, string[]>;
    // SignUpSchema's own messages are a static English fallback (see its comments) — the
    // schema can't know the visitor's locale at module-load time, but this action runs
    // per-request and can. Same reasoning and shape as signIn()/updatePassword() below:
    // email and password reuse the shared login/resetPassword translations for the
    // identical validator text rather than duplicating it under a third key.
    const tLogin = await getTranslations("auth.login");
    const tReset = await getTranslations("auth.resetPassword");
    const tSignup = await getTranslations("auth.signup");
    const translated: Record<string, string> = {
      "Enter at least 2 characters.": tSignup("displayNameTooShort"),
      "Enter a valid email address.": tLogin("emailInvalid"),
      "Use at least 8 characters.": tReset("passwordMinLength"),
      "Include at least one letter.": tReset("passwordNeedsLetter"),
      "Include at least one number.": tReset("passwordNeedsNumber"),
    };
    for (const field of Object.keys(errors)) {
      errors[field] = errors[field].map((message) => translated[message] ?? message);
    }
    if (errors.acceptedTerms) {
      const locale = await resolveLocale();
      errors.acceptedTerms = [getLegalCopy(locale).signupConsent.checkboxRequiredError];
    }
    return { errors };
  }

  const supabase = await createClient();
  const origin = await getOrigin();
  const { displayName, email, password, parentEmail } = parsed.data;

  /**
   * A record of *what* was accepted and *when*, not just that a box was ticked. Stored on
   * the auth user's metadata rather than a new column, so this needs no migration and
   * survives independently of the profile row.
   *
   * `terms_version` is the draft date of the documents in `lib/legal/content.ts`. Once the
   * text is revised — and especially once counsel approves it — accounts created before
   * that revision remain distinguishable from ones created after, which is the whole point
   * of recording a version rather than a bare boolean.
   */
  const consentMetadata = {
    terms_accepted_at: new Date().toISOString(),
    terms_version: LEGAL_REVIEW_STATUS.draftedOn,
    terms_approved_by_counsel: LEGAL_REVIEW_STATUS.approved,
  };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName, ...consentMetadata },
      emailRedirectTo: `${origin}/auth/confirm?next=/onboarding`,
    },
  });

  if (error) {
    // error.message is Supabase Auth's own SDK error text, not static app copy — same
    // deliberate choice as updatePassword() below: no catalog entry, left in English.
    return { message: error.message, variant: "error" };
  }

  /**
   * P4 (docs/veli-hesabi-spec-2026-09-04.md G12) — best-effort, and deliberately cannot fail
   * this signup. The account this student came here to create is the important outcome;
   * losing that because a side field about a *different* person's email couldn't be saved
   * would be a worse failure than just logging it and moving on. Uses the admin client
   * (setParentInviteEmail's own comment explains why): email-confirmation-required projects
   * grant no session at this point, so an RLS-scoped write as "this new user" isn't reliably
   * possible yet, and this write needs to succeed regardless of which mode the project is in.
   *
   * Nothing beyond this column write happens here — no invite link is generated or logged at
   * signup time. See lib/parent/invite.ts's own header: the link's 14-day clock should start
   * when the student actually goes to share it, not silently while it sits unread in
   * Settings, so features/settings/parent-invite-section.tsx computes it fresh on render
   * instead.
   */
  if (parentEmail && data.user) {
    const admin = createAdminClient();
    const result = await setParentInviteEmail(admin, data.user.id, parentEmail);
    if (result.error) {
      console.error("[signUp] failed to save parent_invite_email", { userId: data.user.id, error: result.error });
    } else {
      await logEvent(data.user.id, "parent_email_provided_at_signup");
    }
  }

  /**
   * E2 (docs/PROXOLA-PLAN.md), CEO's decision 2026-09-05 — "the code goes out the moment the
   * email is collected." Signup is that moment for every student, since every account needs
   * one. Same best-effort discipline as the parent_invite_email write just above (own admin
   * client, for the identical reason — no reliable session yet): the account this student
   * came here to create must never fail or stall because a verification send did. Every
   * outcome (not_configured, cooldown — unreachable on a brand-new account but the function's
   * contract either way, send_failed, unavailable) is logged with its own reason, not folded
   * into one generic catch, so a real send failure is findable rather than indistinguishable
   * from "no provider chosen yet."
   */
  if (data.user) {
    const admin = createAdminClient();
    const sendResult = await sendVerificationCode(data.user.id, email, admin);
    if (!sendResult.sent) {
      console.error("[signUp] verification code not sent", { userId: data.user.id, reason: sendResult.reason });
    }
  }

  // If email confirmations are disabled on the Supabase project, signUp returns an
  // active session immediately — skip the "check your email" step.
  if (data.session) {
    redirect("/onboarding");
  }

  const t = await getTranslations("auth.signup");
  return {
    variant: "success",
    message: t("checkEmailMessage"),
  };
}

export async function signIn(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const t = await getTranslations("auth.login");
  const parsed = SignInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors as Record<string, string[]>;
    // SignInSchema's own messages are a static English fallback, for the same reason
    // documented on SignUpSchema.acceptedTerms — the schema is built once at module load
    // and cannot know the visitor's locale, but this action runs per-request and can.
    const translated: Record<string, string> = {
      "Enter a valid email address.": t("emailInvalid"),
      "Enter your password.": t("passwordRequired"),
    };
    for (const field of Object.keys(errors)) {
      errors[field] = errors[field].map((message) => translated[message] ?? message);
    }
    return { errors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { message: t("incorrectCredentials"), variant: "error" };
  }

  const next = formData.get("next");
  redirect(typeof next === "string" && isSafeRedirectTarget(next) ? next : "/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = RequestPasswordResetSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors as Record<string, string[]>;
    // Same reasoning as signIn()/signUp() above — RequestPasswordResetSchema's own
    // message is a static English fallback; reuses auth.login's translation for the
    // identical email validator rather than a fourth copy of the same string.
    if (errors.email) {
      const t = await getTranslations("auth.login");
      errors.email = errors.email.map((message) => (message === "Enter a valid email address." ? t("emailInvalid") : message));
    }
    return { errors };
  }

  const supabase = await createClient();
  const origin = await getOrigin();

  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/confirm?type=recovery&next=/reset-password`,
  });

  // Always return the same message whether or not the email exists, to avoid leaking
  // which addresses have accounts.
  const t = await getTranslations("auth.forgotPassword");
  return {
    variant: "success",
    message: t("linkSentMessage"),
  };
}

export async function updatePassword(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  await requireUser();

  const parsed = UpdatePasswordSchema.safeParse({ password: formData.get("password") });
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors as Record<string, string[]>;
    // Same reasoning as signIn() above — UpdatePasswordSchema's messages are a static
    // English fallback; this action runs per-request and can resolve the real locale.
    const t = await getTranslations("auth.resetPassword");
    const translated: Record<string, string> = {
      "Use at least 8 characters.": t("passwordMinLength"),
      "Include at least one letter.": t("passwordNeedsLetter"),
      "Include at least one number.": t("passwordNeedsNumber"),
    };
    if (errors.password) {
      errors.password = errors.password.map((message) => translated[message] ?? message);
    }
    return { errors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    // error.message is Supabase Auth's own SDK error text, not static app copy — no
    // catalog entry exists for it, and building one would mean maintaining a mapping
    // against an external service's own message set. Left in English deliberately.
    return { message: error.message, variant: "error" };
  }

  redirect("/dashboard");
}
