import type { CompletenessChecklistKey, CoreChecklistFacts } from "@/lib/scoring/completeness";
import { coreChecklist } from "@/lib/scoring/completeness";
import { currentGradeLevel } from "@/lib/profile/grade-level";
import type { DigestDeadlineItem, DigestOpportunityMatchItem } from "@/lib/digest/build";

/**
 * E1 (2026-09-05, founder's own complaint relayed by CEO: "the applications page isn't very
 * useful for an 11th grader" — true, since applications open senior year). Decision made
 * (CEO, not asked): grade-sensitive, not a static "coming soon" banner — a fixed "this will be
 * useful later" note is exactly as useless as leaving the page blank. So this only returns a
 * non-null result for grades 9-11, and always pairs the "not yet" fact with one real,
 * currently-true "here's what you can do instead" action — never a generic tip.
 *
 * Pure decision function, same split this codebase already uses throughout (
 * filterNotableDimensionChanges/hasNotableMonthlySignal, isDueForMonthlyCommentary): every
 * input here is already-fetched real data, so this is testable against plain fixtures with no
 * Supabase mocking, and the caller (app/(app)/applications/page.tsx) owns fetching it — reusing
 * buildDigestContent's own deadlines/newMatches (already `isOpportunityRecommendable` +
 * competesInCoreRecommendations gated, already used identically by the parent-commentary and
 * student-digest features) rather than writing a third copy of "what's actionable right now."
 *
 * Grade 12 (senior) or an undeterminable grade (no graduation_year on file, or outside 9-12)
 * both return null — per CEO's decision, a senior sees no note at all; an undeterminable grade
 * is treated the same as senior for this purpose (not "assume not yet senior") because showing
 * a confident "come back in N years" statement built on a guess would be exactly the kind of
 * invented specific this product's own discipline forbids elsewhere (deadlines, requirements,
 * admission stats) applied here to grade level.
 */
export type ApplicationsPageGuidanceAction =
  | { kind: "deadline"; title: string; date: string; href: string }
  | { kind: "opportunity"; title: string; organization: string | null; href: string | null }
  | { kind: "profile_gap"; checklistKey: CompletenessChecklistKey }
  | { kind: "none" };

export interface ApplicationsPageGuidance {
  grade: number;
  yearsUntilSenior: number;
  action: ApplicationsPageGuidanceAction;
}

/**
 * Priority order is this function's own product judgment (CEO named the three real sources —
 * an open opportunity, an approaching deadline, a missing profile field — without ranking
 * them): a real deadline is the most time-bound of the three, so it leads; a fresh opportunity
 * match is next most concrete; a profile-completeness gap is the fallback when neither of the
 * other two currently exists — always something, never nothing, for as long as ANY of the
 * three is true. Only when all three are empty does `action.kind` become "none", which the
 * caller must render as a calm, non-urgent line, never a manufactured task.
 */
export function computeApplicationsPageGuidance(params: {
  graduationYear: number | null;
  deadlines: Pick<DigestDeadlineItem, "title" | "date" | "href">[];
  newMatches: Pick<DigestOpportunityMatchItem, "title" | "organization" | "href">[];
  completenessFacts: CoreChecklistFacts;
  asOf?: Date;
}): ApplicationsPageGuidance | null {
  const grade = currentGradeLevel(params.graduationYear, params.asOf);
  if (grade === null || grade === 12) return null;

  const [deadline] = params.deadlines;
  const [match] = params.newMatches;
  const firstGap = coreChecklist(params.completenessFacts).find((item) => !item.done);

  const action: ApplicationsPageGuidanceAction = deadline
    ? { kind: "deadline", title: deadline.title, date: deadline.date, href: deadline.href }
    : match
      ? { kind: "opportunity", title: match.title, organization: match.organization, href: match.href }
      : firstGap
        ? { kind: "profile_gap", checklistKey: firstGap.key }
        : { kind: "none" };

  return { grade, yearsUntilSenior: 12 - grade, action };
}
