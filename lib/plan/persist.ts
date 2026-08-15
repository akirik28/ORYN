import "server-only";

import { startOfWeek, formatISO } from "date-fns";
import { createClient } from "@/lib/supabase/server";
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
    await supabase.from("ai_recommendations").insert({
      user_id: userId,
      title: generation.avoidForNow.activity,
      reason: generation.avoidForNow.reason,
      recommendation_class: "avoid_for_now",
      category: "weekly_plan",
      related_dimension: null,
    });
  }

  await createNotification({
    userId,
    category: "weekly_plan",
    title: "Your weekly plan is ready",
    body: generation.summary,
    link: "/plan",
  });

  return { plan, actions: actions ?? [] };
}
