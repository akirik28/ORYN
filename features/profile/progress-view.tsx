import Link from "next/link";
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { dimensionLabel } from "@/lib/scoring/labels";
import { evidenceStateShortLabel, isAssessed, signalCoverage } from "@/lib/scoring/signal";
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
export async function ProgressView({ review }: { review: MonthlyReview }) {
  const locale = await getLocale();
  const t = await getTranslations("profile");
  const tProgress = await getTranslations("profile.progress");
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
          <ArrowLeft className="size-3.5" /> {t("backToProfile")}
        </Link>
        <h1 className="mt-2 font-display text-2xl tracking-tight md:text-3xl">{tProgress("title")}</h1>
        <p className="mt-1 text-muted-foreground">{tProgress("subtitle", { days: review.windowDays })}</p>
      </div>

      {coverage.assessed > 0 ? (
        <section className="space-y-4 rounded-2xl border border-brand-primary-border bg-brand-primary-subtle p-6">
          <div>
            <p lang={locale} className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {tProgress("whereYouStand")}
            </p>
            <p className="mt-1.5 leading-relaxed">
              {strongest.length > 0
                ? tProgress.rich("strongestEvidence", {
                    dimensions: strongest.slice(0, 3).map((row) => dimensionLabel(row.dimension, locale).toLocaleLowerCase(locale)).join(", "),
                    bold: (chunks) => <span className="font-medium">{chunks}</span>,
                  })
                : null}
              {developing.length > 0 ? tProgress("developing", { count: developing.length }) : null}
              {coverage.awaitingEvidence > 0 ? tProgress("awaitingEvidence", { count: coverage.awaitingEvidence }) : null}
            </p>
          </div>
          {nextToStrengthen ? (
            <div className="border-t border-brand-primary-border pt-4">
              <p lang={locale} className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {tProgress("nextToStrengthen")}
              </p>
              <p className="mt-1.5">
                <span className="font-medium">{dimensionLabel(nextToStrengthen.dimension, locale)}</span>
                <span className="text-muted-foreground">
                  {tProgress("nextToStrengthenBody", { state: evidenceStateShortLabel(nextToStrengthen.state, locale).toLocaleLowerCase(locale) })}
                </span>
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      {!review.hasHistory ? (
        <EmptyState icon={TrendingUp} title={tProgress("notEnoughHistoryTitle")} description={tProgress("notEnoughHistoryDescription")} />
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="font-semibold">{tProgress("whatChanged")}</h2>
            <p className="text-sm text-muted-foreground">
              {improved.length > 0 ? tProgress("movedForward", { count: improved.length }) : tProgress("noneMovedForward")}
              {declined.length > 0 ? tProgress("movedBackSuffix", { count: declined.length }) : ""}
              {steady > 0 ? tProgress("heldSteadySuffix", { count: steady }) : ""}.
            </p>
            <ul className="glass-card-offset divide-y divide-white/45 overflow-hidden rounded-2xl border border-white/65 bg-white/45 backdrop-blur-2xl">
              {review.dimensionDeltas.map((d) => (
                <li key={d.dimension} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span>{dimensionLabel(d.dimension, locale)}</span>
                  <span className="flex items-center gap-3 text-muted-foreground">
                    {d.before} → {d.after}
                    <DeltaBadge delta={d.delta} />
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="glass-card rounded-2xl border border-white/65 bg-white/45 p-5 backdrop-blur-2xl">
              <p className="text-2xl font-semibold tracking-tight">{review.projectsCompletedRecently}</p>
              <p className="text-sm text-muted-foreground">{tProgress("projectsCompleted", { days: review.windowDays })}</p>
            </div>
            <div className="glass-card-fast rounded-2xl border border-white/65 bg-white/45 p-5 backdrop-blur-2xl">
              <p className="text-2xl font-semibold tracking-tight">{review.applicationsSubmittedRecently}</p>
              <p className="text-sm text-muted-foreground">{tProgress("applicationsSubmitted", { days: review.windowDays })}</p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
