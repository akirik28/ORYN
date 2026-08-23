import Link from "next/link";
import { ArrowRight, Compass, TrendingUp, FileText, Landmark } from "lucide-react";
import { PageHeader } from "@/components/oryn/page-header";
import { SectionHeader } from "@/components/oryn/section-header";
import { InsightCard } from "@/components/oryn/insight-card";
import { EmptyState } from "@/components/oryn/empty-state";
import { ErrorState } from "@/components/oryn/error-state";
import { DeadlineBadge } from "@/components/oryn/deadline-badge";
import { ScoreRing } from "@/features/dashboard/score-ring";
import { WeeklyFocus } from "@/features/dashboard/weekly-focus";
import { CounselorWeekFallback } from "@/features/dashboard/counselor-week-fallback";
import { GeneratePlanButton } from "@/features/dashboard/generate-plan-button";
import { OutlookBadge } from "@/features/universities/outlook-badge";
import { DIMENSION_LABELS } from "@/lib/scoring/labels";
import type { getTargetUniversitiesWithDetails } from "@/lib/universities/queries";
import type { getUpcomingDeadlines, DeadlineSource } from "@/lib/deadlines/upcoming";
import type { WeeklyPlanWithActions } from "@/lib/plan/persist";
import type { CounselorRecommendation } from "@/lib/counselor";
import type { ProfileDimension } from "@/types/database";

const DEADLINE_SOURCE_ICONS: Record<DeadlineSource, typeof FileText> = {
  application: FileText,
  opportunity: Compass,
  university: Landmark,
};

export interface DashboardViewProps {
  displayName: string;
  greeting: string;
  score: number | null;
  trend: number | null;
  biggestGap: { dimension: ProfileDimension; score: number } | null;
  biggestImprovement: { dimension: ProfileDimension; delta: number } | null;
  weeklyPlan: WeeklyPlanWithActions | null;
  planError: "not_configured" | "failed" | null;
  /** Counselor Core's deterministic "do" candidates (B4) — rendered in place of the AI
   * weekly plan whenever that plan is empty/unavailable, so "This week" always has a real,
   * useful answer without requiring an AI call. See features/dashboard/counselor-week-fallback.tsx. */
  counselorThisWeek: CounselorRecommendation[];
  avoidRecommendation: { title: string; reason: string } | null;
  upcomingDeadlines: Awaited<ReturnType<typeof getUpcomingDeadlines>>;
  targetUniversities: Awaited<ReturnType<typeof getTargetUniversitiesWithDetails>>;
  opportunityPreview: { title: string; matchScore: number }[];
  /** False only when refreshOpportunityMatches skipped its write this render (the admin
   * client wasn't configured) -- never for "genuinely zero matches," which is its own,
   * non-stale outcome. AGENTS.md Phase 45 / Rule 4: never let a page imply this preview
   * is current when it might not be. */
  opportunityMatchesRefreshed: boolean;
}

export function DashboardView({
  displayName,
  greeting,
  score,
  trend,
  biggestGap,
  biggestImprovement,
  weeklyPlan,
  planError,
  counselorThisWeek,
  avoidRecommendation,
  upcomingDeadlines,
  targetUniversities,
  opportunityPreview,
  opportunityMatchesRefreshed,
}: DashboardViewProps) {
  const hasAiPlan = Boolean(weeklyPlan && weeklyPlan.actions.length > 0);
  const usingCounselorFallback = !hasAiPlan && counselorThisWeek.length > 0;

  return (
    <div className="space-y-10">
      <PageHeader title={`${greeting}, ${displayName}.`} description="Here's what matters most right now." />

      <section className="relative overflow-hidden rounded-3xl border border-brand-primary-border bg-gradient-to-br from-brand-primary-subtle via-card to-card p-6 md:p-8">
        <div className="grid gap-8 md:grid-cols-[auto_1fr] md:items-center">
          <ScoreRing score={score} trend={trend} />
          <div className="space-y-4">
            {biggestGap ? (
              <div>
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Biggest gap</p>
                <p className="font-display text-xl text-balance">
                  {DIMENSION_LABELS[biggestGap.dimension]} — {biggestGap.score}/100
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  This is currently your least-developed area relative to the rest of your profile.
                </p>
              </div>
            ) : (
              <div>
                <p className="font-display text-xl">Your Career Profile is waiting for data.</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Add a few activities, grades, or projects and Oryn will tell you where you stand.
                </p>
              </div>
            )}
            {biggestImprovement ? (
              <div className="flex items-center gap-2 text-sm font-medium text-success">
                <TrendingUp className="size-4" />
                <span>
                  {DIMENSION_LABELS[biggestImprovement.dimension]} improved by {biggestImprovement.delta} this month.
                </span>
              </div>
            ) : null}
            <Link href="/profile" className="inline-flex items-center gap-1 text-sm text-brand-primary hover:underline">
              View your full profile <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader
          title="Your focus this week"
          description={
            weeklyPlan?.plan.summary ?? (usingCounselorFallback ? "Based on your verified profile data — no AI required." : undefined)
          }
        />
        {hasAiPlan ? (
          <WeeklyFocus actions={weeklyPlan!.actions} />
        ) : usingCounselorFallback ? (
          <CounselorWeekFallback actions={counselorThisWeek} />
        ) : (
          <EmptyState
            icon={Compass}
            title={
              planError === "not_configured"
                ? "The AI Advisor isn't configured yet"
                : planError === "failed"
                  ? "We couldn't generate this week's plan"
                  : "No weekly plan yet"
            }
            description={
              planError === "not_configured"
                ? "Add ANTHROPIC_API_KEY to enable weekly plans — see API_SETUP.md."
                : planError === "failed"
                  ? "Please try again."
                  : "Add a few things to your profile and Oryn will generate your first weekly plan."
            }
            action={planError !== "not_configured" ? <GeneratePlanButton /> : undefined}
          />
        )}
      </section>

      {avoidRecommendation ? (
        <InsightCard variant="avoid" eyebrow="One thing not to do" title={avoidRecommendation.title}>
          {avoidRecommendation.reason}
        </InsightCard>
      ) : null}

      {upcomingDeadlines.length > 0 ? (
        <section className="space-y-3">
          <SectionHeader title="Due soon" />
          <ul className="divide-y rounded-xl border">
            {upcomingDeadlines.map((deadline) => {
              const SourceIcon = DEADLINE_SOURCE_ICONS[deadline.source];
              return (
                <li key={deadline.id}>
                  <Link
                    href={deadline.href}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-accent"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <SourceIcon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{deadline.title}</span>
                    </span>
                    <DeadlineBadge date={deadline.date} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <section className="space-y-3 rounded-xl border p-5">
          <SectionHeader
            title="University outlook"
            action={
              <Link href="/universities" className="text-sm text-brand-primary hover:underline">
                Explore
              </Link>
            }
          />
          {targetUniversities.length > 0 ? (
            <ul className="space-y-2">
              {targetUniversities.map((target) => (
                <li key={target.id} className="flex items-center justify-between text-sm">
                  <span className="truncate pr-2">{target.university?.name ?? "Unknown university"}</span>
                  <OutlookBadge outlook={target.outlook} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No target universities yet.{" "}
              <Link href="/universities" className="text-brand-primary hover:underline">
                Explore universities
              </Link>{" "}
              to add your first.
            </p>
          )}
        </section>

        <section className="space-y-3 rounded-xl border p-5">
          <SectionHeader
            title="Opportunities"
            action={
              <Link href="/opportunities" className="text-sm text-brand-primary hover:underline">
                Browse
              </Link>
            }
          />
          {!opportunityMatchesRefreshed ? (
            <ErrorState description="We couldn't refresh your matches just now. The list below is your last known result, not necessarily current." />
          ) : null}
          {opportunityPreview.length > 0 ? (
            <ul className="space-y-2">
              {opportunityPreview.map((opp) => (
                <li key={opp.title} className="flex items-center justify-between text-sm">
                  <span className="truncate pr-2">{opp.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{opp.matchScore}% match</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Compass className="size-5 text-brand-primary" />
              <span>Personalized matches appear here once your profile has enough signal.</span>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
