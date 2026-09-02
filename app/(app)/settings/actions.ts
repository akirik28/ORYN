"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { removeAllUserStorage, StorageCleanupError } from "@/lib/account/delete-storage";
import { UpdatePasswordSchema } from "@/lib/validation/auth";
import { meetsMinimumSignupAge } from "@/lib/legal/age-policy";
import { logEvent } from "@/lib/analytics/log";
import type { TimeBudget } from "@/types/database";

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
    return { error: parsed.error.issues[0]?.message ?? "That password can't be used." };
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
 * Permanently deletes the student's account (Phase 12 minor-safe requirement).
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

