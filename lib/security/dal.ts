import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, ProfileScore } from "@/types/database";

/**
 * Data Access Layer. proxy.ts only performs an optimistic cookie-based redirect — this is
 * the authoritative check. Every Server Component, Server Action, and Route Handler that
 * touches user data must call verifySession() (or requireUser()) itself; never rely on a
 * parent layout having already checked (layouts don't re-run on client-side navigation).
 * See node_modules/next/dist/docs/01-app/02-guides/authentication.md.
 */
export const verifySession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { isAuth: Boolean(user), userId: user?.id ?? null, email: user?.email ?? null };
});

/** Redirects to /login if there is no session. Use in pages/layouts that require auth. */
export async function requireUser() {
  const session = await verifySession();
  if (!session.isAuth || !session.userId) {
    redirect("/login");
  }
  return session;
}

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const session = await verifySession();
  if (!session.userId) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", session.userId).single();

  if (error) {
    console.error("[dal] failed to load profile", { error: error.message });
    return null;
  }

  return data;
});

export async function requireProfile() {
  await requireUser();
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }
  return profile;
}

/**
 * `profile_scores` was the most-duplicated read in the product as of the 2026-09-02
 * performance pass (docs/performance.md §2) — the layout (every page), the dashboard,
 * the advisor page, `getCounselorState`, `refreshOpportunityMatches`, and
 * `refreshAdmissionOutlook` each independently re-fetched it, sometimes more than once
 * per render. Mirrors `getCurrentProfile()`'s shape exactly: `cache()`-wrapped,
 * constructs its own `createClient()` internally rather than accepting one as a
 * parameter. That last part is load-bearing, not a style choice — `cache()` memoizes
 * on argument *identity*, and `createClient()` is not itself memoized, so a helper
 * shaped `(supabase, userId)` would see a different `supabase` reference from every
 * independent caller and never actually dedupe (the exact failure mode
 * docs/performance.md's §2 "What actually memoizing this needs" already documents for
 * `assembleScoringFacts`/`loadSupersessionMap`). `userId` alone is a plain string, so
 * `cache()` correctly matches it by value across every caller in the same request.
 *
 * `select("*")` deliberately, matching `getCurrentProfile()`'s own convention — every
 * current caller wants a subset of `dimension | score | confidence | reason_codes`,
 * so one wide query serves all of them rather than each specifying its own narrower
 * column list (which is what made the duplicate reads look like different queries at
 * a glance even though they wanted the same rows).
 *
 * Not a fit for every `profile_scores` caller: `refreshAdmissionOutlook`'s
 * background-job path (no request/cookies to read) and the cohort-wide benchmarking
 * reads (`lib/benchmarking/cohort.ts`, many users at once via the admin client) are
 * structurally different queries this helper isn't shaped for — see this function's
 * callers for which ones actually apply.
 */
export const getProfileScores = cache(async (userId: string): Promise<ProfileScore[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profile_scores").select("*").eq("user_id", userId);

  if (error) {
    console.error("[dal] failed to load profile scores", { userId, error: error.message });
    return [];
  }

  return data ?? [];
});
