import "server-only";

import { startOfWeek, formatISO } from "date-fns";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { generateWeeklyPlan } from "@/lib/ai/weekly-plan";
import { createNotification } from "@/lib/notifications/create";
import { toLocale } from "@/lib/i18n/config";
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

  // No request here (the manual Regenerate action has one, but the dashboard's lazy
  // first-generate and any future scheduled Job D don't), so the locale comes from the
  // student's own stored preference, same source student-context.ts already reads for the
  // AI output language -- not lib/i18n/locale.ts's resolveLocale(), which needs a cookie.
  const { data: profileForLocale } = await supabase.from("profiles").select("preferred_language").eq("id", userId).maybeSingle();
  const locale = toLocale(profileForLocale?.preferred_language);
  const t = await getTranslations({ locale, namespace: "notifications" });

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

  // CEO decision, docs/founder-blocked-backlog.md item 39 (2026-09-02, under the founder's
  // overnight product-authority grant): a completed action is a fact about what the student
  // did, not a plan item -- regenerating is not a reason to unremember it. This used to be
  // an unconditional delete, which erased every reflection written this week along with it
  // (lib/ai/student-context.ts reads reflection_outcome/reflection_note into the advisor's
  // prompt -- the deletion didn't just lose history, it made the advisor forget). Only rows
  // the student never acted on are cleared now. `.in(...)` on the delete below is
  // deliberately the full ActionStatus list minus {not_started, in_progress} rather than
  // just "completed" -- skipped/expired carry a reflection the same way completed does (no
  // code path produces them today, but the rule should already be correct the day one does,
  // not need a second edit). THE DELETE ITSELF IS WHAT PRESERVES COMPLETED WORK, and it
  // needs no column beyond `status`, which has always existed.
  //
  // SEV, 2026-09-02, same day this shipped: `carried_forward` (migration 0077) is written
  // but NOT applied live -- this project's standing discipline is "write migrations, leave
  // them unapplied," which makes "unapplied" the NORMAL state for a migration here, not a
  // temporary gap to code around once. The UPDATE below used to run unconditionally before
  // the delete, and Postgres validates a statement's SET clause before it ever looks at
  // WHERE -- so it threw on every call, matched rows or not, the moment `carried_forward`
  // didn't exist. Only 1 of 8 live plans was for the current week, so almost every student
  // fell through getCurrentWeeklyPlan -> null -> generation -> this throw: weekly plan
  // generation, one of the MVP's sixteen required capabilities, was functionally down for
  // most of the cohort, and the net effect was worse than the bug this package fixed (before,
  // generation worked and just didn't preserve completed rows on regenerate; after, it didn't
  // run at all for most students). CEO caught it, verified independently via
  // information_schema.columns and EXPLAIN before reporting it.
  //
  // THE PRINCIPLE FOR THE NEXT PERSON WHO HITS THIS: code paired with an unapplied migration
  // must degrade, because unapplied is the normal state in this codebase, not a temporary
  // one -- an UPDATE (or any statement naming a not-yet-live column in a way PostgREST must
  // validate before running) needs its own defensive handling; `select("*")` already handles
  // this for reads (see lib/opportunities/persist-matches.ts / lib/ai/student-context.ts's
  // own comments on the identical shape) because a wildcard only ever returns columns that
  // actually exist, but there is no equivalent trick for a write -- a write has to name what
  // it's setting. No live way to check column existence ahead of time either:
  // information_schema isn't exposed over the PostgREST API this client uses, so a real
  // presence check would need its own RPC function, new infrastructure this fix doesn't
  // need. Attempting the write and checking the specific error code is what's actually
  // available: 42703 is Postgres's own SQLSTATE for undefined_column, not a string match on
  // a message that could drift, and CEO's own EXPLAIN confirmed the WHERE-independent
  // failure mode means this is always caught before any row could be touched -- there is no
  // partial write to reason about.
  const { error: preserveError } = await supabase
    .from("weekly_actions")
    .update({ carried_forward: true })
    .eq("plan_id", plan.id)
    .in("status", ["completed", "skipped", "expired"]);
  const carriedForwardColumnMissing = preserveError?.code === "42703" && preserveError.message?.includes("carried_forward");
  if (preserveError && !carriedForwardColumnMissing) {
    throw new Error(`Failed to preserve this week's completed actions: ${preserveError.message}`);
  }
  if (carriedForwardColumnMissing) {
    // Not an error -- an expected, degraded-but-working state. Completed actions and their
    // reflections are still fully preserved by the delete below; they just aren't flagged
    // carried_forward yet, so features/dashboard/weekly-focus.tsx's `!action.carried_forward`
    // filter reads every row (including genuinely carried-forward ones) as active/fresh --
    // a deliberate choice, not an oversight: it means a completed action stays visible and
    // interactive in the normal list rather than disappearing into a "Completed this week"
    // section that can't exist yet, which is strictly better than the alternative (hiding it
    // entirely) and needs no special-case code in that component, since `undefined` is
    // already falsy. Once 0077 is applied, this branch stops firing and every row starts
    // reporting its real carried_forward value with no code change required on either side.
    console.warn("[plan] carried_forward column not yet live (migration 0077 unapplied) — completed actions still preserved, just not distinguishable from a fresh batch until it lands", { planId: plan.id });
  }

  await supabase.from("weekly_actions").delete().eq("plan_id", plan.id).in("status", ["not_started", "in_progress"]);

  // priority is intentionally NOT renumbered around whatever a carried-forward action already
  // holds. A fresh batch's 1..N is this week's current ranking; a carried-forward action's
  // number is a snapshot of a ranking from a previous batch that's no longer being re-ranked
  // against anything -- the two are never meant to be compared, so a reader has to check
  // carried_forward (or status) either way, and renumbering to dodge a same-looking value
  // would cost the historical number for no real gain. features/dashboard/weekly-focus.tsx
  // renders the two groups as separate lists rather than one list sorted by priority.
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
  // identical "weekly plan is ready" notifications, 100 of them unread. Scoped to the
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
      // generation.summary (the body) is already in the student's language -- weekly-plan.ts's
      // withOutputLanguage makes the AI write it that way. Only the title was ever hardcoded
      // English; translated here from the same preferred_language this function just read.
      title: t("weeklyPlanReady"),
      body: generation.summary,
      link: "/plan",
    });
  }

  return { plan, actions: actions ?? [] };
}
