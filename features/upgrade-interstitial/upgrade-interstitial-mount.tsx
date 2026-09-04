"use client";

import { useEffect, useMemo, useState } from "react";
import { Zap, MessagesSquare, Flame, Palette, Infinity as InfinityIcon } from "lucide-react";
import { TIER_COMPARISON_ROWS, type DiffersRow } from "@/lib/tier/comparison";
import { formatNumber, formatTokenCount } from "@/lib/i18n/format";
import type { UltraFeatureCardData } from "@/features/settings/ultra-feature-marquee";
import { UpgradeInterstitialModal } from "./upgrade-interstitial-modal";
import { shouldShowUpgradeInterstitial, type UpgradeInterstitialDismissalState } from "@/lib/upgrade-interstitial/prompt";
import { softDismissUpgradeInterstitial, notNowUpgradeInterstitial, startUltraCheckoutAction, type StartCheckoutResult } from "@/app/(app)/upgrade-interstitial-actions";
import type { PlanTier } from "@/types/database";

/** Same mapping PlanTierView (features/settings/plan-tier-view.tsx) builds client-side from
 *  the identical TIER_COMPARISON_ROWS source — icon components can't cross the server/client
 *  prop boundary, so this modal's mount point builds its own marquee cards from the raw
 *  token-limit numbers the server layout passes down, the same division PlanTierView's own
 *  server page (app/(app)/settings/plan/page.tsx) already established. A small, deliberate
 *  duplication of one ~10-line mapping rather than a shared export neither existing caller
 *  needed before now — kept in sync by hand (2026-09-04: PlanTierView gained
 *  comparisonWidth/comparisonQuota the same night, this file updated to match; `comparisonWidth`
 *  has no icon here on purpose, since it's filtered out of the marquee below exactly like
 *  PlanTierView's own copy, for the same "a static 2-vs-4 needs a beat to read" reasoning
 *  lib/tier/comparison.ts's own header states). */
const CARD_ICONS: Record<Exclude<DiffersRow["id"], "comparisonWidth">, typeof Zap> = {
  aiAllowance: Zap,
  replyCeiling: MessagesSquare,
  replyDepth: Flame,
  visualTheme: Palette,
  comparisonQuota: InfinityIcon,
};

const SESSION_STORAGE_KEY = "oryn:upgrade-interstitial:shown";

/**
 * Mounted once from app/(app)/layout.tsx (a Server Component), fed the server-resolved tier,
 * dismissal state, and price — mirrors the advisor prompt's own division of labor
 * (lib/advisor/upgrade-prompt.ts owns the decision, this owns when/how to check it and hold
 * the Dialog's open state). `ultraPriceTry` is a plain prop from the layout's own single
 * `getFinanceSettings` read (05's work, 2026-09-04) — this component does not read
 * admin_finance_settings itself, so there is exactly one place in the request that does.
 * "First session, not every page load" (this file's own gating source's header) is tracked
 * here via sessionStorage, the identical mechanism UpgradePromptOverlay's own caller already
 * uses for `alreadyShownThisSession` — cleared when the tab/browser closes, which is exactly
 * what makes a new session eligible again.
 */
export function UpgradeInterstitialMount({
  tier,
  dismissalState,
  ultraTokenLimit,
  ultraMaxTokens,
  ultraPriceTry,
}: {
  tier: PlanTier;
  dismissalState: UpgradeInterstitialDismissalState;
  ultraTokenLimit: number;
  ultraMaxTokens: number;
  ultraPriceTry: number;
}) {
  const [open, setOpen] = useState(false);
  const [eligible, setEligible] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<StartCheckoutResult>({ status: "not_configured" });

  useEffect(() => {
    let alreadyShownThisSession = false;
    try {
      alreadyShownThisSession = window.sessionStorage.getItem(SESSION_STORAGE_KEY) === "1";
    } catch {
      // Private-browsing/storage-blocked: fail open to "not yet shown this session" — the
      // worst case is showing once more than intended, never a crash, matching this whole
      // mechanism's "never blocking" posture.
    }

    if (!shouldShowUpgradeInterstitial({ tier, alreadyShownThisSession }, dismissalState)) return;

    let cancelled = false;
    startUltraCheckoutAction().then((result) => {
      if (cancelled) return;
      setCheckoutResult(result);
      setEligible(true);
      setOpen(true);
      try {
        window.sessionStorage.setItem(SESSION_STORAGE_KEY, "1");
      } catch {
        // Same fail-open posture as the read above — a failed write just means this can
        // show again this same session, not a crash.
      }
    });
    return () => {
      cancelled = true;
    };
    // Deliberately once on mount only — the gate is evaluated once per session by design
    // (this file's own header), not re-evaluated on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const marqueeCards: UltraFeatureCardData[] = useMemo(
    () =>
      TIER_COMPARISON_ROWS.filter((row) => row.kind === "differs")
        .filter((row): row is DiffersRow & { id: UltraFeatureCardData["id"] } => row.id !== "comparisonWidth")
        .map((row) => ({
          id: row.id,
          icon: CARD_ICONS[row.id],
          stat: row.id === "aiAllowance" ? formatTokenCount(ultraTokenLimit) : row.id === "replyCeiling" ? formatNumber(ultraMaxTokens) : undefined,
        })),
    [ultraTokenLimit, ultraMaxTokens],
  );

  if (!eligible) return null; // nothing to show yet — either not eligible this session, or still checking

  return (
    <UpgradeInterstitialModal
      open={open}
      onOpenChange={setOpen}
      onSoftDismiss={() => {
        void softDismissUpgradeInterstitial();
      }}
      onNotNow={() => {
        void notNowUpgradeInterstitial();
        setOpen(false);
      }}
      priceTry={ultraPriceTry}
      marqueeCards={marqueeCards}
      checkoutResult={checkoutResult}
    />
  );
}
