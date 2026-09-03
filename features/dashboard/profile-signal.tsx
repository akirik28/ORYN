import Link from "next/link";
import { cn } from "@/lib/utils";
import { Eyebrow } from "@/components/proxola/eyebrow";
// Short forms: this block is a scan-and-compare read, and the full
// "Execution / Project Depth" wraps to two lines in every column width it renders in.
import { dimensionLabel, dimensionLabelShort } from "@/lib/scoring/labels";
import {
  evidenceStateLabel,
  evidenceStateShortLabel,
  isAssessed,
  type DimensionSignal,
  type EvidenceState,
} from "@/lib/scoring/signal";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";

/**
 * Profile Signal (UI-V3 § 11) — how Oryn reads the shape of a student's profile.
 *
 * Deliberately not six progress bars and deliberately not percentages. A bar implies a
 * track with an end, which tells a student the goal is to fill it; the goal is actually to
 * have credible evidence in the areas that matter for where they're going. So each
 * dimension gets a four-step spectrum with one step lit, and the *word* is the reading —
 * the marks are there to let the eye compare rows at a glance, not to be counted.
 *
 * `limited_evidence` renders as an open marker rather than a filled one anywhere on the
 * scale, because it isn't a position on the scale: it means Oryn hasn't been told enough
 * to place this dimension at all. Showing it as a low fill would be a quiet lie.
 */
const STATE_STEP: Record<EvidenceState, number> = {
  emerging: 1,
  developing: 2,
  strong: 4,
  // Neither of these is a position on the scale — see the outlined-track note below.
  limited_evidence: 0,
  not_assessed: 0,
};

const STATE_TONE: Record<EvidenceState, string> = {
  strong: "bg-success",
  developing: "bg-brand-primary",
  // Brand, not warning: "a good next area to strengthen" is a direction, not an alarm.
  // Amber here is what turned a thin profile into a page of red flags.
  emerging: "bg-brand-primary/60",
  limited_evidence: "bg-transparent",
  not_assessed: "bg-transparent",
};

const STATE_TEXT: Record<EvidenceState, string> = {
  strong: "text-success",
  developing: "text-ink-2",
  emerging: "text-ink-2",
  limited_evidence: "text-ink-3",
  not_assessed: "text-ink-3",
};

function Spectrum({ state }: { state: EvidenceState }) {
  const lit = STATE_STEP[state];
  return (
    <span className="flex shrink-0 items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4].map((step) => (
        <span
          key={step}
          className={cn(
            "h-1 w-3.5 rounded-full",
            step <= lit ? STATE_TONE[state] : "bg-ink-4/20",
            // Unknown reads as an outlined track, not a filled one — see the note above.
            (state === "limited_evidence" || state === "not_assessed") &&
              "border border-dashed border-ink-4/50 bg-transparent",
          )}
        />
      ))}
    </span>
  );
}

const EMPTY_STATE_COPY: Record<Locale, { body: string; cta: string }> = {
  en: {
    body: "Proxola hasn't read your profile yet. Add a few courses, activities or projects and this becomes a picture of where you actually stand.",
    cta: "Start your journey",
  },
  tr: {
    body: "Proxola henüz profilini okumadı. Birkaç ders, aktivite veya proje ekle; bu, gerçekte nerede durduğunun bir resmine dönüşür.",
    cta: "Yolculuğuna başla",
  },
};

export function ProfileSignal({
  signal,
  showScores = false,
  heading = "Profile signal",
  locale = DEFAULT_LOCALE,
}: {
  signal: DimensionSignal[];
  /** The detail view (the profile page) may show the underlying 0-100 figure as quiet
   *  metadata beside the qualitative state. Home never does: a number in the summary
   *  invites optimising the number. Even here the word is the reading and the score is
   *  the footnote, never the reverse. */
  showScores?: boolean;
  heading?: string;
  /** The actual language of `heading` (a caller-supplied prop this component doesn't
   *  control) and of every other string this component renders itself. Callers that pass a
   *  translated `heading` must pass the matching `locale` alongside it — see
   *  components/proxola/eyebrow.tsx's own `locale` prop doc for why this can't just inherit
   *  the page's `<html lang>`. */
  locale?: Locale;
}) {
  if (signal.length === 0) {
    const copy = EMPTY_STATE_COPY[locale];
    return (
      <section aria-label={heading}>
        <Eyebrow locale={locale}>{heading}</Eyebrow>
        <p lang={locale} className="mt-4 max-w-xl leading-relaxed text-ink-2">
          {copy.body}{" "}
          <Link href="/profile" className="text-brand-primary underline-offset-4 hover:underline">
            {copy.cta}
          </Link>
          .
        </p>
      </section>
    );
  }

  // @container rather than an `sm:` breakpoint: this block renders in a narrow aside on
  // Home and at full width on the profile page. Keyed to the viewport it went two-up
  // inside the aside and truncated every label to "Le…"/"Ac…"; keyed to its own container
  // it lays out correctly wherever it's placed.
  return (
    <section aria-label={heading} className="@container">
      <Eyebrow locale={locale}>{heading}</Eyebrow>
      {/* Single column in the detail view: it renders full dimension names ("Intellectual
          Curiosity") inside a half-width slot, where two ~280px columns truncated every
          label. The summary variant uses short names and can afford two columns. */}
      <ul lang={locale} className={cn("mt-5 grid gap-x-10 gap-y-3.5", !showScores && "@md:grid-cols-2")}>
        {signal.map((row) => (
          // flex-wrap, and a right-hand group that is no longer shrink-0: the long state
          // labels ("A good next area to strengthen") are wider than the Home aside, and a
          // nowrap group that cannot shrink pushed the whole row past the card's edge, so
          // the values were clipped off-screen rather than wrapping. Wrapping is the
          // width-independent guard; the short/long label swap below keeps it from
          // actually needing to wrap at the widths this really renders at.
          <li key={row.dimension} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-border/60 pb-3">
            <span className="min-w-0 truncate text-sm text-ink-2">
              {showScores ? dimensionLabel(row.dimension, locale) : dimensionLabelShort(row.dimension, locale)}
            </span>
            <span className="flex min-w-0 items-center gap-2.5">
              {/* Only for states Oryn actually assessed. Printing "0" beside "Not enough
                  evidence yet" asserts a measurement that never happened — the same
                  confusion between absence and weakness this whole model exists to end. */}
              {showScores && isAssessed(row.state) ? (
                <span className="shrink-0 text-xs text-ink-3 tabular-nums">{row.score}</span>
              ) : null}
              {showScores ? (
                // Same fact at two lengths, chosen by the container's own width rather
                // than the viewport — this block sits in a ~460px aside on Home and at
                // full width on the profile page.
                <>
                  <span className={cn("text-xs whitespace-nowrap @lg:hidden", STATE_TEXT[row.state])}>
                    {evidenceStateShortLabel(row.state, locale)}
                  </span>
                  <span className={cn("hidden text-xs whitespace-nowrap @lg:inline", STATE_TEXT[row.state])}>
                    {evidenceStateLabel(row.state, locale)}
                  </span>
                </>
              ) : (
                <span className={cn("text-xs whitespace-nowrap", STATE_TEXT[row.state])}>
                  {evidenceStateShortLabel(row.state, locale)}
                </span>
              )}
              <Spectrum state={row.state} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
