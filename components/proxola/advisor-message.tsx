import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";

/**
 * A block of counsel from Oryn (UI-V3 § 14).
 *
 * Deliberately **not** a chat bubble: no rounded container, no avatar circle, no tail, no
 * alternating alignment. Those are messaging affordances, and they make a considered
 * position look like a reply. What's here instead is a thin left rule, a small tracked
 * attribution mark, and body copy at a generous measure and line height — the shape of
 * written advice.
 *
 * The distinction is the product's, not a stylistic preference: Oryn is supposed to read
 * as a counselor taking a position it can defend, and a chat UI frames every answer as
 * disposable conversational output. If this ever grows a bubble, the differentiator is
 * gone.
 *
 * User turns get `variant="student"` — quieter, unruled, clearly secondary. The student's
 * question is the prompt for the counsel, not a peer utterance in a transcript.
 */
const DEFAULT_ATTRIBUTION: Record<Locale, { oryn: string; student: string }> = {
  en: { oryn: "Oryn", student: "You" },
  tr: { oryn: "Oryn", student: "Sen" },
};

export function AdvisorMessage({
  variant = "oryn",
  attribution,
  meta,
  locale = DEFAULT_LOCALE,
  children,
  className,
}: {
  variant?: "oryn" | "student";
  /** Small uppercase mark. Defaults to a locale-appropriate "Oryn" / "You", per `locale`. */
  attribution?: string;
  /** Quiet right-aligned metadata — a timestamp, a model note. */
  meta?: ReactNode;
  /** The actual language of `attribution` (when explicitly passed) or of the default mark
   *  otherwise — see components/proxola/eyebrow.tsx's `locale` prop doc for why this can't
   *  just inherit the page's `<html lang>`. */
  locale?: Locale;
  children: ReactNode;
  className?: string;
}) {
  const isOryn = variant === "oryn";

  if (!isOryn) {
    return (
      <div className={cn("max-w-2xl", className)}>
        <p lang={locale} className="text-[0.6875rem] font-medium tracking-[0.18em] text-ink-3 uppercase">
          {attribution ?? DEFAULT_ATTRIBUTION[locale].student}
        </p>
        <div className="mt-1.5 leading-relaxed text-ink-2">{children}</div>
      </div>
    );
  }

  return (
    <article className={cn("max-w-2xl border-l border-border pl-6 sm:pl-8", className)}>
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span lang={locale} className="text-[0.6875rem] font-medium tracking-[0.18em] text-ink-1 uppercase">
          {attribution ?? DEFAULT_ATTRIBUTION[locale].oryn}
        </span>
        {meta ? <span className="ml-auto text-[0.6875rem] text-ink-3 tabular-nums">{meta}</span> : null}
      </header>
      {/* Serif at a long measure and 1.75 line height. Counsel should feel like something
          written, and the display face is already the voice Oryn speaks in elsewhere. */}
      <div className="mt-3 font-display text-[1.0625rem] leading-[1.75] text-ink-1 [&>p+p]:mt-4">
        {children}
      </div>
    </article>
  );
}

/**
 * Loading state for a reply in flight. Three settling lines rather than a bouncing-dot
 * indicator — dots say "typing", which is the messaging metaphor this component exists to
 * avoid, and this reads as something being composed.
 */
export function AdvisorMessageThinking({ locale = DEFAULT_LOCALE, className }: { locale?: Locale; className?: string }) {
  return (
    <article
      aria-busy="true"
      aria-live="polite"
      className={cn("max-w-2xl border-l border-border pl-6 sm:pl-8", className)}
    >
      <p lang={locale} className="text-[0.6875rem] font-medium tracking-[0.18em] text-ink-1 uppercase">
        {DEFAULT_ATTRIBUTION[locale].oryn}
      </p>
      <div className="mt-4 space-y-3" role="status" aria-label="Composing a response">
        <span className="block h-2.5 w-[92%] animate-pulse rounded-full bg-ink-4/20" />
        <span className="block h-2.5 w-[78%] animate-pulse rounded-full bg-ink-4/20" />
        <span className="block h-2.5 w-[54%] animate-pulse rounded-full bg-ink-4/20" />
      </div>
    </article>
  );
}
