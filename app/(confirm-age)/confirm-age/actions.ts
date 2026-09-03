"use server";

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { toFriendlyDbErrorMessage } from "@/lib/errors/friendly-db-error";
import { meetsMinimumSignupAge } from "@/lib/legal/age-policy";
import { logEvent } from "@/lib/analytics/log";
import { resolveLocale } from "@/lib/i18n/locale";

/**
 * Backfills birth_year for an account that completed onboarding before that field was
 * required (app/(app)/layout.tsx and app/(confirm-age)/layout.tsx both gate on exactly
 * this state). Unlike settings' updateBirthYear(), null is not a valid input here — the
 * whole point of this page is that a value must be supplied to leave it, and there is
 * nowhere else in the product this account can go instead.
 *
 * Deliberately does NOT block or otherwise change the account when the declared year
 * reveals an age below MINIMUM_SIGNUP_AGE_YEARS. This is an existing account that has
 * already been using the product — treating a newly-collected self-report as grounds to
 * lock or delete it is a materially different, higher-stakes decision than refusing a
 * brand-new signup (completeOnboarding's own check), and nothing in this codebase has a
 * guardian-consent mechanism to responsibly act on it yet (see
 * docs/age-gate-design-2026-09-02.md). Recorded via logEvent instead — visible for
 * founder/legal follow-up, not silently dropped, and not a decision made unilaterally
 * here.
 */
export async function submitBirthYear(birthYearInput: string): Promise<{ error?: string }> {
  const session = await requireUser();
  const userId = session.userId!;
  const t = await getTranslations("confirmAge");
  const locale = await resolveLocale();

  const trimmed = birthYearInput.trim();
  const year = Number(trimmed);
  const currentYear = new Date().getFullYear();

  if (!trimmed || !Number.isInteger(year) || year < currentYear - 100 || year > currentYear - 10) {
    return { error: t("invalidYear") };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ birth_year: year }).eq("id", userId);
  if (error) {
    console.error("[confirm-age] failed to save birth year", { code: error.code, message: error.message });
    return { error: toFriendlyDbErrorMessage("save", locale) };
  }

  if (!meetsMinimumSignupAge(year)) {
    await logEvent(userId, "birth_year_backfill_below_minimum_age", { birthYear: year });
  }

  redirect("/dashboard");
}
