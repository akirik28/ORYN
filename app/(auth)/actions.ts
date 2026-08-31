"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
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
import { LEGAL_REVIEW_STATUS } from "@/lib/legal/content";

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
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
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
  const parsed = SignInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { message: "Incorrect email or password.", variant: "error" };
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
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    return { message: error.message, variant: "error" };
  }

  redirect("/dashboard");
}
