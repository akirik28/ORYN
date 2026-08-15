import Link from "next/link";
import { ArrowRight, Compass, TrendingUp, FileText, Landmark } from "lucide-react";
import { differenceInCalendarDays } from "date-fns";
import { getCurrentProfile, requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWeeklyPlan, getOrCreateWeeklyPlan } from "@/lib/plan/persist";
import { getTargetUniversitiesWithDetails } from "@/lib/universities/queries";
import { getUpcomingDeadlines, type DeadlineSource } from "@/lib/deadlines/upcoming";
import { AIProviderNotConfiguredError } from "@/lib/ai";
import { ScoreRing } from "@/features/dashboard/score-ring";
import { WeeklyFocus } from "@/features/dashboard/weekly-focus";
import { GeneratePlanButton } from "@/features/dashboard/generate-plan-button";
import { OutlookBadge } from "@/features/universities/outlook-badge";
import { DIMENSION_LABELS } from "@/lib/scoring/labels";
import type { ProfileDimension } from "@/types/database";

export const metadata = { title: "Home" };

const DEADLINE_SOURCE_ICONS: Record<DeadlineSource, typeof FileText> = {
  application: FileText,
  opportunity: Compass,
  university: Landmark,
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const session = await requireUser();
  const userId = session.userId!;
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const [scoresRes, snapshotsRes, recommendationRes, targetUniversities, upcomingDeadlines] = await Promise.all([
    supabase.from("profile_scores").select("*").eq("user_id", userId),
    supabase
      .from("profile_score_snapshots")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(2),
    supabase
      .from("ai_recommendations")
      .select("*")
      .eq("user_id", userId)
      .in("recommendation_class", ["avoid_for_now", "deprioritize"])
      .is("user_response", null)
      .order("shown_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getTargetUniversitiesWithDetails(supabase, userId, 3),
    getUpcomingDeadlines(supabase, userId, 4),
  ]);

  const scores = scoresRes.data ?? [];
  const previousSnapshot = snapshotsRes.data?.[1] ?? null;
  const trend =
    previousSnapshot && profile?.profile_strength_score != null
      ? profile.profile_strength_score - previousSnapshot.overall_score
      : null;

  const biggestGap = [...scores].sort((a, b) => a.score - b.score)[0] ?? null;

  let biggestImprovement: { dimension: ProfileDimension; delta: number } | null = null;
  if (previousSnapshot) {
    const deltas = scores
      .map((s) => ({
        dimension: s.dimension,
        delta: s.score - ((previousSnapshot.dimension_scores as Record<string, number>)[s.dimension] ?? s.score),
      }))
      .filter((d) => d.delta > 0)
      .sort((a, b) => b.delta - a.delta);
    biggestImprovement = deltas[0] ?? null;
  }

  let weeklyPlan = await getCurrentWeeklyPlan(userId);
  let planError: "not_configured" | "failed" | null = null;
  if (!weeklyPlan) {
    try {
      weeklyPlan = await getOrCreateWeeklyPlan(userId);
    } catch (error) {
      planError = error instanceof AIProviderNotConfiguredError ? "not_configured" : "failed";
      console.error("[dashboard] failed to auto-generate weekly plan", error);
    }
  }

  const displayName = profile?.display_name || profile?.first_name || "there";

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          {greeting()}, {displayName}.
        </h1>
        <p className="mt-1 text-muted-foreground">Here&apos;s what matters most right now.</p>
      </div>

      <section className="grid gap-6 rounded-2xl border bg-card p-6 md:grid-cols-[auto_1fr] md:items-center md:p-8">
        <ScoreRing score={profile?.profile_strength_score ?? null} trend={trend} />
        <div className="space-y-4">
          {biggestGap ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Biggest gap</p>
              <p className="text-lg font-semibold">
                {DIMENSION_LABELS[biggestGap.dimension]} — {biggestGap.score}/100
              </p>
              <p className="text-sm text-muted-foreground">
                This is currently your least-developed area relative to the rest of your profile.
              </p>
            </div>
          ) : (
            <div>
              <p className="text-lg font-semibold">Your Career Profile is waiting for data.</p>
              <p className="text-sm text-muted-foreground">
                Add a few activities, grades, or projects and Oryn will tell you where you stand.
              </p>
            </div>
          )}
          {biggestImprovement ? (
            <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="size-4" />
              <span>
                {DIMENSION_LABELS[biggestImprovement.dimension]} improved by {biggestImprovement.delta} this month.
              </span>
            </div>
          ) : null}
          <Link href="/profile" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            View your full profile <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Your focus this week</h2>
        {weeklyPlan && weeklyPlan.actions.length > 0 ? (
          <>
            {weeklyPlan.plan.summary ? <p className="text-sm text-muted-foreground">{weeklyPlan.plan.summary}</p> : null}
            <WeeklyFocus actions={weeklyPlan.actions} />
          </>
        ) : (
          <div className="rounded-xl border border-dashed p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {planError === "not_configured"
                ? "The AI Advisor isn't configured yet, so weekly plans can't be generated. Add ANTHROPIC_API_KEY to enable this — see API_SETUP.md."
                : planError === "failed"
                  ? "We couldn't generate this week's plan. Please try again."
                  : "Add a few things to your profile and Oryn will generate your first weekly plan."}
            </p>
            {planError !== "not_configured" ? (
              <div className="mt-4 flex justify-center">
                <GeneratePlanButton />
              </div>
            ) : null}
          </div>
        )}
      </section>

      {recommendationRes.data ? (
        <section className="rounded-xl border bg-accent/40 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">One thing not to do</p>
          <p className="mt-1 font-medium">{recommendationRes.data.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{recommendationRes.data.reason}</p>
        </section>
      ) : null}

      {upcomingDeadlines.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Due soon</h2>
          <ul className="divide-y rounded-xl border">
            {upcomingDeadlines.map((deadline) => {
              const daysUntil = differenceInCalendarDays(new Date(deadline.date), new Date());
              const SourceIcon = DEADLINE_SOURCE_ICONS[deadline.source];
              return (
                <li key={deadline.id}>
                  <Link href={deadline.href} className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-accent">
                    <span className="flex items-center gap-2">
                      <SourceIcon className="size-4 text-muted-foreground" />
                      {deadline.title}
                    </span>
                    <span className={daysUntil <= 7 ? "font-medium text-amber-700 dark:text-amber-400" : "text-muted-foreground"}>
                      {daysUntil === 0 ? "Due today" : daysUntil === 1 ? "1 day left" : `${daysUntil} days left`}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <section className="space-y-3 rounded-xl border p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">University outlook</h2>
            <Link href="/universities" className="text-sm text-primary hover:underline">
              Explore
            </Link>
          </div>
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
              <Link href="/universities" className="text-primary hover:underline">
                Explore universities
              </Link>{" "}
              to add your first.
            </p>
          )}
        </section>

        <section className="space-y-3 rounded-xl border p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Opportunities</h2>
            <Link href="/opportunities" className="text-sm text-primary hover:underline">
              Browse
            </Link>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Compass className="size-5 text-primary" />
            <span>Personalized matches appear here once your profile has enough signal.</span>
          </div>
        </section>
      </div>
    </div>
  );
}
