#!/usr/bin/env node
/**
 * CEO's explicit ask, 2026-09-05: before touching lib/counselor/scoring.ts's existing
 * unknown-eligibility discount (dataQuality * 0.6 when eligibility.verdict === "unknown"),
 * measure how many of the real, live "do"-classified (the dashboard/weekly-plan's actual
 * top-3 -- lib/counselor/config.ts's RANKING_THRESHOLDS.doSlots) recommendations currently
 * have unknown eligibility. "Ölçüm kararı versin" (let the measurement decide): a low count
 * means strengthening the existing discount is enough; a high count may need a hard ceiling,
 * matching the card-side score cap this session already built and proved
 * (lib/opportunities/matching.ts's hasAnyEligibilityDataAtAll / NO_ELIGIBILITY_DATA_SCORE_CAP).
 *
 * Deliberately does NOT add a second eligibility mechanism -- CEO's own instruction: the
 * counselor already has a real, working one (known_eligible/known_ineligible/unknown,
 * lib/counselor/eligibility.ts, plus the dataQuality discount, lib/counselor/scoring.ts:70).
 * This script only measures how far that existing mechanism currently falls short, so the
 * next change is "make it enough," not "add a competing one."
 *
 * Runs the REAL, unmodified pipeline (getCounselorRecommendations -> the same function
 * app/(app)/advisor/page.tsx and app/(app)/dashboard/page.tsx call) against every real
 * onboarded student, with the admin client -- not a synthetic reproduction, not a raw SQL
 * approximation of the ranking logic (which lives in TypeScript, not SQL, unlike the
 * eligibility-badge/digest measurements earlier today).
 *
 * NOT run yet: same access wall as every other live measurement in this session (direct SQL
 * denied by this session's own safety classifier; no .env.local in this worktree, confirmed
 * deliberate). Needs SUPABASE_SECRET_KEY -- hand this off to whoever has it.
 *
 * Usage:
 *   npm run measure:unknown-eligibility-top3
 *   (or directly: npx tsx scripts/measure-unknown-eligibility-in-top3.ts)
 */

export {};

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
import { getCounselorRecommendations } from "../lib/counselor";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables.
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

  // Every real onboarded student — same population CEO's own digest-emptying measurement
  // used ("8 öğrenci"), not a hand-picked sample.
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

  let studentsWithDoSlot = 0;
  let totalDoSlotOpportunityRecommendations = 0;
  let totalUnknownInDoSlot = 0;
  const perStudent: { userId: string; doSlotOpportunities: number; unknown: number }[] = [];

  for (const userId of userIds) {
    let result;
    try {
      result = await getCounselorRecommendations(userId, "en", admin);
    } catch (error) {
      console.error(`[${userId}] getCounselorRecommendations failed, skipping:`, error instanceof Error ? error.message : error);
      continue;
    }

    // "do" = the real top-3 (RANKING_THRESHOLDS.doSlots) — the dashboard's own "This Week"
    // block (lib/counselor/dashboard-contract.ts's thisWeekActions uses the identical filter).
    // Restricted to opportunity-sourced recommendations specifically: requirement_action and
    // profile_task candidates are always known_eligible by construction (evaluateCandidateEligibility's
    // own comment — "generated only from the student's own already-active data"), so they can
    // never be the unknown-eligibility case this measures.
    const doSlotOpportunities = result.recommendations.filter(
      (r) => r.recommendationClass === "do" && r.evidence.some((e) => e.sourceType === "opportunity")
    );
    if (doSlotOpportunities.length === 0) continue;

    studentsWithDoSlot++;
    const unknown = doSlotOpportunities.filter((r) => r.eligibility.verdict === "unknown").length;
    totalDoSlotOpportunityRecommendations += doSlotOpportunities.length;
    totalUnknownInDoSlot += unknown;
    perStudent.push({ userId, doSlotOpportunities: doSlotOpportunities.length, unknown });
  }

  console.log(`Students with at least one opportunity-sourced "do" recommendation: ${studentsWithDoSlot} of ${userIds.length}`);
  console.log(`Total opportunity-sourced "do" recommendations across those students: ${totalDoSlotOpportunityRecommendations}`);
  console.log(`Of those, verdict === "unknown": ${totalUnknownInDoSlot} (${totalDoSlotOpportunityRecommendations > 0 ? Math.round((totalUnknownInDoSlot / totalDoSlotOpportunityRecommendations) * 100) : 0}%)`);
  console.log("");
  console.log("Per student (anonymized by row, not id — no need to print real ids for this question):");
  perStudent.forEach((s, i) => console.log(`  Student ${i + 1}: ${s.unknown} of ${s.doSlotOpportunities} "do" opportunity recommendations are unknown-eligibility`));
}

main();
