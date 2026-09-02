"use client";

import { motion } from "motion/react";
import { X } from "lucide-react";
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
 * Anchored to the reply, not floating over it: rendered as a normal sibling directly below
 * the specific `AdvisorMessage` that was degraded (features/advisor/advisor-chat.tsx's own
 * call site), in document flow -- not `position: absolute`/`fixed` over the message text.
 * "Never covers the reply underneath" is true by construction here, not something this
 * component has to defend with z-index or pointer-events tricks.
 *
 * A simple fade+rise, not the "chained, animated" treatment -- that belongs on the
 * self-initiated /settings/plan page a student opens on purpose (design spec §5's own
 * argument: ORYN's one deliberately elaborate animation is already spent on the
 * acceptance-moment celebration, and "don't add a second one of these elsewhere" applies
 * directly to a note interrupting counsel the student didn't ask to see this about).
 * Respects `prefers-reduced-motion` for free via `MotionConfig reducedMotion="user"`
 * (app/layout.tsx) -- every `motion.*` element in the app already gets this, no per-
 * component opt-in.
 *
 * Two distinct exits, not one, matching the policy's own three-tier semantics: the small
 * close (×) is a passive dismiss (7-day suppression); "Not now" is the explicit decline
 * (equal visual weight to the CTA, per the design spec's own copy constraint and the legal
 * research's FTC v. Epic Games caution against a button-hierarchy trick) and carries the
 * longer, escalating suppression. Collapsing these into one "dismiss" button would silently
 * lose the distinction the whole cap policy is built on.
 */
export function UpgradePromptOverlay({ onNotNow, onSoftDismiss }: { onNotNow: () => void; onSoftDismiss: () => void }) {
  const t = useTranslations("advisor.chat.upgradePrompt");

  return (
    <motion.aside
      role="note"
      aria-label={t("cta")}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transition("base")}
      className="mt-3 max-w-2xl rounded-xl border border-border bg-surface-tint p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm leading-relaxed text-ink-2">{t("detail")}</p>
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
    </motion.aside>
  );
}
