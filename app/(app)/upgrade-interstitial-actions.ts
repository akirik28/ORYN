"use server";

import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUndefinedColumnError } from "@/lib/supabase/errors";
import { computeNotNowUpdate, computeSoftDismissUntil } from "@/lib/upgrade-interstitial/prompt";
import { getFinanceSettings } from "@/lib/admin/queries";

/**
 * Mirrors app/(app)/advisor/actions.ts's softDismissUpgradePrompt/notNowUpgradePrompt exactly
 * — same never-surfaces-an-error posture (closing a full-screen interstitial is not an action
 * a student should see fail), same migration-0122-unapplied degrade via isUndefinedColumnError,
 * different columns (migration 0122's own header explains why they're not shared).
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
 * The interstitial's own price read — same source as everywhere else (getFinanceSettings,
 * lib/admin/queries.ts, backed by admin_finance_settings/migration 0094), not a new copy.
 * A Server Action rather than folded into the layout's own server read because the modal's
 * mount wrapper is a Client Component (needs sessionStorage for the once-per-session gate)
 * one level below the server layout — this keeps the price live even if the layout's own
 * server-rendered props go stale under client-side navigation within the (app) segment.
 */
export async function getUltraPriceTryAction(): Promise<number> {
  const settings = await getFinanceSettings(createAdminClient());
  return settings.ultraPriceTry;
}

/**
 * Provisional — no payment provider is configured yet (11 is building the real interface,
 * behind its own seam, coordinated 2026-09-04). Returns `available: false` unconditionally
 * until that lands; this function is the one place that changes when it does, not a check
 * duplicated at every call site. `checkoutUrl` is present only when `available` is true, so a
 * caller can't accidentally render a broken CTA against a partially-filled result.
 */
export interface UltraCheckoutAvailability {
  available: boolean;
  checkoutUrl?: string;
}

export async function checkUltraCheckoutAvailabilityAction(): Promise<UltraCheckoutAvailability> {
  return { available: false };
}
