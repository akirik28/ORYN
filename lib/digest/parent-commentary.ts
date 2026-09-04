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
import { PARENT_MONTHLY_COMMENTARY_SYSTEM_PROMPT } from "@/lib/ai/parent-commentary-prompt";
import { DEFAULT_LOCALE, toLocale, type Locale } from "@/lib/i18n/config";

/**
 * P5's content assembly (docs/veli-hesabi-spec-2026-09-04.md) — the AI half of the parent
 * commentary. Deliberately tier-blind, same shape as buildDigestContent one file over: this
 * module decides WHAT a period's commentary says, never WHETHER a given parent is entitled to
 * see it. resolveParentMonthlyCommentary (bottom of this file) is the thin, tier-aware layer
 * that mirrors lib/digest/run.ts's own processOneStudent — check entitlement first, only then
 * build content.
 *
 * Converted from weekly to monthly 2026-09-04 (B3b — founder, verbatim: "ayda bir AI özet
 * versin gelişimi", an AI summary of progress once a month). The rename touches every symbol
 * in this file that had "Weekly" in its name; nothing about the SELECTION logic changed, only
 * the window it's computed over and the cadence lib/digest/parent-commentary-run.ts's own
 * due-date check enforces before this file is ever called at all — see that file's own header
 * for why "no cron is armed" means the monthly behavior has to be provable from
 * last_commentary_sent_at, not from how often the job happens to run.
 *
 * Parameterized by `studentUserId` alone, not a parent_link row — matches
 * lib/digest/parent-commentary-run.ts's own contract exactly: that runner filters to
 * `status = 'active'` before this file is ever called, and now also to "due" before that.
 *
 * WHAT THIS MAY BE GROUNDED IN — a hard boundary, not a style choice (oryn-45, P1 schema
 * dispatch, 2026-09-04): a parent never gets a raw grant on `profiles` at all (that table also
 * holds `advisor_instructions`, a student's private customization instruction to the
 * advisor). Real parent reads go through a 9-column SECURITY DEFINER whitelist plus direct
 * policies on opportunity_matches/profile_scores/profile_score_snapshots. What remains:
 * profile_scores + profile_score_snapshots (score movement, via lib/scoring/change.ts,
 * already deterministic), opportunity_matches (new matches only, via buildDigestContent — its
 * `deadlines` field is deliberately never read here), and `display_name` from the whitelist.
 * Nothing else.
 */

const MAX_NARRATIVE_CHARS = 700;

/**
 * The decision inputs, already fetched and shaped — kept separate from the I/O that produces
 * them so the "was this month notable" call and the honest-fallback text are directly testable
 * against plain fixtures, the same split computeEligibility/buildProfileChange/
 * detectNotifiableProfileUpdate already use throughout this codebase. Nothing here has touched
 * an AI provider yet.
 */
export interface MonthlySignal {
  studentDisplayName: string;
  periodStart: string;
  periodEnd: string;
  /** Already filtered to NOTIFIABLE_DIMENSION_DELTA — see filterNotableDimensionChanges'
   * own comment for why a sub-threshold move must not count as this period's signal. */
  notableChange: ProfileChange;
  newMatches: DigestOpportunityMatchItem[];
}

/**
 * Reuses lib/scoring/profile-update-notification.ts's own bar for "worth telling someone
 * about" rather than inventing a second threshold next to it — that constant is grounded in
 * real observed data (every genuine profile edit ever recorded moved a dimension by 4+
 * points; the floor sits just above the smallest real one). Without this filter, a student
 * whose ONLY activity this period was a formula-level 0.3-point drift would have
 * describeProfileChangeForParent name it as the area that moved most — true in a technical
 * sense, misleading in the sense a parent would read it. Entries below the bar are dropped
 * from improved/declined, not folded into `steady` — `steady`'s own contract is "came back
 * identical", and a sub-threshold move did not.
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
 * Whether this period has anything worth an AI call at all. Two independent sources, either
 * one is enough — deliberately NOT gated on `notableChange.hasHistory` alone, since a "steady,
 * nothing moved" period can still be worth a note if a new opportunity matched. The false-
 * positive direction (calling the AI for a near-empty period) is the one this whole feature
 * exists to avoid, so this stays a strict OR over real, concrete facts, not a fuzzy heuristic.
 */
export function hasNotableMonthlySignal(signal: Pick<MonthlySignal, "notableChange" | "newMatches">): boolean {
  return signal.notableChange.improved.length > 0 || signal.notableChange.declined.length > 0 || signal.newMatches.length > 0;
}

/**
 * The honest-nothing path, built first and kept completely separate from the AI path — see
 * this file's own module comment and lib/ai/parent-commentary-prompt.ts's header for why.
 * No model call, no fabrication surface at all: a quiet month produces this exact,
 * deterministic sentence every time. The reassurance clause ("not a red flag on its own") is
 * deliberate — a parent reading unexplained silence from a paid feature can read it as the
 * product having broken, not as an honest report of a quiet month; this says which one it is.
 */
export function honestNoActivityNarrative(studentDisplayName: string, locale: Locale = DEFAULT_LOCALE): string {
  return locale === "tr"
    ? `${studentDisplayName} için bu ay profilinde belirgin bir hareket ya da yeni bir fırsat eşleşmesi olmadı. Bu tek başına bir sorun işareti değil — bazı aylar sakin geçer.`
    : `There wasn't a notable profile change or a new opportunity match for ${studentDisplayName} this month. That's not a red flag on its own — some months are quiet.`;
}

/**
 * The second fallback (2026-09-04, degrade-gracefully per AGENTS.md Rule 4/Phase 34): real
 * signal existed this period, but the AI provider isn't configured (every dev/preview
 * environment today has no ANTHROPIC_API_KEY). Assembles a plain, deterministic sentence
 * directly from the same facts the AI path would have used — no narrative voice, no
 * interpretation, just the facts stated. Never silently drops real signal just because the
 * model can't be reached.
 */
function assembleFactsWithoutAI(signal: MonthlySignal, locale: Locale): string {
  const parts: string[] = [];
  const changeSentence = describeProfileChangeForParent(signal.notableChange, signal.studentDisplayName, locale, "month");
  if (changeSentence) parts.push(changeSentence);
  if (signal.newMatches.length > 0) {
    const titles = signal.newMatches.map((m) => m.title).join(", ");
    parts.push(locale === "tr" ? `Bu ay yeni eşleşen fırsatlar: ${titles}.` : `New opportunity matches this month: ${titles}.`);
  }
  return parts.join(" ");
}

const ParentMonthlyCommentarySchema = z.object({
  narrative: z.string().min(1).max(MAX_NARRATIVE_CHARS),
});

export type NarrativeSource = "ai" | "no_activity" | "ai_unavailable";

export interface ParentMonthlyCommentaryContent {
  periodStart: string;
  periodEnd: string;
  narrative: string;
  narrativeSource: NarrativeSource;
  newMatches: DigestOpportunityMatchItem[];
}

/**
 * PRE-REGISTERED over-claim definition (oryn-45's own instruction, 2026-09-04: "measuring
 * absence after the fact is the easiest score in the world to award yourself" — written
 * before any real output from this prompt has been read, matching this session's own earlier
 * ordinal-test discipline; carried forward unchanged by the weekly-to-monthly conversion,
 * since the underlying failure mode — a model reaching for a confident claim over an honest
 * hedge on thin signal — doesn't change with the window size). A generated narrative
 * over-claims if it contains ANY of:
 *   1. A specific number (a score, a count, a percentage) not present in the fact sentences
 *      passed to the model.
 *   2. A specific date, or a relative time reference ("last month", "in March") beyond
 *      "this month", not present in the facts.
 *   3. A named activity, award, or opportunity title not present in newMatches.
 *   4. Any claim about WHY a score moved (a specific cause, action, or event) — the facts
 *      given never state a cause, only a magnitude and direction.
 *   5. Language that reads as resolved/certain about a WEAK signal — e.g. calling a single
 *      just-above-threshold dimension move "strong" or "significant" progress.
 * Not yet checked against real model output for the monthly framing specifically, for the
 * same reason it never was for weekly: no ANTHROPIC_API_KEY is configured in this
 * environment, so every real invocation here takes the ai_unavailable path, not the ai path
 * this criterion is actually about. Still the standard to hold the prompt to whenever someone
 * with real API access can run it.
 */
async function generateNarrative(signal: MonthlySignal, studentUserId: string, locale: Locale): Promise<{ narrative: string; source: NarrativeSource }> {
  const factSentences: string[] = [`Month: ${signal.periodStart} to ${signal.periodEnd}.`, `Student's name: ${signal.studentDisplayName}.`];
  // describeProfileChangeForParent here, not describeProfileChange — the fact sentence fed to
  // the model should already be in the same third-person voice
  // lib/ai/parent-commentary-prompt.ts instructs the model to write in, not a second-person
  // ("since your last review") sentence the model then has to silently reframe. Feeding a
  // "you"-addressed fact makes it measurably easier for a model to echo that framing back
  // despite the explicit instruction not to.
  const changeSentence = describeProfileChangeForParent(signal.notableChange, signal.studentDisplayName, locale, "month");
  factSentences.push(changeSentence ? `Profile movement (already computed, do not recompute or explain its cause): ${changeSentence}` : "No profile-score history to compare against yet.");
  factSentences.push(
    signal.newMatches.length > 0
      ? `New opportunity matches this month: ${signal.newMatches.map((m) => `"${m.title}"${m.organization ? ` (${m.organization})` : ""}`).join("; ")}.`
      : "No new opportunity matches this month."
  );

  try {
    const provider = getAIProvider();
    const result = await withUsageLogging(
      { userId: studentUserId, feature: "parent_monthly_commentary", selectModel: (uid) => selectModelForUser(uid, "ultra") },
      (model) =>
        provider.generateStructured({
          system: withOutputLanguage(PARENT_MONTHLY_COMMENTARY_SYSTEM_PROMPT, locale),
          prompt: `Here are this month's facts:\n\n${factSentences.join("\n")}\n\nWrite the parent note now.`,
          schema: ParentMonthlyCommentarySchema,
          schemaName: "record_parent_monthly_commentary",
          schemaDescription: "Records a short monthly note for a parent about their child's progress on Proxola.",
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

/** Calendar month, not a rolling 30-day window — "bu ay"/"this month" in every string this
 * file produces means the calendar month, so the window it's actually computed over should
 * match what the words say. Used only as the fallback when `since` is null (a student's very
 * first commentary ever); every subsequent call anchors periodStart to their own
 * last_commentary_sent_at instead (see loadMonthlySignal below), which is deliberately NOT
 * forced back to a calendar boundary — a parent confirmed mid-month should get their next
 * note ~30 days later, not snapped to the 1st. */
function startOfMonthIso(referenceDate: Date): string {
  const d = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1, 0, 0, 0, 0));
  return d.toISOString();
}

/**
 * Loads and shapes the period's raw signal — the only function in this file that touches
 * Supabase before generateNarrative's own AI call. `since` mirrors buildDigestContent's own
 * cursor contract exactly (null = no prior commentary, everything currently eligible counts);
 * falls back to the current calendar month's own start when null, since the profile-snapshot
 * comparison needs SOME window even on a first-ever run.
 *
 * buildDigestContent's own `deadlines` field is read here and immediately discarded — see
 * this file's own module comment for why (it sources applications/target_universities/
 * university_deadlines, none of which are on the parent-readable whitelist). Calling
 * buildDigestContent unmodified rather than forking it keeps this a true reuse of the shared
 * digest seam, at the cost of one query this file never uses the result of.
 */
async function loadMonthlySignal(supabase: SupabaseClient<Database>, studentUserId: string, studentDisplayName: string, since: string | null): Promise<MonthlySignal> {
  const now = new Date();
  const periodStart = since ?? startOfMonthIso(now);
  const periodEnd = now.toISOString();

  const [scoresRes, previousSnapshotRes, digestContent] = await Promise.all([
    supabase.from("profile_scores").select("dimension, score").eq("user_id", studentUserId),
    supabase
      .from("profile_score_snapshots")
      .select("dimension_scores")
      .eq("user_id", studentUserId)
      .lt("created_at", periodStart)
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
    periodStart,
    periodEnd,
    notableChange,
    newMatches: digestContent?.newMatches ?? [],
  };
}

/**
 * Tier-blind content assembly — see this file's own module comment. Always returns real
 * content, never null: unlike buildDigestContent (where "nothing to say" means "skip this
 * student, don't send"), a parent commentary that goes silent on a quiet month reads as the
 * product having broken, not as an honest report — see honestNoActivityNarrative's own
 * comment. The AI is only ever called when hasNotableMonthlySignal is true.
 */
export async function buildParentMonthlyCommentary(
  supabase: SupabaseClient<Database>,
  studentUserId: string,
  since: string | null
): Promise<ParentMonthlyCommentaryContent> {
  // display_name + preferred_language: both on the parent-readable whitelist (the latter
  // implicitly, as the mechanism that makes the whitelist's own display readable at all) --
  // see this file's own module comment for the full list and where it came from.
  const { data: profile } = await supabase.from("profiles").select("display_name, preferred_language").eq("id", studentUserId).single();
  const locale = toLocale(profile?.preferred_language);
  const studentDisplayName = profile?.display_name ?? (locale === "tr" ? "Öğrenciniz" : "Your student");

  const signal = await loadMonthlySignal(supabase, studentUserId, studentDisplayName, since);

  if (!hasNotableMonthlySignal(signal)) {
    return {
      periodStart: signal.periodStart,
      periodEnd: signal.periodEnd,
      narrative: honestNoActivityNarrative(studentDisplayName, locale),
      narrativeSource: "no_activity",
      newMatches: [],
    };
  }

  const { narrative, source } = await generateNarrative(signal, studentUserId, locale);
  return {
    periodStart: signal.periodStart,
    periodEnd: signal.periodEnd,
    narrative,
    narrativeSource: source,
    newMatches: signal.newMatches,
  };
}

export type ParentCommentaryOutcome =
  | { kind: "not_premium" }
  | { kind: "ok"; content: ParentMonthlyCommentaryContent };

/**
 * The tier-aware entry point — mirrors lib/digest/run.ts's own processOneStudent exactly:
 * check entitlement first, only then spend anything building content. Tier resolved via
 * lib/tier/parent-tier.ts's resolveParentEffectiveTier, not a raw `plan_tier` column read —
 * a raw `plan_tier === "ultra"` check misses a currently-active Ultra *gift*
 * (`ultra_gift_expires_at` in the future, permanent `plan_tier` still "standard") —
 * resolveParentEffectiveTier already calls the one function (`resolvePlanTier`,
 * lib/tier/plan-tier.ts, ~30 existing call sites) that resolves both correctly, and this
 * routes through it rather than re-deriving the same fallback a third time.
 *
 * `linkStatus` is hardcoded "active" here, not read from `parent_links` — this function's own
 * contract (per its header) is "given an ALREADY-KNOWN, already-authorized studentUserId,
 * build content" — both the link-status gate AND the monthly due-date gate belong to the
 * caller (lib/digest/parent-commentary-run.ts) that iterates real parent_links rows: it must
 * filter to `status = 'active'` AND "due" BEFORE ever calling this function at all — a
 * `pending` link grants nothing (oryn-45, 2026-09-04), and a link commentaried three days ago
 * isn't due again yet either. This function has no way to independently confirm either
 * without parent_links, so it trusts its caller the same way processOneStudent trusts
 * `runDigestPass`'s own candidate-loading to have already applied the opt-in filter.
 *
 * Queries `profiles` a second time (buildParentMonthlyCommentary reads its own display_name/
 * preferred_language columns independently) rather than threading a pre-fetched row through —
 * a small, deliberate redundancy that keeps buildParentMonthlyCommentary's own signature free
 * of a profile-row parameter it would otherwise need only for this one caller. This runs in a
 * background job, not a request hot path; the extra read is cheap relative to the AI call it
 * gates.
 */
export async function resolveParentMonthlyCommentary(
  supabase: SupabaseClient<Database>,
  studentUserId: string,
  since: string | null
): Promise<ParentCommentaryOutcome> {
  const { data: tierRow } = await supabase.from("profiles").select("plan_tier, ultra_gift_expires_at, paid_ultra_expires_at").eq("id", studentUserId).single();
  const tier: PlanTier = resolveParentEffectiveTier("active", {
    plan_tier: (tierRow?.plan_tier as PlanTier | undefined) ?? "standard",
    ultra_gift_expires_at: tierRow?.ultra_gift_expires_at ?? null,
    paid_ultra_expires_at: tierRow?.paid_ultra_expires_at ?? null,
  });
  if (tier !== "ultra") return { kind: "not_premium" };

  const content = await buildParentMonthlyCommentary(supabase, studentUserId, since);
  return { kind: "ok", content };
}
