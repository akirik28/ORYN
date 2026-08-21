import type { CourseLevel, RequirementCategory, RequirementEvaluationStatus } from "@/types/database";
import { StructuredRuleSchema } from "@/lib/validation/requirements";
import {
  INFORMATIONAL_CATEGORIES,
  MANUAL_REVIEW_CATEGORIES,
  type RequirementEvaluationResult,
  type RequirementFacts,
  type RequirementGroupEvaluationResult,
  type RequirementGroupMember,
} from "./types";

/** Rigor ordering used only to compare a course against a rule's `minLevel` — not a
 * general-purpose ranking (that's lib/scoring's job, and it deliberately doesn't rank
 * levels this way for scoring purposes). */
const COURSE_LEVEL_RANK: Record<CourseLevel, number> = {
  regular: 0,
  other: 0,
  honors: 1,
  dual_enrollment: 1,
  ap: 2,
  a_level: 2,
  ib_sl: 2,
  ib_hl: 3,
};

const NO_RULE_RESULT: RequirementEvaluationResult = {
  status: "needs_manual_review",
  reasoning: "No structured rule has been recorded for this requirement yet — check the source link directly.",
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function fuzzyIncludes(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

/**
 * Deterministic, source-free evaluation of one requirement against one student's stored
 * facts (Phase 69). Never calls the AI provider — the rule was already interpreted (by an
 * admin, optionally AI-assisted, see lib/ai/interpret-requirement.ts) before it reached
 * this function; evaluating it against a student's own data is pure comparison logic, the
 * same "deterministic where possible" principle lib/scoring and lib/admissions follow.
 */
export function evaluateRequirement(
  category: RequirementCategory,
  rawStructuredRule: unknown,
  facts: RequirementFacts,
  isExclusion = false
): RequirementEvaluationResult {
  // Migration 0052's comment on university_requirements.is_exclusion already states the
  // contract — "Never auto-resolved by evaluate.ts — always needs_manual_review" — but
  // nothing here read the flag, because ingestion refused to store exclusion rows at all so
  // none could reach this function. Now that they land (lib/requirements/ingest.ts), the
  // check has to exist: an exclusion states who is NOT eligible, so evaluating its text as
  // though it were a threshold to clear inverts it, and a student excluded by a carve-out is
  // told they qualify. Checked before everything else, including structured_rule — a rule
  // authored onto an exclusion row by a later reviewer must not override this.
  if (isExclusion) {
    return {
      status: "needs_manual_review",
      reasoning: "This is a restriction on who is eligible, not a requirement to meet — read the source directly rather than treating it as satisfied.",
    };
  }
  if (MANUAL_REVIEW_CATEGORIES.includes(category)) {
    return {
      status: "needs_manual_review",
      reasoning: "This requirement depends on submitted material Oryn doesn't evaluate automatically — review it yourself.",
    };
  }
  if (INFORMATIONAL_CATEGORIES.includes(category)) {
    return { status: "unknown", reasoning: "Informational — see the listed date, not something to satisfy." };
  }
  if (rawStructuredRule === null || rawStructuredRule === undefined) return NO_RULE_RESULT;

  const parsed = StructuredRuleSchema.safeParse(rawStructuredRule);
  if (!parsed.success) return NO_RULE_RESULT;
  const rule = parsed.data;

  switch (rule.kind) {
    case "curriculum": {
      if (facts.curricula.length === 0) {
        return { status: "unknown", reasoning: "No curriculum is on file yet — add your education record." };
      }
      const match = facts.curricula.find((c) => rule.curricula.includes(c));
      return match
        ? { status: "met", reasoning: `Your ${match.replace(/_/g, " ")} curriculum matches.` }
        : { status: "not_met", reasoning: `Your recorded curriculum (${facts.curricula.join(", ")}) isn't in the accepted list.` };
    }

    case "coursework": {
      if (facts.courses.length === 0) {
        return { status: "unknown", reasoning: "No coursework is on file yet — add your courses." };
      }
      const bySubject = facts.courses.filter((c) => c.subject && fuzzyIncludes(c.subject, rule.subject));
      if (bySubject.length === 0) {
        return { status: "not_met", reasoning: `No course matching "${rule.subject}" is on file.` };
      }
      const exactSubject = bySubject.some((c) => c.subject && normalize(c.subject) === normalize(rule.subject));
      if (!rule.minLevel) {
        return exactSubject
          ? { status: "met", reasoning: `A course in ${rule.subject} is on file.` }
          : { status: "likely_met", reasoning: `A related course ("${bySubject[0].subject}") is on file, close to "${rule.subject}".` };
      }
      const bestLevel = Math.max(...bySubject.map((c) => COURSE_LEVEL_RANK[c.level]));
      const meetsLevel = bestLevel >= COURSE_LEVEL_RANK[rule.minLevel];
      if (!meetsLevel) {
        return { status: "not_met", reasoning: `Your ${rule.subject} coursework doesn't yet reach the required ${rule.minLevel.replace(/_/g, " ")} level.` };
      }
      return exactSubject
        ? { status: "met", reasoning: `Your ${rule.subject} coursework meets the required level.` }
        : { status: "likely_met", reasoning: `A related course ("${bySubject[0].subject}") appears to meet the required level.` };
    }

    case "minimum_grade": {
      if (facts.gpas.length === 0) {
        return { status: "unknown", reasoning: "No GPA is on file yet — add your education record." };
      }
      // Only compare GPAs already on the rule's own scale. A flat linear ratio
      // ((value/scale)*ruleScale) is not a valid way to convert between grading systems —
      // e.g. a Turkish 100-point average and a US 4.0 GPA don't correspond linearly — so
      // this used to produce a confident-looking `likely_met`/`not_met` from a comparison
      // that wasn't actually sound. `lib/scoring/dimensions/academics.ts` already commits
      // to the same "never compare GPA across curricula" principle for scoring; this
      // brings requirement evaluation in line with it rather than quietly disagreeing.
      const sameScale = facts.gpas.filter((gpa) => gpa.scale === rule.scale);
      if (sameScale.length === 0) {
        return {
          status: "needs_manual_review",
          reasoning: `Your GPA is recorded on a different scale than this requirement's ${rule.scale}-point scale — compare it yourself rather than trust an automatic conversion.`,
        };
      }
      const best = Math.max(...sameScale.map((gpa) => gpa.value));
      return best >= rule.minGpa
        ? { status: "met", reasoning: `Your GPA (${best} on a ${rule.scale} scale) meets the required ${rule.minGpa}.` }
        : { status: "not_met", reasoning: `Your GPA (${best} on a ${rule.scale} scale) is below the required ${rule.minGpa}.` };
    }

    case "test_score":
      return evaluateTestScore(rule.testName, rule.minScore, facts);

    case "language_proficiency": {
      if (rule.testName) {
        return evaluateTestScore(rule.testName, rule.minScore, facts);
      }
      if (rule.languageName) {
        const match = facts.languages.find((l) => fuzzyIncludes(l.name, rule.languageName!));
        if (!match) return { status: "unknown", reasoning: `No ${rule.languageName} language entry is on file.` };
        if (!match.proficiency) {
          return { status: "needs_manual_review", reasoning: `${rule.languageName} is on file without a proficiency level — add one to evaluate this automatically.` };
        }
        const strong = /native|fluent/i.test(match.proficiency);
        if (rule.acceptNativeOrFluent && strong) {
          return { status: "met", reasoning: `Your recorded ${rule.languageName} proficiency ("${match.proficiency}") meets this.` };
        }
        return { status: "not_met", reasoning: `Your recorded ${rule.languageName} proficiency ("${match.proficiency}") may not meet this — review manually.` };
      }
      return { status: "needs_manual_review", reasoning: "This requirement doesn't specify enough detail to evaluate automatically." };
    }
  }
}

/** Ordered best-to-worst for combining several inclusion alternatives into one group verdict
 * — "the best individual outcome wins," except not_met, which requires every alternative to
 * agree (see evaluateRequirementGroup). Distinct from the ordering __tests__/requirements/
 * evaluate.test.ts uses for its own "higher score never evaluates worse" check — that one
 * ranks a single requirement's own possible outcomes, this one governs how multiple sibling
 * requirements combine, and needs_manual_review outranks unknown here specifically because an
 * unresolved alternative could still turn out to be the one that's met. */
const GROUP_STATUS_PRIORITY: readonly RequirementEvaluationStatus[] = ["met", "likely_met", "needs_manual_review", "unknown", "not_met"];

/**
 * Combines a requirement_groups set into one verdict (Case B: "any one of N alternatives
 * satisfies this requirement" — Edinburgh's four English-proficiency test routes are the
 * motivating example; a caller previously ran evaluateRequirement() on each row independently,
 * which is exactly the defect this exists to fix: a student with a valid IELTS score being
 * told they failed the TOEFL requirement, a confident wrong answer rather than an honest
 * unknown).
 *
 * Every member is still evaluated individually via evaluateRequirement() — no logic is
 * duplicated — this only adds the combination step on top, and only for 'inclusion' members.
 * 'exclusion' and 'qualifier' members unconditionally force the whole group to
 * needs_manual_review regardless of how the inclusions evaluate, never met or a confident
 * not_met: an exclusion might apply to a student who otherwise looks like they qualify (that
 * is the entire point of an exclusion), and this evaluator has no safe way to determine
 * whether it does — see migration 0052's comment on why exclusions are never auto-resolved by
 * negating the inclusion set. A qualifier is withheld from auto-evaluation for a more mundane
 * reason: RequirementFacts has no field a recency-style qualifier could even be checked
 * against today (no date on a test score), so pretending to evaluate one would silently ignore
 * its actual content rather than honestly deferring to a human reviewer.
 */
export function evaluateRequirementGroup(members: RequirementGroupMember[], facts: RequirementFacts): RequirementGroupEvaluationResult {
  const memberResults = new Map<string, RequirementEvaluationResult>();
  for (const member of members) {
    memberResults.set(member.id, evaluateRequirement(member.category, member.rawStructuredRule, facts, member.isExclusion ?? false));
  }

  // groupRole 'exclusion' implies is_exclusion (migration 0052's
  // university_requirements_exclusion_role_implies_flag), but the converse is not enforced:
  // a row can carry is_exclusion with any groupRole. Both are checked, so a mislabelled
  // exclusion sitting in the inclusion list still cannot be counted as an alternative that
  // satisfies the group.
  if (members.some((m) => m.groupRole === "exclusion" || m.isExclusion)) {
    return {
      status: "needs_manual_review",
      reasoning: "This requirement has an exclusion condition attached that Oryn doesn't evaluate automatically — review the source directly.",
      memberResults,
    };
  }
  if (members.some((m) => m.groupRole === "qualifier")) {
    return {
      status: "needs_manual_review",
      reasoning: "This requirement has an additional condition attached (e.g. a recency window) that Oryn doesn't evaluate automatically — review the source directly.",
      memberResults,
    };
  }

  const inclusions = members.filter((m) => m.groupRole === "inclusion");
  if (inclusions.length === 0) {
    return {
      status: "needs_manual_review",
      reasoning: "This requirement group has no recognized alternatives to evaluate — review the source directly.",
      memberResults,
    };
  }

  let best: { member: RequirementGroupMember; result: RequirementEvaluationResult; rank: number } | null = null;
  for (const member of inclusions) {
    const result = memberResults.get(member.id)!;
    const rank = GROUP_STATUS_PRIORITY.indexOf(result.status);
    if (best === null || rank < best.rank) best = { member, result, rank };
  }
  const { member, result } = best!;

  if (result.status === "met" || result.status === "likely_met") {
    const label = member.title ?? "one of the accepted alternatives";
    return {
      status: result.status,
      reasoning: `${result.reasoning} (${label} — any one of ${inclusions.length} accepted alternatives is enough.)`,
      memberResults,
    };
  }
  if (result.status === "not_met") {
    return { status: "not_met", reasoning: `None of the ${inclusions.length} accepted alternatives are currently met.`, memberResults };
  }
  // needs_manual_review or unknown: surface the best-ranked alternative's own reasoning as-is
  // rather than inventing group-specific phrasing for cases evaluateRequirement already
  // explains well on its own.
  return { status: result.status, reasoning: result.reasoning, memberResults };
}

function evaluateTestScore(testName: string, minScore: number | undefined, facts: RequirementFacts): RequirementEvaluationResult {
  const exact = facts.testScores.filter((t) => normalize(t.testName) === normalize(testName));
  const fuzzy = exact.length > 0 ? exact : facts.testScores.filter((t) => fuzzyIncludes(t.testName, testName));
  if (fuzzy.length === 0) {
    return { status: "unknown", reasoning: `No ${testName} score is on file yet.` };
  }
  const isExactName = exact.length > 0;

  if (minScore === undefined) {
    return isExactName
      ? { status: "met", reasoning: `A ${testName} score is on file.` }
      : { status: "likely_met", reasoning: `A score for a similarly-named test ("${fuzzy[0].testName}") is on file.` };
  }

  const numericScores = fuzzy.map((t) => Number.parseFloat(t.score)).filter((n) => !Number.isNaN(n));
  if (numericScores.length === 0) {
    return { status: "needs_manual_review", reasoning: `A ${testName} score is on file but isn't a plain number Oryn can compare — review it manually.` };
  }
  const best = Math.max(...numericScores);
  if (best < minScore) {
    return { status: "not_met", reasoning: `Your best ${testName} score (${best}) is below the required ${minScore}.` };
  }
  return isExactName
    ? { status: "met", reasoning: `Your best ${testName} score (${best}) meets the required ${minScore}.` }
    : { status: "likely_met", reasoning: `A similarly-named test's score (${best}) meets the required ${minScore}.` };
}
