import Link from "next/link";
import type { CSSProperties } from "react";
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

// glass-card chrome shared by every panel below the hero — literal source values
// (App.tsx `HomeScreen`, 2026-08-30 export): translucent white over the page's ambient
// tint, 22px blur, 20px radius. Kept as inline style rather than a Tailwind class because
// the blur/opacity pair doesn't have a clean utility equivalent at these exact values.
const glassCard: CSSProperties = {
  background: "rgba(255,255,255,0.42)",
  backdropFilter: "blur(22px)",
  WebkitBackdropFilter: "blur(22px)",
  borderRadius: 20,
  border: "1px solid rgba(255,255,255,0.65)",
};

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
    <div>
      {/* Dark hero (Figma source App.tsx `HomeScreen`) — scoped `.dark` so NextMove's
          ink-token text resolves light-on-dark automatically, same mechanism as the
          landing page. The real three-state hero copy/logic is untouched; only its
          container is new. Contained within the page's own measure (rounded card) rather
          than the source's full viewport bleed — the shared (app) layout's content column
          already has its own horizontal padding, and breaking out of it here would need to
          change that column for every other page too. */}
      <div
        className="relative overflow-hidden rounded-[28px] px-6 py-11 md:px-10 md:py-14"
        style={{ background: "linear-gradient(145deg, #111030 0%, #1A1650 50%, #0E1540 100%)" }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 right-20 size-[300px] rounded-full"
          style={{ background: "rgba(61,53,232,0.12)" }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -right-10 size-[200px] rounded-full"
          style={{ background: "rgba(107,100,240,0.08)" }}
        />
        {/* text-foreground here, not just `dark`: NextMove's headline has no color class of
            its own (it inherits), so without re-establishing the base color at this scope
            it kept the light-mode ink color cascaded down from body — dark ink on a dark
            purple card, nearly unreadable. Same fix as the landing page's dark wrapper. */}
        <div className="dark relative mx-auto max-w-[860px] text-foreground">
          <p className="text-sm text-white/60">
            {greeting}, {displayName}.
          </p>
          <div
            className="mt-6 rounded-[20px] p-7 md:p-8"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", backdropFilter: "blur(12px)" }}
          >
            {heroState.kind === "claimable" ? (
              <NextMove
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
            {changeSentence ? (
              <p
                className={`mt-6 flex items-center gap-2 border-t border-white/10 pt-5 text-sm ${
                  profileChange.improved.length > 0 ? "text-[#A0F0C0]" : "text-white/50"
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
          </div>
        </div>
      </div>

      {/* Light content — glass-card panels over the shared shell's AmbientBlobs
          ((app)/layout.tsx now renders these once for every page, not per-page). */}
      <div className="relative z-[1] -mx-4 px-4 pt-10 pb-4 md:-mx-8 md:px-8">
        <div className="mx-auto max-w-[860px] space-y-10">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-8">
            <section style={glassCard} className="glass-card min-w-0 p-6 md:p-7">
              <SectionHeader
                title="Your focus this week"
                description={
                  weeklyPlan?.plan.summary ??
                  (usingCounselorFallback ? "Based on your verified profile data — no AI required." : undefined)
                }
              />
              <div className="mt-6">
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
              </div>
            </section>

            <aside className="min-w-0 space-y-8">
              <section style={glassCard} className="glass-card-offset p-6">
                {/* showScores=true: the source's Home shows numeric bars, and this component
                    already supports a quiet numeric footnote beside the qualitative read for
                    exactly this case (see features/dashboard/profile-signal.tsx) — the word
                    stays primary, the score is real data, not fabricated to match source. */}
                <ProfileSignal signal={profileSignal} showScores heading="Profile dimensions" />
              </section>

              {upcomingDeadlines.length > 0 ? (
                <section style={glassCard} className="glass-card-fast p-6" aria-label="Due soon">
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

          <div className="grid gap-10 md:grid-cols-2 md:gap-8">
            <section style={glassCard} className="glass-card-offset2 p-6">
              <SectionHeader
                title="University outlook"
                action={
                  <Link href="/universities" className="text-sm text-brand-primary underline-offset-4 hover:underline">
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

            <section style={glassCard} className="glass-card p-6">
              <SectionHeader
                title="Opportunities"
                action={
                  <Link href="/opportunities" className="text-sm text-brand-primary underline-offset-4 hover:underline">
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
                  Personalized matches appear here once your profile has enough signal for Oryn to rank them
                  honestly.
                </p>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
