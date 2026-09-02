import { describe, expect, test } from "vitest";
import { formatContextForPrompt, isBusyModeActive, timeBudgetLabel, reflectionOutcomeLabel, type StudentAdvisorContext } from "@/lib/ai/student-context";
import type { EvidenceStatus, ReflectionOutcome, TimeBudget } from "@/types/database";

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
    },
    profileScores: [],
    overallScore: 50,
    completenessPercent: 50,
    activities: [],
    projects: [],
    research: [],
    awards: [],
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
