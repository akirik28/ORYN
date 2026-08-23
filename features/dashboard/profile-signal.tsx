import Link from "next/link";
import { cn } from "@/lib/utils";
import { Eyebrow } from "@/components/oryn/eyebrow";
// Short forms: this block is a scan-and-compare read, and the full
// "Execution / Project Depth" wraps to two lines in every column width it renders in.
import { DIMENSION_LABELS, DIMENSION_LABELS_SHORT } from "@/lib/scoring/labels";
import { EVIDENCE_STATE_LABELS, type DimensionSignal, type EvidenceState } from "@/lib/scoring/signal";

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
  needs_attention: 1,
  developing: 2,
  strong: 4,
  limited_evidence: 0,
};

const STATE_TONE: Record<EvidenceState, string> = {
  strong: "bg-success",
  developing: "bg-brand-primary",
  needs_attention: "bg-warning",
  limited_evidence: "bg-transparent",
};

const STATE_TEXT: Record<EvidenceState, string> = {
  strong: "text-success",
  developing: "text-ink-2",
  needs_attention: "text-warning",
  limited_evidence: "text-ink-4",
};

function Spectrum({ state }: { state: EvidenceState }) {
  const lit = STATE_STEP[state];
  return (
    <span className="flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4].map((step) => (
        <span
          key={step}
          className={cn(
            "h-1 w-3.5 rounded-full",
            step <= lit ? STATE_TONE[state] : "bg-ink-4/20",
            // Unknown reads as an outlined track, not a filled one — see the note above.
            state === "limited_evidence" && "border border-dashed border-ink-4/50 bg-transparent",
          )}
        />
      ))}
    </span>
  );
}

export function ProfileSignal({
  signal,
  showScores = false,
  heading = "Profile signal",
}: {
  signal: DimensionSignal[];
  /** The detail view (the profile page) may show the underlying 0-100 figure as quiet
   *  metadata beside the qualitative state. Home never does: a number in the summary
   *  invites optimising the number. Even here the word is the reading and the score is
   *  the footnote, never the reverse. */
  showScores?: boolean;
  heading?: string;
}) {
  if (signal.length === 0) {
    return (
      <section aria-label={heading}>
        <Eyebrow>{heading}</Eyebrow>
        <p className="mt-4 max-w-xl leading-relaxed text-ink-2">
          Oryn hasn&apos;t read your profile yet. Add a few courses, activities or projects and this
          becomes a picture of where you actually stand.{" "}
          <Link href="/profile" className="text-brand-primary underline-offset-4 hover:underline">
            Start your journey
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
      <Eyebrow>{heading}</Eyebrow>
      <ul className="mt-5 grid gap-x-10 gap-y-3.5 @md:grid-cols-2">
        {signal.map((row) => (
          <li key={row.dimension} className="flex items-center justify-between gap-4 border-b border-border/60 pb-3">
            <span className="min-w-0 truncate text-sm text-ink-2">
              {showScores ? DIMENSION_LABELS[row.dimension] : DIMENSION_LABELS_SHORT[row.dimension]}
            </span>
            <span className="flex shrink-0 items-center gap-2.5">
              {showScores && row.state !== "limited_evidence" ? (
                <span className="text-xs text-ink-4 tabular-nums">{row.score}</span>
              ) : null}
              <span className={cn("text-xs whitespace-nowrap", STATE_TEXT[row.state])}>
                {EVIDENCE_STATE_LABELS[row.state]}
              </span>
              <Spectrum state={row.state} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
