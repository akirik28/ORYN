"use client";

import { useEffect, useMemo, useState } from "react";
import { Zap, MessagesSquare, Flame, Palette } from "lucide-react";
import { TIER_COMPARISON_ROWS } from "@/lib/tier/comparison";
import { formatNumber, formatTokenCount } from "@/lib/i18n/format";
import type { UltraFeatureCardData } from "@/features/settings/ultra-feature-marquee";
import { UpgradeInterstitialModal } from "./upgrade-interstitial-modal";
import {
  shouldShowUpgradeInterstitial,
  type UpgradeInterstitialDismissalState,
} from "@/lib/upgrade-interstitial/prompt";
import {
  softDismissUpgradeInterstitial,
  notNowUpgradeInterstitial,
  getUltraPriceTryAction,
  checkUltraCheckoutAvailabilityAction,
  type UltraCheckoutAvailability,
} from "@/app/(app)/upgrade-interstitial-actions";
import type { PlanTier } from "@/types/database";

/** Same mapping PlanTierView (features/settings/plan-tier-view.tsx) builds client-side from
 *  the identical TIER_COMPARISON_ROWS source — icon components can't cross the server/client
 *  prop boundary, so this modal's mount point builds its own marquee cards from the raw
 *  token-limit numbers the server layout passes down, the same division PlanTierView's own
 *  server page (app/(app)/settings/plan/page.tsx) already established. A small, deliberate
 *  duplication of one ~10-line mapping rather than a shared export neither existing caller
 *  needed before now. */
const CARD_ICONS: Record<UltraFeatureCardData["id"], typeof Zap> = {
  aiAllowance: Zap,
  replyCeiling: MessagesSquare,
  replyDepth: Flame,
  visualTheme: Palette,
};

const SESSION_STORAGE_KEY = "oryn:upgrade-interstitial:shown";

/**
 * Mounted once from app/(app)/layout.tsx (a Server Component), fed the server-resolved tier
 * and dismissal state — mirrors the advisor prompt's own division of labor
 * (lib/advisor/upgrade-prompt.ts owns the decision, this owns when/how to check it and hold
 * the Dialog's open state). "First session, not every page load" (this file's own gating
 * source's header) is tracked here via sessionStorage, the identical mechanism
 * UpgradePromptOverlay's own caller already uses for `alreadyShownThisSession` — cleared when
 * the tab/browser closes, which is exactly what makes a new session eligible again.
 */
export function UpgradeInterstitialMount({
  tier,
  dismissalState,
  ultraTokenLimit,
  ultraMaxTokens,
}: {
  tier: PlanTier;
  dismissalState: UpgradeInterstitialDismissalState;
  ultraTokenLimit: number;
  ultraMaxTokens: number;
}) {
  const [open, setOpen] = useState(false);
  const [priceTry, setPriceTry] = useState<number | null>(null);
  const [checkoutAvailability, setCheckoutAvailability] = useState<UltraCheckoutAvailability>({ available: false });

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
    Promise.all([getUltraPriceTryAction(), checkUltraCheckoutAvailabilityAction()]).then(([price, availability]) => {
      if (cancelled) return;
      setPriceTry(price);
      setCheckoutAvailability(availability);
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
      TIER_COMPARISON_ROWS.filter((row) => row.kind === "differs").map((row) => ({
        id: row.id,
        icon: CARD_ICONS[row.id],
        stat: row.id === "aiAllowance" ? formatTokenCount(ultraTokenLimit) : row.id === "replyCeiling" ? formatNumber(ultraMaxTokens) : undefined,
      })),
    [ultraTokenLimit, ultraMaxTokens],
  );

  if (priceTry === null) return null; // nothing to show yet — either not eligible, or still loading

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
      priceTry={priceTry}
      marqueeCards={marqueeCards}
      checkoutAvailability={checkoutAvailability}
    />
  );
}
