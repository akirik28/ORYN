#!/usr/bin/env node
/**
 * CEO's explicit ask, 2026-09-05: before touching lib/counselor/scoring.ts's existing
 * unknown-eligibility discount (dataQuality * 0.6 when eligibility.verdict === "unknown"),
 * measure how many of the real, live "do"-classified (the dashboard/weekly-plan's actual
 * top-3 -- lib/counselor/config.ts's RANKING_THRESHOLDS.doSlots) recommendations currently
 * have unknown eligibility.
 *
 * Deliberately does NOT add a second eligibility mechanism -- CEO's own instruction: the
 * counselor already has a real, working one (known_eligible/known_ineligible/unknown,
 * lib/counselor/eligibility.ts). This script only measures how far that existing mechanism
 * falls short, so the fix is "make it enough," not "add a competing one."
 *
 * FIRST RUN (before the fix): 14 of 18 real "do" opportunity recommendations across 6 real
 * students (78%) carried verdict === "unknown" -- two students with all 3 of their 3 "do"
 * slots unknown. CEO's own conclusion: the 0.6 discount alone is not enough (confirmed against
 * real data, not the ~13-point worst case originally estimated by hand).
 *
 * FIX LANDED (lib/counselor/scoring.ts): a hard ceiling at RANKING_THRESHOLDS.considerFloor on
 * an unknown-eligibility opportunity's final score -- same pattern as
 * lib/opportunities/matching.ts's card-side NO_ELIGIBILITY_DATA_SCORE_CAP, not a new mechanism.
 * Proven red-to-green in __tests__/counselor/scoring.test.ts.
 *
 * SECOND RUN, this version (CEO's own explicit follow-up question, asked BEFORE approving the
 * ceiling be relied on): "if unknowns drop out of the top 3, what fills the slots instead?"
 * Requirement_action and profile_task candidates are always known_eligible by construction
 * (never touched by the ceiling), so the hypothesis was doSlots gets refilled by them rather
 * than emptying -- but that's a hypothesis, not yet a measurement. This run reports, per
 * student and in aggregate: the real post-fix "do" slot composition by candidate kind, how many
 * students end up with zero opportunity-sourced "do" recommendations, and whether any
 * student's total "do" count ever drops below RANKING_THRESHOLDS.doSlots (3) -- the "this
 * week: 3 things" promise (AGENTS.md's own spec) breaking would be a separate, more serious
 * finding than a shape change.
 *
 * Runs the REAL, unmodified pipeline (getCounselorRecommendations -> the same function
 * app/(app)/advisor/page.tsx and app/(app)/dashboard/page.tsx call) against every real
 * onboarded student, with the admin client -- not a synthetic reproduction, not a raw SQL
 * approximation of the ranking logic (which lives in TypeScript, not SQL).
 *
 * Needs SUPABASE_SECRET_KEY -- same access wall as every other live measurement this session
 * (direct SQL denied by this session's own safety classifier; no .env.local in this worktree,
 * confirmed deliberate). Verified independently of live access: the script resolves and runs
 * up to the credential check (see docs/running-server-only-scripts-2026-09-05.md for the
 * "Cannot find module 'server-only'" fix this needed first).
 *
 * Usage:
 *   npm run measure:unknown-eligibility-top3
 *   (or directly: npx tsx --tsconfig tsconfig.eval-cli.json scripts/measure-unknown-eligibility-in-top3.ts)
 */

export {};

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
import { getCounselorRecommendations } from "../lib/counselor";
import type { CounselorRecommendation } from "../lib/counselor";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables.
}

const DO_SLOTS = 3; // lib/counselor/config.ts's RANKING_THRESHOLDS.doSlots, duplicated here
// deliberately rather than imported: this file already reaches into lib/ for the real
// pipeline, but pulling in config.ts's constant just to echo it back in a log line isn't
// worth a second import — if this drifts from the real value, the "of 3" in the printed
// lines would read oddly and prompt a look at config.ts, not silently mismeasure anything
// (doSlotRecommendations.length below is always the REAL count, never DO_SLOTS itself).

type CandidateKind = CounselorRecommendation["evidence"][number]["sourceType"];

function kindOf(r: CounselorRecommendation): CandidateKind {
  // evidence.ts's buildRecommendation always writes exactly one entry, sourceType ===
  // candidate.source.kind — a clean 1:1 mapping, confirmed by reading that file directly.
  return r.evidence[0].sourceType;
}

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY — see API_SETUP.md. Nothing was read.");
    process.exitCode = 1;
    return;
  }

  const admin = createClient<Database>(url, key);

  const { data: profiles, error: profilesError } = await admin.from("profiles").select("id").eq("onboarding_completed", true);
  if (profilesError) {
    console.error("Failed to read profiles:", profilesError.message);
    process.exitCode = 1;
    return;
  }
  const userIds = (profiles ?? []).map((p) => p.id);
  if (userIds.length === 0) {
    console.log("No onboarded students found — nothing to measure.");
    return;
  }

  let studentsMeasured = 0;
  let studentsWithZeroOpportunityDo = 0;
  let studentsBelowDoSlots = 0;
  let remainingUnknownInDo = 0;
  const kindTotals: Record<CandidateKind, number> = { opportunity: 0, requirement_action: 0, profile_task: 0 };
  const perStudent: { userId: string; total: number; opportunity: number; requirement_action: number; profile_task: number; unknownSlippedThrough: number }[] = [];

  for (const userId of userIds) {
    let result;
    try {
      result = await getCounselorRecommendations(userId, "en", admin);
    } catch (error) {
      console.error(`[${userId}] getCounselorRecommendations failed, skipping:`, error instanceof Error ? error.message : error);
      continue;
    }

    const doSlotRecommendations = result.recommendations.filter((r) => r.recommendationClass === "do");
    if (doSlotRecommendations.length === 0) continue;
    studentsMeasured++;

    const byKind: Record<CandidateKind, number> = { opportunity: 0, requirement_action: 0, profile_task: 0 };
    for (const r of doSlotRecommendations) {
      byKind[kindOf(r)]++;
      kindTotals[kindOf(r)]++;
    }

    if (byKind.opportunity === 0) studentsWithZeroOpportunityDo++;
    if (doSlotRecommendations.length < DO_SLOTS) studentsBelowDoSlots++;

    // Sanity check on the fix itself, not the follow-up question — should always be 0 now
    // that the ceiling is live. A non-zero value here would mean the ceiling isn't actually
    // reaching this candidate (e.g. a code path that bypasses scoreOpportunityCandidate),
    // worth flagging loudly rather than silently folding into the totals below.
    const unknownSlippedThrough = doSlotRecommendations.filter((r) => kindOf(r) === "opportunity" && r.eligibility.verdict === "unknown").length;
    remainingUnknownInDo += unknownSlippedThrough;

    perStudent.push({ userId, total: doSlotRecommendations.length, opportunity: byKind.opportunity, requirement_action: byKind.requirement_action, profile_task: byKind.profile_task, unknownSlippedThrough });
  }

  console.log(`Students with at least one "do" recommendation: ${studentsMeasured} of ${userIds.length}`);
  console.log(`Students with ZERO opportunity-sourced "do" recommendations (the slot went entirely to requirement/profile-task instead): ${studentsWithZeroOpportunityDo} of ${studentsMeasured}`);
  console.log(`Students whose total "do" count fell below ${DO_SLOTS} (the "3 things this week" promise): ${studentsBelowDoSlots} of ${studentsMeasured}`);
  console.log("");
  console.log(`"do" slot composition across all measured students: opportunity=${kindTotals.opportunity}, requirement_action=${kindTotals.requirement_action}, profile_task=${kindTotals.profile_task}`);
  if (remainingUnknownInDo > 0) {
    console.error(`WARNING: ${remainingUnknownInDo} unknown-eligibility opportunity recommendation(s) still reached "do" despite the ceiling — the fix is not fully effective, investigate before trusting this ceiling.`);
  } else {
    console.log(`Unknown-eligibility opportunities remaining in any "do" slot: 0 (the ceiling is working as intended).`);
  }
  console.log("");
  console.log("Per student (anonymized by row, not id):");
  perStudent.forEach((s, i) =>
    console.log(
      `  Student ${i + 1}: ${s.total} "do" total — opportunity=${s.opportunity}, requirement_action=${s.requirement_action}, profile_task=${s.profile_task}${s.unknownSlippedThrough > 0 ? ` [${s.unknownSlippedThrough} unknown slipped through!]` : ""}`
    )
  );
}

main();
