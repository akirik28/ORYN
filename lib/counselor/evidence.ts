import { GAP_CLAIM_SCORE_CEILING } from "./config";
import { alreadyStrongWhyLine, gapWhyLine, missingInfoWhyLine, verifiedActiveLine } from "./copy";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import type { CounselorRecommendation, CounselorState, NextActionType, RankedCandidate } from "./types";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function sourceId(candidate: RankedCandidate["candidate"]): string {
  switch (candidate.source.kind) {
    case "opportunity":
      return candidate.source.opportunityId;
    case "requirement_action":
      return candidate.source.requirementId;
    case "profile_task":
      return slugify(candidate.source.checklistKey);
  }
}

function recommendationId(candidate: RankedCandidate["candidate"]): string {
  return `${candidate.source.kind}:${sourceId(candidate)}`;
}

function nextActionFor(candidate: RankedCandidate["candidate"]): { label: string; type: NextActionType; href: string } {
  switch (candidate.source.kind) {
    case "opportunity":
      return { label: "View opportunity", type: "VIEW", href: `/opportunities/${candidate.source.opportunityId}` };
    case "requirement_action":
      return { label: "Review university requirement", type: "VIEW", href: `/universities/${candidate.source.universityId}` };
    case "profile_task":
      return { label: "Update profile", type: "COMPLETE_PROFILE", href: "/profile" };
  }
}

/**
 * Same ceiling as gapRelevanceComponent (scoring.ts) — a dimension already this strong is
 * never described as a *gap*. Found live: Academics at 94/100 (labelled "Strong" on the
 * same page's profile-signal panel) rendered as "Addresses Academics, a minor current gap
 * (94/100)" — a candidate the student was actively told to avoid for touching nothing but
 * an already-strong dimension, explained with copy that called that dimension a weakness.
 *
 * Deliberately not a blanket omission: `deprioritize`/`avoid_for_now` exist specifically
 * *because* every matched dimension is already strong (scoring.ts's deprioritizeEligible/
 * avoidEligible) — for those classes, saying so plainly is the actual reason to show, not
 * something to hide. Only `do`/`consider` copy should never cite a strength as a reason to
 * act; a mixed candidate (e.g. a real Awards gap alongside an already-strong Academics
 * match) keeps its genuine reason and drops only the false one.
 */
function whyForOpportunity(ranked: RankedCandidate, locale: Locale): string[] {
  const isDeprioritized = ranked.recommendationClass === "deprioritize" || ranked.recommendationClass === "avoid_for_now";
  const lines = ranked.matchedGaps
    .filter((g) => isDeprioritized || g.score < GAP_CLAIM_SCORE_CEILING)
    .map((g) =>
      g.score >= GAP_CLAIM_SCORE_CEILING ? alreadyStrongWhyLine(g.dimension, g.score, locale) : gapWhyLine(g.dimension, g.severity, g.score, locale)
    );
  if (ranked.candidate.verificationState === "verified_current") {
    lines.push(verifiedActiveLine(locale));
  }
  return lines;
}

// `match.evaluation.reasoning` comes from lib/requirements/evaluate.ts, a separate,
// ~30-template English-only reasoning generator for university requirement checks
// (curriculum/coursework/GPA/language rules) — out of scope for this pass (flagged as
// follow-up, not silently skipped: see this branch's own status notes). A Turkish student
// currently sees this one line in English inside an otherwise-Turkish recommendation;
// everything else on the same card (title, other why lines, eligibility notes) is Turkish.
function whyForRequirement(ranked: RankedCandidate, state: CounselorState): string[] {
  if (ranked.candidate.source.kind !== "requirement_action") return [];
  const requirementId = ranked.candidate.source.requirementId;
  const match = state.requirementCandidateInputs.find((i) => i.requirement.id === requirementId);
  return match ? [match.evaluation.reasoning] : [];
}

/**
 * Counselor Core Phase H (docs/counselor-core-plan.md §9). Pure — assembles the
 * student-facing contract from an already-ranked candidate. `why` is built from fixed
 * templates parameterized by real fields (gap dimension/severity, or the requirement
 * evaluator's own sourced reasoning string) — never free LLM text, so a recommendation is
 * fully explainable even when the optional LLM narration layer (Phase J) is unavailable.
 *
 * `locale` is optional and defaults to English so every existing caller (weekly-plan.ts,
 * opportunity-context.ts — both feed an English-prompted AI call and have no locale to pass
 * yet) keeps producing byte-identical output. Only app/(app)/advisor/page.tsx and
 * app/(app)/dashboard/page.tsx pass a resolved student locale.
 */
export function buildRecommendation(ranked: RankedCandidate, state: CounselorState, locale: Locale = DEFAULT_LOCALE): CounselorRecommendation {
  const { candidate } = ranked;

  const why =
    candidate.source.kind === "opportunity"
      ? whyForOpportunity(ranked, locale)
      : candidate.source.kind === "requirement_action"
        ? whyForRequirement(ranked, state)
        : [missingInfoWhyLine(locale)];

  return {
    id: recommendationId(candidate),
    title: candidate.title,
    recommendationClass: ranked.recommendationClass,
    why,
    matchedGapDimensions: ranked.matchedGaps.map((g) => g.dimension),
    impact: ranked.impact,
    effort: ranked.effort,
    urgency: ranked.urgency,
    deadline: candidate.deadline,
    costOnFile: candidate.costOnFile,
    applicationRequirements: candidate.applicationRequirements,
    eligibility: ranked.eligibility,
    confidence: ranked.confidence,
    evidence: [{ sourceType: candidate.source.kind, sourceId: sourceId(candidate), sourceUrl: candidate.sourceUrl, verificationState: candidate.verificationState }],
    warnings: ranked.eligibility.verdict === "unknown" ? ranked.eligibility.notes : [],
    nextAction: nextActionFor(candidate),
  };
}
