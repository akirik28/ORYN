"use client";

import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

export interface UltraFeatureCardData {
  id: "aiAllowance" | "replyCeiling" | "replyDepth" | "visualTheme";
  icon: LucideIcon;
  /**
   * A code-derived stat string ("472K", "8,192") for the two cards with a real number
   * behind them, computed server-side in app/(app)/settings/plan/page.tsx from the same
   * constants that actually enforce the limit (lib/ai/token-limits.ts,
   * lib/ai/advisor-chat.ts's ADVISOR_MAX_TOKENS_ULTRA) — never hand-typed here or in
   * messages/*.json, so the page can't drift from what the product actually enforces the
   * way a marketing page normally could. `undefined` for the two qualitative cards
   * (replyDepth, visualTheme), which don't reduce to one clean number.
   */
  stat?: string;
}

/**
 * Auto-scrolling row of "what Ultra gives you" cards — the founder's own direction
 * (2026-09-03, relayed via oryn-45): "olabildiğince fazla animasyon" energy applied to
 * this one page, where showing the flame identity to a Standard viewer is the whole point
 * rather than something reserved for a real Ultra account.
 *
 * **`data-tier="ultra"` is applied locally, by the caller (PlanTierView), not read from the
 * viewer's real tier.** `[data-tier="ultra"] .foo` in app/globals.css is a plain descendant
 * selector — it activates for any element under a matching ancestor, not only `<html>` —
 * so wrapping just this section reuses the exact founder-approved --tier-grad-1/2/3 and
 * --tier-glow flame values (the same ones a real Ultra account's sidebar/usage-meter/slider
 * already use)
 * instead of a second, hand-picked copy of them. This is the one deliberate exception to
 * "data-tier reflects the viewer's real tier" elsewhere in the app (UltraAmbient reads it
 * from the actual session) — safe here because CSS attribute selectors don't care which
 * element sets the attribute, and because this section carries no functional behavior
 * (no upgrade action, no gated control) that a Standard viewer shouldn't have access to —
 * it's decoration answering "what would this look like," never a capability check.
 *
 * **Doubled card row + `motion-reduce:hidden` on the second copy**, not a single row with
 * animation toggled off: `plan-marquee-scroll` (app/globals.css) translates the track by
 * exactly -50%, which only loops seamlessly if the track holds two back-to-back copies of
 * the same list. Rendering both copies unconditionally and just disabling the animation
 * under reduced motion would leave a reduced-motion viewer looking at the same six cards
 * twice, side by side, motionless — confusing, not merely undecorated. `motion-reduce:hidden`
 * on the second copy means only one set of cards ever mounts for them; the animation itself
 * is also disabled via the plain `@media (prefers-reduced-motion: reduce)` rule in
 * globals.css (belt and suspenders — Tailwind's `motion-reduce:` variant and a bare media
 * query compile to the identical query, so neither can disagree with the other).
 *
 * **Pausable on hover or focus (WCAG 2.2.2, "Pause, Stop, Hide"; also an explicit
 * constraint from oryn-45's dispatch).** The viewport itself is the thing that needs to be
 * reachable by keyboard, not the individual cards — they carry no interactive content, so
 * without `tabIndex={0}` here a keyboard user could never trigger the `:focus-within` pause
 * rule at all. `role="region"` + an aria-label names what's being paused, since a plain
 * `tabIndex` div with no semantic role would land on a screen reader as "unlabeled,
 * focusable, no idea why."
 */
export function UltraFeatureMarquee({ cards }: { cards: readonly UltraFeatureCardData[] }) {
  const t = useTranslations("settings.plan");

  return (
    <div
      data-tier="ultra"
      className="plan-marquee-viewport overflow-hidden rounded-2xl"
      tabIndex={0}
      role="region"
      aria-label={t("marqueeAriaLabel")}
    >
      <div className="plan-marquee-track flex w-max gap-4 py-1">
        <div className="flex gap-4">
          {cards.map((card) => (
            <FeatureCard key={card.id} card={card} />
          ))}
        </div>
        {/* The seamless-loop duplicate — see this file's own header for why it's hidden,
            not merely unanimated, under reduced motion. */}
        <div className="flex gap-4 motion-reduce:hidden" aria-hidden="true">
          {cards.map((card) => (
            <FeatureCard key={`loop-${card.id}`} card={card} />
          ))}
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ card }: { card: UltraFeatureCardData }) {
  const t = useTranslations("settings.plan");
  const Icon = card.icon;

  return (
    <div className="plan-ultra-card flex w-64 shrink-0 flex-col gap-2 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
      <Icon className="size-5" style={{ color: "var(--tier-accent-strong)" }} aria-hidden="true" />
      {card.stat ? (
        <p className="text-2xl font-semibold tabular-nums" style={{ color: "var(--tier-accent-strong)" }}>
          {card.stat}
        </p>
      ) : null}
      <p className="text-sm font-medium">{t(`marquee.${card.id}.label`)}</p>
      <p className="text-sm text-muted-foreground">{t(`marquee.${card.id}.description`)}</p>
    </div>
  );
}
