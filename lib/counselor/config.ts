import type { GapSeverity } from "./types";

/**
 * Centralized, documented Counselor Core ranking configuration (docs/counselor-core-plan.md
 * §8). Every magic number the ranking model uses lives here — nowhere else in
 * lib/counselor/*.ts should have an inline weight/threshold literal. These are product
 * ranking heuristics, not a scientifically validated model (spec §14) — editable, and
 * covered by lib/counselor/scoring.ts's tests, not claimed as precise.
 */
export const COUNSELOR_SCORE_VERSION = "counselor_ranking_v1";

/** Applies only to "opportunity" candidates — the only kind with all four dimensions
 * meaningfully computable (see scoring.ts for why requirement_action/profile_task use their
 * own simpler, documented formulas instead of forcing this same shape). */
export const OPPORTUNITY_SCORE_WEIGHTS = {
  gapRelevance: 0.4,
  fieldAlignment: 0.25,
  urgency: 0.15,
  dataQuality: 0.2,
} as const;

export const GAP_SEVERITY_SCORE: Record<GapSeverity, number> = {
  critical: 100,
  moderate: 65,
  minor: 30,
  insufficient_data: 0,
};

/** Days-until-deadline thresholds for the urgency component. */
export const URGENCY_THRESHOLDS = { highDays: 14, mediumDays: 45 } as const;

export const DATA_CONFIDENCE_SCORE = { high: 100, medium: 60, low: 20 } as const;

/** Multiplier applied to the Nth (0-indexed) candidate addressing an already-seen dimension
 * — diminishing weight so three near-identical opportunities in one dimension don't crowd
 * out a genuinely different candidate (spec §45 diversity). Mirrors the diminishing-returns
 * shape lib/scoring/math.ts already uses for the same "reward depth over quantity" idea. */
export const REDUNDANCY_DECAY = 0.75;

/** Effort to meaningfully pursue one candidate, by category. Deliberately coarse (spec
 * §18 — no fake precision); "requirement_action"/"profile_completion" are Counselor Core's
 * own synthetic categories (see candidates.ts), the rest are real `opportunity_category`
 * enum values. Unlisted categories default to "medium" in code, not silently to "low". */
export const EFFORT_BY_CATEGORY: Record<string, "low" | "medium" | "high"> = {
  profile_completion: "low",
  requirement_action: "medium",
  conference: "low",
  competition: "medium",
  scholarship: "medium",
  volunteering: "medium",
  hackathon: "medium",
  online_program: "medium",
  student_program: "medium",
  academic_program: "high",
  summer_program: "high",
  fellowship: "high",
  research: "high",
  internship: "high",
  entrepreneurship: "high",
};

export const RANKING_THRESHOLDS = {
  /** Below this score, a candidate is never promoted to "do" or "consider". */
  considerFloor: 25,
  /** Top-N by score, targeting a real (critical/moderate) gap, become "do". */
  doSlots: 3,
  /** A dimension score at or above this is "already strong" — a candidate whose only
   * matched dimensions are all this strong gets deprioritized rather than recommended. */
  strongDimensionScore: 75,
} as const;

/**
 * A matched dimension at or above this score is never treated as a gap for scoring/copy
 * purposes, even though `rankDimensionGaps` still assigns it some `GapSeverity` (that
 * function ranks all 9 dimensions relative to each other, which is legitimate for
 * `RANKING_THRESHOLDS.strongDimensionScore`'s deprioritize check above — but "ranked below
 * the strongest dimension" is not the same claim as "this is a gap").
 *
 * Found live: a candidate addressing Academics at 94/100 was scored with real gapRelevance
 * credit and rendered "Addresses Academics, a minor current gap (94/100)" — on the same
 * page as the profile-signal panel calling that same dimension "Strong". `severityFor`
 * (gaps.ts) only ever compares a dimension to the single strongest one, so anything short
 * of a tie gets *some* GapSeverity no matter how high its own absolute score is.
 *
 * Sourced from `lib/scoring/signal.ts`'s `evidenceStateFor` — 70 is the exact score that
 * produces the "Strong" label a student sees elsewhere on this same profile, so this is the
 * one number that actually closes the contradiction rather than merely narrowing it.
 * Deliberately not unified with `strongDimensionScore` above (75, Counselor Core's own
 * pre-existing threshold for a different decision) — changing that one could shift which
 * candidates get deprioritized/avoided, a product-tuning call out of scope for this fix.
 */
export const GAP_CLAIM_SCORE_CEILING = 70;

/** Spec §16 — "do not overrecommend". `do` is already capped at doSlots by construction
 * (scoring.ts); this caps the secondary "consider" bucket the same way at the pipeline
 * layer (lib/counselor/pipeline.ts), so the rule lives with the other ranking config
 * instead of being left to the UI to remember. */
export const MAX_CONSIDER_RECOMMENDATIONS = 5;

/** Below this measured profile completeness, Counselor Core should lead with
 * profile-completion tasks and say plainly that it doesn't know the student well enough
 * yet (spec §58's near-empty-profile contract test), rather than presenting judgment-based
 * opportunity/requirement recommendations with unearned confidence. */
export const MIN_COMPLETENESS_FOR_JUDGMENT = 40;
