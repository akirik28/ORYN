import Link from "next/link";
import { ArrowRight, Compass, FileText, Landmark, Minus, TrendingUp } from "lucide-react";
import { Eyebrow } from "@/components/oryn/eyebrow";
import { SectionHeader } from "@/components/oryn/section-header";
import { InsightCard } from "@/components/oryn/insight-card";
import { NextMove } from "@/components/oryn/next-move";
import { EmptyState } from "@/components/oryn/empty-state";
import { ErrorState } from "@/components/oryn/error-state";
import { DeadlineBadge } from "@/components/oryn/deadline-badge";
import { ButtonLink } from "@/components/ui/button-link";
import { WeeklyFocus } from "@/features/dashboard/weekly-focus";
import { CounselorWeekFallback } from "@/features/dashboard/counselor-week-fallback";
import { GeneratePlanButton } from "@/features/dashboard/generate-plan-button";
import { ProfileSignal } from "@/features/dashboard/profile-signal";
import { OutlookBadge } from "@/features/universities/outlook-badge";
import { computeDashboardHeroState } from "@/lib/scoring/dashboard-hero";
import type { DimensionSignal } from "@/lib/scoring/signal";
import { describeProfileChange, type ProfileChange } from "@/lib/scoring/change";
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
  biggestGap: { dimension: ProfileDimension; score: number } | null;
  /** Per-dimension movement since the last snapshot. Replaced the single aggregate delta —
   * see lib/scoring/change.ts for why a mean of nine dimensions isn't something to act on. */
  profileChange: ProfileChange;
  /** Qualitative per-dimension read (lib/scoring/signal.ts). Never rendered as percentages. */
  profileSignal: DimensionSignal[];
  weeklyPlan: WeeklyPlanWithActions | null;
  planError: "not_configured" | "failed" | null;
  /** Counselor Core's deterministic "do" candidates (B4) — rendered in place of the AI
   * weekly plan whenever that plan is empty/unavailable, so "This week" always has a real,
   * useful answer without requiring an AI call. See features/dashboard/counselor-week-fallback.tsx. */
  counselorThisWeek: CounselorRecommendation[];
  avoidRecommendation: { title: string; reason: string } | null;
  upcomingDeadlines: Awaited<ReturnType<typeof getUpcomingDeadlines>>;
  targetUniversities: Awaited<ReturnType<typeof getTargetUniversitiesWithDetails>>;
  opportunityPreview: { title: string; matchScore: number; deadline: string | null }[];
  /** False only when refreshOpportunityMatches skipped its write this render (the admin
   * client wasn't configured) -- never for "genuinely zero matches," which is its own,
   * non-stale outcome. AGENTS.md Phase 45 / Rule 4: never let a page imply this preview
   * is current when it might not be. */
  opportunityMatchesRefreshed: boolean;
}

export function DashboardView({
  displayName,
  greeting,
  biggestGap,
  profileChange,
  profileSignal,
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
  // See lib/scoring/dashboard-hero.ts for why this needs three states, not two — a rich
  // profile whose literal weakest dimension happens to be unassessed used to render the
  // same "nothing recorded" copy as a genuinely empty profile (live Gate 2 finding,
  // 2026-08-24, docs/handoffs/gate2-ai-counselor-report-2026-08-24.md §18).
  const heroState = computeDashboardHeroState(profileSignal, biggestGap);
  const changeSentence = describeProfileChange(profileChange);

  return (
    <div className="space-y-20 md:space-y-24">
      {/* Opening. Not a card, and not a stat block — the first thing a student reads is a
          sentence about what to do, in Oryn's own voice. The greeting is deliberately
          small: it's an address, not the headline. */}
      <header>
        {/* No aggregate score here. It is still computed and stored — ranking, snapshots and
            trend logic all read `profiles.profile_strength_score` — but a student was being
            shown a mean of nine dimensions as though it were a reading of them. It is not
            interpretable (two very different months produce the same 69), not actionable
            (nothing you can do maps to it), and it invites optimising the figure instead of
            the evidence underneath. What replaces it is everything below: the area to
            strengthen next, the per-dimension signal, and what actually moved. */}
        <p className="text-sm text-ink-3">
          {greeting}, {displayName}.
        </p>
        {heroState.kind === "claimable" ? (
          <NextMove
            className="mt-6"
            size="hero"
            as="h1"
            eyebrow="Your next move"
            headline={<>Your clearest gap right now is {heroState.gapLabel!.toLowerCase()}.</>}
            why={
              <>
                Oryn compares your dimensions against each other, not against other students. Across
                everything you&apos;ve recorded, this is the area with the least supporting evidence — so
                it&apos;s where the same hours of work change your profile most.
              </>
            }
            evidence={heroState.evidence}
            action={
              <>
                <ButtonLink href="/advisor">
                  Build a plan for this <ArrowRight className="size-4" />
                </ButtonLink>
                <ButtonLink href="/profile" variant="outline">
                  See the full picture
                </ButtonLink>
              </>
            }
          />
        ) : heroState.kind === "rich_unclaimable" ? (
          <NextMove
            className="mt-6"
            size="hero"
            as="h1"
            eyebrow="Where you stand"
            headline="No single dimension stands out as your clearest gap right now."
            why="Oryn compares your dimensions against each other, not against other students, and right now none of them is clearly behind the rest — that's a good sign, not a gap in what Oryn knows."
            evidence={heroState.evidence}
            action={
              <>
                <ButtonLink href="/advisor">
                  Talk to your counselor <ArrowRight className="size-4" />
                </ButtonLink>
                <ButtonLink href="/profile" variant="outline">
                  See the full picture
                </ButtonLink>
              </>
            }
          />
        ) : (
          <NextMove
            className="mt-6"
            size="hero"
            as="h1"
            eyebrow="Getting started"
            headline="Tell Oryn what you've done, and it will tell you what to do next."
            why="Oryn reads your courses, activities, projects and awards to find where your profile is thinnest. Right now there isn't enough recorded for it to say anything it could stand behind — that's a gap in what Oryn knows, not a judgement about you."
            action={
              <ButtonLink href="/profile">
                Start your journey <ArrowRight className="size-4" />
              </ButtonLink>
            }
          />
        )}
        {/* Change since the previous review. Previously this only appeared when something had
            improved, so a flat month and a month with no history looked identical — and the
            only other signal of movement was the aggregate delta that used to sit above. */}
        {changeSentence ? (
          <p
            className={`mt-8 flex items-center gap-2 text-sm ${
              profileChange.improved.length > 0 ? "text-success" : "text-ink-3"
            }`}
          >
            {profileChange.improved.length > 0 ? (
              <TrendingUp className="size-4 shrink-0" aria-hidden="true" />
            ) : (
              <Minus className="size-4 shrink-0" aria-hidden="true" />
            )}
            <span>{changeSentence}</span>
          </p>
        ) : null}
      </header>

      {/* Asymmetric split: the week's work is the wide column and carries the reading
          measure; the standing read on the profile and what's due sit beside it as
          reference. Stacks on mobile with the same priority order. */}
      <div className="grid gap-16 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-20">
        <section className="min-w-0 space-y-6">
          <SectionHeader
            title="Your focus this week"
            description={
              weeklyPlan?.plan.summary ??
              (usingCounselorFallback ? "Based on your verified profile data — no AI required." : undefined)
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

        <aside className="min-w-0 space-y-14">
          <ProfileSignal signal={profileSignal} />

          {upcomingDeadlines.length > 0 ? (
            <section aria-label="Due soon">
              <Eyebrow>Due soon</Eyebrow>
              <ul className="mt-5 space-y-0">
                {upcomingDeadlines.map((deadline) => {
                  const SourceIcon = DEADLINE_SOURCE_ICONS[deadline.source];
                  return (
                    <li key={deadline.id} className="border-b border-border/60 last:border-0">
                      <Link
                        href={deadline.href}
                        className="group flex items-start justify-between gap-3 py-3 transition-colors hover:text-brand-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                      >
                        <span className="flex min-w-0 items-start gap-2.5">
                          <SourceIcon className="mt-0.5 size-3.5 shrink-0 text-ink-4" aria-hidden="true" />
                          <span className="min-w-0 text-sm leading-snug text-ink-2 group-hover:text-brand-primary">
                            {deadline.title}
                          </span>
                        </span>
                        <DeadlineBadge date={deadline.date} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>

      {avoidRecommendation ? (
        <InsightCard variant="avoid" eyebrow="One thing not to do" title={avoidRecommendation.title}>
          {avoidRecommendation.reason}
        </InsightCard>
      ) : null}

      <div className="grid gap-16 md:grid-cols-2 md:gap-20">
        <section>
          <SectionHeader
            title="University outlook"
            action={
              <Link
                href="/universities"
                className="text-sm text-brand-primary underline-offset-4 hover:underline"
              >
                Explore
              </Link>
            }
          />
          {targetUniversities.length > 0 ? (
            <ul className="mt-5">
              {targetUniversities.map((target) => (
                <li
                  key={target.id}
                  className="flex items-center justify-between gap-3 border-b border-border/60 py-3 last:border-0"
                >
                  <span className="min-w-0 truncate text-sm text-ink-2">
                    {target.university?.name ?? "Unknown university"}
                  </span>
                  <OutlookBadge outlook={target.outlook} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 max-w-md text-sm leading-relaxed text-ink-2">
              No target universities yet.{" "}
              <Link href="/universities" className="text-brand-primary underline-offset-4 hover:underline">
                Explore universities
              </Link>{" "}
              to add your first — Oryn will start showing you where you stand.
            </p>
          )}
        </section>

        <section>
          <SectionHeader
            title="Opportunities"
            action={
              <Link
                href="/opportunities"
                className="text-sm text-brand-primary underline-offset-4 hover:underline"
              >
                Browse
              </Link>
            }
          />
          {!opportunityMatchesRefreshed ? (
            <div className="mt-5">
              <ErrorState description="We couldn't refresh your matches just now. The list below is your last known result, not necessarily current." />
            </div>
          ) : null}
          {opportunityPreview.length > 0 ? (
            <ul className="mt-5">
              {opportunityPreview.map((opp) => (
                <li key={opp.title} className="border-b border-border/60 py-3 last:border-0">
                  <p className="text-sm leading-snug text-ink-2">{opp.title}</p>
                  <p className="mt-1.5 flex items-center gap-3">
                    <span className="text-xs text-ink-3 tabular-nums">{opp.matchScore}% match</span>
                    {opp.deadline ? <DeadlineBadge date={opp.deadline} /> : null}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 max-w-md text-sm leading-relaxed text-ink-2">
              Personalized matches appear here once your profile has enough signal for Oryn to rank
              them honestly.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
