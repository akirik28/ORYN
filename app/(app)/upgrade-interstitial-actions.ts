"use server";

import { headers } from "next/headers";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { isUndefinedColumnError } from "@/lib/supabase/errors";
import { computeNotNowUpdate, computeSoftDismissUntil } from "@/lib/upgrade-interstitial/prompt";
import { env } from "@/lib/env";
import { startUltraCheckout, type StartCheckoutResult } from "@/lib/payments/checkout";

export type { StartCheckoutResult };

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
 * 2026-09-04 — the real action landed (migration 0123, lib/payments/), replacing the stub
 * this comment used to describe. Exactly the swap the stub's own comment anticipated: same
 * function name, same call sites (this modal, features/settings/plan-tier-view.tsx), only
 * this body changed. `StartCheckoutResult` is now re-exported from lib/payments/checkout.ts
 * rather than independently declared here — the two were structurally identical from the
 * start (they were agreed together), so keeping one canonical declaration is strictly a
 * cleanup, not a behavior change for either caller.
 *
 * `status: "ready"` means redirect to `checkoutUrl` (a hosted payment page — full
 * `window.location.href`, never `router.push`, since it's an external domain);
 * `"not_configured"` means no provider set up yet — still the honest, visible default today,
 * now because `PAYMENT_PROVIDER` genuinely has no case in lib/payments/index.ts's
 * getPaymentProvider(), not because this function was a stub; `"error"` surfaces `message`.
 * Price is still not a parameter: lib/payments/checkout.ts's startUltraCheckout reads
 * admin_finance_settings itself at checkout-creation time, so whatever's live in kumanda's
 * settings is what actually gets charged, not whatever this client happened to render with.
 */
export async function startUltraCheckoutAction(): Promise<StartCheckoutResult> {
  const session = await requireUser();
  const origin = (await headers()).get("origin") || env.app.url;
  return startUltraCheckout(session.userId!, `${origin}/settings/plan?checkout=success`, `${origin}/settings/plan?checkout=canceled`);
}
