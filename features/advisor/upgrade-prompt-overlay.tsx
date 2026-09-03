"use client";

import { motion } from "motion/react";
import { Flame, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { transition } from "@/lib/motion";

/**
 * The founder-approved, frequency-capped upgrade pop-up
 * (docs/upgrade-prompt-design-spec-2026-09-02.md,
 * docs/research/upgrade-prompt-frequency-precedent-2026-09-02.md) — the gating decision
 * (when this is allowed to render at all) lives entirely in lib/advisor/upgrade-prompt.ts;
 * this component only knows how to render once that decision is already "yes" and how to
 * report which of the three dismissal actions the student took.
 *
 * **2026-09-03, restyled, not restructured — see the "Upgrade Prompt Options" artifact
 * (the companion visual to the design spec above) for the two rejected properties this
 * still deliberately avoids.** That artifact shows a REJECTED pattern -- a step-animated
 * modal stacked over a dimmed reply, pulsing icon, shimmering "Upgrade Now" button next to
 * a tiny, dismissed-looking "maybe later" -- and names exactly two reasons it's out:
 * (1) it sits on top of counsel the student came to read, (2) the button-weight asymmetry
 * is the FTC v. Epic Games dark-pattern shape. **Neither reason is about the animation's
 * existence; both are about placement and weight, and this component already gets both
 * right, unchanged below.** The founder's own reaction to that artifact
 * ("bu sağdaki animasyon çok çok iyi") was to the motion quality specifically, relayed
 * 2026-09-03 -- this pass is what applying that reaction looks like without reintroducing
 * either rejected property:
 *
 * - **Still anchored to the reply, not floating over it**: rendered as a normal sibling
 *   directly below the specific `AdvisorMessage` that was degraded
 *   (features/advisor/advisor-chat.tsx's own call site), in document flow -- not
 *   `position: absolute`/`fixed` over the message text. "Never covers the reply
 *   underneath" is true by construction here, unchanged from before this pass.
 * - **Still two distinct exits, equal weight**: the small close (×) is a passive dismiss
 *   (7-day suppression); "Not now" is the explicit decline, same `variant="outline"
 *   size="sm"` as the CTA -- neither button gained the new motion, so neither reads as
 *   more "real" than the other. The rejected design's shimmer lived ON the loud button
 *   specifically, which is what made it a weight trick as much as a color one; putting any
 *   new motion there again would recreate the same asymmetry through a different door, so
 *   it doesn't go there.
 * - **The motion instead lives on the card itself, not on either action**: a `Flame` icon
 *   and a flowing gradient top edge, both reusing `.tier-glow-sm`/`.tier-flow-bar`
 *   (app/globals.css) verbatim -- the exact tokens and animation a real Ultra account's own
 *   sidebar/usage-meter already carry, not a new, hand-picked effect. Wrapped in a local
 *   `data-tier="ultra"` scope, the same mechanism features/settings/ultra-feature-
 *   marquee.tsx uses and for the identical reason: this component's one real audience is a
 *   *Standard* viewer (`shouldShowUpgradePrompt`'s own `tier !== "standard"` gate below),
 *   whose actual `<html data-tier>` is never "ultra" -- without the local wrapper, none of
 *   this would ever render for the only viewer who ever sees it.
 * - **Not the "one showy animation" restraint's second violation it would have been on
 *   2026-09-02.** That restraint's own reasoning (design spec §5) was "ORYN's one
 *   deliberately elaborate animation is already spent on the acceptance-moment
 *   celebration." Superseded by later, explicit founder direction the same week
 *   ("olabildiğince fazla animasyon" applied to Ultra surfaces) that this build itself acted
 *   on -- see features/settings/ultra-feature-marquee.tsx, built the same day. A continuous
 *   ambient flow line and a static icon are also a different *scale* of motion than a
 *   step-animated, multi-stage interstitial regardless -- this stays a quiet, single,
 *   continuous accent, never a sequence.
 *
 * Respects `prefers-reduced-motion` for free, twice over: every `motion.*` element already
 * gets it via `MotionConfig reducedMotion="user"` (app/layout.tsx), and `.tier-flow-bar`'s
 * own `@media (prefers-reduced-motion: reduce)` rule (app/globals.css) turns its animation
 * off the same way it already does everywhere else that class is used -- nothing new to
 * gate here, both mechanisms were already correct before this component reused them.
 */
export function UpgradePromptOverlay({ onNotNow, onSoftDismiss }: { onNotNow: () => void; onSoftDismiss: () => void }) {
  const t = useTranslations("advisor.chat.upgradePrompt");

  return (
    // data-tier lives on this plain wrapper, one level above .tier-glow-sm, deliberately --
    // [data-tier="ultra"] .tier-glow-sm is a descendant selector; the attribute and the
    // class cannot both sit on the same element and still match (confirmed live, 2026-09-03
    // -- putting them on one node left the glow computing as `none`, caught by
    // getComputedStyle, not by any of tsc/eslint/vitest). .tier-flow-bar below is a real
    // child of the aside either way, so it isn't affected by this -- only a class applied to
    // the SAME element the attribute sits on breaks this way.
    <div data-tier="ultra">
      <motion.aside
        role="note"
        aria-label={t("cta")}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transition("base")}
        className="tier-glow-sm mt-3 max-w-2xl overflow-hidden rounded-xl border border-border bg-surface-tint"
      >
        {/* Reused verbatim, not a new keyframe -- see this file's own header. */}
        <div className="tier-flow-bar h-[3px] w-full" />
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Flame aria-hidden="true" className="mt-0.5 size-4 shrink-0" style={{ color: "var(--tier-accent-strong)" }} />
              <p className="text-sm leading-relaxed text-ink-2">{t("detail")}</p>
            </div>
            <button
              type="button"
              aria-label={t("close")}
              onClick={onSoftDismiss}
              className="shrink-0 rounded-md p-1 text-ink-3 transition-colors hover:bg-accent hover:text-ink-1"
            >
              <X className="size-4" />
            </button>
          </div>
          {/* Equal visual weight, same row, same size -- neither reads as the "real" button. */}
          <div className="mt-3 flex flex-wrap gap-2">
            <ButtonLink href="/settings/plan" variant="outline" size="sm">
              {t("cta")}
            </ButtonLink>
            <Button type="button" variant="outline" size="sm" onClick={onNotNow}>
              {t("notNow")}
            </Button>
          </div>
        </div>
      </motion.aside>
    </div>
  );
}
