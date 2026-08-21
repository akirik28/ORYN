import { describe, expect, test } from "vitest";
import {
  buildUniversityCounselingView,
  type CounselingProgramInput,
  type CounselingRequirementEvaluationInput,
  type CounselingRequirementInput,
  type UniversityCounselingViewInput,
} from "@/lib/universities/counseling-adapter";
import { computeAdmissionOutlook } from "@/lib/admissions/outlook";
import { explainOutlook } from "@/lib/admissions/explain";
import { formatTuition } from "@/lib/universities/tuition-format";
import { formatCurrency } from "@/lib/i18n/format";
import { REQUIREMENT_CATEGORY_LABELS } from "@/lib/requirements/types";
import type { RequirementCategory } from "@/types/database";

function baseInput(overrides: Partial<UniversityCounselingViewInput> = {}): UniversityCounselingViewInput {
  return {
    universityId: "uni-1",
    universityName: "Test University",
    verifiedPrograms: [],
    studentInterestLabels: [],
    requirements: [],
    requirementEvaluations: [],
    tuition: { costOfAttendance: null, internationalTuition: null, domesticTuition: null },
    target: null,
    admissionRate: null,
    profileStrength: 50,
    profileDataConfidence: "medium",
    profileDimensionScores: {},
    ...overrides,
  };
}

function program(overrides: Partial<CounselingProgramInput> & { id: string }): CounselingProgramInput {
  return { name: "Program", degreeLevel: "Bachelor", officialProgramUrl: null, subjectTaxonomy: null, secondarySubjectTags: [], ...overrides };
}

function requirement(overrides: Partial<CounselingRequirementInput> & { id: string }): CounselingRequirementInput {
  return { programId: null, requirementType: "minimum_grade", title: null, isRequired: true, sourceUrl: null, ...overrides };
}

describe("buildUniversityCounselingView — outlook (never a fake acceptance chance)", () => {
  test("outlook is null when the student hasn't targeted this university — never fabricated", () => {
    const view = buildUniversityCounselingView(baseInput({ target: null, admissionRate: 0.2, profileStrength: 80 }));
    expect(view.outlook).toBeNull();
    expect(view.isTarget).toBe(false);
    expect(view.targetStatus).toBeNull();
  });

  test("outlook, when computed, is exactly computeAdmissionOutlook/explainOutlook's own output — no re-derivation", () => {
    const scores = { research: 40, leadership: 90 } as const;
    const view = buildUniversityCounselingView(
      baseInput({
        target: { id: "t1", programId: null, status: "target" },
        admissionRate: 0.3,
        profileStrength: 70,
        profileDataConfidence: "high",
        profileDimensionScores: scores,
      })
    );
    const expectedOutlook = computeAdmissionOutlook({ profileStrength: 70, admissionRate: 0.3, dataConfidence: "high" });
    const expectedExplanation = explainOutlook(scores);

    expect(view.isTarget).toBe(true);
    expect(view.targetStatus).toBe("target");
    expect(view.outlook).not.toBeNull();
    expect(view.outlook!.outlook).toBe(expectedOutlook.outlook);
    expect(view.outlook!.compositeScore).toBe(expectedOutlook.compositeScore);
    expect(view.outlook!.estimateRangeLow).toBe(expectedOutlook.estimateRangeLow);
    expect(view.outlook!.estimateRangeHigh).toBe(expectedOutlook.estimateRangeHigh);
    expect(view.outlook!.estimateConfidence).toBe(expectedOutlook.estimateConfidence);
    expect(view.outlook!.strengths).toEqual(expectedExplanation.strengths);
    expect(view.outlook!.gaps).toEqual(expectedExplanation.gaps);
    expect(view.outlook!.unknowns).toEqual(expectedExplanation.unknowns);
  });
});

/**
 * Regression for docs/research/admissions-systems/implementation-gap/README.md's top-line
 * finding: this adapter was one of the two production callers that never passed an
 * admissions-system input, so it gave every student in every country the same US-style
 * reach/competitive/likely framing. Each test below produced a holistic label before the
 * Gate-1 wiring landed.
 */
describe("buildUniversityCounselingView — Gate 1 (geography-conditional outlook)", () => {
  const targeted = { id: "t1", programId: null, status: "target" } as const;

  test("a Turkish student targeting a Turkish university is told the scale doesn't apply", () => {
    const view = buildUniversityCounselingView(
      baseInput({
        universityName: "Boğaziçi Üniversitesi",
        universityCountry: "Türkiye",
        studentCountry: "Türkiye",
        target: targeted,
        admissionRate: 0.08,
        profileStrength: 92,
        profileDataConfidence: "high",
      })
    );
    expect(view.outlook!.outlook).toBe("not_applicable");
    expect(view.outlook!.notApplicableKind).toBe("no_evidence_review_rank_competitive");
    expect(view.outlook!.estimateRangeLow).toBeNull();
    // Unlike the persisted path, this view carries the explanation with it.
    expect(view.outlook!.notApplicableReason).toContain("ÖSYM");
    expect(view.outlook!.sources.length).toBeGreaterThan(0);
  });

  test("the same student targeting a US university still gets a normal holistic outlook", () => {
    const view = buildUniversityCounselingView(
      baseInput({
        universityName: "Yale University",
        universityCountry: "United States",
        studentCountry: "Türkiye",
        target: targeted,
        admissionRate: 0.05,
        profileStrength: 92,
      })
    );
    expect(view.outlook!.outlook).not.toBe("not_applicable");
    expect(view.outlook!.admissionSystemShape).toBe("holistic_review");
  });

  test("omitting the country fields leaves the outlook exactly as it was before Gate 1 existed", () => {
    const withoutCountry = buildUniversityCounselingView(baseInput({ target: targeted, admissionRate: 0.3, profileStrength: 70 }));
    const expected = computeAdmissionOutlook({ profileStrength: 70, admissionRate: 0.3, dataConfidence: "medium" });
    expect(withoutCountry.outlook!.outlook).toBe(expected.outlook);
    expect(withoutCountry.outlook!.estimateRangeLow).toBe(expected.estimateRangeLow);
    expect(withoutCountry.outlook!.notApplicableReason).toBeNull();
  });

  test("the same Irish university resolves differently for an Irish and a Turkish student", () => {
    const forTurkish = buildUniversityCounselingView(
      baseInput({ universityName: "Trinity College Dublin", universityCountry: "Ireland", studentCountry: "Türkiye", target: targeted, admissionRate: 0.3, profileStrength: 70 })
    );
    const forIrish = buildUniversityCounselingView(
      baseInput({ universityName: "Trinity College Dublin", universityCountry: "Ireland", studentCountry: "Ireland", target: targeted, admissionRate: 0.3, profileStrength: 70 })
    );
    expect(forTurkish.outlook!.outlook).not.toBe("not_applicable");
    expect(forIrish.outlook!.outlook).toBe("not_applicable");
  });

  test("an explicitly targeted German Medicine programme uses the NC field override, not Germany's general shape", () => {
    const medicine = program({ id: "p-med", name: "Humanmedizin", subjectTaxonomy: "medicine" });
    const view = buildUniversityCounselingView(
      baseInput({
        universityName: "Universität Heidelberg",
        universityCountry: "Germany",
        studentCountry: "Türkiye",
        verifiedPrograms: [medicine],
        target: { id: "t1", programId: "p-med", status: "target" },
        admissionRate: 0.1,
        profileStrength: 70,
      })
    );
    expect(view.outlook!.notApplicableKind).toBe("no_evidence_review_rank_competitive");
    expect(view.outlook!.notApplicableReason).toContain("hochschulstart");
  });

  test("outlook stays null when the university isn't a target, whatever the country", () => {
    const view = buildUniversityCounselingView(
      baseInput({ universityCountry: "Türkiye", studentCountry: "Türkiye", target: null, admissionRate: 0.2, profileStrength: 80 })
    );
    expect(view.outlook).toBeNull();
  });
});

/**
 * RULE-ADMISSIONS-021 at both signal strengths. The split matters: an explicitly targeted
 * programme is a claim about the degree path, while an interest label is not — suppressing a
 * real, holistically-reviewed US undergraduate application because a student typed
 * "Medicine" into their interests would swap one wrong answer for another.
 */
describe("buildUniversityCounselingView — undergraduate field existence", () => {
  test("an explicitly targeted undergraduate Medicine programme in the US is not rated", () => {
    const med = program({ id: "p-med", name: "Medicine", subjectTaxonomy: "medicine" });
    const view = buildUniversityCounselingView(
      baseInput({
        universityName: "Harvard University",
        universityCountry: "United States",
        studentCountry: "Türkiye",
        verifiedPrograms: [med],
        target: { id: "t1", programId: "p-med", status: "target" },
        admissionRate: 0.04,
        profileStrength: 88,
      })
    );
    expect(view.outlook!.outlook).toBe("not_applicable");
    expect(view.outlook!.notApplicableKind).toBe("field_not_offered_at_undergraduate");
    expect(view.outlook!.notApplicableReason).toContain("medical school");
  });

  test("a merely stated interest in Medicine surfaces the fact as an action and leaves the outlook intact", () => {
    const view = buildUniversityCounselingView(
      baseInput({
        universityName: "Harvard University",
        universityCountry: "United States",
        studentCountry: "Türkiye",
        studentInterestLabels: ["Medicine"],
        target: { id: "t1", programId: null, status: "target" },
        admissionRate: 0.04,
        profileStrength: 88,
      })
    );
    expect(view.outlook!.outlook).not.toBe("not_applicable");
    const advisory = view.recommendedActions.find((a) => a.label.includes("medical school"));
    expect(advisory).toBeDefined();
    expect(advisory!.detail).toContain("Medicine");
  });

  test("a stated interest in Medicine raises no advisory where Medicine IS an undergraduate degree", () => {
    const view = buildUniversityCounselingView(
      baseInput({
        universityName: "University of Oxford",
        universityCountry: "United Kingdom",
        studentCountry: "Türkiye",
        studentInterestLabels: ["Medicine"],
        target: { id: "t1", programId: null, status: "target" },
        admissionRate: 0.15,
        profileStrength: 88,
      })
    );
    expect(view.recommendedActions.some((a) => a.label.includes("medical school"))).toBe(false);
  });
});

describe("buildUniversityCounselingView — programFocus (target major, not an opaque score)", () => {
  test("an explicit targeted program wins outright over any stated interest", () => {
    const cs = program({ id: "p1", name: "BSc Computer Science", subjectTaxonomy: "computer_science" });
    const econ = program({ id: "p2", name: "BA Economics", subjectTaxonomy: "economics" });
    const view = buildUniversityCounselingView(
      baseInput({
        verifiedPrograms: [cs, econ],
        studentInterestLabels: ["Economics"],
        target: { id: "t1", programId: "p1", status: "target" },
      })
    );
    expect(view.programFocus.interestSource).toBe("target_program");
    expect(view.programFocus.matchedPrograms.map((p) => p.id)).toEqual(["p1"]);
    expect(view.programFocus.matchedSubjectLabel).toBeNull();
  });

  test("a targeted program not present in the verified catalog yields an honest empty match — never silently falls back to interest matching", () => {
    const econ = program({ id: "p2", subjectTaxonomy: "economics" });
    const view = buildUniversityCounselingView(
      baseInput({
        verifiedPrograms: [econ],
        studentInterestLabels: ["Economics"],
        target: { id: "t1", programId: "unverified-or-deleted-program", status: "target" },
      })
    );
    expect(view.programFocus.interestSource).toBe("target_program");
    expect(view.programFocus.matchedPrograms).toEqual([]);
  });

  test("falls back to the student's stated interest when no program is explicitly targeted, matching on primary subject tag", () => {
    const cs = program({ id: "p1", subjectTaxonomy: "computer_science" });
    const view = buildUniversityCounselingView(baseInput({ verifiedPrograms: [cs], studentInterestLabels: ["Computer Science"] }));
    expect(view.programFocus.interestSource).toBe("stated_interest");
    expect(view.programFocus.matchedSubjectLabel).toBe("Computer Science");
    expect(view.programFocus.matchedPrograms.map((p) => p.id)).toEqual(["p1"]);
  });

  test("also matches via a program's secondary subject tags, not only its primary classification", () => {
    const crossListed = program({ id: "p1", subjectTaxonomy: "artificial_intelligence", secondarySubjectTags: ["economics"] });
    const view = buildUniversityCounselingView(baseInput({ verifiedPrograms: [crossListed], studentInterestLabels: ["Economics"] }));
    expect(view.programFocus.matchedPrograms.map((p) => p.id)).toEqual(["p1"]);
  });

  test("an unclassifiable interest is skipped and a later, real interest is used instead", () => {
    const econ = program({ id: "p1", subjectTaxonomy: "economics" });
    const view = buildUniversityCounselingView(baseInput({ verifiedPrograms: [econ], studentInterestLabels: ["Marine Biology", "Economics"] }));
    expect(view.programFocus.matchedSubjectLabel).toBe("Economics");
    expect(view.programFocus.matchedPrograms.map((p) => p.id)).toEqual(["p1"]);
  });

  test("a real, classifiable interest that matches no verified program is still reported (not silently dropped) with an empty match list", () => {
    const cs = program({ id: "p1", subjectTaxonomy: "computer_science" });
    const view = buildUniversityCounselingView(baseInput({ verifiedPrograms: [cs], studentInterestLabels: ["Economics"] }));
    expect(view.programFocus.interestSource).toBe("stated_interest");
    expect(view.programFocus.matchedSubjectLabel).toBe("Economics");
    expect(view.programFocus.matchedPrograms).toEqual([]);
  });

  test("no target program and no classifiable interest at all is 'none' — never guesses a target major the student never stated", () => {
    const view = buildUniversityCounselingView(baseInput({ studentInterestLabels: ["Marine Biology"] }));
    expect(view.programFocus.interestSource).toBe("none");
    expect(view.programFocus.matchedSubjectLabel).toBeNull();
  });

  test("totalVerifiedProgramCount always reflects the full verified catalog, independent of the match", () => {
    const view = buildUniversityCounselingView(baseInput({ verifiedPrograms: [program({ id: "p1" }), program({ id: "p2" })] }));
    expect(view.programFocus.totalVerifiedProgramCount).toBe(2);
  });
});

describe("buildUniversityCounselingView — tuition (US cost-of-attendance never blended with international/domestic)", () => {
  test("US cost_of_attendance takes priority and is used as-is, never mixed with a tuition-only figure", () => {
    const view = buildUniversityCounselingView(
      baseInput({
        tuition: { costOfAttendance: 65000, internationalTuition: { amount: 40000, unit: "GBP/year", precisionState: "exact" }, domesticTuition: null },
      })
    );
    expect(view.tuition.kind).toBe("cost_of_attendance");
    expect(view.tuition.displayValue).toBe(formatCurrency(65000));
  });

  test("an international range figure gets a 'From' prefix and carries the domestic rate in its caption, independently qualified", () => {
    const view = buildUniversityCounselingView(
      baseInput({
        tuition: {
          costOfAttendance: null,
          internationalTuition: { amount: 30000, unit: "GBP/year", precisionState: "range" },
          domesticTuition: { amount: 9250, unit: "GBP/year", precisionState: "exact" },
        },
      })
    );
    expect(view.tuition.kind).toBe("international");
    expect(view.tuition.displayValue).toBe(`From ${formatTuition(30000, "GBP/year")}`);
    expect(view.tuition.caption).toContain("Domestic rate");
    // Regression guard: the international side's "From " qualifier must never leak onto the
    // domestic figure's own display — this is the exact live bug tuitionQualifier's own tests
    // pin down at the formatter level; this test pins it down at the composed-object level too.
    expect(view.tuition.caption).toContain(formatTuition(9250, "GBP/year"));
    expect(view.tuition.caption).not.toContain(`From ${formatTuition(9250, "GBP/year")}`);
  });

  test("domestic-only tuition (no international figure published) is labeled and captioned distinctly, not shown as 'unavailable'", () => {
    const view = buildUniversityCounselingView(
      baseInput({ tuition: { costOfAttendance: null, internationalTuition: null, domesticTuition: { amount: 0, unit: "EUR/year", precisionState: "exact" } } })
    );
    expect(view.tuition.kind).toBe("domestic");
    expect(view.tuition.displayValue).toBe("Free"); // 0 is real data (e.g. German public universities), not missing
    expect(view.tuition.caption).toContain("International fee not");
  });

  test("no tuition data at all is honestly unavailable, never fabricated", () => {
    const view = buildUniversityCounselingView(baseInput());
    expect(view.tuition).toEqual({ kind: "unavailable", displayValue: null, caption: null });
  });
});

describe("buildUniversityCounselingView — requirement rollup and requirementCounts", () => {
  test("an informational requirement (application_deadline) reuses evaluateRequirement's own copy and is excluded from requirementCounts", () => {
    const req = requirement({ id: "r1", requirementType: "application_deadline", title: "Round 1 deadline" });
    const view = buildUniversityCounselingView(baseInput({ requirements: [req] }));
    expect(view.requirements[0].status).toBe("unknown");
    expect(view.requirements[0].reasoning).toContain("Informational");
    expect(view.requirementCounts.unknown).toBe(0);
  });

  test("an unevaluated manual-review requirement (e.g. essay) still resolves via evaluateRequirement's own unconditional branch, without needing facts", () => {
    const req = requirement({ id: "r1", requirementType: "essay" });
    const view = buildUniversityCounselingView(baseInput({ requirements: [req] }));
    expect(view.requirements[0].status).toBe("needs_manual_review");
    expect(view.requirements[0].reasoning.toLowerCase()).toContain("review it yourself");
  });

  test("a requirement with no persisted evaluation and an ordinary evaluable category is honestly 'not yet checked', never assumed met", () => {
    const req = requirement({ id: "r1", requirementType: "minimum_grade" });
    const view = buildUniversityCounselingView(baseInput({ requirements: [req] }));
    expect(view.requirements[0].status).toBe("unknown");
    expect(view.requirements[0].reasoning).toContain("hasn't been checked");
  });

  test("requirementCounts tallies persisted statuses across evaluable requirements, excluding informational rows", () => {
    const reqs = [
      requirement({ id: "r1", requirementType: "minimum_grade" }),
      requirement({ id: "r2", requirementType: "standardized_test" }),
      requirement({ id: "r3", requirementType: "application_deadline" }),
    ];
    const evaluations: CounselingRequirementEvaluationInput[] = [
      { requirementId: "r1", status: "met", reasoning: "x" },
      { requirementId: "r2", status: "not_met", reasoning: "y" },
    ];
    const view = buildUniversityCounselingView(baseInput({ requirements: reqs, requirementEvaluations: evaluations }));
    expect(view.requirementCounts.met).toBe(1);
    expect(view.requirementCounts.not_met).toBe(1);
    expect(view.requirementCounts.unknown).toBe(0);
  });
});

describe("buildUniversityCounselingView — missingEvidence", () => {
  test("a persisted 'unknown' evaluation on an ordinary evaluable category becomes a missing-evidence item, reasoning passed through verbatim", () => {
    const req = requirement({ id: "r1", requirementType: "minimum_grade", title: "Minimum GPA" });
    const evaluation: CounselingRequirementEvaluationInput = { requirementId: "r1", status: "unknown", reasoning: "No GPA is on file yet — add your education record." };
    const view = buildUniversityCounselingView(baseInput({ requirements: [req], requirementEvaluations: [evaluation] }));
    expect(view.missingEvidence).toEqual([{ requirementId: "r1", title: "Minimum GPA", reasoning: evaluation.reasoning }]);
  });

  test("a manual-review category is never counted as missing evidence, even with a fabricated 'unknown' status on it", () => {
    const req = requirement({ id: "r1", requirementType: "essay" });
    const evaluation: CounselingRequirementEvaluationInput = { requirementId: "r1", status: "unknown", reasoning: "hypothetical" };
    const view = buildUniversityCounselingView(baseInput({ requirements: [req], requirementEvaluations: [evaluation] }));
    expect(view.missingEvidence).toEqual([]);
  });

  test("an informational category is never counted as missing evidence", () => {
    const req = requirement({ id: "r1", requirementType: "application_deadline" });
    const view = buildUniversityCounselingView(baseInput({ requirements: [req] }));
    expect(view.missingEvidence).toEqual([]);
  });

  test("a title-less requirement falls back to its category label", () => {
    const req = requirement({ id: "r1", requirementType: "standardized_test", title: null });
    const evaluation: CounselingRequirementEvaluationInput = { requirementId: "r1", status: "unknown", reasoning: "No SAT/ACT score is on file yet." };
    const view = buildUniversityCounselingView(baseInput({ requirements: [req], requirementEvaluations: [evaluation] }));
    expect(view.missingEvidence[0].title).toBe(REQUIREMENT_CATEGORY_LABELS.standardized_test);
  });
});

describe("buildUniversityCounselingView — recommendedActions (deterministic, never a fabricated priority judgment)", () => {
  test("leads with adding the university as a target when it isn't one yet", () => {
    const view = buildUniversityCounselingView(baseInput({ target: null, universityName: "Bocconi" }));
    expect(view.recommendedActions[0].label).toContain("Add Bocconi as a target university");
  });

  test("no target-status action once the university is already a target", () => {
    const view = buildUniversityCounselingView(baseInput({ target: { id: "t1", programId: null, status: "target" } }));
    expect(view.recommendedActions.some((a) => a.label.includes("as a target university"))).toBe(false);
  });

  test("missing-evidence actions are deduplicated by requirement category — two GPA-needing requirements produce one action, not two", () => {
    const reqs = [requirement({ id: "r1", requirementType: "minimum_grade" }), requirement({ id: "r2", requirementType: "minimum_grade" })];
    const evaluations: CounselingRequirementEvaluationInput[] = [
      { requirementId: "r1", status: "unknown", reasoning: "No GPA on file (r1)." },
      { requirementId: "r2", status: "unknown", reasoning: "No GPA on file (r2)." },
    ];
    const view = buildUniversityCounselingView(
      baseInput({ target: { id: "t1", programId: null, status: "target" }, requirements: reqs, requirementEvaluations: evaluations })
    );
    const gpaActions = view.recommendedActions.filter((a) => a.detail === REQUIREMENT_CATEGORY_LABELS.minimum_grade);
    expect(gpaActions).toHaveLength(1);
  });

  test("manual-review categories produce a deduplicated action too, using evaluateRequirement's own 'review it yourself' copy", () => {
    const reqs = [requirement({ id: "r1", requirementType: "essay" }), requirement({ id: "r2", requirementType: "essay" })];
    const view = buildUniversityCounselingView(baseInput({ target: { id: "t1", programId: null, status: "target" }, requirements: reqs }));
    const essayActions = view.recommendedActions.filter((a) => a.detail === REQUIREMENT_CATEGORY_LABELS.essay);
    expect(essayActions).toHaveLength(1);
    expect(essayActions[0].label.toLowerCase()).toContain("review it yourself");
  });

  test("a stated interest matching no verified program produces an explicit 'not verified yet' action naming the interest", () => {
    const cs = program({ id: "p1", subjectTaxonomy: "computer_science" });
    const view = buildUniversityCounselingView(
      baseInput({ target: { id: "t1", programId: null, status: "target" }, verifiedPrograms: [cs], studentInterestLabels: ["Economics"] })
    );
    expect(view.recommendedActions.some((a) => a.label.includes("Economics"))).toBe(true);
  });

  test("zero verified programs at all produces a single explicit action, not silence", () => {
    const view = buildUniversityCounselingView(baseInput({ target: { id: "t1", programId: null, status: "target" }, verifiedPrograms: [] }));
    expect(view.recommendedActions.some((a) => a.label.includes("hasn't verified any programs"))).toBe(true);
  });

  test("recommended actions are always capped, never an unbounded list", () => {
    const types: RequirementCategory[] = ["minimum_grade", "standardized_test", "curriculum", "english_proficiency", "required_subject", "essay", "recommendation"];
    const reqs = types.map((type, i) => requirement({ id: `r${i}`, requirementType: type }));
    const view = buildUniversityCounselingView(baseInput({ target: null, requirements: reqs }));
    expect(view.recommendedActions.length).toBeLessThanOrEqual(5);
  });

  test("a fully-met, fully-matched, already-targeted university has no recommended actions at all", () => {
    const cs = program({ id: "p1", subjectTaxonomy: "computer_science" });
    const req = requirement({ id: "r1", requirementType: "minimum_grade" });
    const evaluation: CounselingRequirementEvaluationInput = { requirementId: "r1", status: "met", reasoning: "Meets it." };
    const view = buildUniversityCounselingView(
      baseInput({
        target: { id: "t1", programId: null, status: "target" },
        verifiedPrograms: [cs],
        studentInterestLabels: ["Computer Science"],
        requirements: [req],
        requirementEvaluations: [evaluation],
      })
    );
    expect(view.recommendedActions).toEqual([]);
  });
});

describe("buildUniversityCounselingView — totality", () => {
  test("never throws on entirely empty input", () => {
    expect(() => buildUniversityCounselingView(baseInput())).not.toThrow();
  });
});
