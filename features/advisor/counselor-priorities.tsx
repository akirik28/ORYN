import Link from "next/link";
import { Compass, TriangleAlert } from "lucide-react";
import { SectionHeader } from "@/components/oryn/section-header";
import { InsightCard } from "@/components/oryn/insight-card";
import { EmptyState } from "@/components/oryn/empty-state";
import { DeadlineBadge } from "@/components/oryn/deadline-badge";
import { StatusBadge } from "@/components/oryn/status-badge";
import { Button } from "@/components/ui/button";
import type { CounselorRecommendation, CounselorResult } from "@/lib/counselor";

const LEVEL_LABEL = { low: "Low", medium: "Medium", high: "High" } as const;

function RecommendationCard({ recommendation }: { recommendation: CounselorRecommendation }) {
  const unknownEligibility = recommendation.eligibility.verdict === "unknown";
  return (
    <li className="space-y-2.5 rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium text-balance">{recommendation.title}</p>
        {recommendation.deadline ? <DeadlineBadge date={recommendation.deadline.date} className="shrink-0" /> : null}
      </div>
      {recommendation.why.length > 0 ? (
        <ul className="space-y-1 text-sm text-muted-foreground">
          {recommendation.why.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
      <p className="text-xs text-muted-foreground">
        {LEVEL_LABEL[recommendation.impact]} impact · {LEVEL_LABEL[recommendation.effort]} effort
      </p>
      {unknownEligibility && recommendation.warnings[0] ? (
        <StatusBadge label={recommendation.warnings[0]} tone="warning" icon={TriangleAlert} />
      ) : null}
      <div className="pt-1">
        <Button variant="outline" size="sm" render={<Link href={recommendation.nextAction.href} />}>
          {recommendation.nextAction.label}
        </Button>
      </div>
    </li>
  );
}

/**
 * Counselor Core Phase L — "Your priorities" panel on the Advisor page
 * (docs/counselor-core-plan.md §12). Purely presentational: every fact shown here already
 * came from the deterministic pipeline (lib/counselor/pipeline.ts) with real evidence
 * attached — no scores, no internal breakdown, no invented copy.
 */
export function CounselorPriorities({ result }: { result: CounselorResult }) {
  const doItems = result.recommendations.filter((r) => r.recommendationClass === "do");
  const considerItems = result.recommendations.filter((r) => r.recommendationClass === "consider");
  const avoidItem = result.recommendations.find((r) => r.recommendationClass === "avoid_for_now");

  if (!result.profileReadiness.sufficientForJudgment) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={Compass}
          title="Oryn needs a bit more information before it can make confident recommendations"
          description={`Profile completeness: ${result.profileReadiness.completenessPercent}%. The items below are the highest-value ones to add first.`}
          action={
            <Button size="sm" render={<Link href="/profile" />}>
              Complete your profile
            </Button>
          }
        />
        {doItems.length > 0 ? (
          <ul className="space-y-3">
            {doItems.map((r) => (
              <RecommendationCard key={r.id} recommendation={r} />
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  if (result.recommendations.length === 0) {
    return (
      <EmptyState
        icon={Compass}
        title="No verified, eligible recommendations right now"
        description="Oryn only recommends opportunities and requirements it can verify and confirm you're eligible for — it doesn't guess. Check back as more verified data becomes available, or explore Opportunities and Universities directly."
      />
    );
  }

  return (
    <div className="space-y-6">
      {doItems.length > 0 ? (
        <section className="space-y-3">
          <SectionHeader title="Your priorities" />
          <ul className="space-y-3">
            {doItems.map((r) => (
              <RecommendationCard key={r.id} recommendation={r} />
            ))}
          </ul>
        </section>
      ) : null}

      {avoidItem ? (
        <InsightCard variant="avoid" eyebrow="One thing not to do" title={avoidItem.title}>
          {avoidItem.why[0]}
        </InsightCard>
      ) : null}

      {considerItems.length > 0 ? (
        <section className="space-y-3">
          <SectionHeader title="Worth considering" />
          <ul className="space-y-3">
            {considerItems.map((r) => (
              <RecommendationCard key={r.id} recommendation={r} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
