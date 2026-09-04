"use server";

import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { isUndefinedColumnError } from "@/lib/supabase/errors";
import { computeNotNowUpdate, computeSoftDismissUntil } from "@/lib/upgrade-interstitial/prompt";

/**
 * Mirrors app/(app)/advisor/actions.ts's softDismissUpgradePrompt/notNowUpgradePrompt exactly
 * — same never-surfaces-an-error posture (closing a full-screen interstitial is not an action
 * a student should see fail), same migration-0124-unapplied degrade via isUndefinedColumnError,
 * different columns (migration 0124's own header explains why they're not shared).
 */
export async function softDismissUpgradeInterstitial(): Promise<void> {
  const session = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ upgrade_interstitial_soft_dismissed_until: computeSoftDismissUntil() })
    .eq("id", session.userId!);

  if (error && !isUndefinedColumnError(error, "upgrade_interstitial_")) {
    console.warn("[upgrade-interstitial] failed to record soft dismiss", { userId: session.userId, error });
  }
}

export async function notNowUpgradeInterstitial(): Promise<void> {
  const session = await requireUser();
  const supabase = await createClient();

  const { data: current, error: readError } = await supabase
    .from("profiles")
    .select("upgrade_interstitial_not_now_at, upgrade_interstitial_not_now_count")
    .eq("id", session.userId!)
    .maybeSingle();

  if (readError && !isUndefinedColumnError(readError, "upgrade_interstitial_")) {
    console.warn("[upgrade-interstitial] failed to read prior not-now state", { userId: session.userId, error: readError });
  }

  const row = current as { upgrade_interstitial_not_now_at: string | null; upgrade_interstitial_not_now_count: number | null } | null;
  const update = computeNotNowUpdate(row?.upgrade_interstitial_not_now_at ?? null, row?.upgrade_interstitial_not_now_count ?? 0);

  const { error: writeError } = await supabase
    .from("profiles")
    .update({
      upgrade_interstitial_not_now_at: update.notNowAt,
      upgrade_interstitial_not_now_count: update.notNowCount,
      upgrade_interstitial_dismissed_forever: update.dismissedForever,
    })
    .eq("id", session.userId!);

  if (writeError && !isUndefinedColumnError(writeError, "upgrade_interstitial_")) {
    console.warn("[upgrade-interstitial] failed to record not-now", { userId: session.userId, error: writeError });
  }
}

/**
 * PROVISIONAL — 11's own interface, agreed 2026-09-04 while the real provider adapters are
 * still under CEO review: `status: "ready"` (redirect to `checkoutUrl`, a hosted payment
 * page — full `window.location.href`, never `router.push`, since it's an external domain),
 * `"not_configured"` (no provider set up — the honest, visible state this whole feature is
 * built around, never a dead button or fake spinner), `"error"` (surface `message`). Price is
 * NOT a parameter here on purpose — 11's real action reads admin_finance_settings itself at
 * checkout-creation time, so whatever's live in kumanda's settings is what actually gets
 * charged, not whatever this client happened to render with.
 *
 * This stub always returns "not_configured", which is simply true today — no provider exists
 * yet. Both call sites (this modal, features/settings/plan-tier-view.tsx) call this exact
 * function name; the only change needed once 11's real action lands is this function's own
 * body, not either caller.
 */
export type StartCheckoutResult = { status: "ready"; checkoutUrl: string } | { status: "not_configured" } | { status: "error"; message: string };

export async function startUltraCheckoutAction(): Promise<StartCheckoutResult> {
  return { status: "not_configured" };
}
