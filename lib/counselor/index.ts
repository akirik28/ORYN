import "server-only";

import { getCounselorState } from "./state";
import { runCounselorPipeline } from "./pipeline";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import type { CounselorResult } from "./types";

export type {
  CandidateAction,
  CounselorRecommendation,
  CounselorResult,
  CounselorState,
  EligibilityResult,
  EligibilityVerdict,
  ProfileGap,
  ProfileStrength,
  RankedCandidate,
  StrengthTier,
} from "./types";
export type { CounselorDashboardContract } from "./dashboard-contract";
export { buildCounselorDashboardContract } from "./dashboard-contract";
export { rankDimensionStrengths } from "./strengths";

/**
 * Counselor Core's single public entry point (docs/counselor-core-plan.md). Assembles the
 * student's current state and runs the fully deterministic gap/candidate/eligibility/
 * ranking/evidence pipeline — no LLM call happens here. Callers that also want the optional
 * narrated summary call lib/ai/counselor-explain.ts separately afterward and merge it in;
 * this function's output is already complete and student-facing on its own.
 *
 * `locale` defaults to English. lib/ai/weekly-plan.ts and lib/ai/opportunity-context.ts call
 * this without one deliberately — they feed an English-prompted AI call, and mixing a
 * Turkish `why` line into an English prompt context is exactly the incoherence a later,
 * separate pass (the counselor's own AI system prompt) needs to solve properly, not this
 * one accidentally. Only app/(app)/advisor/page.tsx and app/(app)/dashboard/page.tsx pass
 * the resolved student locale.
 */
export async function getCounselorRecommendations(
  userId: string,
  locale: Locale = DEFAULT_LOCALE,
  supabaseClient?: Parameters<typeof getCounselorState>[2],
): Promise<CounselorResult> {
  const state = await getCounselorState(userId, locale, supabaseClient);
  return runCounselorPipeline(state, new Date(), locale);
}
