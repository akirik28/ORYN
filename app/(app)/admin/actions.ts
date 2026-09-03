"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/security/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { discoverOpportunitiesForQuery, DEFAULT_DISCOVERY_QUERIES } from "@/lib/opportunities/discover";
import { syncUsUniversities, DEFAULT_US_UNIVERSITIES } from "@/lib/universities/sync-us-universities";
import { scanDeadlines } from "@/lib/deadlines/scan";
import { discoverRequirementsForUncoveredUniversities } from "@/lib/requirements/discover";
import { runWithTracking } from "@/lib/jobs/run-with-tracking";
import { isJobDisabled, setJobDisabled } from "@/lib/jobs/job-controls";
import { isUuidLike } from "@/lib/validation/uuid";
import { buildPostRemovalUpdate, buildPostRestoreUpdate, ModerationInputError } from "@/lib/social/posts-moderation";
import { ADMIN_FINANCE_SETTINGS_ID, getAdminOpportunityList, type AdminOpportunityRow, KNOWN_PRODUCT_EVENT_NAMES } from "@/lib/admin/queries";
import { isValidExchangeRate, isValidPrice } from "@/lib/admin/finance";
import { isUndefinedTableError } from "@/lib/supabase/errors";
import { WEEKLY_PLAN_BUDGET_SETTINGS_ID } from "@/lib/ai/limits/weekly-plan-budget";
import { resolvePlanTier } from "@/lib/tier/plan-tier";
import { logAdminAction } from "@/lib/admin/log";
import { tavilyProvider } from "@/lib/providers/tavily";
import { collegeScorecardProvider } from "@/lib/providers/college-scorecard";
import { openAlexProvider } from "@/lib/providers/openalex";
import { getAIProvider, isAIConfigured, AIProviderNotConfiguredError } from "@/lib/ai";
import { getOrCreateWeeklyPlan } from "@/lib/plan/persist";
import { RateLimitExceededError } from "@/lib/ai/rate-limit";
import { aiServiceFailureMessage } from "@/lib/ai/service-failure";
import { JOB_BUDGET_USD, type JobBudgetFeature } from "@/lib/ai/limits/job-budget";
import { getMonthlyGrantsUsd } from "@/lib/ai/limits/grants";
import { CONTAMINATION_CLEANUP_2026_09_02 } from "@/lib/opportunities/contamination-cleanup-2026-09-02";
import type { MessageReportStatus, PlanTier } from "@/types/database";

function currentUtcMonthStartIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

/**
 * Manual "run now" triggers for the admin panel — call the same underlying job logic the
 * scheduled HTTP routes use, directly (no HTTP round-trip, no need to hand the
 * server-only CRON_SECRET to client code). Every export here re-checks requireAdmin()
 * itself; never assume the page-level check is enough for a Server Action.
 */

export interface JobRunResult {
  error?: string;
  itemsProcessed?: number;
  errorsEncountered?: number;
  durationMs?: number;
}

/**
 * `runWithTracking` writes items_processed/errors_encountered/finished_at to the fresh
 * external_sync_jobs row and returns only the caller's own `result` — the stats themselves
 * are computed and discarded internally. Re-reading the row it just wrote is simpler and
 * lower-risk than changing runWithTracking's return shape, which every one of the four
 * /api/jobs/* cron routes also depends on and would need updating in lockstep for no
 * benefit those routes actually need (they return the result to a cron log, not a toast).
 */
async function readLatestRunStats(jobName: string): Promise<JobRunResult> {
  const admin = createAdminClient();
  const { data } = await admin.from("external_sync_jobs").select("*").eq("job_name", jobName).order("started_at", { ascending: false }).limit(1).maybeSingle();
  if (!data) return {};
  return {
    itemsProcessed: data.items_processed,
    errorsEncountered: data.errors_encountered,
    durationMs: data.finished_at ? new Date(data.finished_at).getTime() - new Date(data.started_at).getTime() : undefined,
  };
}

export async function triggerOpportunityDiscovery(): Promise<JobRunResult> {
  await requireAdmin();
  if (await isJobDisabled(createAdminClient(), "discover_opportunities")) {
    return { error: "This job's future runs are currently disabled — re-enable it first." };
  }
  try {
    await runWithTracking("discover_opportunities", async () => {
      const runs = [];
      for (const query of DEFAULT_DISCOVERY_QUERIES) runs.push(await discoverOpportunitiesForQuery(query));
      return {
        itemsProcessed: runs.reduce((sum, r) => sum + r.opportunitiesStored, 0),
        errorsEncountered: runs.reduce((sum, r) => sum + r.errors.length, 0),
        result: runs,
      };
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Job failed." };
  }
  revalidatePath("/admin");
  return await readLatestRunStats("discover_opportunities");
}

export async function triggerUniversitySync(): Promise<JobRunResult> {
  await requireAdmin();
  if (await isJobDisabled(createAdminClient(), "sync_us_universities")) {
    return { error: "This job's future runs are currently disabled — re-enable it first." };
  }
  try {
    await runWithTracking("sync_us_universities", async () => {
      const runs = await syncUsUniversities(DEFAULT_US_UNIVERSITIES);
      return {
        itemsProcessed: runs.filter((r) => r.status === "created" || r.status === "updated").length,
        errorsEncountered: runs.filter((r) => r.status === "error").length,
        result: runs,
      };
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Job failed." };
  }
  revalidatePath("/admin");
  return await readLatestRunStats("sync_us_universities");
}

export async function triggerDeadlineScan(): Promise<JobRunResult> {
  await requireAdmin();
  if (await isJobDisabled(createAdminClient(), "deadline_reminders")) {
    return { error: "This job's future runs are currently disabled — re-enable it first." };
  }
  try {
    await runWithTracking("deadline_reminders", async () => {
      const { notified, checked } = await scanDeadlines();
      return { itemsProcessed: notified, errorsEncountered: 0, result: { notified, checked } };
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Job failed." };
  }
  revalidatePath("/admin");
  return await readLatestRunStats("deadline_reminders");
}

export async function triggerRequirementDiscovery(): Promise<JobRunResult> {
  await requireAdmin();
  if (await isJobDisabled(createAdminClient(), "discover_requirements")) {
    return { error: "This job's future runs are currently disabled — re-enable it first." };
  }
  try {
    await runWithTracking("discover_requirements", async () => {
      const runs = await discoverRequirementsForUncoveredUniversities();
      return {
        itemsProcessed: runs.reduce((sum, r) => sum + r.requirementsStored, 0),
        errorsEncountered: runs.reduce((sum, r) => sum + r.errors.length, 0),
        result: runs,
      };
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Job failed." };
  }
  revalidatePath("/admin");
  return await readLatestRunStats("discover_requirements");
}

/**
 * `job_controls` (migration 0095) toggle. Deliberately does not attempt to stop a run
 * already in progress — no API exists to terminate an in-flight Vercel invocation from
 * application code, and pretending otherwise (marking the current run "failed" while the
 * real process keeps executing regardless) would misrepresent what actually happened. This
 * only ever gates the *next* attempt, cron or manual — see lib/jobs/job-controls.ts and
 * migration 0095's own comments.
 */
export async function toggleJobDisabled(jobName: string, disabled: boolean): Promise<{ error?: string }> {
  const admin_profile = await requireAdmin();
  const admin = createAdminClient();
  const result = await setJobDisabled(admin, jobName, disabled, admin_profile.id);
  if (result.error) return result;

  // migration 0097's admin_action_log — joining lib/admin/log.ts's shared write path
  // rather than a bespoke one, per that migration's own comment naming job actions as a
  // roadmap item this integrates with. No targetUserId: this action targets a job, not a
  // profile; the job name lives in targetLabel/detail instead.
  await logAdminAction(admin, {
    adminProfile: admin_profile,
    action: disabled ? "disable_job" : "enable_job",
    targetLabel: jobName,
    detail: { jobName },
  });

  revalidatePath("/admin");
  return {};
}

export interface ProviderRecheckResult {
  error?: string;
  notConfigured?: boolean;
}

/**
 * Triggers one small, real call to the named provider right now, through the same code
 * path (lib/providers/fetch-json.ts, or lib/ai/anthropic-provider.ts for Anthropic) that
 * already records provider_health on every real call the app makes organically — this
 * doesn't write provider_health itself, it just gives an admin a way to make one happen on
 * demand instead of waiting for real traffic. A provider with no API key configured is
 * reported as `notConfigured`, not attempted and not recorded as a failure — Tavily/College
 * Scorecard/Anthropic's own `isConfigured()`/`isAIConfigured()` checks already short-circuit
 * before ever reaching provider_health for exactly this reason (see lib/providers/tavily.ts,
 * lib/providers/college-scorecard.ts, lib/ai/anthropic-provider.ts's own comments): a
 * missing key is a deployment fact, not a live health signal, and recording it as a failure
 * would make the panel read "degraded" when the honest statement is "never configured".
 */
export async function recheckProvider(provider: string): Promise<ProviderRecheckResult> {
  await requireAdmin();

  try {
    switch (provider) {
      case "anthropic": {
        if (!isAIConfigured()) return { notConfigured: true };
        await getAIProvider().generateText({ prompt: "Reply with the single word OK.", maxTokens: 8 });
        break;
      }
      case "tavily": {
        if (!tavilyProvider.isConfigured()) return { notConfigured: true };
        const result = await tavilyProvider.search("test", { maxResults: 1 });
        if (!result.success) return { error: result.error.message };
        break;
      }
      case "college_scorecard": {
        if (!collegeScorecardProvider.isConfigured()) return { notConfigured: true };
        const result = await collegeScorecardProvider.searchByName("test", 1);
        if (!result.success) return { error: result.error.message };
        break;
      }
      case "openalex": {
        // No API key — OpenAlex is a free, keyless public API, so there is no
        // "not configured" state for it the way the other three have.
        const result = await openAlexProvider.searchWorks("test", 1);
        if (!result.success) return { error: result.error.message };
        break;
      }
      default:
        return { error: "Unknown provider." };
    }
  } catch (error) {
    // Anthropic's generateText throws rather than returning a ProviderResult — the two
    // failure shapes (AIResponseIncompleteError with usage attached, or a plain transport
    // error) are both already recorded to provider_health inside anthropic-provider.ts
    // itself before this catches them; this only needs to turn the throw into a message.
    return { error: error instanceof Error ? error.message : "Check failed." };
  }

  revalidatePath("/admin");
  return {};
}

/**
 * Minimum viable moderation (migration 0030): move a message_reports row through the
 * review state, and/or record a resolution note. Touching either field marks the report
 * reviewed by the acting admin, now — this is the audit trail, not a separate table.
 * Goes through the admin client because no RLS policy grants a normal client write access
 * to message_reports at all (reporter is insert-only) — same trust boundary as every
 * other admin-only write on this page.
 */
export async function updateReportReview(
  reportId: string,
  input: { status?: MessageReportStatus; resolutionNote?: string }
): Promise<{ error?: string }> {
  const admin_profile = await requireAdmin();
  if (!isUuidLike(reportId)) return { error: "Invalid report." };
  if (input.status === undefined && input.resolutionNote === undefined) return {};

  const admin = createAdminClient();
  const { error } = await admin
    .from("message_reports")
    .update({
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.resolutionNote !== undefined ? { resolution_note: input.resolutionNote.trim().slice(0, 2000) } : {}),
      reviewed_by: admin_profile.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  if (error) {
    console.error("[admin] failed to update report review", { code: error.code, message: error.message });
    return { error: "Couldn't save that. Please try again." };
  }

  revalidatePath("/admin");
  return {};
}

/**
 * Content removal for a reported post (migration 0058's social layer).
 *
 * This is the half the report flow has never had. Migration 0030 gave `message_reports`
 * review states so a report could be triaged; nothing could actually take content down,
 * so "resolved" meant "an admin read it". For a product whose users are 14-18 that is not
 * a moderation path, and shipping the social layer without it would repeat exactly the
 * failure that migration's own header describes.
 *
 * Admin-only, and admin-only in the sense that matters: `requireAdmin()` 404s rather than
 * redirects, so a student poking at URLs learns nothing. This action is reachable only
 * from /admin — the social layer itself remains switched off and unreachable, which is why
 * these two functions live here rather than in lib/social/post-actions.ts.
 *
 * MUST go through the admin (service-role) client. `posts_guard_system_columns` restores
 * `removed_at`/`removed_by`/`removal_reason` on any UPDATE that is neither nested inside
 * another trigger nor from `service_role` — the same guard that stops an author clearing
 * their own removal through PostgREST.
 *
 * A removed post stays readable by its own author (the author branch of the read policy
 * is the only one not gated on `removed_at is null`), so removal is never silent. Every
 * other viewer, including anyone who reposted it, gets the neutral unavailable
 * placeholder.
 */
export async function removeReportedPost(postId: string, reason: string): Promise<{ error?: string }> {
  const adminProfile = await requireAdmin();
  if (!isUuidLike(postId)) return { error: "Invalid post." };

  let update;
  try {
    update = buildPostRemovalUpdate({ moderatorId: adminProfile.id, reason });
  } catch (error) {
    if (error instanceof ModerationInputError) return { error: error.message };
    throw error;
  }

  const admin = createAdminClient();
  const { error } = await admin.from("posts").update(update).eq("id", postId);
  if (error) {
    console.error("[admin] failed to remove reported post", { code: error.code, message: error.message });
    return { error: "Couldn't remove that post. Please try again." };
  }

  revalidatePath("/admin");
  return {};
}

/** Undoes a removal. Clears all three moderation columns together — migration 0058's
 * `posts_removal_shape` check enforces that they are set or null as a group. */
export async function restoreReportedPost(postId: string): Promise<{ error?: string }> {
  await requireAdmin();
  if (!isUuidLike(postId)) return { error: "Invalid post." };

  const admin = createAdminClient();
  const { error } = await admin.from("posts").update(buildPostRestoreUpdate()).eq("id", postId);
  if (error) {
    console.error("[admin] failed to restore post", { code: error.code, message: error.message });
    return { error: "Couldn't restore that post. Please try again." };
  }

  revalidatePath("/admin");
  return {};
}

/**
 * The finance dashboard's editable settings (migration 0094, CEO's course correction —
 * "the founder can set it here", not an env var needing a deploy). Either field is optional
 * so the settings form can save just the rate, just the price, or both in one submit;
 * `undefined` means "leave this one alone", genuinely distinct from "clear it to null" (the
 * rate has no clear-to-null affordance in the UI this pairs with — there's no legitimate
 * reason to un-set a once-known rate back to "unconfigured").
 *
 * `.upsert()`, not `.update()` — the row may not exist yet (first-ever save) or the whole
 * table may not exist yet (migration unapplied), and this project's standing discipline is
 * that a write naming an unmigrated target degrades rather than throwing an unhandled
 * exception up through the Server Action boundary.
 */
export async function updateFinanceSettings(input: { usdTryRate?: number; ultraPriceTry?: number }): Promise<{ error?: string }> {
  const adminProfile = await requireAdmin();
  if (input.usdTryRate === undefined && input.ultraPriceTry === undefined) return {};
  if (input.usdTryRate !== undefined && !isValidExchangeRate(input.usdTryRate)) return { error: "Enter a positive exchange rate." };
  if (input.ultraPriceTry !== undefined && !isValidPrice(input.ultraPriceTry)) return { error: "Enter a positive price." };

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin.from("admin_finance_settings").upsert({
    id: ADMIN_FINANCE_SETTINGS_ID,
    ...(input.usdTryRate !== undefined ? { usd_try_rate: input.usdTryRate, usd_try_rate_updated_at: now } : {}),
    ...(input.ultraPriceTry !== undefined ? { ultra_price_try: input.ultraPriceTry, ultra_price_try_updated_at: now } : {}),
    updated_by: adminProfile.id,
    updated_at: now,
  });

  if (error) {
    if (isUndefinedTableError(error, "admin_finance_settings")) {
      return { error: "Finance settings aren't set up in the database yet — migration 0094 needs to be applied first." };
    }
    console.error("[admin] failed to update finance settings", { code: error.code, message: error.message });
    return { error: "Couldn't save that. Please try again." };
  }

  revalidatePath("/admin");
  return {};
}

// ---------------------------------------------------------------------------------------------
// Growth tab actions (docs/admin-growth-panel-2026-09-02.md)
// ---------------------------------------------------------------------------------------------

/**
 * Regenerates one student's current-week plan on an admin's behalf — the support-path
 * version of the student's own `regenerateWeeklyPlan` (app/(app)/plan/actions.ts), for a
 * student who can't reach or use their own button. Same `force: true` call the student's
 * button makes — lib/plan/generate-for-active-students.ts's own comment confirms that flag
 * is meant to stay reserved for a deliberate, manual trigger like this one, never an
 * automated path. **Real consequence, not just a retry**: force:true replaces the student's
 * current-week plan and its actions, including any already marked completed — the section
 * this ships in must warn about that before the button is clickable, not just here.
 *
 * MUST thread the admin client through explicitly. getOrCreateWeeklyPlan's own doc comment
 * documents a confirmed-live bug: called with the default session-scoped client from a
 * context with no student session (exactly what an admin action is), the AI call still
 * fires and gets billed, then the save fails RLS silently — real money, nothing persisted,
 * every time. `admin` below is what avoids that, not an optional hardening.
 */
export async function regenerateStudentWeeklyPlan(userId: string): Promise<{ error?: string }> {
  await requireAdmin();
  if (!isUuidLike(userId)) return { error: "Invalid student." };

  const admin = createAdminClient();
  try {
    await getOrCreateWeeklyPlan(userId, { force: true, supabaseClient: admin });
  } catch (error) {
    if (error instanceof RateLimitExceededError) return { error: error.message };
    if (error instanceof AIProviderNotConfiguredError) {
      return { error: "The AI Advisor isn't configured yet, so weekly plans can't be generated. See API_SETUP.md." };
    }
    console.error("[admin] failed to regenerate student weekly plan", { userId, error });
    const serviceMessage = aiServiceFailureMessage(error, "The plan generator");
    if (serviceMessage) return { error: serviceMessage };
    return { error: "Something went wrong generating that plan. Please try again." };
  }

  revalidatePath("/admin");
  return {};
}

/**
 * The honest, smaller action in place of a literal "re-run onboarding" (which doesn't
 * exist — no server path can re-submit a student's own answers for them,
 * docs/admin-growth-panel-2026-09-02.md's own finding). This only clears the completed
 * flag so the *student* can walk the wizard again themselves; it does not touch any field
 * onboarding previously wrote (country, interests, CV-imported items, etc.) — a student
 * redoing onboarding sees the wizard, not a blank profile.
 */
export async function resetStudentOnboarding(userId: string): Promise<{ error?: string }> {
  await requireAdmin();
  if (!isUuidLike(userId)) return { error: "Invalid student." };

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ onboarding_completed: false }).eq("id", userId);
  if (error) {
    console.error("[admin] failed to reset onboarding", { userId, code: error.code, message: error.message });
    return { error: "Couldn't reset that. Please try again." };
  }

  revalidatePath("/admin");
  return {};
}

/**
 * Record + display only (docs/admin-panel-architecture-2026-09-02.md D8) — marking a
 * feature here changes nothing about whether its code path runs; it's a dated, attributed
 * decision a human reads before building on top of that feature again. `featureKey` is
 * restricted to KNOWN_PRODUCT_EVENT_NAMES (lib/admin/queries.ts) rather than accepting
 * arbitrary text from the client, since this table has no other validation on that column.
 */
export async function markFeatureDead(featureKey: string, note?: string): Promise<{ error?: string }> {
  const adminProfile = await requireAdmin();
  const knownNames: readonly string[] = KNOWN_PRODUCT_EVENT_NAMES;
  if (!knownNames.includes(featureKey)) return { error: "Unknown feature." };

  const admin = createAdminClient();
  const { error } = await admin.from("admin_dead_feature_flags").upsert({
    feature_key: featureKey,
    marked_by: adminProfile.id,
    marked_at: new Date().toISOString(),
    note: note?.trim().slice(0, 500) || null,
  });
  if (error) {
    console.error("[admin] failed to mark feature dead", { featureKey, code: error.code, message: error.message });
    return { error: "Couldn't save that. Please try again." };
  }

  revalidatePath("/admin");
  return {};
}

const JOB_BUDGET_FEATURES: readonly JobBudgetFeature[] = Object.keys(JOB_BUDGET_USD) as JobBudgetFeature[];

/**
 * Live-adjust one catalog job's monthly budget (migration 0099, job_budget_overrides) —
 * lib/ai/limits/job-budget.ts's checkJobBudget reads this table before falling back to
 * JOB_BUDGET_USD's own env/hardcoded default, so this takes effect on the very next call,
 * not after a deploy. `budgetUsd >= 0` only — zero is a real, deliberate value (an admin can
 * pause a job entirely this way, see checkJobBudget's own boundary test), negative isn't.
 */
export async function setJobBudgetOverride(feature: JobBudgetFeature, budgetUsd: number): Promise<{ error?: string }> {
  const adminProfile = await requireAdmin();
  if (!JOB_BUDGET_FEATURES.includes(feature)) return { error: "Unknown job." };
  if (!Number.isFinite(budgetUsd) || budgetUsd < 0) return { error: "Budget must be a number of at least $0." };

  const admin = createAdminClient();
  const { error } = await admin.from("job_budget_overrides").upsert({ feature, budget_usd: budgetUsd, updated_by: adminProfile.id });
  if (error) {
    console.error("[admin] failed to set job budget override", { code: error.code, message: error.message });
    return { error: "Couldn't save that. Please try again." };
  }

  revalidatePath("/admin");
  return {};
}

/**
 * The one write path for `weekly_plan_budget_settings` (migration 0102) — the aggregate
 * spend ceiling that must exist and be visible before generate-weekly-plans can be armed
 * (see lib/ai/limits/weekly-plan-budget.ts's own header). Mirrors updateFinanceSettings'
 * shape exactly: validate, upsert the one known row, degrade on a missing table rather than
 * throw, log the change.
 */
export async function updateWeeklyPlanBudgetCeiling(ceilingUsd: number): Promise<{ error?: string }> {
  const adminProfile = await requireAdmin();
  if (!Number.isFinite(ceilingUsd) || ceilingUsd <= 0) return { error: "Enter a positive monthly ceiling." };

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin.from("weekly_plan_budget_settings").upsert({
    id: WEEKLY_PLAN_BUDGET_SETTINGS_ID,
    monthly_ceiling_usd: ceilingUsd,
    updated_by: adminProfile.id,
    updated_at: now,
  });

  if (error) {
    if (isUndefinedTableError(error, "weekly_plan_budget_settings")) {
      return { error: "The weekly-plan budget setting isn't set up in the database yet — migration 0102 needs to be applied first." };
    }
    console.error("[admin] failed to update weekly-plan budget ceiling", { code: error.code, message: error.message });
    return { error: "Couldn't save that. Please try again." };
  }

  await logAdminAction(admin, {
    adminProfile,
    action: "set_weekly_plan_budget_ceiling",
    detail: { ceilingUsd },
  });

  revalidatePath("/admin");
  return {};
}

export interface SetUserPlanTierResult {
  error?: string;
  /** true once a write actually happened; false when the target was already on the
   * requested tier (a real outcome, not an error — the UI renders it as "already Ultra",
   * not a failure). Absent (undefined) only alongside `error`. */
  changed?: boolean;
  fromTier?: PlanTier;
}

/**
 * The founder's own example of what this whole package exists to fix: they asked oryn-a7 to
 * run raw SQL twice to set their own plan_tier to 'ultra', and once it silently affected
 * zero rows with neither of them knowing why. The fix isn't "run the same UPDATE from a
 * button" — it's making a no-op impossible to mistake for a success.
 *
 * Three distinguishable outcomes, not two: an error (the write failed), a genuine no-op
 * (`changed: false` — the user was already on that tier, nothing to do, not a failure), and
 * a confirmed change (`changed: true`). The no-op/change distinction is only knowable
 * because this reads the row first rather than firing the UPDATE blind — the same blindness
 * that let the founder's SQL affect zero rows without either of them noticing.
 *
 * `.update(...).select("id")` (not a bare `.update(...)`, which returns no data at all) is
 * what makes an actually-zero-rows-affected UPDATE detectable here even in the case this
 * function's own pre-read doesn't anticipate (a row deleted between the read and the write,
 * a race this codebase has no transaction wrapping either side against) — `updated` coming
 * back empty is reported as a real error, not swallowed as if `error === null` were the
 * whole story, which is exactly the gap the founder's raw SQL fell into.
 */
export async function setUserPlanTier(userId: string, tier: PlanTier): Promise<SetUserPlanTierResult> {
  const adminProfile = await requireAdmin();
  if (!isUuidLike(userId)) return { error: "Invalid user." };
  if (tier !== "standard" && tier !== "ultra") return { error: "Invalid tier." };

  const admin = createAdminClient();
  const { data: before, error: readError } = await admin.from("profiles").select("plan_tier, display_name").eq("id", userId).maybeSingle();
  if (readError || !before) {
    console.error("[admin] failed to read profile before setting plan tier", { userId, error: readError });
    return { error: "Couldn't find that user." };
  }

  const fromTier = resolvePlanTier(before);
  if (fromTier === tier) {
    return { changed: false, fromTier };
  }

  const { data: updated, error } = await admin.from("profiles").update({ plan_tier: tier }).eq("id", userId).select("id");
  if (error) {
    console.error("[admin] failed to set plan tier", { userId, tier, error });
    return { error: "Couldn't save that. Please try again." };
  }
  if (!updated || updated.length === 0) {
    console.error("[admin] plan tier update matched zero rows", { userId, tier });
    return { error: "That saved nothing — 0 rows were updated. The account may have just been deleted." };
  }

  await logAdminAction(admin, {
    adminProfile,
    action: "set_plan_tier",
    targetUserId: userId,
    targetLabel: before.display_name,
    detail: { from: fromTier, to: tier },
  });

  revalidatePath("/admin");
  return { changed: true, fromTier };
}

export interface SetOpportunityDisabledResult {
  error?: string;
  changed?: boolean;
}

/**
 * oryn-a7's own named example, personally hit tonight: their own attempt to disable a bad
 * opportunity record was blocked by the RLS permission layer (migration 0014 gives
 * `opportunities` a select-only policy for authenticated users -- no write policy for any
 * normal role, by design, same as every other global reference table), and the founder had
 * to run raw SQL again. No new migration -- `status` already has `"disabled"` as a real
 * value (types/database.ts) and every student-facing read already filters
 * `.eq("status", "active")` (lib/opportunities/browse.ts, app/(app)/opportunities/page.tsx),
 * so writing this column is already sufficient to hide a bad record everywhere a student
 * would see it. This is that write path, through the one client that can actually make it
 * (createAdminClient(), same as removeReportedPost/restoreReportedPost above).
 *
 * A reason is required to disable, same rule post-removal-control.tsx already enforces for
 * posts -- the reason is the audit trail (logged to admin_action_log's `detail`, not a new
 * column: unlike a post, an opportunity has no "author" who needs to keep seeing their own
 * disabled content with a notice, so the lighter posts-lack-that-half version is enough
 * here). No reason required to reactivate.
 *
 * Reactivating always restores to `"active"`, never to whatever status (e.g. "expired",
 * "under_review") the row held before being disabled -- a deliberate simplification, not an
 * oversight: nothing student-facing distinguishes those two statuses from "disabled" (only
 * "active" is ever shown), so which one a reactivated row lands on has no visible effect.
 * Flag if a case needs the distinction restored.
 */
export async function setOpportunityDisabled(opportunityId: string, disabled: boolean, reason?: string): Promise<SetOpportunityDisabledResult> {
  const adminProfile = await requireAdmin();
  if (!isUuidLike(opportunityId)) return { error: "Invalid opportunity." };
  const trimmedReason = reason?.trim();
  if (disabled && !trimmedReason) return { error: "A reason is required to disable an opportunity." };

  const admin = createAdminClient();
  const { data: before, error: readError } = await admin.from("opportunities").select("status, title").eq("id", opportunityId).maybeSingle();
  if (readError || !before) {
    console.error("[admin] failed to read opportunity before setting disabled state", { opportunityId, error: readError });
    return { error: "Couldn't find that opportunity." };
  }

  const targetStatus = disabled ? "disabled" : "active";
  if (before.status === targetStatus) return { changed: false };

  const { data: updated, error } = await admin.from("opportunities").update({ status: targetStatus }).eq("id", opportunityId).select("id");
  if (error) {
    console.error("[admin] failed to set opportunity disabled state", { opportunityId, targetStatus, error });
    return { error: "Couldn't save that. Please try again." };
  }
  if (!updated || updated.length === 0) {
    console.error("[admin] opportunity disabled-state update matched zero rows", { opportunityId, targetStatus });
    return { error: "That saved nothing — 0 rows were updated. The record may have just been deleted." };
  }

  await logAdminAction(admin, {
    adminProfile,
    action: disabled ? "disable_opportunity" : "reactivate_opportunity",
    targetLabel: before.title,
    detail: { from: before.status, to: targetStatus, reason: trimmedReason ?? null, opportunityId },
  });

  revalidatePath("/admin");
  return { changed: true };
}

/**
 * The moderation list's own search, called from OpportunityModerationList (a client
 * component — search-as-you-type needs client state, unlike every other section on this
 * page, which fetches once server-side and re-renders via router.refresh()). Thin wrapper:
 * getAdminOpportunityList already does the real work, this just adds the requireAdmin()
 * gate a Server Action needs regardless of what the page-level check already did.
 */
export async function searchAdminOpportunities(q?: string): Promise<{ rows: AdminOpportunityRow[]; error?: string }> {
  await requireAdmin();
  try {
    const admin = createAdminClient();
    return { rows: await getAdminOpportunityList(admin, q) };
  } catch (error) {
    console.error("[admin] opportunity search failed", { q, error });
    return { rows: [], error: "Couldn't search opportunities. Please try again." };
  }
}

export async function unmarkFeatureDead(featureKey: string): Promise<{ error?: string }> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("admin_dead_feature_flags").delete().eq("feature_key", featureKey);
  if (error) {
    console.error("[admin] failed to unmark feature dead", { featureKey, code: error.code, message: error.message });
    return { error: "Couldn't save that. Please try again." };
  }

  revalidatePath("/admin");
  return {};
}

/** Deletes the override row so the job falls back to JOB_BUDGET_USD's own default —
 *  reversible by construction, same reasoning as the override table itself never editing
 *  ai_usage: this removes an admin-entered adjustment, never the spend history behind it. */
export async function clearJobBudgetOverride(feature: JobBudgetFeature): Promise<{ error?: string }> {
  await requireAdmin();
  if (!JOB_BUDGET_FEATURES.includes(feature)) return { error: "Unknown job." };

  const admin = createAdminClient();
  const { error } = await admin.from("job_budget_overrides").delete().eq("feature", feature);
  if (error) {
    console.error("[admin] failed to clear job budget override", { code: error.code, message: error.message });
    return { error: "Couldn't clear that. Please try again." };
  }

  revalidatePath("/admin");
  return {};
}

/**
 * Manual top-up of one student's shared monthly AI allowance (migration 0096, quota_grants)
 * — "the single most likely real support action" (oryn-a7, 2026-09-02). Never edits
 * ai_usage: adds an offsetting ledger row instead, read by both selectModelForUser's degrade
 * decision and getMonthlyQuota's hard monthly stop (lib/ai/limits/grants.ts), so a grant
 * relieves both rather than leaving a student still stuck on the degraded model.
 */
export async function grantQuota(userId: string, amountUsd: number, reason?: string): Promise<{ error?: string }> {
  const adminProfile = await requireAdmin();
  if (!isUuidLike(userId)) return { error: "Invalid student." };
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) return { error: "Grant amount must be a positive number." };

  const admin = createAdminClient();
  const { error } = await admin.from("quota_grants").insert({
    user_id: userId,
    amount_usd: amountUsd,
    reason: reason?.trim() ? reason.trim().slice(0, 500) : null,
    granted_by: adminProfile.id,
  });
  if (error) {
    console.error("[admin] failed to grant quota", { code: error.code, message: error.message });
    return { error: "Couldn't save that grant. Please try again." };
  }

  revalidatePath("/admin");
  return {};
}

/**
 * "Reset this month" — a grant equal to exactly the student's own remaining effective spend
 * (real spend minus whatever's already been granted this month), so effective spend returns
 * to $0 without the admin needing to know or type a figure. Same primitive as grantQuota
 * (oryn-a7's own framing: "reset = grant equal to current month spend") — computed
 * server-side from the authoritative source rather than trusting whatever number the admin's
 * screen happened to be showing at click time, which could already be stale.
 */
export async function resetQuotaThisMonth(userId: string): Promise<{ error?: string }> {
  const adminProfile = await requireAdmin();
  if (!isUuidLike(userId)) return { error: "Invalid student." };

  const admin = createAdminClient();
  const monthStartIso = currentUtcMonthStartIso();
  const [{ data: usageRows, error: usageError }, grantsUsd] = await Promise.all([
    admin.from("ai_usage").select("estimated_cost").eq("user_id", userId).gte("created_at", monthStartIso),
    getMonthlyGrantsUsd(admin, userId, monthStartIso),
  ]);
  if (usageError || !usageRows) {
    console.error("[admin] failed to read ai_usage for reset", { code: usageError?.code, message: usageError?.message });
    return { error: "Couldn't read this student's spend. Please try again." };
  }

  const knownSpendUsd = usageRows.reduce((sum, row) => sum + (row.estimated_cost ?? 0), 0);
  const remainingEffectiveSpendUsd = Math.max(0, knownSpendUsd - grantsUsd);
  // Already at $0 effective spend -- nothing to grant (a $0 amount would also violate
  // quota_grants' own `amount_usd > 0` check constraint), and this is a normal outcome, not
  // an error the admin needs to see.
  if (remainingEffectiveSpendUsd <= 0) return {};

  const { error } = await admin.from("quota_grants").insert({
    user_id: userId,
    amount_usd: remainingEffectiveSpendUsd,
    reason: "Reset to $0 for this month",
    granted_by: adminProfile.id,
  });
  if (error) {
    console.error("[admin] failed to reset quota", { code: error.code, message: error.message });
    return { error: "Couldn't reset that student's month. Please try again." };
  }

  revalidatePath("/admin");
  return {};
}

/**
 * Add or correct one model's per-token rate (migration 0100, ai_model_pricing) — the lever
 * behind the unpriced-calls alert (AiFeatureShapeSection): every dollar figure on the spend
 * screens already treats a null estimated_cost as $0, so closing the gap from here is what
 * keeps those totals honest going forward, not just visible as a known gap. Checked before
 * PRICE_PER_MILLION_TOKENS_USD's own hardcoded table by resolveModelCostUsd
 * (lib/ai/pricing.ts) — takes effect on the next AI call, within that function's own short
 * cache TTL, not after a deploy.
 */
export async function setModelPricing(model: string, inputRatePerMillion: number, outputRatePerMillion: number): Promise<{ error?: string }> {
  const adminProfile = await requireAdmin();
  const trimmedModel = model.trim();
  if (!trimmedModel) return { error: "Enter a model name." };
  if (!Number.isFinite(inputRatePerMillion) || inputRatePerMillion < 0) return { error: "Input rate must be a number of at least $0." };
  if (!Number.isFinite(outputRatePerMillion) || outputRatePerMillion < 0) return { error: "Output rate must be a number of at least $0." };

  const admin = createAdminClient();
  const { error } = await admin.from("ai_model_pricing").upsert({
    model: trimmedModel,
    input_rate_per_million: inputRatePerMillion,
    output_rate_per_million: outputRatePerMillion,
    updated_by: adminProfile.id,
  });
  if (error) {
    console.error("[admin] failed to set model pricing", { code: error.code, message: error.message });
    return { error: "Couldn't save that. Please try again." };
  }

  revalidatePath("/admin");
  return {};
}

export interface ContaminationCleanupOutcome {
  id: string;
  title: string;
  applied: boolean;
  /** Present only when applied is false — "why," never left for the caller to infer from a
   *  bare count. Distinguishes a guard miss (row changed since 2026-09-02) from a genuine
   *  write error, since an admin acting on this needs to know which. */
  reason?: string;
}

/**
 * The 35-row description-contamination cleanup (data/research/opportunities/
 * description_contamination_cleanup_2026-09-02.sql, converted to typed data — see that file's
 * own header) — CEO's explicit approval, 2026-09-02: "the 35-row cleanup is approved to apply —
 * through your button, not raw SQL... your button gives per-row before/after preview, each
 * row's own guard, and visible reporting of any row that doesn't take."
 *
 * Each of the 35 is applied independently via `.like(description, guardPrefix + "%")` — the
 * PostgREST-expressible equivalent of the original SQL's `left(description, N) = guardPrefix`
 * exact-prefix guard. Postgres/PostgREST does not error on a zero-row match, so a guard miss is
 * a normal, visible `count: 0` outcome to check, not an exception — matching the original file's
 * own stated behavior exactly: "the other 36 are unaffected and safe to apply as-is... a 0-row
 * match on one does not roll back." No explicit transaction wraps all 35: each statement was
 * already independent in the source file, and CEO's own words confirm this is the intended
 * shape, not a shortcut ("34 applying and 1 flagged is better than all-or-nothing").
 *
 * Every attempt — applied or skipped — writes its own `admin_actions` row in the same request as
 * the update itself, recording the old and new description as `before_value`/`after_value`. If
 * the audit write itself fails, that row's whole attempt is reported as not applied (`reason`
 * names the audit failure specifically) even if the description update itself already
 * succeeded — deliberately fails toward "admin re-checks a row that's actually fine" rather than
 * "a real change exists with no record of it," the opposite of the gap this table exists to close.
 *
 * FAILS CLOSED, DELIBERATELY — the mirror of `logAdminAction`'s (lib/admin/log.ts) opposite
 * choice; do not "fix" this to match it. Their table logs label/state changes, where losing
 * one entry is recoverable — the state itself is still visible elsewhere. This one is the
 * only record that an irreversible content rewrite happened at all; failing open here would
 * let a real change through with nothing anywhere pointing back to it. Same instinct, two
 * different stakes, two different correct answers — see that function's own comment for the
 * mirror of this one.
 */
export async function applyContaminationCleanup(): Promise<ContaminationCleanupOutcome[]> {
  const adminProfile = await requireAdmin();
  const admin = createAdminClient();

  const outcomes: ContaminationCleanupOutcome[] = [];
  for (const entry of CONTAMINATION_CLEANUP_2026_09_02) {
    const { data: beforeRow } = await admin.from("opportunities").select("description").eq("id", entry.id).maybeSingle();
    if (!beforeRow) {
      outcomes.push({ id: entry.id, title: entry.title, applied: false, reason: "Row not found — id may be stale." });
      continue;
    }

    const { data: updatedRows, error: updateError } = await admin
      .from("opportunities")
      .update({ description: entry.newDescription })
      .eq("id", entry.id)
      .like("description", `${entry.guardPrefix}%`)
      .select("id");
    if (updateError) {
      console.error("[admin] contamination cleanup update failed", { id: entry.id, code: updateError.code, message: updateError.message });
      outcomes.push({ id: entry.id, title: entry.title, applied: false, reason: "Write failed — see server logs." });
      continue;
    }
    if (!updatedRows || updatedRows.length === 0) {
      outcomes.push({ id: entry.id, title: entry.title, applied: false, reason: "Description changed since 2026-09-02 — guard did not match, nothing written." });
      continue;
    }

    const { error: auditError } = await admin.from("admin_actions").insert({
      admin_user_id: adminProfile.id,
      action: "apply_description_cleanup",
      target_table: "opportunities",
      target_id: entry.id,
      before_value: { description: beforeRow.description },
      after_value: { description: entry.newDescription },
    });
    if (auditError) {
      console.error("[admin] contamination cleanup audit write failed after a real update", { id: entry.id, code: auditError.code, message: auditError.message });
      outcomes.push({ id: entry.id, title: entry.title, applied: false, reason: "Saved, but the audit record failed to write — flag this row for a manual check." });
      continue;
    }

    outcomes.push({ id: entry.id, title: entry.title, applied: true });
  }

  revalidatePath("/admin");
  return outcomes;
}
