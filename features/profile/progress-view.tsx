import Link from "next/link";
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { DIMENSION_LABELS } from "@/lib/scoring/labels";
import { EVIDENCE_STATE_SHORT_LABELS, isAssessed, signalCoverage } from "@/lib/scoring/signal";
import type { MonthlyReview } from "@/lib/scoring/monthly-review";
import { EmptyState } from "@/components/oryn/empty-state";

function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Minus className="size-3.5" /> 0
      </span>
    );
  }
  const positive = delta > 0;
  return (
    <span className={`inline-flex items-center gap-1 font-medium ${positive ? "text-success" : "text-muted-foreground"}`}>
      {positive ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
      {positive ? "+" : ""}
      {delta}
    </span>
  );
}

/**
 * Phase 40 — Progress.
 *
 * This page used to open with the aggregate profile score set in display type ("69, was
 * 66"), which made a mean of nine dimensions the headline reading of a student's month.
 * That number is still computed and still stored; it is no longer what a student is shown,
 * because it is not interpretable (two very different months produce the same figure) and
 * not actionable (nothing a student can do maps onto it). What replaces it is the same
 * information in the form a student can act on: which areas moved, which are strongest
 * now, and which one to work on next.
 *
 * Per-dimension numbers stay. They are evidence about a specific, nameable thing, and
 * hiding them would remove the detail that makes the qualitative read checkable.
 */
export function ProgressView({ review }: { review: MonthlyReview }) {
  const coverage = signalCoverage(review.signal);
  const strongest = review.signal.filter((row) => row.state === "strong");
  const developing = review.signal.filter((row) => row.state === "developing");
  // Weakest assessed area — the one worth the next block of work. Unassessed dimensions are
  // deliberately not eligible: Oryn would be naming a gap in data it doesn't have.
  const nextToStrengthen = [...review.signal].reverse().find((row) => isAssessed(row.state)) ?? null;

  const improved = review.dimensionDeltas.filter((d) => d.delta > 0);
  const declined = review.dimensionDeltas.filter((d) => d.delta < 0);
  const steady = review.dimensionDeltas.length - improved.length - declined.length;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/profile" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Back to profile
        </Link>
        <h1 className="mt-2 font-display text-2xl tracking-tight md:text-3xl">Progress</h1>
        <p className="mt-1 text-muted-foreground">How your profile has changed over the last {review.windowDays} days.</p>
      </div>

      {coverage.assessed > 0 ? (
        <section className="space-y-4 rounded-2xl border border-brand-primary-border bg-brand-primary-subtle p-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Where you stand</p>
            <p className="mt-1.5 leading-relaxed">
              {strongest.length > 0 ? (
                <>
                  Your strongest evidence is in{" "}
                  <span className="font-medium">
                    {strongest.slice(0, 3).map((row) => DIMENSION_LABELS[row.dimension].toLowerCase()).join(", ")}
                  </span>
                  .{" "}
                </>
              ) : null}
              {developing.length > 0 ? (
                <>
                  {developing.length} area{developing.length === 1 ? " is" : "s are"} developing.{" "}
                </>
              ) : null}
              {coverage.awaitingEvidence > 0 ? (
                <>
                  Oryn still has too little to say about {coverage.awaitingEvidence} of them.
                </>
              ) : null}
            </p>
          </div>
          {nextToStrengthen ? (
            <div className="border-t border-brand-primary-border pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Next area to strengthen</p>
              <p className="mt-1.5">
                <span className="font-medium">{DIMENSION_LABELS[nextToStrengthen.dimension]}</span>
                <span className="text-muted-foreground">
                  {" "}
                  — {EVIDENCE_STATE_SHORT_LABELS[nextToStrengthen.state].toLowerCase()}. Of everything Oryn has
                  a read on, this is where the same hours of work change your profile most.
                </span>
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      {!review.hasHistory ? (
        <EmptyState
          icon={TrendingUp}
          title="Not enough history yet"
          description="Check back after your profile has had a chance to change over a few weeks. Oryn compares your dimensions against a snapshot taken at least a month ago."
        />
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="font-semibold">What changed</h2>
            <p className="text-sm text-muted-foreground">
              {improved.length > 0
                ? `${improved.length} area${improved.length === 1 ? "" : "s"} moved forward`
                : "No area moved forward"}
              {declined.length > 0 ? `, ${declined.length} moved back` : ""}
              {steady > 0 ? `, ${steady} held steady` : ""}.
            </p>
            <ul className="divide-y rounded-xl border">
              {review.dimensionDeltas.map((d) => (
                <li key={d.dimension} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span>{DIMENSION_LABELS[d.dimension]}</span>
                  <span className="flex items-center gap-3 text-muted-foreground">
                    {d.before} → {d.after}
                    <DeltaBadge delta={d.delta} />
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border p-5">
              <p className="text-2xl font-semibold tracking-tight">{review.projectsCompletedRecently}</p>
              <p className="text-sm text-muted-foreground">Projects marked complete in the last {review.windowDays} days</p>
            </div>
            <div className="rounded-xl border p-5">
              <p className="text-2xl font-semibold tracking-tight">{review.applicationsSubmittedRecently}</p>
              <p className="text-sm text-muted-foreground">Applications submitted or updated in the last {review.windowDays} days</p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
