"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
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

async function getOrigin() {
  const originHeader = (await headers()).get("origin");
  return originHeader || env.app.url;
}

export async function signUp(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = SignUpSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
    acceptedTerms: formData.get("acceptedTerms"),
  });

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors as Record<string, string[]>;
    // SignUpSchema's own message is a static English fallback (see its comment) — the
    // schema can't know the visitor's locale at module-load time, but this action runs
    // per-request and can, so it overrides just this one field's message with the
    // localized version.
    if (errors.acceptedTerms) {
      const locale = await resolveLocale();
      errors.acceptedTerms = [getLegalCopy(locale).signupConsent.checkboxRequiredError];
    }
    return { errors };
  }

  const supabase = await createClient();
  const origin = await getOrigin();
  const { displayName, email, password } = parsed.data;

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
    return { message: error.message, variant: "error" };
  }

  // If email confirmations are disabled on the Supabase project, signUp returns an
  // active session immediately — skip the "check your email" step.
  if (data.session) {
    redirect("/onboarding");
  }

  return {
    variant: "success",
    message: "Check your email to confirm your account and get started.",
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
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const supabase = await createClient();
  const origin = await getOrigin();

  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/confirm?type=recovery&next=/reset-password`,
  });

  // Always return the same message whether or not the email exists, to avoid leaking
  // which addresses have accounts.
  return {
    variant: "success",
    message: "If an account exists for that email, a reset link is on its way.",
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
