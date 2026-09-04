"use client";

import { useState } from "react";
import { Zap, MessagesSquare, Flame, Palette } from "lucide-react";
import { UpgradePromptOverlay } from "@/features/advisor/upgrade-prompt-overlay";
import { UpgradeInterstitialModal } from "@/features/upgrade-interstitial/upgrade-interstitial-modal";
import { Button } from "@/components/ui/button";
import type { UltraFeatureCardData } from "@/features/settings/ultra-feature-marquee";

/** The one client-only piece of this preview — see the page's own header for why it's
 *  split out. Both callbacks log rather than call a real Server Action, since this route
 *  has no live session to write dismissal state against. */
export function UpgradePromptPreviewClient() {
  return (
    <UpgradePromptOverlay
      onNotNow={() => console.log("[preview] Not now clicked")}
      onSoftDismiss={() => console.log("[preview] soft dismiss (×) clicked")}
    />
  );
}

/** P7's variant of the same component (docs/veli-hesabi-spec-2026-09-04.md §6) — same
 *  shell, `namespace="parent.upgradePrompt"` is the only difference from the client above.
 *  No parent panel exists yet to nest this inside (P3), so the page below renders it plain
 *  rather than inside a caller that doesn't exist. */
export function ParentUpgradePromptPreviewClient() {
  return (
    <UpgradePromptOverlay
      namespace="parent.upgradePrompt"
      onNotNow={() => console.log("[preview] parent: Not now clicked")}
      onSoftDismiss={() => console.log("[preview] parent: soft dismiss (×) clicked")}
    />
  );
}

const PREVIEW_MARQUEE_CARDS: UltraFeatureCardData[] = [
  { id: "aiAllowance", icon: Zap, stat: "472K" },
  { id: "replyCeiling", icon: MessagesSquare, stat: "8,192" },
  { id: "replyDepth", icon: Flame },
  { id: "visualTheme", icon: Palette },
];

/**
 * The founder's full-screen upgrade interstitial (2026-09-04) — opened by a button rather
 * than automatically, since the real trigger (lib/upgrade-interstitial/prompt.ts's
 * shouldShowUpgradeInterstitial) is session/dismissal-state-driven and this route has
 * neither. All three checkout states selectable so the honest-degrade copy is checkable by
 * eye, not just asserted in a test — matches this preview page's own "no real Server Action"
 * convention throughout.
 */
export function UpgradeInterstitialPreviewClient() {
  const [open, setOpen] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState<"not_configured" | "ready" | "error">("not_configured");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setCheckoutStatus("not_configured")}>
          not_configured
        </Button>
        <Button size="sm" variant="outline" onClick={() => setCheckoutStatus("ready")}>
          ready
        </Button>
        <Button size="sm" variant="outline" onClick={() => setCheckoutStatus("error")}>
          error
        </Button>
        <Button size="sm" onClick={() => setOpen(true)}>
          Open interstitial
        </Button>
      </div>
      <UpgradeInterstitialModal
        open={open}
        onOpenChange={setOpen}
        onSoftDismiss={() => console.log("[preview] interstitial: soft dismiss (×/Escape) fired")}
        onNotNow={() => {
          console.log("[preview] interstitial: Not now clicked");
          setOpen(false);
        }}
        priceTry={399.99}
        marqueeCards={PREVIEW_MARQUEE_CARDS}
        checkoutResult={
          checkoutStatus === "ready"
            ? { status: "ready", checkoutUrl: "https://checkout.example.com/session/preview" }
            : checkoutStatus === "error"
              ? { status: "error", message: "The payment provider is temporarily unreachable." }
              : { status: "not_configured" }
        }
      />
    </div>
  );
}
