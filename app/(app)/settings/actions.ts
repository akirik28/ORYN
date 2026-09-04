"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser, getCurrentProfile } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUndefinedColumnError } from "@/lib/supabase/errors";
import { removeAllUserStorage, StorageCleanupError } from "@/lib/account/delete-storage";
import { UpdatePasswordSchema } from "@/lib/validation/auth";
import { meetsMinimumSignupAge } from "@/lib/legal/age-policy";
import { logEvent } from "@/lib/analytics/log";
import { resolvePlanTier } from "@/lib/tier/plan-tier";
import { getTranslations } from "next-intl/server";
import { advisorInstructionsMaxLength } from "@/lib/tier/advisor-instructions";
import type { NotificationCategory, TimeBudget, ResponseMode } from "@/types/database";

/**
 * Change the password of the already-signed-in student.
 *
 * Separate from `(auth)/actions.ts`'s `updatePassword` even though both end in the same
 * Supabase call, because that one redirects to /dashboard on success — correct when the
 * student arrived from a reset link and has nowhere else to be, wrong when they are on
 * Settings and expect to stay there. Same `UpdatePasswordSchema`, so the strength rules
 * cannot drift between the two entry points.
 *
 * No current-password field: Supabase's `updateUser` acts on the session, and this route
 * is already behind `requireUser()`. Re-authentication would be a real hardening step but
 * it belongs with a session-freshness policy, not bolted onto one form.
 */
export async function changePassword(password: string): Promise<{ error?: string }> {
  await requireUser();

  const parsed = UpdatePasswordSchema.safeParse({ password });
  if (!parsed.success) {
    // UpdatePasswordSchema's own messages are a static English fallback -- exact same
    // schema app/(auth)/actions.ts's updatePassword() already validates against, so this
    // reuses that function's own translated lookup table (auth.resetPassword) rather than
    // a second, drifting copy. Found untranslated during 2026-09-03's student-facing i18n
    // audit.
    const t = await getTranslations("auth.resetPassword");
    const translated: Record<string, string> = {
      "Use at least 8 characters.": t("passwordMinLength"),
      "Include at least one letter.": t("passwordNeedsLetter"),
      "Include at least one number.": t("passwordNeedsNumber"),
    };
    const message = parsed.error.issues[0]?.message;
    return { error: (message ? translated[message] : undefined) ?? t("passwordMinLength") };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { error: error.message };
  }

  return {};
}

export async function updateDisplayName(displayName: string): Promise<{ error?: string }> {
  const session = await requireUser();
  const trimmed = displayName.trim();
  if (!trimmed) return { error: "Name can't be empty." };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ display_name: trimmed }).eq("id", session.userId!);
  if (error) return { error: "Couldn't save your name." };

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return {};
}

/** Editable post-onboarding (onboarding only ever writes this once, with no way back —
 * a student who moves, or typed it wrong, was stuck). Country stays required (matches
 * onboarding's own validation; several other reads already assume a student who's
 * completed onboarding has one) — city is optional and, unlike country, isn't collected
 * anywhere else yet. Both feed opportunity relevance ranking (lib/opportunities/matching.ts's
 * isNearStudent) at the country level only; `opportunities` has no city column yet. */
export async function updateLocation(country: string, city: string | null): Promise<{ error?: string }> {
  const session = await requireUser();
  const trimmedCountry = country.trim();
  if (!trimmedCountry) return { error: "Country can't be empty." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ country: trimmedCountry, city: city?.trim() || null })
    .eq("id", session.userId!);
  if (error) return { error: "Couldn't save your location." };

  revalidatePath("/settings");
  revalidatePath("/opportunities");
  return {};
}

/**
 * The edit path for a field onboarding now requires but that no existing account was ever
 * asked for — before this, `birth_year` was read in four places and writable in none, so
 * every account created before it was added is stuck with null and sees "Oryn can't check
 * this without your birth year on file" on every age-restricted opportunity.
 *
 * Bounds duplicated from `CompleteOnboardingSchema` deliberately: this is a Server Action
 * reachable independently of that schema, and a client that skips the form must not be able
 * to write a value the onboarding path would have rejected.
 */
export async function updateBirthYear(birthYear: number | null): Promise<{ error?: string }> {
  const session = await requireUser();

  if (birthYear !== null) {
    const currentYear = new Date().getFullYear();
    if (!Number.isInteger(birthYear) || birthYear < currentYear - 100 || birthYear > currentYear - 10) {
      return { error: "Enter the year you were born." };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ birth_year: birthYear }).eq("id", session.userId!);
  if (error) return { error: "Couldn't save your birth year." };

  // Same non-blocking flag as app/(confirm-age)/confirm-age/actions.ts, and the same
  // reasoning: this is an existing account correcting its own on-file value, not a new
  // signup — refusing or reverting the edit unilaterally would be a bigger decision than
  // "capture the age" (see docs/age-gate-design-2026-09-02.md). Only fires on an actual
  // value, never on clearing it back to null — there's no age to flag in that case.
  if (birthYear !== null && !meetsMinimumSignupAge(birthYear)) {
    await logEvent(session.userId!, "birth_year_settings_update_below_minimum_age", { birthYear });
  }

  revalidatePath("/settings");
  // Both surfaces re-derive eligibility from this value, so a stale cache here is the
  // difference between "Oryn can't check this" and a real answer.
  revalidatePath("/opportunities");
  revalidatePath("/advisor");
  return {};
}

/** Distinct from updateLocation's `country` (residence/school location) — citizenship
 * (migration 0047), never inferred from it, feeds Counselor Core's structured eligibility
 * check (lib/counselor/eligibility.ts) against opportunities.eligible_citizenships. Never
 * required — an empty list is a valid, honest "not stated," not an error; Counselor treats
 * citizenship-restricted opportunities as unknown-eligibility (not confirmed either way)
 * rather than blocking anything on this being filled in. */
export async function updateCitizenship(citizenshipCountries: string[]): Promise<{ error?: string }> {
  const session = await requireUser();
  const trimmed = [...new Set(citizenshipCountries.map((c) => c.trim()).filter(Boolean))];

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ citizenship_countries: trimmed }).eq("id", session.userId!);
  if (error) return { error: "Couldn't save your citizenship." };

  revalidatePath("/settings");
  revalidatePath("/opportunities");
  revalidatePath("/advisor");
  return {};
}

export async function updateBusyMode(busyMode: boolean, busyModeUntil: string | null): Promise<{ error?: string }> {
  const session = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ busy_mode: busyMode, busy_mode_until: busyModeUntil }).eq("id", session.userId!);
  if (error) return { error: "Couldn't update." };
  revalidatePath("/settings");
  return {};
}

/** Phase 64 — feeds directly into weekly-plan generation (lib/ai/student-context.ts
 * already reads this field into the advisor's prompt context; this is what actually lets
 * a student set it). */
export async function updateTimeBudget(timeBudget: TimeBudget | null): Promise<{ error?: string }> {
  const session = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ weekly_time_budget: timeBudget }).eq("id", session.userId!);
  if (error) return { error: "Couldn't update." };
  revalidatePath("/settings");
  return {};
}

/** V1 social scope (docs/product-decisions.md) — opt-in, private-by-default. `isPublic`
 * and `lookingFor` are independent: a student can set a "looking for" status while
 * staying private (it just won't be visible anywhere yet), though the settings UI only
 * exposes it once public to avoid a confusing "who sees this?" state. */
export async function updateVisibility(isPublic: boolean, lookingFor: string | null): Promise<{ error?: string }> {
  const session = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ is_public: isPublic, looking_for: lookingFor?.trim() || null })
    .eq("id", session.userId!);
  if (error) return { error: "Couldn't update." };
  revalidatePath("/settings");
  revalidatePath("/profile");
  return {};
}

/**
 * Migration 0090 — per-category notification toggles. Going-forward only, same as every
 * write lib/notifications/create.ts's createNotification() gates: this changes nothing about
 * notifications already sitting in a student's list, only whether a future one for a given
 * category gets created. All seven written in one call, matching updateVisibility's own
 * batched-fields shape above, rather than one Server Action per toggle.
 *
 * Fails loudly, deliberately, not silently — this is the one write in this file that
 * degrades a promise rather than a display. 0090 unapplied means every save fails
 * (confirmed live 2026-09-02: this shipped with no missing-column handling at all, so the
 * generic error below fired on every single attempt, unconditionally, for a reason that had
 * nothing to do with the student). The fix is not to make the write succeed silently — a
 * student believing a preference saved when it didn't is worse than being told it failed —
 * it's to tell them the TRUE, SPECIFIC reason rather than an opaque wall they'd reasonably
 * read as "try again." isUndefinedColumnError narrows on the shared `notify_` prefix, same
 * reasoning as lib/notifications/create.ts's read-side categoryIsEnabled: whichever of the
 * seven Postgres/PostgREST names first, the rest are missing too (they land together). This
 * is the write-side case lib/supabase/errors.ts's own corrected comment names directly — a
 * named-column write, not `select('*')`, so `?? default` was never an option here the way it
 * is for lib/tier/plan-tier.ts's read.
 */
export async function updateNotificationPreferences(preferences: Record<NotificationCategory, boolean>): Promise<{ error?: string }> {
  const session = await requireUser();
  const supabase = await createClient();

  // Explicit per-field, not a dynamic keyed loop -- seven is few enough that this stays
  // readable, and it keeps the object a real Partial<Profile> literal (needed for the
  // generated Supabase types to accept it) rather than a widened Record<string, boolean>.
  const { error } = await supabase
    .from("profiles")
    .update({
      notify_deadline: preferences.deadline,
      notify_new_opportunity: preferences.new_opportunity,
      notify_weekly_plan: preferences.weekly_plan,
      notify_profile_update: preferences.profile_update,
      notify_university_data_changed: preferences.university_data_changed,
      notify_connection: preferences.connection,
      notify_message: preferences.message,
    })
    .eq("id", session.userId!);
  if (error) {
    if (isUndefinedColumnError(error, "notify_")) {
      return { error: "Notification preferences aren't available on your account yet, so nothing was saved. Retrying won't change that." };
    }
    return { error: "Couldn't update your notification settings." };
  }
  revalidatePath("/settings");
  return {};
}

/**
 * Migration 0091 — the response-mode slider's own persistence (features/advisor/response-
 * mode-slider.tsx). Same shape as updateNotificationPreferences above and the same
 * reasoning for failing loudly rather than retrying without the field: unlike
 * advisor_messages.degraded (migration 0088, app/(app)/advisor/actions.ts), where a
 * missing column means dropping one piece of metadata off a write that still has a real
 * primary purpose (saving the reply), this write's *entire* purpose is the one field. There
 * is nothing meaningful left to save if it's silently omitted — a student who picked
 * "Ultra" and got no error, no confirmation, and no saved preference would reasonably
 * assume it worked.
 *
 * Saving the preference is independent of whether it's currently in effect — spend-based
 * degrade (lib/ai/limits/budget.ts) can still override which model actually answers the
 * next message, same as it already does silently today. This action only ever records what
 * the student asked for.
 *
 * Plan-gated for "thorough" only (founder, 2026-09-02: "sadece normal kullanıcı ultraya
 * geçemesin, o kadar" — only a standard user shouldn't be able to switch to Ultra, that's
 * it). Fast and Standard stay free for every plan_tier, unconditionally. The slider's own
 * interactive clamp is what a real student actually meets; this check is the backstop for
 * the same reason every other authorization check in this codebase re-verifies server-side
 * — a Server Action is directly callable with any argument regardless of what UI called it.
 */
export async function updateResponseMode(mode: ResponseMode): Promise<{ error?: string }> {
  const session = await requireUser();

  if (mode === "thorough") {
    const profile = await getCurrentProfile();
    if (resolvePlanTier(profile ?? { plan_tier: "standard", ultra_gift_expires_at: null, paid_ultra_expires_at: null }) !== "ultra") {
      return { error: "Ultra isn't available on your plan, so nothing was saved." };
    }
  }

  const supabase = await createClient();

  const { error } = await supabase.from("profiles").update({ response_mode: mode }).eq("id", session.userId!);
  if (error) {
    if (isUndefinedColumnError(error, "response_mode")) {
      return { error: "Response mode isn't available on your account yet, so nothing was saved. Retrying won't change that." };
    }
    return { error: "Couldn't save your response mode." };
  }

  revalidatePath("/advisor");
  return {};
}

/**
 * Özelleşme piece 1 (docs/ozellesme-spec-2026-09-03.md §1) — the student's own standing
 * instruction to the advisor. Empty/whitespace-only input clears it (`null`), a legitimate
 * "remove my instruction" action, not an error.
 *
 * The 500 (Standard) / 2,000 (Ultra) character limit is re-checked here, server-side,
 * against the real char count of the trimmed text — never trusted from the client. The
 * spec's own words: "İstemciyi atlayıp doğrudan çağıran biri 20.000 karakter yazamamalı; bu
 * bir maliyet kontrolü, bir arayüz nezaketi değil" (someone bypassing the client and calling
 * directly must not be able to write 20,000 characters — this is a cost control, not a UI
 * nicety) — this text enters every advisor_chat system prompt
 * (lib/ai/student-context.ts's formatContextForPrompt), so an unenforced limit is an
 * unbounded per-call cost, not just a cosmetic overflow. Rejected outright rather than
 * silently truncated: a student who wrote 600 characters and had it silently cut to 500
 * would not know their instruction now ends mid-sentence, and would have no way to notice
 * until the advisor's behavior stopped matching what they thought they'd asked for.
 *
 * Same shape as updateResponseMode above: a real tier check re-verified server-side (a
 * Server Action is directly callable with any argument regardless of what UI called it, and
 * a plan_tier downgrade after an Ultra-length instruction was saved must not let that
 * instruction silently keep costing Ultra-sized tokens on a Standard-priced call), and the
 * same isUndefinedColumnError handling for migration 0111 being written but not yet applied
 * everywhere this runs.
 */
export async function updateAdvisorInstructions(text: string): Promise<{ error?: string }> {
  const session = await requireUser();
  const profile = await getCurrentProfile();
  const tier = resolvePlanTier(profile ?? { plan_tier: "standard", ultra_gift_expires_at: null, paid_ultra_expires_at: null });
  const maxLength = advisorInstructionsMaxLength(tier);

  const trimmed = text.trim();
  if (trimmed.length > maxLength) {
    return { error: `Instructions can be at most ${maxLength} characters on your plan, so nothing was saved.` };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ advisor_instructions: trimmed.length > 0 ? trimmed : null })
    .eq("id", session.userId!);
  if (error) {
    if (isUndefinedColumnError(error, "advisor_instructions")) {
      return { error: "Instructions aren't available on your account yet, so nothing was saved. Retrying won't change that." };
    }
    return { error: "Couldn't save your instructions." };
  }

  revalidatePath("/advisor");
  return {};
}

/**
 * The plan page's only call to action, and it does not upgrade anything — there is no
 * payments integration (migration 0089's own header: "no payment, no upgrade flow, no
 * billing table"), so a control that looked like it did would be exactly the "fake buttons
 * that do nothing" AGENTS.md forbids outright. This registers a genuine, honest signal
 * (an analytics event, same mechanism as every other product event in this codebase) and
 * nothing else — no row is created that implies an entitlement, no email is sent, no plan
 * changes. `logEvent` is fire-and-forget by design (its own doc comment), so this always
 * resolves successfully from the caller's point of view; a real logging failure is visible
 * in server logs, not surfaced to the student as an error, matching how every other
 * best-effort product event in this codebase already behaves.
 */
export async function registerUltraInterestAction(): Promise<void> {
  const session = await requireUser();
  await logEvent(session.userId!, "ultra_interest_registered");
}

/**
 * Permanently deletes the student's account (AGENTS.md section 12, minor-safe requirement).
 *
 * Order matters and is the whole design. Storage objects are removed FIRST, while the
 * database rows saying which file paths belonged to this student still exist — reversed,
 * there is no way left to know which paths were theirs. Only once that succeeds does the
 * admin client delete the `auth.users` row; 42 of the 43 live tables with a `profiles(id)`
 * reference cascade via `on delete cascade` (independently re-verified live against
 * `pg_constraint` in docs/account-deletion-audit-2026-09-02.md, superseding
 * DATA_RIGHTS_AUDIT.md's original 41-of-42 count from before several later migrations
 * added more owner tables), so that one call removes the rest of the student's *database*
 * data — with one deliberate exception: `ai_usage.user_id` is `on delete set null`, not
 * cascade (migration 0013_ops.sql), so an `ai_usage` row survives as an anonymized record
 * (feature/provider/model/token counts/cost, no prompt content, no user_id) rather than
 * being removed. DATA_RIGHTS_AUDIT.md treats that as a legitimate way to satisfy an
 * erasure right, not a bug — but it is a real, deliberate divergence from "every table
 * cascades," not a rounding error, and whether anonymize-in-place is sufficient (vs.
 * requiring full deletion) is recorded as an open question in `LAWYER_FLAGS`
 * (lib/legal/content.ts) rather than settled here.
 *
 * It does not touch Storage — Postgres FK cascades don't reach it, which is exactly the
 * gap DATA_RIGHTS_AUDIT.md found: this function used to delete the account and leave
 * every uploaded file behind, unreachable and unaccounted for, forever, while a comment
 * right here claimed "this one call removes all of the student's data." That claim was
 * false for Storage and is the reason removeAllUserStorage() exists. If it throws, this
 * function must return an honest error and must NOT proceed to deleteUser() — a partial
 * cleanup reported to the student as a complete deletion is worse than a deletion that
 * visibly failed and can be retried.
 *
 * The two failure branches below are NOT interchangeable, and must not share a message.
 * A storage failure means nothing happened — the account is untouched and a retry starts
 * clean. A deleteUser() failure happens strictly after storage has already succeeded, so
 * the student's uploaded files are already, irrecoverably gone even though their account
 * (oddly) still exists — found and left unfixed as "the silent-loss gap" in
 * docs/account-deletion-audit-2026-09-02.md, fixed here. Telling a 16-year-old
 * "something went wrong" when their documents are already gone is not honest merely
 * because it's vague; it has to say which thing actually happened.
 *
 * Irreversible once both steps succeed; the confirmation happens in the UI before this is
 * called.
 */
export async function deleteMyAccount(): Promise<{ error?: string }> {
  const session = await requireUser();
  const admin = createAdminClient();

  try {
    await removeAllUserStorage(admin, session.userId!);
  } catch (error) {
    console.error("[deleteMyAccount] storage cleanup failed; account was NOT deleted", {
      userId: session.userId,
      bucket: error instanceof StorageCleanupError ? error.bucket : undefined,
      stage: error instanceof StorageCleanupError ? error.stage : undefined,
      error,
    });
    return {
      error:
        "We couldn't finish removing your files, so your account has not been deleted. Please try again, or contact support if this keeps happening.",
    };
  }

  const { error } = await admin.auth.admin.deleteUser(session.userId!);
  if (error) {
    // Not the same failure as the storage branch above, and must not read as one:
    // removeAllUserStorage() already succeeded by this point, so any uploaded evidence
    // or CVs are genuinely, irrecoverably gone — while the account itself, oddly, still
    // exists (docs/account-deletion-audit-2026-09-02.md's "silent-loss gap"). The
    // ordering stays storage-first regardless — the alternative orphans files against a
    // deleted account with no owner left to ever reclaim them — but a student reading
    // "something went wrong" here would have no reason to suspect their files didn't
    // survive. Retrying is expected to succeed: every bucket is already empty for this
    // user, so removeAllUserStorage() is a no-op the second time (confirmed live: even a
    // bucket that doesn't exist yet, like post-media, lists as 200/[] rather than
    // erroring — see the audit doc), leaving only deleteUser() to actually complete.
    console.error("[deleteMyAccount] storage cleanup succeeded but deleteUser failed; account was NOT deleted, files were", {
      userId: session.userId,
      error,
    });
    return {
      error:
        "Your uploaded files have already been removed and can't be recovered, but the rest of your account hasn't been deleted yet. Please try again, or contact support if this keeps happening.",
    };
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

