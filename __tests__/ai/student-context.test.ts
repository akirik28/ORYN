import { describe, expect, test } from "vitest";
import {
  formatContextForPrompt,
  isBusyModeActive,
  timeBudgetLabel,
  reflectionOutcomeLabel,
  requirementTypeLabel,
  courseLevelLabel,
  employmentTypeLabel,
  type StudentAdvisorContext,
} from "@/lib/ai/student-context";
import type { CourseLevel, EmploymentType, EvidenceStatus, ReflectionOutcome, TimeBudget } from "@/types/database";

/** Phase 65: the exact "marked exam week in November, never unmarked, should not still
 * read as busy in March" scenario CEO named — confirmed live nobody clears this
 * automatically (docs/time-budget-busy-mode-audit-2026-09-02.md), fixed here. */
describe("isBusyModeActive", () => {
  test("false when busy_mode itself is false, regardless of the until date", () => {
    expect(isBusyModeActive(false, "2099-01-01", "2026-09-02")).toBe(false);
  });

  test("true when busy_mode is set with no end date — an open-ended busy period", () => {
    expect(isBusyModeActive(true, null, "2026-09-02")).toBe(true);
  });

  test("true when today is before the until date — still genuinely busy", () => {
    expect(isBusyModeActive(true, "2026-09-10", "2026-09-02")).toBe(true);
  });

  test("true on the until date itself — the last day still counts", () => {
    expect(isBusyModeActive(true, "2026-09-02", "2026-09-02")).toBe(true);
  });

  test("false once today is after the until date — the exact bug this closes: marked in November, never unmarked, must not still read as busy in March", () => {
    expect(isBusyModeActive(true, "2026-11-15", "2027-03-01")).toBe(false);
  });
});

function baseContext(overrides: Partial<StudentAdvisorContext> = {}): StudentAdvisorContext {
  return {
    student: {
      displayName: "Test Student",
    preferredLanguage: "en" as const,
      country: null,
      schoolName: null,
      graduationYear: null,
      curriculum: null,
      weeklyTimeBudget: null,
      busyMode: false,
      busyModeUntil: null,
      birthYear: null,
      citizenshipCountries: [],
      tier: "standard",
    },
    profileScores: [],
    overallScore: 50,
    completenessPercent: 50,
    activities: [],
    projects: [],
    research: [],
    awards: [],
    educationRecords: [],
    courses: [],
    testScores: [],
    certifications: [],
    volunteeringExperiences: [],
    workExperiences: [],
    sports: [],
    goals: [],
    interests: [],
    targetUniversities: [],
    upcomingDeadlines: [],
    recentRecommendationTitles: [],
    recentActionOutcomes: [],
    pendingApplicationRequirements: [],
    ...overrides,
  };
}

/**
 * Package 4, docs/handoffs/feat1-territory-audit-2026-08-22.md Finding 1: before this fix,
 * only `self_reported` rendered a tag — `evidence_added` and `verification_rejected` both
 * fell through to the same silence as `verified`, so a claim someone actively disbelieved
 * reached the advisor with full, unflagged certainty.
 */
describe("formatContextForPrompt — evidence status tags", () => {
  function activityWith(evidenceStatus: EvidenceStatus): StudentAdvisorContext {
    return baseContext({ activities: [{ title: "Regional Science Fair", category: "competition", isLeadership: false, ongoing: false, evidenceStatus }] });
  }

  test("self_reported renders [self-reported]", () => {
    expect(formatContextForPrompt(activityWith("self_reported"))).toContain("Regional Science Fair [self-reported]");
  });

  test("evidence_added renders its own distinct tag, not [self-reported] and not silence", () => {
    const text = formatContextForPrompt(activityWith("evidence_added"));
    expect(text).toContain("Regional Science Fair [evidence added, not independently verified]");
    expect(text).not.toContain("Regional Science Fair [self-reported]");
  });

  test("verification_rejected renders its own explicit tag — the core regression this package fixes", () => {
    const text = formatContextForPrompt(activityWith("verification_rejected"));
    expect(text).toContain("Regional Science Fair [verification rejected]");
    // Must not be silently indistinguishable from a verified item (no tag at all).
    expect(text).not.toBe(formatContextForPrompt(activityWith("verified")));
  });

  test("verified renders no evidence tag at all — the one silent, default state", () => {
    const text = formatContextForPrompt(activityWith("verified"));
    expect(text).toContain("Activities (1): Regional Science Fair");
    expect(text).not.toContain("[self-reported]");
    expect(text).not.toContain("[evidence added");
    expect(text).not.toContain("[verification rejected]");
  });

  test("all four states produce visibly different text for the same item — no two collapse together", () => {
    const statuses: EvidenceStatus[] = ["self_reported", "evidence_added", "verified", "verification_rejected"];
    const rendered = statuses.map((s) => formatContextForPrompt(activityWith(s)));
    expect(new Set(rendered).size).toBe(statuses.length);
  });

  test("the tag applies identically across activities, projects, research, and awards", () => {
    const context = baseContext({
      projects: [{ title: "Community App", outcomeSummary: null, ongoing: false, evidenceStatus: "verification_rejected" }],
      research: [{ title: "Youth Unemployment Study", field: "Economics", outputType: "preprint", ongoing: false, evidenceStatus: "verification_rejected" }],
      awards: [{ title: "Debate Trophy", level: "national", evidenceStatus: "verification_rejected" }],
    });
    const text = formatContextForPrompt(context);
    expect(text).toContain("Community App [verification rejected]");
    expect(text).toContain("Youth Unemployment Study [verification rejected]");
    expect(text).toContain("Debate Trophy [verification rejected]");
  });

  test("ongoing and evidence tags compose without clobbering each other", () => {
    const context = baseContext({
      activities: [{ title: "Ongoing Club", category: "club", isLeadership: false, ongoing: true, evidenceStatus: "verification_rejected" }],
    });
    expect(formatContextForPrompt(context)).toContain("Ongoing Club [ongoing] [verification rejected]");
  });
});

/**
 * The prompt is read by a model that then writes prose the student sees, so anything in it
 * that looks like a name will come back out as one. A raw `career_exploration` reached the
 * dashboard's "One thing not to do" card that way on 2026-09-01 — "your career_exploration
 * gap is better addressed by…" — and no test or type could have caught it, because the
 * value was correct at every step except the one that reformats its input freely.
 */
describe("formatContextForPrompt — dimension names are human labels, not column values", () => {
  const withScores: StudentAdvisorContext = {
    ...baseContext(),
    profileScores: [
      { dimension: "career_exploration", score: 12, confidence: "low", state: "limited_evidence" },
      { dimension: "execution_project_depth", score: 40, confidence: "medium", state: "developing" },
      { dimension: "intellectual_curiosity", score: 55, confidence: "high", state: "developing" },
    ],
  };

  test("renders the display label", () => {
    const text = formatContextForPrompt(withScores);
    expect(text).toContain("Execution / Project Depth: Developing (40/100");
  });

  /**
   * 18 of 22 stored weekly actions quoted an "X/100" back at the student on 2026-09-01,
   * including "Academics is 0/100" for a dimension nobody had entered anything for. No
   * component renders overallScore and every surface shows an evidence state instead, so
   * the model was reintroducing precisely what that design decision removed — and a 0 on an
   * unassessed dimension is an absence being reported as a measurement.
   */
  test("an unassessed dimension is described, never given a number to quote", () => {
    const text = formatContextForPrompt(withScores);
    const line = text.split("\n").find((l) => l.includes("Career Exploration"))!;
    expect(line).toContain("Limited evidence");
    expect(line).not.toMatch(/\d+\/100/);
    expect(line).toContain("Oryn has not assessed this");
  });

  test("no snake_case identifier survives anywhere in the prompt", () => {
    // Broader than the three above on purpose: this is the class of bug, not the instance.
    const snakeCase = formatContextForPrompt(withScores).match(/\b[a-z]+(?:_[a-z]+)+\b/g) ?? [];
    const allowed = new Set(["self_reported", "evidence_added", "verification_rejected"]);
    expect(snakeCase.filter((w) => !allowed.has(w))).toEqual([]);
  });

  test("locale is additive — Turkish labels when asked, English by default", () => {
    expect(formatContextForPrompt(withScores, "tr")).toContain("Kariyer Keşfi:");
    expect(formatContextForPrompt(withScores)).toContain("Career Exploration:");
  });
});

/**
 * `extreme_reach` reached four live advisor replies the same way `career_exploration` reached
 * the dashboard: a persisted enum handed to the model raw, then written into prose. The badge
 * has always said "Extreme Reach"; only the prompt disagreed.
 */
describe("formatContextForPrompt — target outlooks use the same words the badge shows", () => {
  test("renders the display label, not the enum member", () => {
    const text = formatContextForPrompt({
      ...baseContext(),
      targetUniversities: [
        { id: "t1", universityId: "u1", programId: null, name: "LSE", status: "target", outlook: "extreme_reach" },
        { id: "t2", universityId: "u2", programId: null, name: "Bocconi", status: "applying", outlook: "competitive" },
      ],
    });
    expect(text).toContain("LSE (target, Extreme Reach)");
    expect(text).toContain("Bocconi (applying, Competitive)");
    expect(text).not.toContain("extreme_reach");
  });

  test("a target with no outlook yet says nothing rather than inventing one", () => {
    const text = formatContextForPrompt({
      ...baseContext(),
      targetUniversities: [{ id: "t1", universityId: "u1", programId: null, name: "LSE", status: "exploring", outlook: null }],
    });
    expect(text).toContain("LSE (exploring)");
  });

  // 2026-09-01: OUTLOOK_LABELS itself had no Turkish counterpart until the same pass that
  // added outlook-badge.tsx's — this line read the raw English map regardless of the
  // student's locale, unlike the dimension-name fix right above it in this same file.
  test("Turkish: renders the same word the badge shows in Turkish, not the English label", () => {
    const text = formatContextForPrompt(
      {
        ...baseContext(),
        targetUniversities: [{ id: "t1", universityId: "u1", programId: null, name: "LSE", status: "target", outlook: "extreme_reach" }],
      },
      "tr",
    );
    expect(text).toContain("LSE (target, Aşırı Zorlu)");
    expect(text).not.toContain("Extreme Reach");
  });
});

/**
 * 2026-09-02 raw-enum-leak sweep: the same class of bug the outlook tests above already
 * cover (a raw DB identifier reaching the model, then a student, per CEO's framing —
 * "the risk is echo, not comprehension") found live in curriculum and weeklyTimeBudget,
 * both interpolated raw with no label accessor at all until this pass.
 */
describe("formatContextForPrompt — curriculum and weekly time budget use real labels", () => {
  test("curriculum renders the readable label, not the raw enum member", () => {
    const text = formatContextForPrompt({ ...baseContext(), student: { ...baseContext().student, curriculum: "turkish_curriculum" } });
    expect(text).not.toContain("turkish_curriculum");
  });

  test("curriculum in Turkish is real Turkish, not the English label carried over", () => {
    const text = formatContextForPrompt({ ...baseContext(), student: { ...baseContext().student, curriculum: "turkish_curriculum" } }, "tr");
    expect(text).toContain("Türk müfredatı");
  });

  test("weeklyTimeBudget renders the readable label, not the raw enum member", () => {
    const text = formatContextForPrompt({ ...baseContext(), student: { ...baseContext().student, weeklyTimeBudget: "5_10h" } });
    expect(text).toContain("5-10 hours");
    expect(text).not.toContain("5_10h");
  });

  test("weeklyTimeBudget in Turkish matches Settings' own wording for the same bucket", () => {
    const text = formatContextForPrompt({ ...baseContext(), student: { ...baseContext().student, weeklyTimeBudget: "under_2h" } }, "tr");
    expect(text).toContain("2 saatten az");
  });

  test("a null curriculum or time budget still says nothing rather than inventing one", () => {
    const text = formatContextForPrompt(baseContext());
    expect(text).toContain("unknown curriculum");
    expect(text).toContain("Weekly time budget: not set");
  });
});

/**
 * Same sweep: reflectionOutcome was interpolated raw ("did_not_work",
 * "opportunity_no_longer_available") in the recent-action-outcomes line.
 */
describe("formatContextForPrompt — reflection outcomes use the same words a student already picked", () => {
  test("renders the readable label, not the raw enum member", () => {
    const text = formatContextForPrompt({
      ...baseContext(),
      recentActionOutcomes: [{ title: "Finish the dataset", status: "completed", reflectionOutcome: "did_not_work", reflectionNote: null }],
    });
    expect(text).toContain("(outcome: Didn't work)");
    expect(text).not.toContain("did_not_work");
  });

  test("Turkish matches weekly-focus.tsx's own catalog wording for the same outcome", () => {
    const text = formatContextForPrompt(
      {
        ...baseContext(),
        recentActionOutcomes: [{ title: "Finish the dataset", status: "completed", reflectionOutcome: "opportunity_no_longer_available", reflectionNote: null }],
      },
      "tr",
    );
    expect(text).toContain("(outcome: Artık mevcut değil)");
  });
});

describe("timeBudgetLabel", () => {
  const ALL: TimeBudget[] = ["under_2h", "2_5h", "5_10h", "10h_plus"];
  test("never returns the raw value in either locale", () => {
    for (const v of ALL) {
      expect(timeBudgetLabel(v, "en")).not.toBe(v);
      expect(timeBudgetLabel(v, "tr")).not.toBe(v);
    }
  });
});

describe("reflectionOutcomeLabel", () => {
  const ALL: ReflectionOutcome[] = ["completed_successfully", "partially_completed", "did_not_work", "opportunity_no_longer_available"];
  test("never returns the raw value in either locale", () => {
    for (const v of ALL) {
      expect(reflectionOutcomeLabel(v, "en")).not.toBe(v);
      expect(reflectionOutcomeLabel(v, "tr")).not.toBe(v);
    }
  });
});

/**
 * Sixth instance, found by oryn-31 during this same sweep and confirmed live: 100% of
 * live application_requirements rows have title IS NULL (createApplication's own insert
 * sets it for every DEFAULT_REQUIREMENTS row), so every one hit the raw requirement_type
 * fallback on every prompt build — not a rare edge case, and already observed once in a
 * real advisor_messages row ("test_score" echoed verbatim).
 */
describe("formatContextForPrompt — pending application requirements fall back to a real label, not the raw type", () => {
  test("a real title is used as-is, requirementType is never consulted", () => {
    const text = formatContextForPrompt({
      ...baseContext(),
      pendingApplicationRequirements: [{ applicationTitle: "MIT", requirementTitle: "Second recommendation letter", requirementType: "recommendation" }],
    });
    expect(text).toContain("Second recommendation letter (MIT)");
  });

  test("a null title falls back to the readable type label, not the raw value", () => {
    const text = formatContextForPrompt({
      ...baseContext(),
      pendingApplicationRequirements: [{ applicationTitle: "MIT", requirementTitle: null, requirementType: "test_score" }],
    });
    expect(text).toContain("Test score (MIT)");
    expect(text).not.toContain("test_score (MIT)");
  });

  test("Turkish matches requirement-chip-grid.tsx's own catalog wording for the same type", () => {
    const text = formatContextForPrompt(
      { ...baseContext(), pendingApplicationRequirements: [{ applicationTitle: "MIT", requirementTitle: null, requirementType: "test_score" }] },
      "tr",
    );
    expect(text).toContain("Sınav puanı (MIT)");
  });

  test("an unmapped/custom requirement_type still degrades to a readable label, not a raw underscore identifier — requirement_type has no closed DB enum", () => {
    const text = formatContextForPrompt({
      ...baseContext(),
      pendingApplicationRequirements: [{ applicationTitle: "MIT", requirementTitle: null, requirementType: "custom_future_type" }],
    });
    expect(text).toContain("custom future type (MIT)");
    expect(text).not.toContain("custom_future_type");
  });
});

describe("requirementTypeLabel", () => {
  test("known types never return the raw value in either locale", () => {
    for (const v of ["application", "transcript", "test_score", "essay", "recommendation", "portfolio", "interview", "financial_aid"]) {
      expect(requirementTypeLabel(v, "en")).not.toContain("_");
      expect(requirementTypeLabel(v, "tr")).not.toContain("_");
    }
  });

  test("an unrecognized value still loses its underscores rather than failing a lookup", () => {
    expect(requirementTypeLabel("some_new_type", "en")).toBe("some new type");
  });
});

/**
 * CEO finding, 2026-09-02: graduationYear was already reaching the model (in the "Student:
 * ..., graduating {year}, ..." line), but nothing told it that's the thing to calibrate
 * ambition and pacing against — the spec's own "scale difficulty to age and experience"
 * (Phase 6.5/8.2) had nowhere to land. Derived from graduationYear specifically, not
 * birthYear: birth_year is null on 4 of 11 onboarded profiles including the founder's own,
 * so a birth-year-based signal would be silently absent for the one real account this
 * product has.
 */
describe("formatContextForPrompt — age/experience calibration", () => {
  const currentYear = new Date().getFullYear();

  test("states years remaining, plural, and explains why it matters", () => {
    const text = formatContextForPrompt({ ...baseContext(), student: { ...baseContext().student, graduationYear: currentYear + 3 } });
    expect(text).toContain("3 years until they apply to university");
    expect(text).toContain("calibrate ambition and pacing to this");
  });

  test("singular grammar for exactly one year remaining", () => {
    const text = formatContextForPrompt({ ...baseContext(), student: { ...baseContext().student, graduationYear: currentYear + 1 } });
    expect(text).toContain("1 year until they apply to university");
    expect(text).not.toContain("1 years");
  });

  test("a graduation year at or before the current year reads as at-or-past, not a negative number", () => {
    const text = formatContextForPrompt({ ...baseContext(), student: { ...baseContext().student, graduationYear: currentYear } });
    expect(text).toContain("at or past their expected graduation year");
    expect(text).not.toMatch(/-\d+ years?/);
  });

  test("never states a computed age or birth year — only the years-remaining implication", () => {
    const text = formatContextForPrompt({ ...baseContext(), student: { ...baseContext().student, graduationYear: currentYear + 2, birthYear: 2009 } });
    expect(text).not.toContain("2009");
    expect(text).not.toMatch(/\d+ years old/);
    expect(text).not.toMatch(/\bage\b/i);
  });

  test("a missing graduation year omits the calibration line entirely, rather than announcing it as unknown", () => {
    const text = formatContextForPrompt(baseContext()); // graduationYear: null by default
    expect(text).not.toContain("calibrate ambition and pacing");
    expect(text).not.toContain("until they apply");
    // The pre-existing bare mention on the Student: line is untouched -- this test is about
    // the new line specifically, not a claim that "unknown" never appears anywhere at all.
    expect(text).toContain("graduating unknown");
  });
});

/**
 * 2026-09-03 -- docs/advisor-context-coverage-2026-09-03.md's headline finding, closed:
 * schoolName was fetched into context.student since the assembler's first version and never
 * rendered, with no comment anywhere explaining why (unlike birthYear/citizenshipCountries,
 * which both have one) -- treated as an oversight and fixed.
 */
describe("formatContextForPrompt — schoolName", () => {
  test("folds into the existing student line rather than a separate one", () => {
    const text = formatContextForPrompt({ ...baseContext(), student: { ...baseContext().student, schoolName: "Robert College" } });
    expect(text).toContain("at Robert College");
  });

  test("a null schoolName adds no stray clause", () => {
    const text = formatContextForPrompt(baseContext()); // schoolName: null by default
    expect(text).not.toContain(" at ,");
    expect(text).not.toContain("at null");
  });
});

/**
 * The headline finding itself: educationRecords/courses/testScores were already fetched by
 * assembleScoringFacts on every call and dropped before reaching the model. This block proves
 * they render, and render through their label accessors rather than as raw enum members --
 * courses.level is now a TRACKED_TYPES entry in ai-prompt-enum-labels.test.ts specifically
 * because this is the first place it reaches lib/ai/.
 */
describe("formatContextForPrompt — raw academic evidence (education, courses, test scores)", () => {
  test("an education record with a GPA shows the school and the GPA", () => {
    const text = formatContextForPrompt({ ...baseContext(), educationRecords: [{ schoolName: "Robert College", overallGpa: 3.82, gpaScale: 4 }] });
    expect(text).toContain("Education (1): Robert College (GPA 3.82/4)");
  });

  test("an education record with no GPA on file still shows the school, with no invented figure", () => {
    const text = formatContextForPrompt({ ...baseContext(), educationRecords: [{ schoolName: "Robert College", overallGpa: null, gpaScale: null }] });
    expect(text).toContain("Education (1): Robert College");
    expect(text).not.toContain("GPA");
  });

  test("no education records renders none, not an empty list", () => {
    const text = formatContextForPrompt(baseContext());
    expect(text).toContain("Education (0): none");
  });

  test("a course renders its readable level label, never the raw enum member", () => {
    const text = formatContextForPrompt({ ...baseContext(), courses: [{ courseName: "Economics HL", level: "ib_hl", gradeValue: "6", gradeScale: "IB 1-7" }] });
    expect(text).toContain("Economics HL [IB Higher Level (HL)]: 6/IB 1-7");
    expect(text).not.toContain("ib_hl");
  });

  test("a course with no grade on file omits the grade suffix but still shows the level", () => {
    const text = formatContextForPrompt({ ...baseContext(), courses: [{ courseName: "Physics SL", level: "ib_sl", gradeValue: null, gradeScale: null }] });
    expect(text).toContain("Physics SL [IB Standard Level (SL)]");
    expect(text).not.toContain("Physics SL [IB Standard Level (SL)]:");
  });

  test("courses in Turkish use real Turkish level labels, not the English carried over", () => {
    const text = formatContextForPrompt({ ...baseContext(), courses: [{ courseName: "Ekonomi", level: "a_level", gradeValue: null, gradeScale: null }] }, "tr");
    expect(text).toContain("A-Level");
  });

  test("a test score renders name, score, and max score", () => {
    const text = formatContextForPrompt({ ...baseContext(), testScores: [{ testName: "SAT", score: "1470", maxScore: "1600", subscores: {} }] });
    expect(text).toContain("SAT: 1470/1600");
  });

  test("subscores render prettified (spaces, not underscores) and are omitted entirely when empty", () => {
    const withSubscores = formatContextForPrompt({
      ...baseContext(),
      testScores: [{ testName: "SAT", score: "1470", maxScore: "1600", subscores: { math: 780, reading_writing: 690 } }],
    });
    expect(withSubscores).toContain("(math: 780, reading writing: 690)");
    expect(withSubscores).not.toContain("reading_writing");

    const withoutSubscores = formatContextForPrompt({
      ...baseContext(),
      testScores: [{ testName: "IB Predicted", score: "38", maxScore: "45", subscores: {} }],
    });
    expect(withoutSubscores).toContain("IB Predicted: 38/45");
    expect(withoutSubscores).not.toContain("IB Predicted: 38/45 (");
  });

  test("no courses or test scores renders none for each, not an empty list", () => {
    const text = formatContextForPrompt(baseContext());
    expect(text).toContain("Courses (0): none");
    expect(text).toContain("Test scores (0): none");
  });
});

/**
 * Same headline finding, the other three already-fetched-and-dropped categories. Work
 * experience's employment_type is the second new TRACKED_TYPES entry.
 */
describe("formatContextForPrompt — certifications, volunteering, work experience", () => {
  test("a certification shows title, organization, and its evidence tag", () => {
    const text = formatContextForPrompt({
      ...baseContext(),
      certifications: [{ title: "CS50x", organization: "HarvardX", evidenceStatus: "evidence_added" }],
    });
    expect(text).toContain("CS50x — HarvardX [evidence added, not independently verified]");
  });

  test("a volunteering entry uses the same ongoing/evidence tag activities and projects already use", () => {
    const text = formatContextForPrompt({
      ...baseContext(),
      volunteeringExperiences: [{ title: "Weekend numeracy volunteer", organization: "TGV", ongoing: true, evidenceStatus: "self_reported" }],
    });
    expect(text).toContain("Weekend numeracy volunteer — TGV [ongoing] [self-reported]");
  });

  test("a work experience shows its readable employment-type label, never the raw enum member", () => {
    const text = formatContextForPrompt({
      ...baseContext(),
      workExperiences: [
        { title: "Summer intern, operations", organization: "Getir", employmentType: "internship", ongoing: false, paid: true, evidenceStatus: "self_reported" },
      ],
    });
    expect(text).toContain("Summer intern, operations — Getir [Internship] [paid]");
    expect(text).not.toContain("[internship]"); // raw enum member is lowercase; the label is not
  });

  test("an unpaid, ongoing work experience shows neither a stray [paid] tag nor loses its ongoing tag", () => {
    const text = formatContextForPrompt({
      ...baseContext(),
      workExperiences: [{ title: "Tutor", organization: "Kumon", employmentType: "part_time_job", ongoing: true, paid: false, evidenceStatus: "verified" }],
    });
    expect(text).toContain("Tutor — Kumon [Part-time job] [ongoing]");
    expect(text).not.toContain("[paid]");
  });

  test("no certifications, volunteering, or work experience renders none for each", () => {
    const text = formatContextForPrompt(baseContext());
    expect(text).toContain("Certifications (0): none");
    expect(text).toContain("Volunteering (0): none");
    expect(text).toContain("Work experience (0): none");
  });
});

/**
 * The two smallest fixes from the same audit: goals.category and interests were both already
 * fetched and typed, just never rendered by this formatter (confirmed: weekly-plan.ts uses this
 * same function, and research-generator.ts's interests param is caller-supplied, not
 * context.interests -- so before this, interests reached no AI feature at all).
 */
describe("formatContextForPrompt — goals category and interests", () => {
  test("a goal with a category shows it alongside the title", () => {
    const text = formatContextForPrompt({ ...baseContext(), goals: [{ title: "Study Economics in the UK", category: "academic" }] });
    expect(text).toContain("Study Economics in the UK [academic]");
  });

  test("a goal with no category shows the title alone, no stray brackets", () => {
    const text = formatContextForPrompt({ ...baseContext(), goals: [{ title: "Launch my startup", category: null }] });
    expect(text).toContain("Launch my startup");
    expect(text).not.toContain("Launch my startup [");
  });

  test("interests render as a plain comma-joined list", () => {
    const text = formatContextForPrompt({ ...baseContext(), interests: ["Economics", "Artificial Intelligence", "Youth Employment"] });
    expect(text).toContain("Interests: Economics, Artificial Intelligence, Youth Employment");
  });

  test("no interests set renders the same 'none set' wording goals already uses, not a blank line", () => {
    const text = formatContextForPrompt(baseContext());
    expect(text).toContain("Interests: none set");
  });
});

describe("courseLevelLabel", () => {
  const ALL: CourseLevel[] = ["regular", "honors", "ap", "ib_hl", "ib_sl", "a_level", "dual_enrollment", "other"];
  test("never returns the raw value in either locale", () => {
    for (const v of ALL) {
      expect(courseLevelLabel(v, "en")).not.toBe(v);
      expect(courseLevelLabel(v, "tr")).not.toBe(v);
    }
  });

  test("English wording matches features/profile/field-config.ts's COURSE_LEVEL_OPTIONS verbatim, not reinvented copy", () => {
    expect(courseLevelLabel("ib_hl", "en")).toBe("IB Higher Level (HL)");
    expect(courseLevelLabel("dual_enrollment", "en")).toBe("Dual enrollment");
  });
});

describe("employmentTypeLabel", () => {
  const ALL: EmploymentType[] = ["internship", "part_time_job", "full_time_job", "apprenticeship", "freelance", "other"];
  test("never returns the raw value in either locale", () => {
    for (const v of ALL) {
      expect(employmentTypeLabel(v, "en")).not.toBe(v);
      expect(employmentTypeLabel(v, "tr")).not.toBe(v);
    }
  });

  test("English wording matches features/profile/field-config.ts's EMPLOYMENT_TYPE_OPTIONS verbatim, not reinvented copy", () => {
    expect(employmentTypeLabel("part_time_job", "en")).toBe("Part-time job");
    expect(employmentTypeLabel("internship", "en")).toBe("Internship");
  });
});
