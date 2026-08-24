"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

/**
 * Permanently deletes the student's account (Phase 12 minor-safe requirement). Uses the
 * admin client to delete the auth.users row directly — every other table cascades via
 * `references auth.users(id) on delete cascade` (profiles) and `references
 * profiles(id) on delete cascade` (everything else), so this one call removes all of the
 * student's data. Irreversible; the confirmation happens in the UI before this is called.
 */
export async function deleteMyAccount(): Promise<{ error?: string }> {
  const session = await requireUser();
  const admin = createAdminClient();

  const { error } = await admin.auth.admin.deleteUser(session.userId!);
  if (error) return { error: "Couldn't delete your account. Please try again or contact support." };

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

