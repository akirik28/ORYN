"use client";

import Image from "next/image";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { DialogPortal } from "@/components/ui/dialog";
import { transition } from "@/lib/motion";
import { UltraFeatureMarquee, type UltraFeatureCardData } from "@/features/settings/ultra-feature-marquee";
import type { UltraCheckoutAvailability } from "@/app/(app)/upgrade-interstitial-actions";

/**
 * The founder's full-screen upgrade interstitial (2026-09-04, relayed via oryn-45): "ekranın
 * tamamına çıkan, sağ üstten çarpıdan kapanan pop-uplar... ilk açtığında her zaman çıksın,
 * arada çıksın işte... Şu kadar TL almak ister misin, üstte de özellikler dönüyor... havalı
 * olmalı, ve yine alevli logoyu koy" — full-screen, X top-right, first session then
 * periodically, price with rotating features above it, one impressive card, flame logo.
 *
 * Built on the same `@base-ui/react/dialog` primitives components/ui/dialog.tsx already
 * wraps, not a hand-rolled overlay — Base UI's Dialog gives Escape-to-close, focus trapping
 * while open, and focus return on close for free, all three of CEO's explicit accessibility
 * requirements. Not reusing `DialogContent` itself: its sizing (`max-w-sm`, centered card) is
 * the wrong shape for "ekranın tamamına çıkan" — this composes `DialogPortal`/`Popup`
 * directly with its own full-bleed classes instead.
 *
 * The gating decision (whether this is allowed to render at all) lives entirely in
 * lib/upgrade-interstitial/prompt.ts and the mount wrapper (upgrade-interstitial-mount.tsx)
 * — this component only knows how to render once that decision is already "yes", exactly the
 * same division of labor UpgradePromptOverlay already established for the advisor prompt.
 *
 * `prefers-reduced-motion`: the card's own entrance handled by `MotionConfig
 * reducedMotion="user"` (app/layout.tsx), same free mechanism upgrade-prompt-overlay.tsx
 * already relies on. `UltraFeatureMarquee`'s own scroll animation already stops under reduced
 * motion by construction (that component's own header) — reused here for exactly that reason,
 * not rebuilt.
 */
export function UpgradeInterstitialModal({
  open,
  onOpenChange,
  onSoftDismiss,
  onNotNow,
  priceTry,
  marqueeCards,
  checkoutAvailability,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fired once, the moment the dialog actually closes (X, Escape, or backdrop) — mirrors
   *  UpgradePromptOverlay's onSoftDismiss: a passive close, not an explicit decline. */
  onSoftDismiss: () => void;
  /** The explicit "Not now" button only — escalates per computeNotNowUpdate, distinct from a
   *  passive close for the same reason the inline prompt keeps the two separate. */
  onNotNow: () => void;
  priceTry: number;
  marqueeCards: readonly UltraFeatureCardData[];
  checkoutAvailability: UltraCheckoutAvailability;
}) {
  const t = useTranslations("upgradeInterstitial");
  const locale = useLocale();

  // Matches the decimal-separator convention the existing hardcoded price copy already used
  // per locale (399,99 tr / 399.99 en) — deliberately NOT lib/i18n/format.ts's
  // NUMBER_FORMAT_LOCALE, which that file's own header pins to English formatting for every
  // OTHER number in the app on purpose; this is a narrow, local match to copy that already
  // varied by locale before this modal existed, not a step toward localizing numbers
  // app-wide.
  const formattedPrice = new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(priceTry);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) onSoftDismiss();
    onOpenChange(nextOpen);
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPortal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup
          data-tier="ultra"
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 duration-150"
          aria-label={t("dialogAriaLabel")}
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={transition("base")}
            className="tier-glow-sm relative my-8 w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-surface-tint"
          >
            <div className="tier-flow-bar h-[3px] w-full" />

            <DialogPrimitive.Close
              aria-label={t("close")}
              className="absolute top-3 right-3 z-10 rounded-md p-1.5 text-ink-3 transition-colors hover:bg-accent hover:text-ink-1"
            >
              <X className="size-5" aria-hidden="true" />
            </DialogPrimitive.Close>

            <div className="flex flex-col items-center gap-4 p-6 pt-8 text-center">
              <Image src="/brand/logo-mark-flame.png" alt="" width={64} height={64} className="size-16" priority />

              <DialogPrimitive.Title className="text-xl font-semibold text-ink-1">{t("title")}</DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-sm text-ink-2">
                {t.rich("priceLine", { price: formattedPrice, strong: (chunks) => <strong style={{ color: "var(--tier-accent-strong)" }}>{chunks}</strong> })}
              </DialogPrimitive.Description>
            </div>

            <div className="pb-2">
              <UltraFeatureMarquee cards={marqueeCards} />
            </div>

            <div className="flex flex-col gap-2 p-6 pt-4">
              {checkoutAvailability.available && checkoutAvailability.checkoutUrl ? (
                <ButtonLink href={checkoutAvailability.checkoutUrl} size="lg">
                  {t("cta")}
                </ButtonLink>
              ) : (
                <div className="space-y-2">
                  <Button size="lg" disabled aria-describedby="upgrade-interstitial-unavailable">
                    {t("cta")}
                  </Button>
                  <p id="upgrade-interstitial-unavailable" className="text-xs text-ink-3">
                    {t("checkoutNotConfigured")}
                  </p>
                </div>
              )}
              <Button type="button" variant="ghost" size="sm" onClick={onNotNow}>
                {t("notNow")}
              </Button>
            </div>
          </motion.div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}
