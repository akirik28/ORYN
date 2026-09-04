import "server-only";

import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ProfileDimension, PlanTier } from "@/types/database";
import { readOr } from "@/lib/supabase/safe-read";
import { buildDigestContent, type DigestOpportunityMatchItem } from "./build";
import { buildProfileChange, describeProfileChangeForParent, type ProfileChange } from "@/lib/scoring/change";
import { NOTIFIABLE_DIMENSION_DELTA } from "@/lib/scoring/profile-update-notification";
import { resolveParentEffectiveTier } from "@/lib/tier/parent-tier";
import { getAIProvider, AIProviderNotConfiguredError } from "@/lib/ai/index";
import { withUsageLogging } from "@/lib/ai/usage";
import { selectModelForUser } from "@/lib/ai/limits/budget";
import { withOutputLanguage } from "@/lib/ai/output-language";
import { PARENT_WEEKLY_COMMENTARY_SYSTEM_PROMPT } from "@/lib/ai/parent-commentary-prompt";
import { DEFAULT_LOCALE, toLocale, type Locale } from "@/lib/i18n/config";

/**
 * P5's content assembly (docs/veli-hesabi-spec-2026-09-04.md) — the AI half of the parent
 * weekly commentary. Deliberately tier-blind, same shape as buildDigestContent one file over:
 * this module decides WHAT the week's commentary says, never WHETHER a given parent is
 * entitled to see it. resolveParentWeeklyCommentary (bottom of this file) is the thin,
 * tier-aware layer that mirrors lib/digest/run.ts's own processOneStudent — check
 * entitlement first, only then build content.
 *
 * Parameterized by `studentUserId` alone, not a parent_link row — P1 (account_role,
 * parent_links, the RLS policies, migration 0116) is staged, not applied. K4's own tier-
 * inheritance rule already defines a parent's effective tier as their linked student's
 * plan_tier, so entitlement can be checked against the student's own profile today; the only
 * piece this file cannot build yet is "for every ACTIVE parent_link, call this" — a few-line
 * batch runner once parent_links exists, not a reason to block content assembly on it. That
 * future runner MUST filter to `status = 'active'` only — a `pending` link (the schema's own
 * default) grants nothing, so an awaiting-confirmation parent gets no commentary at all, not
 * a degraded one (oryn-45, P1 schema dispatch, 2026-09-04).
 *
 * WHAT THIS MAY BE GROUNDED IN — a hard boundary, not a style choice (same dispatch): a parent
 * never gets a raw grant on `profiles` (that table also holds `advisor_instructions`, a
 * student's private customization instruction to the advisor). Real parent reads go through a
 * SECURITY DEFINER function with an explicit 9-column whitelist — display_name,
 * graduation_year, curriculum, country, school_name, plan_tier, onboarding_completed,
 * completeness_percent, profile_strength_score — plus direct policies on `opportunity_matches`,
 * `profile_scores`, and `profile_score_snapshots`. This file was FIRST written against a wider
 * signal set (weekly_actions' title/impact_level, and buildDigestContent's deadlines, which
 * read `applications`/`target_universities`/`university_deadlines`) before that boundary was
 * confirmed — corrected here rather than left as a second, wider surface nobody had reason to
 * distrust yet. What remains: profile_scores + profile_score_snapshots (score movement, via
 * lib/scoring/change.ts, already deterministic), opportunity_matches (new matches only, via
 * buildDigestContent — its `deadlines` field is deliberately never read here), and `display_name`
 * from the whitelist. Nothing else.
 */

const MAX_NARRATIVE_CHARS = 700;

/**
 * The decision inputs, already fetched and shaped — kept separate from the I/O that produces
 * them so the "was this week notable" call and the honest-fallback text are directly testable
 * against plain fixtures, the same split computeEligibility/buildProfileChange/
 * detectNotifiableProfileUpdate already use throughout this codebase. Nothing here has touched
 * an AI provider yet.
 */
export interface WeeklySignal {
  studentDisplayName: string;
  weekStart: string;
  weekEnd: string;
  /** Already filtered to NOTIFIABLE_DIMENSION_DELTA — see filterNotableDimensionChanges'
   * own comment for why a sub-threshold move must not count as this week's signal. */
  notableChange: ProfileChange;
  newMatches: DigestOpportunityMatchItem[];
}

/**
 * Reuses lib/scoring/profile-update-notification.ts's own bar for "worth telling someone
 * about" rather than inventing a second threshold next to it — that constant is grounded in
 * real observed data (every genuine profile edit ever recorded moved a dimension by 4+
 * points; the floor sits just above the smallest real one). Without this filter, a student
 * whose ONLY activity this week was a formula-level 0.3-point drift would have
 * describeProfileChangeForParent name it as the area that moved most this week — true in a
 * technical sense, misleading in the sense a parent would read it. Entries below the bar are
 * dropped from improved/declined, not folded into `steady` — `steady`'s own contract is
 * "came back identical", and a sub-threshold move did not.
 */
export function filterNotableDimensionChanges(change: ProfileChange): ProfileChange {
  return {
    hasHistory: change.hasHistory,
    improved: change.improved.filter((d) => Math.abs(d.delta) >= NOTIFIABLE_DIMENSION_DELTA),
    declined: change.declined.filter((d) => Math.abs(d.delta) >= NOTIFIABLE_DIMENSION_DELTA),
    steady: change.steady,
  };
}

/**
 * Whether this week has anything worth an AI call at all. Two independent sources, either one
 * is enough — deliberately NOT gated on `notableChange.hasHistory` alone, since a "steady,
 * nothing moved" week can still be worth a note if a new opportunity matched. The false-
 * positive direction (calling the AI for a near-empty week) is the one this whole feature
 * exists to avoid, so this stays a strict OR over real, concrete facts, not a fuzzy heuristic.
 */
export function hasNotableWeeklySignal(signal: Pick<WeeklySignal, "notableChange" | "newMatches">): boolean {
  return signal.notableChange.improved.length > 0 || signal.notableChange.declined.length > 0 || signal.newMatches.length > 0;
}

/**
 * The honest-nothing path, built first and kept completely separate from the AI path — see
 * this file's own module comment and lib/ai/parent-commentary-prompt.ts's header for why.
 * No model call, no fabrication surface at all: a quiet week produces this exact,
 * deterministic sentence every time. The reassurance clause ("not a red flag on its own") is
 * deliberate — a parent reading unexplained silence from a paid feature can read it as the
 * product having broken, not as an honest report of a quiet week; this says which one it is.
 */
export function honestNoActivityNarrative(studentDisplayName: string, locale: Locale = DEFAULT_LOCALE): string {
  return locale === "tr"
    ? `${studentDisplayName} için bu hafta profilinde belirgin bir hareket ya da yeni bir fırsat eşleşmesi olmadı. Bu tek başına bir sorun işareti değil — bazı haftalar sakin geçer.`
    : `There wasn't a notable profile change or a new opportunity match for ${studentDisplayName} this week. That's not a red flag on its own — some weeks are quiet.`;
}

/**
 * The second fallback (2026-09-04, degrade-gracefully per AGENTS.md Rule 4/Phase 34): real
 * signal existed this week, but the AI provider isn't configured (every dev/preview
 * environment today has no ANTHROPIC_API_KEY). Assembles a plain, deterministic sentence
 * directly from the same facts the AI path would have used — no narrative voice, no
 * interpretation, just the facts stated. Never silently drops real signal just because the
 * model can't be reached.
 */
function assembleFactsWithoutAI(signal: WeeklySignal, locale: Locale): string {
  const parts: string[] = [];
  const changeSentence = describeProfileChangeForParent(signal.notableChange, signal.studentDisplayName, locale);
  if (changeSentence) parts.push(changeSentence);
  if (signal.newMatches.length > 0) {
    const titles = signal.newMatches.map((m) => m.title).join(", ");
    parts.push(locale === "tr" ? `Bu hafta yeni eşleşen fırsatlar: ${titles}.` : `New opportunity matches this week: ${titles}.`);
  }
  return parts.join(" ");
}

const ParentWeeklyCommentarySchema = z.object({
  narrative: z.string().min(1).max(MAX_NARRATIVE_CHARS),
});

export type NarrativeSource = "ai" | "no_activity" | "ai_unavailable";

export interface ParentWeeklyCommentaryContent {
  weekStart: string;
  weekEnd: string;
  narrative: string;
  narrativeSource: NarrativeSource;
  newMatches: DigestOpportunityMatchItem[];
}

/**
 * PRE-REGISTERED over-claim definition (oryn-45's own instruction, 2026-09-04: "measuring
 * absence after the fact is the easiest score in the world to award yourself" — written
 * before any real output from this prompt has been read, matching this session's own earlier
 * ordinal-test discipline). A generated narrative over-claims if it contains ANY of:
 *   1. A specific number (a score, a count, a percentage) not present in the fact sentences
 *      passed to the model.
 *   2. A specific date, or a relative time reference ("last month", "in March") beyond
 *      "this week", not present in the facts.
 *   3. A named activity, award, or opportunity title not present in newMatches.
 *   4. Any claim about WHY a score moved (a specific cause, action, or event) — the facts
 *      given never state a cause, only a magnitude and direction.
 *   5. Language that reads as resolved/certain about a WEAK signal — e.g. calling a single
 *      just-above-threshold dimension move "strong" or "significant" progress.
 * This criterion is checked against real model output in docs/parent-weekly-commentary-p5-
 * 2026-09-04.md's own verification section — see that doc for whether it could be run at all
 * in this environment (it could not: no ANTHROPIC_API_KEY is configured here, so every real
 * run in this session's own testing took the ai_unavailable path, not the ai path this
 * criterion is actually about).
 */
async function generateNarrative(signal: WeeklySignal, studentUserId: string, locale: Locale): Promise<{ narrative: string; source: NarrativeSource }> {
  const factSentences: string[] = [`Week: ${signal.weekStart} to ${signal.weekEnd}.`, `Student's name: ${signal.studentDisplayName}.`];
  // describeProfileChangeForParent here, not describeProfileChange — the fact sentence fed to
  // the model should already be in the same third-person voice
  // lib/ai/parent-commentary-prompt.ts instructs the model to write in, not a second-person
  // ("since your last review") sentence the model then has to silently reframe. Feeding a
  // "you"-addressed fact makes it measurably easier for a model to echo that framing back
  // despite the explicit instruction not to.
  const changeSentence = describeProfileChangeForParent(signal.notableChange, signal.studentDisplayName, locale);
  factSentences.push(changeSentence ? `Profile movement (already computed, do not recompute or explain its cause): ${changeSentence}` : "No profile-score history to compare against yet.");
  factSentences.push(
    signal.newMatches.length > 0
      ? `New opportunity matches this week: ${signal.newMatches.map((m) => `"${m.title}"${m.organization ? ` (${m.organization})` : ""}`).join("; ")}.`
      : "No new opportunity matches this week."
  );

  try {
    const provider = getAIProvider();
    const result = await withUsageLogging(
      { userId: studentUserId, feature: "parent_weekly_commentary", selectModel: (uid) => selectModelForUser(uid, "ultra") },
      (model) =>
        provider.generateStructured({
          system: withOutputLanguage(PARENT_WEEKLY_COMMENTARY_SYSTEM_PROMPT, locale),
          prompt: `Here are this week's facts:\n\n${factSentences.join("\n")}\n\nWrite the parent note now.`,
          schema: ParentWeeklyCommentarySchema,
          schemaName: "record_parent_weekly_commentary",
          schemaDescription: "Records a short weekly note for a parent about their child's week on Proxola.",
          maxTokens: 400,
          model,
        })
    );
    return { narrative: result.data.narrative, source: "ai" };
  } catch (error) {
    if (error instanceof AIProviderNotConfiguredError) {
      console.warn("[parent-commentary] AI not configured, degrading to a factual summary", { studentUserId });
      return { narrative: assembleFactsWithoutAI(signal, locale), source: "ai_unavailable" };
    }
    throw error;
  }
}

function startOfWeekIso(referenceDate: Date): string {
  const d = new Date(referenceDate);
  const day = d.getUTCDay();
  // ISO week starts Monday — same convention lib/plan/persist.ts's currentWeekStart already
  // uses for weekly_plans, so "this week" means the same calendar window everywhere it's used.
  const diff = (day === 0 ? -6 : 1) - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Loads and shapes the week's raw signal — the only function in this file that touches
 * Supabase before generateNarrative's own AI call. `since` mirrors buildDigestContent's own
 * cursor contract exactly (null = no prior commentary, everything currently eligible counts);
 * falls back to the current ISO week's Monday when null, since the profile-snapshot
 * comparison needs SOME window even on a first-ever run.
 *
 * buildDigestContent's own `deadlines` field is read here and immediately discarded — see
 * this file's own module comment for why (it sources applications/target_universities/
 * university_deadlines, none of which are on the parent-readable whitelist). Calling
 * buildDigestContent unmodified rather than forking it keeps this a true reuse of the shared
 * digest seam, at the cost of one query this file never uses the result of.
 */
async function loadWeeklySignal(supabase: SupabaseClient<Database>, studentUserId: string, studentDisplayName: string, since: string | null): Promise<WeeklySignal> {
  const now = new Date();
  const weekStart = since ?? startOfWeekIso(now);
  const weekEnd = now.toISOString();

  const [scoresRes, previousSnapshotRes, digestContent] = await Promise.all([
    supabase.from("profile_scores").select("dimension, score").eq("user_id", studentUserId),
    supabase
      .from("profile_score_snapshots")
      .select("dimension_scores")
      .eq("user_id", studentUserId)
      .lt("created_at", weekStart)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    buildDigestContent(supabase, studentUserId, since),
  ]);

  const scores = readOr("parent-commentary.scores", scoresRes, [], { userId: studentUserId }) as { dimension: ProfileDimension; score: number }[];
  const previousDimensionScores = readOr("parent-commentary.previousSnapshot", previousSnapshotRes, null, { userId: studentUserId })?.dimension_scores as
    | Record<string, number>
    | null
    | undefined;
  const rawChange = buildProfileChange(scores, previousDimensionScores ?? null);
  const notableChange = filterNotableDimensionChanges(rawChange);

  return {
    studentDisplayName,
    weekStart,
    weekEnd,
    notableChange,
    newMatches: digestContent?.newMatches ?? [],
  };
}

/**
 * Tier-blind content assembly — see this file's own module comment. Always returns real
 * content, never null: unlike buildDigestContent (where "nothing to say" means "skip this
 * student, don't send"), a parent commentary that goes silent on a quiet week reads as the
 * product having broken, not as an honest report — see honestNoActivityNarrative's own
 * comment. The AI is only ever called when hasNotableWeeklySignal is true.
 */
export async function buildParentWeeklyCommentary(
  supabase: SupabaseClient<Database>,
  studentUserId: string,
  since: string | null
): Promise<ParentWeeklyCommentaryContent> {
  // display_name + preferred_language: both on the parent-readable whitelist (the latter
  // implicitly, as the mechanism that makes the whitelist's own display readable at all) --
  // see this file's own module comment for the full list and where it came from.
  const { data: profile } = await supabase.from("profiles").select("display_name, preferred_language").eq("id", studentUserId).single();
  const locale = toLocale(profile?.preferred_language);
  const studentDisplayName = profile?.display_name ?? (locale === "tr" ? "Öğrenciniz" : "Your student");

  const signal = await loadWeeklySignal(supabase, studentUserId, studentDisplayName, since);

  if (!hasNotableWeeklySignal(signal)) {
    return {
      weekStart: signal.weekStart,
      weekEnd: signal.weekEnd,
      narrative: honestNoActivityNarrative(studentDisplayName, locale),
      narrativeSource: "no_activity",
      newMatches: [],
    };
  }

  const { narrative, source } = await generateNarrative(signal, studentUserId, locale);
  return {
    weekStart: signal.weekStart,
    weekEnd: signal.weekEnd,
    narrative,
    narrativeSource: source,
    newMatches: signal.newMatches,
  };
}

export type ParentCommentaryOutcome =
  | { kind: "not_premium" }
  | { kind: "ok"; content: ParentWeeklyCommentaryContent };

/**
 * The tier-aware entry point — mirrors lib/digest/run.ts's own processOneStudent exactly:
 * check entitlement first, only then spend anything building content. Tier resolved via
 * lib/tier/parent-tier.ts's resolveParentEffectiveTier, not a raw `plan_tier` column read —
 * an earlier version of this function did exactly that raw read, and P6 (the tier-inheritance
 * lane, landed 2026-09-04 while this file was being corrected for the same reason) is why it
 * didn't ship that way: a raw `plan_tier === "ultra"` check misses a currently-active Ultra
 * *gift* (`ultra_gift_expires_at` in the future, permanent `plan_tier` still "standard") —
 * resolveParentEffectiveTier already calls the one function (`resolvePlanTier`,
 * lib/tier/plan-tier.ts, ~30 existing call sites) that resolves both correctly, and this
 * routes through it rather than re-deriving the same fallback a third time.
 *
 * `linkStatus` is hardcoded "active" here, not read from `parent_links` — P1 isn't applied,
 * and more importantly, this function's own contract (per its header) is "given an
 * ALREADY-KNOWN, already-authorized studentUserId, build content" — the link-status gate
 * belongs to the future batch runner that iterates real parent_links rows and must filter to
 * `status = 'active'` BEFORE ever calling this function at all; a `pending` link grants
 * nothing (oryn-45, 2026-09-04), and this function has no way to independently confirm that
 * without parent_links, so it trusts its caller the same way processOneStudent trusts
 * `runDigestPass`'s own candidate-loading to have already applied the opt-in filter.
 *
 * Queries `profiles` a second time (buildParentWeeklyCommentary reads its own display_name/
 * preferred_language columns independently) rather than threading a pre-fetched row through —
 * a small, deliberate redundancy that keeps buildParentWeeklyCommentary's own signature free
 * of a profile-row parameter it would otherwise need only for this one caller. This runs in a
 * background job, not a request hot path; the extra read is cheap relative to the AI call it
 * gates.
 */
export async function resolveParentWeeklyCommentary(
  supabase: SupabaseClient<Database>,
  studentUserId: string,
  since: string | null
): Promise<ParentCommentaryOutcome> {
  const { data: tierRow } = await supabase.from("profiles").select("plan_tier, ultra_gift_expires_at").eq("id", studentUserId).single();
  const tier: PlanTier = resolveParentEffectiveTier("active", { plan_tier: (tierRow?.plan_tier as PlanTier | undefined) ?? "standard", ultra_gift_expires_at: tierRow?.ultra_gift_expires_at ?? null });
  if (tier !== "ultra") return { kind: "not_premium" };

  const content = await buildParentWeeklyCommentary(supabase, studentUserId, since);
  return { kind: "ok", content };
}
