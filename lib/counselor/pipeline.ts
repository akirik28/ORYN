import { rankDimensionGaps } from "./gaps";
import { generateCandidateActions } from "./candidates";
import { rankCandidates } from "./scoring";
import { buildRecommendation } from "./evidence";
import { COUNSELOR_SCORE_VERSION, MAX_CONSIDER_RECOMMENDATIONS, MIN_COMPLETENESS_FOR_JUDGMENT } from "./config";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import type { CounselorResult, CounselorState } from "./types";

/**
 * Counselor Core Phase I (docs/counselor-core-plan.md §11) — the pure orchestration layer.
 * No database access, no LLM call: takes an already-assembled CounselorState (see
 * lib/counselor/state.ts for the DB-fetching boundary) and returns a complete, fully
 * explained result. This is what makes Counselor Core work even when the AI provider is
 * down (spec §22/§59) — the natural-language narration layer (lib/ai/counselor-explain.ts)
 * is a strictly optional addition on top of this, never a dependency of it.
 *
 * `locale` defaults to English; see evidence.ts's buildRecommendation for the full
 * reasoning. This is the one place it fans out to every downstream generator at once.
 */
export function runCounselorPipeline(state: CounselorState, referenceDate: Date = new Date(), locale: Locale = DEFAULT_LOCALE): CounselorResult {
  const gaps = rankDimensionGaps(state.dimensionScores);
  const candidates = generateCandidateActions(state, locale);
  const ranked = rankCandidates(candidates, gaps, state, referenceDate, locale);

  let considerCount = 0;
  const recommendations = ranked
    .filter((r) => {
      if (r.recommendationClass !== "consider") return true;
      considerCount += 1;
      return considerCount <= MAX_CONSIDER_RECOMMENDATIONS;
    })
    .map((r) => buildRecommendation(r, state, locale));

  const completenessPercent = state.advisor.completenessPercent ?? 0;

  return {
    scoreVersion: COUNSELOR_SCORE_VERSION,
    gaps,
    recommendations,
    profileReadiness: {
      completenessPercent,
      sufficientForJudgment: completenessPercent >= MIN_COMPLETENESS_FOR_JUDGMENT,
    },
  };
}
