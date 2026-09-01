import "server-only";

import { startOfWeek, formatISO } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { generateWeeklyPlan } from "@/lib/ai/weekly-plan";
import { createNotification } from "@/lib/notifications/create";
import type { WeeklyAction, WeeklyPlan } from "@/types/database";

function currentWeekStart(): string {
  return formatISO(startOfWeek(new Date(), { weekStartsOn: 1 }), { representation: "date" });
}

export interface WeeklyPlanWithActions {
  plan: WeeklyPlan;
  actions: WeeklyAction[];
}

/** Reads this week's plan without generating one. Used by the dashboard — generation only happens through getOrCreateWeeklyPlan / an explicit "regenerate" action, never as a side effect of a page view. */
export async function getCurrentWeeklyPlan(userId: string): Promise<WeeklyPlanWithActions | null> {
  const supabase = await createClient();
  const weekStartDate = currentWeekStart();

  const { data: plan } = await supabase
    .from("weekly_plans")
    .select("*")
    .eq("user_id", userId)
    .eq("week_start_date", weekStartDate)
    .maybeSingle();

  if (!plan) return null;

  const { data: actions } = await supabase
    .from("weekly_actions")
    .select("*")
    .eq("plan_id", plan.id)
    .order("priority", { ascending: true });

  return { plan, actions: actions ?? [] };
}

/**
 * Generates (or regenerates, with force:true) this week's AI plan and persists it —
 * Phase 9. Idempotent per ISO week: calling it twice in the same week without force
 * returns the existing plan rather than burning another AI call.
 */
export async function getOrCreateWeeklyPlan(userId: string, opts?: { force?: boolean }): Promise<WeeklyPlanWithActions> {
  if (!opts?.force) {
    const existing = await getCurrentWeeklyPlan(userId);
    if (existing) return existing;
  }

  const supabase = await createClient();
  const weekStartDate = currentWeekStart();
  const generation = await generateWeeklyPlan(userId);

  const { data: plan, error: planError } = await supabase
    .from("weekly_plans")
    .upsert(
      { user_id: userId, week_start_date: weekStartDate, summary: generation.summary, status: "active" },
      { onConflict: "user_id,week_start_date" }
    )
    .select()
    .single();

  if (planError || !plan) {
    throw new Error(`Failed to save weekly plan: ${planError?.message ?? "no data"}`);
  }

  await supabase.from("weekly_actions").delete().eq("plan_id", plan.id);

  const actionRows = generation.actions.map((action, index) => ({
    plan_id: plan.id,
    user_id: userId,
    title: action.title,
    description: action.description,
    reason: action.reason,
    category: action.category,
    priority: index + 1,
    estimated_minutes: action.estimatedMinutes,
    impact_level: action.impact,
    deadline: null,
    status: "not_started" as const,
    source_type: "weekly_plan_ai",
    source_id: null,
    reflection_outcome: null,
    reflection_note: null,
    completed_at: null,
  }));

  const { data: actions, error: actionsError } = await supabase.from("weekly_actions").insert(actionRows).select();
  if (actionsError) {
    throw new Error(`Failed to save weekly actions: ${actionsError.message}`);
  }

  if (generation.avoidForNow) {
    // Migration 0065: ai_recommendations' own RLS policy no longer permits an INSERT
    // from the caller's RLS-scoped session at all (its content is the advisor's own
    // voice -- a forged row impersonates Oryn, not just the forger's own metrics). This
    // is one optional side-effect of plan generation, not its purpose, so an
    // unconfigured admin client logs and skips this write rather than failing the
    // whole weekly plan -- same discipline as lib/scoring/persist.ts.
    const admin = tryCreateAdminClient();
    if (admin) {
      // Dedup, same shape as lib/deadlines/scan.ts's notifyIfThresholdCrossed: getOrCreateWeeklyPlan
      // has exactly two callers (this action's own regenerate, and the dashboard's lazy
      // first-generate-of-the-week) and neither is a scheduled job a student could be away
      // from -- so every regeneration re-proposed the identical avoid-for-now title with no
      // check, and student-context.ts's own prompt-assembly reads the 15 most recent
      // unconditionally. Live before this: one student had the same title written 99 times,
      // crowding 14 of 15 "don't repeat this" slots the advisor's prompt is supposed to hold
      // with copies of itself. Scoped to this ISO week, matching weekly_plans' own
      // one-row-per-(user,week) shape, not a rolling window -- a genuinely new avoid-for-now
      // suggestion next week should still land.
      // .limit(1) before .maybeSingle(): without it, two rows matching (a real race between
      // two regenerate calls -- no unique constraint stops it, same shape
      // buildActionStatusPatch exists to handle for the other half of this feature) makes
      // maybeSingle() error, data comes back null, and the check below reads that as "no
      // existing row" -- inserting again, permanently, since the duplicate it just created
      // makes the next race even more likely. Bounding to one row keeps the guard working
      // even after a race has already happened, not just before the first one.
      const { data: existingRecommendation } = await supabase
        .from("ai_recommendations")
        .select("id")
        .eq("user_id", userId)
        .eq("recommendation_class", "avoid_for_now")
        .eq("title", generation.avoidForNow.activity)
        .gte("shown_at", `${weekStartDate}T00:00:00.000Z`)
        .limit(1)
        .maybeSingle();
      if (!existingRecommendation) {
        await admin.from("ai_recommendations").insert({
          user_id: userId,
          title: generation.avoidForNow.activity,
          reason: generation.avoidForNow.reason,
          recommendation_class: "avoid_for_now",
          category: "weekly_plan",
          related_dimension: null,
        });
      }
    } else {
      console.error("[plan] SUPABASE_SECRET_KEY not configured — skipping avoid-for-now recommendation write");
    }
  }

  // Same dedup shape and reasoning as the ai_recommendations check above: two non-scheduled
  // callers, no reason a student who just clicked "Regenerate" and is looking at the result
  // needs a second notification telling them so. Live before this: one student had 100
  // identical "Your weekly plan is ready" notifications, 100 of them unread. Scoped to the
  // ISO week for the same reason -- once per week's plan, not once per generation.
  // .limit(1) for the same reason as the ai_recommendations check above -- without it, two
  // rows matching turns maybeSingle() into a silent, self-perpetuating false negative.
  const { data: existingNotification } = await supabase
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("category", "weekly_plan")
    .gte("created_at", `${weekStartDate}T00:00:00.000Z`)
    .limit(1)
    .maybeSingle();
  if (!existingNotification) {
    await createNotification({
      userId,
      category: "weekly_plan",
      title: "Your weekly plan is ready",
      body: generation.summary,
      link: "/plan",
    });
  }

  return { plan, actions: actions ?? [] };
}
