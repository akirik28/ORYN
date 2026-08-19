import "server-only";

import { getCounselorState } from "./state";
import { runCounselorPipeline } from "./pipeline";
import type { CounselorResult } from "./types";

export type {
  CandidateAction,
  CounselorRecommendation,
  CounselorResult,
  CounselorState,
  EligibilityResult,
  EligibilityVerdict,
  ProfileGap,
  RankedCandidate,
} from "./types";

/**
 * Counselor Core's single public entry point (docs/counselor-core-plan.md). Assembles the
 * student's current state and runs the fully deterministic gap/candidate/eligibility/
 * ranking/evidence pipeline — no LLM call happens here. Callers that also want the optional
 * narrated summary call lib/ai/counselor-explain.ts separately afterward and merge it in;
 * this function's output is already complete and student-facing on its own.
 */
export async function getCounselorRecommendations(userId: string): Promise<CounselorResult> {
  const state = await getCounselorState(userId);
  return runCounselorPipeline(state);
}
