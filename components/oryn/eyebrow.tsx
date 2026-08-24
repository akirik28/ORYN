import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type EyebrowTone = "neutral" | "brand" | "positive" | "caution" | "critical";

/**
 * The atom of Oryn's editorial voice: a short hairline rule followed by a small, widely
 * tracked uppercase label. It's what lets a section announce itself without a card, a
 * border or a heading — which is the whole basis of the V3 surface system.
 *
 * Two rules make it work, and both are easy to undo by accident:
 *
 * 1. **Tone colors the rule, never the label's neighbours.** A tone here is a quiet
 *    accent on a 32px hairline; it must never bleed into the headline underneath. A
 *    colored headline turns an interpretation into an alert.
 * 2. **The tracking is the signature.** 0.18em at 11px is what reads as editorial rather
 *    than as a generic uppercase badge. Don't "fix" it to a Tailwind preset — `tracking-widest`
 *    is 0.1em and looks like a different product.
 */
export function Eyebrow({
  children,
  tone = "neutral",
  rule = true,
  className,
}: {
  children: ReactNode;
  tone?: EyebrowTone;
  /** Drop the rule when the eyebrow already sits against a container edge or an index. */
  rule?: boolean;
  className?: string;
}) {
  const ruleTone: Record<EyebrowTone, string> = {
    neutral: "bg-ink-4",
    brand: "bg-brand-primary",
    positive: "bg-success",
    caution: "bg-warning",
    critical: "bg-error",
  };

  return (
    <p className={cn("flex items-center gap-3", className)}>
      {rule ? <span aria-hidden="true" className={cn("h-px w-8 shrink-0", ruleTone[tone])} /> : null}
      <span className="text-[0.6875rem] font-medium tracking-[0.18em] text-ink-3 uppercase">{children}</span>
    </p>
  );
}
