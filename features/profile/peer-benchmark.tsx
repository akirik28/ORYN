import { getTranslations, getLocale } from "next-intl/server";
import { Users } from "lucide-react";
import { dimensionLabel } from "@/lib/scoring/labels";
import { MIN_COHORT_SIZE, type PeerBenchmarkSummary } from "@/lib/benchmarking";
import { EmptyState } from "@/components/oryn/empty-state";

/**
 * Phase 19 — deliberately shows nothing precise below MIN_COHORT_SIZE. Pre-launch, that's
 * every cohort (n=0), so the honest empty state below is what this renders today; it's
 * still built and tested now so it activates itself the moment real cohorts exist, rather
 * than needing a second pass later.
 */
export async function PeerBenchmark({ summary }: { summary: PeerBenchmarkSummary }) {
  const t = await getTranslations("profile.peerBenchmark");
  const locale = await getLocale();
  const withData = summary.results.filter((r) => r.percentile !== null);
  // cohortDescription comes from lib/benchmarking as an English sentence fragment — data,
  // not UI copy, same boundary as every other stored/generated string in this codebase's
  // i18n work — left untranslated regardless of locale.
  const cohort = summary.cohortDescription.toLowerCase();

  if (withData.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title={t("notEnoughStudents")}
        description={t("notEnoughDescription", { cohort, min: MIN_COHORT_SIZE })}
        className="py-6"
      />
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{t("comparedTo", { cohort })}</p>
      <ul className="divide-y rounded-lg border">
        {withData.map((result) => (
          <li key={result.dimension} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <span className="font-medium">
              {result.dimension === "overall" ? t("overallProfile") : dimensionLabel(result.dimension, locale)}
            </span>
            <span className="text-muted-foreground">
              {t("percentile", { percentile: result.percentile! })} <span className="text-xs">{t("cohortSize", { size: result.cohortSize })}</span>
            </span>
          </li>
        ))}
      </ul>
      {withData.length < summary.results.length ? (
        <p className="text-xs text-muted-foreground">{t("someDimensionsHidden")}</p>
      ) : null}
    </div>
  );
}
