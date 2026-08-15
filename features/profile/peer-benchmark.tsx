import { DIMENSION_LABELS } from "@/lib/scoring/labels";
import { MIN_COHORT_SIZE, type PeerBenchmarkSummary } from "@/lib/benchmarking";

/**
 * Phase 19 — deliberately shows nothing precise below MIN_COHORT_SIZE. Pre-launch, that's
 * every cohort (n=0), so the honest empty state below is what this renders today; it's
 * still built and tested now so it activates itself the moment real cohorts exist, rather
 * than needing a second pass later.
 */
export function PeerBenchmark({ summary }: { summary: PeerBenchmarkSummary }) {
  const withData = summary.results.filter((r) => r.percentile !== null);

  if (withData.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        Not enough comparable Oryn students yet to show peer comparison ({summary.cohortDescription.toLowerCase()}, minimum{" "}
        {MIN_COHORT_SIZE}).
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Compared to {summary.cohortDescription.toLowerCase()}</p>
      <ul className="divide-y rounded-lg border">
        {withData.map((result) => (
          <li key={result.dimension} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <span className="font-medium">{result.dimension === "overall" ? "Overall profile" : DIMENSION_LABELS[result.dimension]}</span>
            <span className="text-muted-foreground">
              {result.percentile}th percentile <span className="text-xs">(n={result.cohortSize})</span>
            </span>
          </li>
        ))}
      </ul>
      {withData.length < summary.results.length ? (
        <p className="text-xs text-muted-foreground">Some dimensions don&apos;t have enough comparable students yet to show.</p>
      ) : null}
    </div>
  );
}
