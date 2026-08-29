"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { UpdatePasswordSchema } from "@/lib/validation/auth";
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

const ACCOUNT_DELETION_STORAGE_BUCKETS = ["evidence", "cv-uploads"] as const;

/**
 * Permanently deletes the student's account (Phase 12 minor-safe requirement). The
 * `auth.users` delete below cascades every DB table — `references auth.users(id) on delete
 * cascade` (profiles) and `references profiles(id) on delete cascade` (everything else) — so
 * that one call removes all of the student's *database* rows. It does nothing about
 * `evidence`/`cv-uploads` Storage objects, which are addressed by path (`{userId}/...`, see
 * migration 0015), not by foreign key — no DB cascade reaches them. Before this fix, this
 * function silently left every evidence/CV file behind while the confirmation dialog
 * (features/settings/delete-account-dialog.tsx) told the student the opposite: "This
 * permanently deletes your profile, achievements, evidence files, conversations, and
 * everything else." Security Gate 1 (2026-08-29), found during an account-deletion audit.
 *
 * Order matters, and was deliberately reconsidered (Security Gate 1 second-pass review,
 * 2026-08-29): the auth.users delete runs FIRST, Storage cleanup AFTER. An earlier version
 * of this fix ran Storage cleanup first on a "retry-ability" argument, but that gets the
 * failure-mode analysis backwards. The two possible failure points are not equally bad:
 * if Storage cleanup fails and THEN deleteUser succeeds (this order), the account and every
 * DB row are fully gone — exactly what the student asked for and what the dialog promises —
 * and the only residue is orphaned bytes in Storage that no live row or session can ever
 * reference again, a backend hygiene issue, not a user-facing one. The reverse order's
 * failure mode is worse: if Storage cleanup succeeds and THEN deleteUser fails, the student
 * is left with a *live* account whose evidence/CV links are now permanently broken — a
 * degraded account, not a clean "nothing happened yet" state. Retry-ability is identical
 * either way for a first-step failure (nothing committed, the student just retries); it's
 * only the second-step-failure case where the ordering actually matters, and this order's
 * failure mode is the one that keeps the account's promise even when Storage cleanup can't
 * keep up with it.
 *
 * Storage cleanup itself enumerates each bucket's `{userId}/` prefix directly
 * (`storage.list`) rather than going by `evidence_files.file_path` rows — the same
 * reasoning as this file's own upload path (documents/actions.ts): a DB reference can be
 * incomplete or stale, an object listing can't be. It stays best-effort, not blocking, run
 * or not: a failure is logged (never silently dropped, never reported as success) but
 * never stops the account/auth deletion itself, which has already happened by the time
 * this runs — this app already treats Storage cleanup as best-effort elsewhere
 * (documents/actions.ts's own deleteEvidence does not block its DB delete on a storage
 * error either). What this fix guarantees is that a failure is at least recorded for
 * follow-up instead of never attempted at all. `userId` is captured before the delete and
 * used only as a plain string for path construction — Storage cleanup does not depend on
 * the account or any DB row still existing, so running it after deleteUser loses nothing.
 *
 * Uses `tryCreateAdminClient()`, not the throwing `createAdminClient()`, so a missing
 * `SUPABASE_SECRET_KEY` returns a clear error instead of an uncaught exception — this was
 * the one real gap a credential-failure-handling sweep found across the whole codebase;
 * every other direct `createAdminClient()` call site is either already caught by its
 * caller or reachable only from admin/cron-gated code, not a plain signed-in student
 * action like this one.
 */
export async function deleteMyAccount(): Promise<{ error?: string }> {
  const session = await requireUser();
  const userId = session.userId!;
  const admin = tryCreateAdminClient();
  if (!admin) {
    console.error("[account-deletion] SUPABASE_SECRET_KEY not configured — cannot delete account");
    return { error: "Account deletion is temporarily unavailable. Please try again shortly." };
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: "Couldn't delete your account. Please try again or contact support." };

  const storageFailures: string[] = [];
  for (const bucket of ACCOUNT_DELETION_STORAGE_BUCKETS) {
    const { data: objects, error: listError } = await admin.storage.from(bucket).list(userId);
    if (listError) {
      storageFailures.push(bucket);
      console.error(`[account-deletion] couldn't list ${bucket}/${userId}: ${listError.message}`);
      continue;
    }
    if (objects && objects.length > 0) {
      const paths = objects.map((object) => `${userId}/${object.name}`);
      const { error: removeError } = await admin.storage.from(bucket).remove(paths);
      if (removeError) {
        storageFailures.push(bucket);
        console.error(`[account-deletion] couldn't remove objects from ${bucket}/${userId}: ${removeError.message}`);
      }
    }
  }
  if (storageFailures.length > 0) {
    console.error(
      `[account-deletion] account ${userId} was deleted, but Storage cleanup was incomplete in: ${storageFailures.join(", ")} — orphaned files may remain and need manual follow-up`
    );
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

