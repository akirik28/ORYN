import Link from "next/link";
import { ArrowRight, Compass, TrendingUp, FileText, Landmark } from "lucide-react";
import { PageHeader } from "@/components/oryn/page-header";
import { SectionHeader } from "@/components/oryn/section-header";
import { InsightCard } from "@/components/oryn/insight-card";
import { EmptyState } from "@/components/oryn/empty-state";
import { DeadlineBadge } from "@/components/oryn/deadline-badge";
import { StatusBadge } from "@/components/oryn/status-badge";
import { ScoreRing } from "@/features/dashboard/score-ring";
import { WeeklyFocus } from "@/features/dashboard/weekly-focus";
import { GeneratePlanButton } from "@/features/dashboard/generate-plan-button";
import { OutlookBadge } from "@/features/universities/outlook-badge";
import { tierFor } from "@/lib/opportunities/match-tier";
import { DIMENSION_LABELS } from "@/lib/scoring/labels";
import type { getTargetUniversitiesWithDetails } from "@/lib/universities/queries";
import type { getUpcomingDeadlines, DeadlineSource } from "@/lib/deadlines/upcoming";
import type { WeeklyPlanWithActions } from "@/lib/plan/persist";
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
  avoidRecommendation: { title: string; reason: string } | null;
  upcomingDeadlines: Awaited<ReturnType<typeof getUpcomingDeadlines>>;
  targetUniversities: Awaited<ReturnType<typeof getTargetUniversitiesWithDetails>>;
  opportunityPreview: { title: string; matchScore: number }[];
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
  avoidRecommendation,
  upcomingDeadlines,
  targetUniversities,
  opportunityPreview,
}: DashboardViewProps) {
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
                <p className="font-heading text-xl font-medium text-balance">
                  {DIMENSION_LABELS[biggestGap.dimension]} — {biggestGap.score}/100
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  This is currently your least-developed area relative to the rest of your profile.
                </p>
              </div>
            ) : (
              <div>
                <p className="font-heading text-xl font-medium">Your Career Profile is waiting for data.</p>
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
        <SectionHeader title="Your focus this week" description={weeklyPlan?.plan.summary ?? undefined} />
        {weeklyPlan && weeklyPlan.actions.length > 0 ? (
          <WeeklyFocus actions={weeklyPlan.actions} />
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
                    <span className="flex items-center gap-2">
                      <SourceIcon className="size-4 text-muted-foreground" />
                      {deadline.title}
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
          {opportunityPreview.length > 0 ? (
            <ul className="space-y-2">
              {opportunityPreview.map((opp) => (
                <li key={opp.title} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate pr-2">{opp.title}</span>
                  <span className="shrink-0">
                    <StatusBadge label={tierFor(opp.matchScore).label} tone={tierFor(opp.matchScore).tone} />
                  </span>
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
