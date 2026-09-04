import { computeNotNowUpdate, computeSoftDismissUntil, type NotNowUpdate } from "@/lib/advisor/upgrade-prompt";
import { startOfNextMonthUTC } from "@/lib/date/month-boundary";
import type { PlanTier, Profile } from "@/types/database";

export { computeNotNowUpdate, computeSoftDismissUntil };
export type { NotNowUpdate };

/**
 * The gating decision for the founder's full-screen upgrade interstitial (migration 0124).
 * Deliberately pure, mirroring lib/advisor/upgrade-prompt.ts's own reasoning: no
 * `server-only`, so a Client Component can import the decision function directly without
 * pulling a server-only dependency chain into the client bundle.
 */

export interface UpgradeInterstitialDismissalState {
  softDismissedUntil: string | null;
  notNowAt: string | null;
  notNowCount: number;
  dismissedForever: boolean;
}

export const NOT_YET_DISMISSED: UpgradeInterstitialDismissalState = {
  softDismissedUntil: null,
  notNowAt: null,
  notNowCount: 0,
  dismissedForever: false,
};

export function extractUpgradeInterstitialDismissalState(
  profile: Pick<
    Profile,
    | "upgrade_interstitial_soft_dismissed_until"
    | "upgrade_interstitial_not_now_at"
    | "upgrade_interstitial_not_now_count"
    | "upgrade_interstitial_dismissed_forever"
  >,
): UpgradeInterstitialDismissalState {
  return {
    softDismissedUntil: profile.upgrade_interstitial_soft_dismissed_until ?? null,
    notNowAt: profile.upgrade_interstitial_not_now_at ?? null,
    notNowCount: profile.upgrade_interstitial_not_now_count ?? 0,
    dismissedForever: profile.upgrade_interstitial_dismissed_forever ?? false,
  };
}

/**
 * Unlike the advisor prompt (gated on a real event — a degraded reply), this interstitial's
 * own trigger IS the session starting: "ilk açtığında her zaman çıksın, arada çıksın" (show
 * on first open, then periodically) reads as first *session*, not every page load — a new
 * tab/day is legitimately eligible again, the same "genuinely session-scoped" reasoning
 * lib/advisor/upgrade-prompt.ts's own header already applies to `alreadyShownThisSession`,
 * reused here for the same reason: tracked client-side (sessionStorage) by the caller, not
 * in this state, and passed in.
 */
export interface UpgradeInterstitialContext {
  tier: PlanTier;
  alreadyShownThisSession: boolean;
}

export function shouldShowUpgradeInterstitial(
  context: UpgradeInterstitialContext,
  state: UpgradeInterstitialDismissalState,
  now: Date = new Date(),
): boolean {
  if (context.tier !== "standard") return false; // never for Ultra
  if (context.alreadyShownThisSession) return false; // once per session

  if (state.dismissedForever) return false;
  if (state.softDismissedUntil && now < new Date(state.softDismissedUntil)) return false;
  if (state.notNowAt && now < startOfNextMonthUTC(new Date(state.notNowAt))) return false;

  return true;
}
