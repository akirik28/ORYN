import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";

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
  locale = DEFAULT_LOCALE,
  className,
}: {
  children: ReactNode;
  tone?: EyebrowTone;
  /** Drop the rule when the eyebrow already sits against a container edge or an index. */
  rule?: boolean;
  /**
   * The actual language of `children` — declared explicitly, never inherited from the
   * page's `<html lang>`. `text-transform: uppercase` case-folds per the *element's*
   * effective language, and this component's callers span 19+ files at very different
   * points in translation: some already pass real Turkish, most still pass English, and an
   * ancestor's `lang="tr"` would apply Turkish dotted-İ casing to whichever this is either
   * way if left to inherit. Defaults to English because that's what an un-migrated caller
   * — the common case today — actually renders; a caller that translates `children` should
   * pass the locale it translated to. Same convention as `features/legal/site-footer.tsx`
   * and `legal-document.tsx`'s own `lang={locale}`, generalized here for a primitive with
   * a much larger, mostly-not-yet-translated caller population — hence optional-with-a-
   * default rather than their required prop.
   */
  locale?: Locale;
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
      <span lang={locale} className="text-[0.6875rem] font-medium tracking-[0.18em] text-ink-3 uppercase">
        {children}
      </span>
    </p>
  );
}
