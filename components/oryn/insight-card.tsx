import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Eyebrow, type EyebrowTone } from "./eyebrow";

export type InsightVariant = "gap" | "avoid" | "strength" | "neutral";

/**
 * "Oryn is telling you something." A typography-led statement that interprets the data
 * around it rather than displaying more of it.
 *
 * UI-V3-0b removed the border, fill and icon chip this used to carry. The point of the
 * component is that an interpretation should distinguish itself through scale, voice and
 * hierarchy alone — boxing it made it look like one more data card in a stack of data
 * cards, which is precisely the SaaS reflex this redesign is moving away from. What's
 * left is an eyebrow, a display-serif claim, and supporting prose.
 *
 * The variant now only tints the eyebrow's hairline rule. In particular `avoid` stays
 * visually calm: a deprioritization is a strategic call, not a warning, and the product
 * spec is explicit that it must never read as alarming. Do not give any variant a red or
 * amber headline.
 *
 * `surface` is the deliberate exception — the warm recommendation ground, used for the one
 * statement on a page that should feel like it carries weight. The brief allows it
 * "selectively" and warns against it becoming the dominant surface; if two of these are
 * visible at once, one of them is wrong.
 */
const VARIANT_TONE: Record<InsightVariant, EyebrowTone> = {
  gap: "brand",
  avoid: "neutral",
  strength: "positive",
  neutral: "neutral",
};

export function InsightCard({
  variant = "neutral",
  eyebrow,
  title,
  children,
  action,
  surface = false,
  className,
}: {
  variant?: InsightVariant;
  eyebrow: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  /** Lift the statement onto the warm recommendation ground. At most one per screen. */
  surface?: boolean;
  className?: string;
}) {
  return (
    <section
      className={cn(
        surface && "rounded-2xl bg-module-recommendation p-6 md:p-8",
        className,
      )}
    >
      <Eyebrow tone={VARIANT_TONE[variant]}>{eyebrow}</Eyebrow>
      <p className="mt-4 max-w-2xl font-display text-2xl leading-[1.15] tracking-[-0.02em] text-balance md:text-3xl">
        {title}
      </p>
      {children ? <div className="mt-3 max-w-2xl leading-relaxed text-ink-2">{children}</div> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </section>
  );
}
