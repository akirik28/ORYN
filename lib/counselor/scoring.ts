import { clampScore } from "@/lib/scoring/math";
import { evaluateCandidateEligibility } from "./eligibility";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import {
  DATA_CONFIDENCE_SCORE,
  EFFORT_BY_CATEGORY,
  GAP_CLAIM_SCORE_CEILING,
  GAP_SEVERITY_SCORE,
  OPPORTUNITY_SCORE_WEIGHTS,
  RANKING_THRESHOLDS,
  REDUNDANCY_DECAY,
  URGENCY_THRESHOLDS,
} from "./config";
import type { BoundedLevel, CandidateAction, CounselorState, EligibilityResult, ProfileGap, RankedCandidate, RecommendationClass, ScoreComponent } from "./types";

function toLevel(score: number): BoundedLevel {
  if (score >= 67) return "high";
  if (score >= 34) return "medium";
  return "low";
}

function matchedGapsFor(candidate: CandidateAction, gaps: ProfileGap[]): ProfileGap[] {
  return gaps.filter((g) => candidate.addressesDimensions.includes(g.dimension));
}

function gapRelevanceComponent(matchedGaps: ProfileGap[]): number {
  // A dimension already at/above GAP_CLAIM_SCORE_CEILING earns no gap-relevance credit —
  // matchedGapsFor still lists it (deprioritizeEligible/avoidEligible below need to see it
  // to catch "every matched dimension is already strong"), but a candidate must not be
  // *ranked up* for touching a strength.
  const claimable = matchedGaps.filter((g) => g.score < GAP_CLAIM_SCORE_CEILING);
  if (claimable.length === 0) return 0;
  return Math.max(...claimable.map((g) => GAP_SEVERITY_SCORE[g.severity]));
}

function urgencyComponent(deadline: CandidateAction["deadline"], referenceDate: Date): number {
  if (!deadline) return 0;
  const days = Math.floor((new Date(deadline.date).getTime() - referenceDate.getTime()) / 86_400_000);
  if (days < 0) return 0;
  if (days <= URGENCY_THRESHOLDS.highDays) return 100;
  if (days <= URGENCY_THRESHOLDS.mediumDays) return 60;
  return 20;
}

interface ScoredCandidate {
  candidate: CandidateAction;
  eligibility: EligibilityResult;
  matchedGaps: ProfileGap[];
  score: number;
  scoreBreakdown: Record<ScoreComponent, number>;
  impact: BoundedLevel;
  effort: BoundedLevel;
  urgency: BoundedLevel;
  confidence: BoundedLevel;
}

function scoreOpportunityCandidate(candidate: CandidateAction, gaps: ProfileGap[], state: CounselorState, referenceDate: Date, locale: Locale): Omit<ScoredCandidate, "eligibility"> {
  const matchedGaps = matchedGapsFor(candidate, gaps);
  const source = candidate.source as { kind: "opportunity"; opportunityId: string };
  const entry = state.eligibleOpportunityMatches.find((e) => e.opportunity.id === source.opportunityId);
  // Only .verdict is read below — the notes text itself never surfaces from this call, so
  // the locale threaded through here doesn't change any output, but keeps the signature
  // consistent with scoreCandidate's own (real) eligibility call below.
  const eligibility = evaluateCandidateEligibility(candidate, state, referenceDate, locale);

  const gapRelevance = gapRelevanceComponent(matchedGaps);
  const fieldAlignment = entry?.match.relevance_score ?? 0;
  const urgency = urgencyComponent(candidate.deadline, referenceDate);
  const dataQualityBase = entry ? DATA_CONFIDENCE_SCORE[entry.opportunity.source_confidence] : DATA_CONFIDENCE_SCORE.low;
  const dataQuality = eligibility.verdict === "unknown" ? Math.round(dataQualityBase * 0.6) : dataQualityBase;

  const scoreBreakdown: Record<ScoreComponent, number> = { gapRelevance, fieldAlignment, urgency, dataQuality };
  const score = clampScore(
    gapRelevance * OPPORTUNITY_SCORE_WEIGHTS.gapRelevance +
      fieldAlignment * OPPORTUNITY_SCORE_WEIGHTS.fieldAlignment +
      urgency * OPPORTUNITY_SCORE_WEIGHTS.urgency +
      dataQuality * OPPORTUNITY_SCORE_WEIGHTS.dataQuality
  );

  return {
    candidate,
    matchedGaps,
    score,
    scoreBreakdown,
    impact: toLevel(gapRelevance),
    effort: EFFORT_BY_CATEGORY[candidate.category] ?? "medium",
    urgency: toLevel(urgency),
    confidence: toLevel(dataQuality),
  };
}

function scoreRequirementCandidate(candidate: CandidateAction, state: CounselorState): Omit<ScoredCandidate, "eligibility"> {
  const source = candidate.source as { kind: "requirement_action"; requirementId: string; status: "not_met" | "unknown" };
  const input = state.requirementCandidateInputs.find((i) => i.requirement.id === source.requirementId);
  const score = source.status === "not_met" ? 80 : 55;
  // Absent input means the candidate's own backing requirement wasn't found in state — the
  // same "shouldn't happen but let's be honest when it does" case scoreOpportunityCandidate's
  // `dataQualityBase` handles above with DATA_CONFIDENCE_SCORE.low. This branch used to default
  // to .medium instead — an absence of data reading as a real, moderate confidence level,
  // inconsistent with its own sibling one function up (Tier 2,
  // docs/handoffs/feat1-territory-audit-2026-08-22.md).
  const confidenceScore = input ? DATA_CONFIDENCE_SCORE[input.requirement.data_confidence] : DATA_CONFIDENCE_SCORE.low;

  return {
    candidate,
    matchedGaps: [],
    score,
    scoreBreakdown: { gapRelevance: 0, fieldAlignment: 0, urgency: 0, dataQuality: confidenceScore },
    impact: "high", // a not_met/unknown requirement gates an application the student explicitly targeted
    effort: EFFORT_BY_CATEGORY[candidate.category] ?? "medium",
    urgency: "medium",
    confidence: toLevel(confidenceScore),
  };
}

function scoreProfileTaskCandidate(candidate: CandidateAction, state: CounselorState): Omit<ScoredCandidate, "eligibility"> {
  const completenessPercent = state.advisor.completenessPercent ?? 0;
  const score = clampScore(100 - completenessPercent);
  return {
    candidate,
    matchedGaps: [],
    score,
    scoreBreakdown: { gapRelevance: 0, fieldAlignment: 0, urgency: 0, dataQuality: 100 },
    impact: completenessPercent < 50 ? "high" : "medium",
    effort: EFFORT_BY_CATEGORY[candidate.category] ?? "low",
    urgency: "low",
    confidence: "high", // the student's own profile data, no ambiguity about whether the gap is real
  };
}

function scoreCandidate(candidate: CandidateAction, gaps: ProfileGap[], state: CounselorState, referenceDate: Date, locale: Locale): ScoredCandidate {
  const eligibility = evaluateCandidateEligibility(candidate, state, referenceDate, locale);
  if (candidate.source.kind === "opportunity") {
    return { ...scoreOpportunityCandidate(candidate, gaps, state, referenceDate, locale), eligibility };
  }
  if (candidate.source.kind === "requirement_action") {
    return { ...scoreRequirementCandidate(candidate, state), eligibility };
  }
  return { ...scoreProfileTaskCandidate(candidate, state), eligibility };
}

/** Applies REDUNDANCY_DECAY to the Nth+ candidate touching an already-seen dimension,
 * processed in raw-score order so the strongest candidate for a dimension is never the one
 * discounted. Candidates with no addressesDimensions (requirement_action, profile_task) are
 * never discounted — they aren't competing for the same profile-dimension "slot". */
function applyRedundancyDecay(scored: ScoredCandidate[]): ScoredCandidate[] {
  const byRawScoreDesc = [...scored].sort((a, b) => b.score - a.score);
  const seenCount = new Map<string, number>();
  const adjusted = byRawScoreDesc.map((s) => {
    const dimensions = s.candidate.addressesDimensions;
    const maxSeen = dimensions.length === 0 ? 0 : Math.max(...dimensions.map((d) => seenCount.get(d) ?? 0));
    const decay = REDUNDANCY_DECAY ** maxSeen;
    for (const d of dimensions) seenCount.set(d, (seenCount.get(d) ?? 0) + 1);
    return { ...s, score: clampScore(s.score * decay) };
  });
  return adjusted;
}

function strongestGap(gaps: ProfileGap[]): ProfileGap | null {
  if (gaps.length === 0) return null;
  return [...gaps].sort((a, b) => b.score - a.score)[0];
}

/**
 * Counselor Core Phase G (docs/counselor-core-plan.md §8). Deterministic, centrally
 * configured (lib/counselor/config.ts) ranking — no LLM involvement. known_ineligible
 * candidates never reach the output (spec invariant). recommendationClass reuses the
 * existing `recommendation_class` enum (do/consider/deprioritize/avoid_for_now) —
 * deprioritize/avoid_for_now are produced deterministically here rather than left unused,
 * per docs/known-issues.md's documented gap.
 *
 * `locale` defaults to English; see evidence.ts's buildRecommendation for why this is safe
 * for every existing caller.
 */
export function rankCandidates(
  candidates: CandidateAction[],
  gaps: ProfileGap[],
  state: CounselorState,
  referenceDate: Date = new Date(),
  locale: Locale = DEFAULT_LOCALE
): RankedCandidate[] {
  const eligible = candidates
    .map((c) => scoreCandidate(c, gaps, state, referenceDate, locale))
    .filter((s) => s.eligibility.verdict !== "known_ineligible");

  const adjusted = applyRedundancyDecay(eligible).sort((a, b) => b.score - a.score);

  const strong = strongestGap(gaps);
  const deprioritizeEligible = (s: ScoredCandidate) => s.matchedGaps.length > 0 && s.matchedGaps.every((g) => g.score >= RANKING_THRESHOLDS.strongDimensionScore);
  const avoidEligible = (s: ScoredCandidate) => deprioritizeEligible(s) && strong !== null && s.matchedGaps.every((g) => g.dimension === strong.dimension);

  const avoidCandidateIds = new Set(
    adjusted
      .filter(avoidEligible)
      .slice(0, 1) // adjusted is already score-desc, so the first is the highest-scoring
      .map((s) => s.candidate.source)
  );

  let doSlotsUsed = 0;
  const result: RankedCandidate[] = adjusted.map((s) => {
    let recommendationClass: RecommendationClass;
    if (avoidCandidateIds.has(s.candidate.source)) {
      recommendationClass = "avoid_for_now";
    } else if (deprioritizeEligible(s)) {
      recommendationClass = "deprioritize";
    } else if (s.score <= RANKING_THRESHOLDS.considerFloor) {
      recommendationClass = "deprioritize";
    } else if (doSlotsUsed < RANKING_THRESHOLDS.doSlots) {
      recommendationClass = "do";
      doSlotsUsed += 1;
    } else {
      recommendationClass = "consider";
    }

    return {
      candidate: s.candidate,
      eligibility: s.eligibility,
      matchedGaps: s.matchedGaps,
      score: s.score,
      scoreBreakdown: s.scoreBreakdown,
      impact: s.impact,
      effort: s.effort,
      urgency: s.urgency,
      confidence: s.confidence,
      recommendationClass,
    };
  });

  return result;
}
