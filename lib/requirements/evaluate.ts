import type { CourseLevel, RequirementCategory, RequirementEvaluationStatus } from "@/types/database";
import { RequirementQualifiersSchema, StructuredRuleSchema } from "@/lib/validation/requirements";
import {
  INFORMATIONAL_CATEGORIES,
  MANUAL_REVIEW_CATEGORIES,
  SCORE_PROVENANCE_LABELS,
  type EvaluationGate,
  type ManualReviewReason,
  type RecencyRule,
  type RequirementEvaluationResult,
  type RequirementFacts,
  type RequirementGroupEvaluationResult,
  type RequirementGroupMember,
  type RequirementQualifiers,
  type ScoreProvenance,
  type StudentTestScore,
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

function review(reasoning: string, reviewReason: ManualReviewReason): RequirementEvaluationResult {
  return { status: "needs_manual_review", reasoning, reviewReason };
}

const NO_RULE_RESULT = review(
  "No structured rule has been recorded for this requirement yet — check the source link directly.",
  "no_structured_rule"
);

/**
 * What a student is told when a row is gated (migration 0056 §4). Each of these is
 * `needs_manual_review`, but they are not interchangeable sentences: an obligation to enrol
 * if admitted and a missing essay are the same status and must not read the same way.
 * `age_bar` and `binding_commitment` in particular are permanent — no better data lifts
 * them — so the copy says what to do instead of implying Oryn will work it out later.
 */
const GATE_COPY: Record<EvaluationGate, string> = {
  inverted_recency:
    "This university refuses certificates taken AFTER a cut-off date, not before one — the usual \"must be recent enough\" reading is backwards here. Check the exact dates on the source page against your own certificate.",
  recency_window:
    "This qualification has a validity window, and Oryn can't tell whether yours still falls inside it at the point you'd actually apply. Check the window against your certificate date on the source page.",
  unstated_scale:
    "The published threshold is a bare number with no scale stated, so there is nothing safe to compare your score to. Check the source page for the maximum this number is out of.",
  incomparable_scale:
    "This threshold is a rank or a cut-off Oryn can't express as a score, so your number and the requirement aren't the same kind of quantity. Compare them yourself on the source page.",
  named_exclusion:
    "This university refuses some ways of obtaining a score even when the number itself qualifies. Check the source page for which variants it accepts before relying on your result.",
  eligibility_restriction:
    "This is a restriction on who is eligible rather than a threshold to clear, so Oryn won't score it either way. Read it on the source page.",
  age_bar:
    "This depends on your exact date of birth, and Oryn stores only your birth year — deliberately, so it holds as little about you as it can. If you were born in the second half of the year, the year alone can't settle it: check the cut-off date against your own birthday.",
  source_conflict:
    "Two official pages state this differently and neither has been established as correct, so Oryn won't pick one. Check the source directly.",
  historical:
    "This was correct for an application cycle that has already closed, so it may not describe the cycle you're applying in. Check the current page.",
  binding_commitment:
    "This is a commitment, not a box to tick. Applying under this round binds you: if you're admitted you're expected to enrol and to withdraw your other applications. Oryn will never mark it satisfied. Read the agreement in full, with your school counsellor and your family, before you apply.",
};

function gateResult(gate: EvaluationGate): RequirementEvaluationResult {
  return review(GATE_COPY[gate], gate);
}

/**
 * `scale_ambiguity` values that permit automatic evaluation, per migration 0056 §1's own
 * comment: "Anything other than the first two blocks automatic evaluation." Everything else
 * — including a value this code has never seen — blocks. `possibly_discontinued_instrument`
 * is deliberately NOT here.
 */
const SAFE_SCALE_AMBIGUITY = new Set(["none", "resolved_unambiguous"]);

/**
 * Which scales measure the same quantity. Two thresholds are comparable only within a
 * family; `TOEFL_IBT_1_6` and `TOEFL_IBT_0_120_LEGACY` are the same exam and are not
 * comparable at all. `TOEFL_IBT_0_120_UNDATED` sits in the 0-120 family because the number
 * genuinely is out of 120 — what is undated about it is which side of ETS's January 2026
 * rescale it was written on, and that is carried by `scale_ambiguity`, which blocks it.
 *
 * Two values map to no family at all, and that is the finding rather than a gap: within one
 * TR-YÖS cycle Hacettepe publishes 400 of 500, Ankara publishes "440 points" with no
 * denominator on either page, and METU publishes "first 5th percentile". No numeric column
 * holds all three, so the last two resolve to a refusal instead of a family.
 */
const SCALE_FAMILY: Record<string, string> = {
  TOEFL_IBT_1_6: "toefl_ibt_1_6",
  TOEFL_IBT_0_120_LEGACY: "toefl_ibt_0_120",
  TOEFL_IBT_0_120_COMPARABLE: "toefl_ibt_0_120",
  TOEFL_IBT_0_120_UNDATED: "toefl_ibt_0_120",
  IELTS_0_9: "ielts_0_9",
  PTE_ACADEMIC_10_90: "pte_10_90",
  CAMBRIDGE_ENGLISH_SCALE: "cambridge_scale",
  SAT_400_1600: "sat_1600",
  SAT_1600: "sat_1600",
  ACT_1_36: "act_1_36",
  IB_DIPLOMA_0_45: "ib_diploma_45",
  AP_1_5: "ap_1_5",
  GCE_A_LEVEL_LETTER: "a_level_letter",
  TR_YOS_0_500: "tr_yos_500",
  TR_HIGH_SCHOOL_GPA_0_100: "percent_100",
  PERCENT_0_100: "percent_100",
};

/** A threshold on this scale has no denominator anywhere on the source page. Ankara's TR-YÖS
 * rows are the live case: "Minimum 440 points", and nothing states 440 out of what. */
const UNSTATED_SCALES = new Set(["TR_YOS_SCALE_UNSTATED"]);

/** A threshold on this scale is a RANK, not a score. METU admits TR-YÖS applicants "having
 * ranked in the first 5th percentile" — resolving that needs the national distribution for
 * the cycle, which Oryn does not hold and cannot derive from a stored score. */
const RANK_SCALES = new Set(["TR_YOS_PERCENTILE_RANK"]);

/**
 * Instruments whose bare number is not self-describing, so a threshold on them is
 * unevaluable until a scale is stated. Only these two: TOEFL because ETS rescaled it in
 * January 2026 and ends dual reporting in January 2028 (after which a legacy 0-120 threshold
 * is not merely ambiguous but unmeasurable), and TR-YÖS because the denominator is set
 * per-institution rather than nationally. IELTS 6.5, SAT 1400 and the rest are unambiguous
 * and are deliberately left alone — a blanket "every threshold needs a scale column" would
 * turn the whole requirement check into manual review for no truth gained.
 */
const SCALE_QUALIFIER_REQUIRED: { pattern: RegExp; label: string }[] = [
  { pattern: /\btoefl\b/i, label: "TOEFL" },
  { pattern: /\btr[-\s]?y[oö]s\b|\by[oö]s\b/i, label: "TR-YÖS" },
];

function needsScaleQualifier(testName: string): string | null {
  return SCALE_QUALIFIER_REQUIRED.find((entry) => entry.pattern.test(testName))?.label ?? null;
}

/**
 * Places a student's own score on a scale from the two things `test_scores` actually
 * carries: `max_score`, and — where the number itself is decisive — the score.
 *
 * Conservative by construction, and the residue is the point. A recorded TOEFL of 95 cannot
 * be a 1-6 score, so it places cleanly on 0-120 without anyone having filled in a max. A
 * recorded TOEFL of 5 genuinely could be either a strong new-scale result or a failing
 * legacy one, so it places nowhere and the caller falls through to manual review — which is
 * precisely the ETS dual-reporting boundary this whole check exists for, not a gap in it.
 */
export function inferStudentScale(testName: string, score: string, maxScore: string | null | undefined): string | null {
  const max = maxScore?.trim();
  const maxNumeric = max ? Number.parseFloat(max) : Number.NaN;
  const scoreNumeric = Number.parseFloat(score);

  if (/\btoefl\b/i.test(testName)) {
    if (maxNumeric === 120) return "TOEFL_IBT_0_120_UNDATED";
    if (maxNumeric === 6) return "TOEFL_IBT_1_6";
    if (!Number.isNaN(scoreNumeric) && scoreNumeric > 6 && scoreNumeric <= 120) return "TOEFL_IBT_0_120_UNDATED";
    return null;
  }
  if (/\btr[-\s]?y[oö]s\b|\by[oö]s\b/i.test(testName)) {
    // No score-value shortcut here: Hacettepe's 400/500 and Ankara's undenominated "440" are
    // both plausible readings of the same magnitude, which is the whole finding.
    if (maxNumeric === 500) return "TR_YOS_0_500";
    return null;
  }
  return null;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function fuzzyIncludes(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

const NO_QUALIFIERS: RequirementQualifiers = {};

/**
 * Deterministic, source-free evaluation of one requirement against one student's stored
 * facts (Phase 69). Never calls the AI provider — the rule was already interpreted (by an
 * admin, optionally AI-assisted, see lib/ai/interpret-requirement.ts) before it reached
 * this function; evaluating it against a student's own data is pure comparison logic, the
 * same "deterministic where possible" principle lib/scoring and lib/admissions follow.
 *
 * `rawQualifiers` is the requirement row itself (or anything shaped like migration 0056's
 * qualifier columns); pass it and the checks below run, omit it and behaviour is identical
 * to before those columns existed. The ordering matters and is not incidental:
 *
 *   1. the evaluation gate, before the category and before the rule, so no later change to
 *      either can route around a row that has been marked unevaluable;
 *   2. the categories that are never machine-evaluated;
 *   3. a scale the research lane itself flagged as unsafe;
 *   4. only then the rule.
 *
 * Everything here is biased in one direction on purpose. A wrong `met` shown to a student
 * about their own eligibility is the most damaging output this system produces, so every
 * qualifier can only ever make a verdict more cautious — see `applyBlock`.
 */
export function evaluateRequirement(
  category: RequirementCategory,
  rawStructuredRule: unknown,
  facts: RequirementFacts,
  rawQualifiers?: unknown
): RequirementEvaluationResult {
  let qualifiers: RequirementQualifiers = NO_QUALIFIERS;
  if (rawQualifiers !== null && rawQualifiers !== undefined) {
    const parsedQualifiers = RequirementQualifiersSchema.safeParse(rawQualifiers);
    if (!parsedQualifiers.success) {
      return review(
        "Oryn couldn't read the conditions attached to this requirement, so it won't guess at a verdict — check the source link directly.",
        "unreadable_qualifiers"
      );
    }
    qualifiers = parsedQualifiers.data;
  }

  // The gate, before the category and before the rule.
  //
  // `is_exclusion` (migration 0052) resolves to the `eligibility_restriction` gate rather
  // than to a check of its own. 0052's column comment already stated the contract — "Never
  // auto-resolved by evaluate.ts — always needs_manual_review" — but nothing read the flag,
  // because ingestion refused to store exclusion rows so none could reach this function.
  // They land now (lib/requirements/ingest.ts), so the check has to exist: an exclusion
  // states who is NOT eligible, so evaluating its text as though it were a threshold to
  // clear inverts it, and a student excluded by a carve-out is told they qualify.
  //
  // Both concerns wanted to run "before everything else" and both do, because they are one
  // step: a gate and an exclusion are the same kind of fact — a property of the requirement
  // that makes the comparison in `structured_rule` illegitimate, whatever that rule says.
  // So a rule authored onto an exclusion row by a later reviewer cannot override it, and
  // neither can a later change to the category lists below.
  const gate = qualifiers.evaluationGate ?? (qualifiers.isExclusion ? "eligibility_restriction" : null);
  if (gate) return gateResult(gate);


  if (MANUAL_REVIEW_CATEGORIES.includes(category)) {
    return review(
      "This requirement depends on submitted material Oryn doesn't evaluate automatically — review it yourself.",
      "submitted_material"
    );
  }
  if (INFORMATIONAL_CATEGORIES.includes(category)) {
    return { status: "unknown", reasoning: "Informational — see the listed date, not something to satisfy." };
  }

  if (qualifiers.scaleAmbiguity && !SAFE_SCALE_AMBIGUITY.has(qualifiers.scaleAmbiguity)) {
    return review(
      "The scale this requirement's number is measured on couldn't be pinned down from the source, so comparing your result to it wouldn't mean anything. Check the source page.",
      "unstated_scale"
    );
  }

  if (rawStructuredRule === null || rawStructuredRule === undefined) return NO_RULE_RESULT;

  const parsed = StructuredRuleSchema.safeParse(rawStructuredRule);
  if (!parsed.success) return { ...NO_RULE_RESULT, reviewReason: "unreadable_rule" };
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
        return review(
          `Your GPA is recorded on a different scale than this requirement's ${rule.scale}-point scale — compare it yourself rather than trust an automatic conversion.`,
          "gpa_scale_mismatch"
        );
      }
      const best = Math.max(...sameScale.map((gpa) => gpa.value));
      return best >= rule.minGpa
        ? { status: "met", reasoning: `Your GPA (${best} on a ${rule.scale} scale) meets the required ${rule.minGpa}.` }
        : { status: "not_met", reasoning: `Your GPA (${best} on a ${rule.scale} scale) is below the required ${rule.minGpa}.` };
    }

    case "test_score":
      return evaluateTestScore(rule.testName, rule.minScore, rule.minPercentileRank, facts, qualifiers);

    case "language_proficiency": {
      if (rule.testName) {
        return evaluateTestScore(rule.testName, rule.minScore, rule.minPercentileRank, facts, qualifiers);
      }
      if (rule.languageName) {
        const match = facts.languages.find((l) => fuzzyIncludes(l.name, rule.languageName!));
        if (!match) return { status: "unknown", reasoning: `No ${rule.languageName} language entry is on file.` };
        if (!match.proficiency) {
          return review(
            `${rule.languageName} is on file without a proficiency level — add one to evaluate this automatically.`,
            "missing_language_proficiency"
          );
        }
        const strong = /native|fluent/i.test(match.proficiency);
        if (rule.acceptNativeOrFluent && strong) {
          return { status: "met", reasoning: `Your recorded ${rule.languageName} proficiency ("${match.proficiency}") meets this.` };
        }
        return { status: "not_met", reasoning: `Your recorded ${rule.languageName} proficiency ("${match.proficiency}") may not meet this — review manually.` };
      }
      return review("This requirement doesn't specify enough detail to evaluate automatically.", "underspecified_rule");
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
 * A member's own qualifier columns (including its evaluation gate) travel with it and are
 * applied by evaluateRequirement, deliberately per-member rather than per-group: the whole
 * point of a group is that any one alternative suffices, so a gated IELTS route must not
 * block a student who cleanly meets the TOEFL one.
 *
 * 'exclusion' and 'qualifier' members unconditionally force the whole group to
 * needs_manual_review regardless of how the inclusions evaluate, never met or a confident
 * not_met: an exclusion might apply to a student who otherwise looks like they qualify (that
 * is the entire point of an exclusion), and this evaluator has no safe way to determine
 * whether it does — see migration 0052's comment on why exclusions are never auto-resolved by
 * negating the inclusion set. A qualifier is withheld from auto-evaluation for a more mundane
 * reason: a qualifier row carries its condition in prose, and until that condition has been
 * lifted into this module's own vocabulary (a `recency_rule`, an `excluded_provenances` list,
 * an `evaluation_gate`) pretending to evaluate one would silently ignore its actual content
 * rather than honestly deferring to a human reviewer.
 */
/**
 * A group member carries its qualifiers in two places — `rawQualifiers` (the row's 0056
 * columns) and `isExclusion` (0052's applied column, lifted to its own field because it also
 * has a group-level consequence). `evaluateRequirement` takes one qualifier argument, so
 * they are folded together here.
 *
 * A `rawQualifiers` that is present but not an object is passed through untouched rather
 * than replaced with a merged object: it is unreadable, and `evaluateRequirement` must be
 * allowed to fail closed on it. Merging would quietly discard the unreadable value and
 * answer as though the row had been understood.
 */
function memberQualifiers(member: RequirementGroupMember): unknown {
  if (member.isExclusion === undefined) return member.rawQualifiers;
  if (member.rawQualifiers === null || member.rawQualifiers === undefined) return { is_exclusion: member.isExclusion };
  if (typeof member.rawQualifiers !== "object") return member.rawQualifiers;
  return { ...member.rawQualifiers, is_exclusion: member.isExclusion };
}

export function evaluateRequirementGroup(members: RequirementGroupMember[], facts: RequirementFacts): RequirementGroupEvaluationResult {
  const memberResults = new Map<string, RequirementEvaluationResult>();
  for (const member of members) {
    memberResults.set(member.id, evaluateRequirement(member.category, member.rawStructuredRule, facts, memberQualifiers(member)));
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

/**
 * A qualifier may only ever make a verdict more cautious, never better. `unknown` and
 * `not_met` are left alone: "no score on file" already says the honest thing, and a score
 * that misses the number outright is not rescued (nor made more alarming) by how it was
 * obtained or when it was sat. Everything else — including a `met` — yields to the block.
 */
function applyBlock(result: RequirementEvaluationResult, block: RequirementEvaluationResult | null): RequirementEvaluationResult {
  if (!block) return result;
  if (result.status === "unknown" || result.status === "not_met") return result;
  return block;
}

/** ISO `YYYY-MM-DD` strings order lexicographically, so both dated directions are plain
 * string comparisons — no clock is read anywhere in this module, which is why every verdict
 * here is reproducible rather than drifting with the date the test happens to run. */
function violatesWindow(rule: RecencyRule, testDate: string | null | undefined): boolean {
  if (!testDate || !rule.boundaryDate) return false;
  if (rule.direction === "not_valid_on_or_after") return testDate >= rule.boundaryDate;
  if (rule.direction === "not_valid_before") return testDate < rule.boundaryDate;
  return false;
}

function describeWindow(rule: RecencyRule): string {
  if (rule.direction === "not_valid_on_or_after" && rule.boundaryDate) {
    return `this university does not accept results from ${rule.boundaryDate} onwards`;
  }
  if (rule.direction === "not_valid_before" && rule.boundaryDate) {
    return `this threshold only applies to results from ${rule.boundaryDate} onwards`;
  }
  const window = rule.value && rule.unit ? `${rule.value} ${rule.unit}` : "a limited period";
  return `results are only valid for ${window}`;
}

/**
 * Case 1 — a validity window, in whichever direction the source actually states it.
 *
 * METU's rule is bounded from BELOW: "IELTS exams taken on or after the 24th of December
 * 2022 will not be anymore accepted." A max-age model ("at most N years old") does not merely
 * fail to express that, it inverts it — it would tell a student their fresh 2026 certificate
 * qualifies when the freshness is precisely what disqualifies it.
 *
 * `max_age` is never resolved even when a test date is on file, and that is a decision rather
 * than a gap: the window is measured at the point of application, not today, and Oryn does not
 * know when the student will apply. The two dated directions can be resolved, but only ever
 * downwards — a window is never grounds for `met`. METU is the reason: a certificate predating
 * 24 December 2022 clears METU's stated exclusion and is still, in 2026, far outside IELTS's
 * own two-year validity, so "the stated window is satisfied" and "this score is usable" are
 * different claims and only the first is checkable here.
 */
function recencyBlock(rule: RecencyRule, candidates: StudentTestScore[]): RequirementEvaluationResult {
  const violating = candidates.filter((c) => violatesWindow(rule, c.testDate));
  if (candidates.length > 0 && violating.length === candidates.length) {
    const dates = violating.map((c) => c.testDate).filter(Boolean).join(", ");
    return {
      status: "not_met",
      reasoning: `${capitalize(describeWindow(rule))}, and the result you've recorded (${dates}) falls outside that.`,
    };
  }
  return review(
    `This requirement has a validity window — ${describeWindow(rule)} — and Oryn can't confirm your result falls inside it, so it won't call this met. Check the dates on the source page.`,
    rule.direction === "not_valid_on_or_after" ? "inverted_recency" : "recency_window"
  );
}

/**
 * Case 4 — how a score was obtained is a per-institution acceptance decision, never a global
 * property of the test. Southampton lists "(IELTS) Academic UKVI SELT (including One Skill
 * Retake)" among its accepted tests; Edinburgh states "We do not accept IELTS One Skill Retake
 * to meet our English language requirements". Same variant, same number, opposite answers,
 * both official and both current — which is why the excluded list lives on the requirement
 * and a requirement with no list evaluates the score normally.
 *
 * Nothing writes a provenance onto a student's score today, so in production this reliably
 * lands on manual review rather than a pass. That is the outcome the research lane asked for
 * by name ("a numerically-qualifying IELTS One Skill Retake or TOEFL MyBest score must still
 * evaluate to needs_manual_review, not met").
 */
function provenanceBlock(excluded: readonly ScoreProvenance[], candidates: StudentTestScore[]): RequirementEvaluationResult | null {
  if (excluded.length === 0 || candidates.length === 0) return null;
  const refused = candidates.filter((c) => c.provenance && excluded.includes(c.provenance));
  if (refused.length === candidates.length) {
    const names = [...new Set(refused.map((c) => SCORE_PROVENANCE_LABELS[c.provenance!]))].join(", ");
    return {
      status: "not_met",
      reasoning: `Your score qualifies on the number, but this university doesn't accept ${names} — how the score was obtained is what rules it out here, not the result.`,
    };
  }
  if (candidates.every((c) => c.provenance)) return null;
  const names = [...new Set(excluded.map((p) => SCORE_PROVENANCE_LABELS[p]))].join(", ");
  return review(
    `This university doesn't accept ${names} even when the number qualifies, and Oryn doesn't know how your score was obtained — check that yours isn't one of these before relying on it.`,
    "named_exclusion"
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function evaluateTestScore(
  testName: string,
  minScore: number | undefined,
  minPercentileRank: number | undefined,
  facts: RequirementFacts,
  qualifiers: RequirementQualifiers
): RequirementEvaluationResult {
  const ruleScale = qualifiers.testScale ?? null;

  // Case 3 — a rank and a score are not the same kind of quantity, and neither is comparable
  // to a threshold with no published denominator. Checked before the student's own scores are
  // even looked at: these are properties of the requirement, and no amount of student data
  // makes the comparison legitimate.
  if (minPercentileRank !== undefined || (ruleScale && RANK_SCALES.has(ruleScale))) {
    return gateResult("incomparable_scale");
  }
  if (ruleScale && UNSTATED_SCALES.has(ruleScale)) {
    return gateResult("unstated_scale");
  }

  // Case 2 — a bare number on an instrument whose scale is not self-describing. TOEFL was
  // rescaled in January 2026 and ETS ends dual reporting in January 2028, at which point a
  // legacy 0-120 threshold stops being merely ambiguous and becomes unmeasurable.
  const qualifierLabel = needsScaleQualifier(testName);
  if (minScore !== undefined && qualifierLabel && !ruleScale) {
    return review(
      `This ${qualifierLabel} threshold is recorded as a bare number with no scale attached, and ${qualifierLabel} scores aren't comparable across scales — Oryn won't guess which one it means. Check the source page.`,
      "unstated_scale"
    );
  }

  const exact = facts.testScores.filter((t) => normalize(t.testName) === normalize(testName));
  let candidates = exact.length > 0 ? exact : facts.testScores.filter((t) => fuzzyIncludes(t.testName, testName));
  if (candidates.length === 0) {
    return { status: "unknown", reasoning: `No ${testName} score is on file yet.` };
  }
  const isExactName = exact.length > 0;

  // Only enforced for the instruments that actually need a qualifier. Requiring a student to
  // have a recorded scale for IELTS or SAT would gain no truth and would turn every one of
  // those into manual review.
  if (qualifierLabel && ruleScale) {
    const ruleFamily = SCALE_FAMILY[ruleScale] ?? null;
    const placed = candidates.map((c) => ({ score: c, family: SCALE_FAMILY[c.scale ?? inferStudentScale(c.testName, c.score, c.maxScore) ?? ""] ?? null }));
    const comparable = placed.filter((p) => ruleFamily !== null && p.family === ruleFamily).map((p) => p.score);
    if (comparable.length > 0) {
      candidates = comparable;
    } else if (placed.some((p) => p.family === null)) {
      return review(
        `This threshold is stated on the ${ruleScale} scale, and Oryn can't tell which scale your ${testName} result is on — record the maximum your score was out of, or compare it yourself on the source page.`,
        "unstated_student_scale"
      );
    } else {
      return review(
        `Your ${testName} result is on a different scale (${placed[0].family}) than this threshold (${ruleScale}). The two aren't convertible, so Oryn won't compare them.`,
        "incomparable_student_scale"
      );
    }
  }

  const block =
    provenanceBlock(qualifiers.excludedProvenances ?? [], candidates) ??
    (qualifiers.recencyRule ? recencyBlock(qualifiers.recencyRule, candidates) : null);

  if (minScore === undefined) {
    return applyBlock(
      isExactName
        ? { status: "met", reasoning: `A ${testName} score is on file.` }
        : { status: "likely_met", reasoning: `A score for a similarly-named test ("${candidates[0].testName}") is on file.` },
      block
    );
  }

  const numericScores = candidates.map((t) => Number.parseFloat(t.score)).filter((n) => !Number.isNaN(n));
  if (numericScores.length === 0) {
    return applyBlock(
      review(`A ${testName} score is on file but isn't a plain number Oryn can compare — review it manually.`, "non_numeric_score"),
      block
    );
  }
  const best = Math.max(...numericScores);
  if (best < minScore) {
    return { status: "not_met", reasoning: `Your best ${testName} score (${best}) is below the required ${minScore}.` };
  }
  return applyBlock(
    isExactName
      ? { status: "met", reasoning: `Your best ${testName} score (${best}) meets the required ${minScore}.` }
      : { status: "likely_met", reasoning: `A similarly-named test's score (${best}) meets the required ${minScore}.` },
    block
  );
}
