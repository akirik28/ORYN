import { describe, expect, test } from "vitest";
import { computeCareerProfile } from "@/lib/scoring";
import { buildProfileSignal, isAssessed, signalCoverage } from "@/lib/scoring/signal";
import type { ScoringFacts } from "@/lib/scoring/types";

/**
 * End-to-end persona checks: real facts → real scoring → the signal the UI renders.
 *
 * The founder-reported symptom was never visible in a per-dimension unit test. It only
 * appeared when a whole profile was scored and the nine results were read together: a
 * near-complete student saw six simultaneous negative-looking rows. These tests assert
 * that whole-profile shape, which is the level the bug actually lived at.
 *
 * Personas are the four named in the brief.
 */

const mk = <T extends Record<string, unknown>>(o: T, i: number) =>
  ({ id: `id-${i}`, user_id: "u1", created_at: "", updated_at: "", ...o }) as unknown as never;

function facts(over: Partial<ScoringFacts> = {}): ScoringFacts {
  return {
    referenceDate: new Date("2026-01-01"),
    educationRecords: [],
    courses: [],
    testScores: [],
    activities: [],
    awards: [],
    certifications: [],
    projects: [],
    researchExperiences: [],
    volunteeringExperiences: [],
    workExperiences: [],
    ...over,
  } as ScoringFacts;
}

/** No records at all — a student who just signed up. */
const SPARSE = facts();

/** Grade 10: real coursework, one club, one volunteering commitment. Nothing exotic. */
const GRADE_10 = facts({
  educationRecords: [mk({ school_name: "City High", overall_gpa: 3.5, gpa_scale: 4, is_current: true, start_date: "2023-09-01", end_date: null }, 1)],
  courses: ["Maths", "Physics", "English", "History"].map((s, i) =>
    mk({ course_name: s, subject: s, level: "regular", grade_value: "B+", grade_scale: "A-F" }, i),
  ),
  activities: [mk({ title: "Science Club", category: "stem", is_leadership_role: false, ongoing: true, start_date: "2024-09-01", end_date: null, hours_per_week: 2, weeks_per_year: 30 }, 10)],
  volunteeringExperiences: [mk({ title: "Library helper", organization: "City Library", ongoing: true, start_date: "2024-06-01", end_date: null, hours_per_week: 3, weeks_per_year: 30, cause_area: "Education" }, 20)],
});

/** Grade 11: AP load, a leadership role, a project, an award, an internship. */
const GRADE_11 = facts({
  educationRecords: [mk({ school_name: "City High", overall_gpa: 3.9, gpa_scale: 4, is_current: true, start_date: "2022-09-01", end_date: null }, 1)],
  courses: ["Maths", "Physics", "Economics", "History", "Biology"].map((s, i) =>
    mk({ course_name: s, subject: s, level: "ap", grade_value: "A", grade_scale: "A-F" }, i),
  ),
  testScores: [mk({ test_name: "SAT", score: "1480", max_score: "1600" }, 30)],
  activities: [
    mk({ title: "Debate Society President", category: "debate", is_leadership_role: true, people_led: 25, organization_scope: "school", ongoing: true, start_date: "2024-09-01", end_date: null, hours_per_week: 5, weeks_per_year: 32 }, 10),
    mk({ title: "Maths Olympiad Club", category: "stem", is_leadership_role: false, ongoing: true, start_date: "2024-01-01", end_date: null, hours_per_week: 3, weeks_per_year: 30 }, 11),
  ],
  awards: [mk({ title: "Regional Maths Medal", level: "regional", award_date: "2025-04-01" }, 40)],
  projects: [mk({ title: "Study app", start_date: "2024-06-01", end_date: null, ongoing: true, shipped: true, users_reached: 400, role: "Builder" }, 50)],
  workExperiences: [mk({ title: "Summer intern", organization: "Local Firm", employment_type: "internship", start_date: "2025-06-01", end_date: "2025-08-01" }, 60)],
  certifications: [mk({ title: "CS50" }, 70)],
  volunteeringExperiences: [mk({ title: "Peer tutor", organization: "School", ongoing: true, start_date: "2024-09-01", end_date: null, hours_per_week: 3, weeks_per_year: 30, cause_area: "Education" }, 20)],
});

/** Near-complete high achiever: the persona the brief says must not look weak. */
const HIGH_ACHIEVER = facts({
  educationRecords: [mk({ school_name: "City High", overall_gpa: 4, gpa_scale: 4, is_current: true, start_date: "2022-09-01", end_date: null }, 1)],
  courses: ["Maths", "Further Maths", "Physics", "Economics", "History", "Biology", "Computer Science"].map((s, i) =>
    mk({ course_name: s, subject: s, level: "ap", grade_value: "A", grade_scale: "A-F" }, i),
  ),
  testScores: [mk({ test_name: "SAT", score: "1550", max_score: "1600" }, 30), mk({ test_name: "TOEFL", score: "115", max_score: "120" }, 31)],
  activities: [
    mk({ title: "Student Council President", category: "leadership", is_leadership_role: true, people_led: 600, organization_scope: "school", ongoing: true, start_date: "2023-09-01", end_date: null, hours_per_week: 8, weeks_per_year: 36 }, 10),
    mk({ title: "Robotics Team Captain", category: "stem", is_leadership_role: true, people_led: 20, organization_scope: "national", ongoing: true, start_date: "2023-01-01", end_date: null, hours_per_week: 8, weeks_per_year: 34 }, 11),
    mk({ title: "Debate", category: "debate", is_leadership_role: false, ongoing: true, start_date: "2023-09-01", end_date: null, hours_per_week: 4, weeks_per_year: 30 }, 12),
  ],
  awards: [
    mk({ title: "National Physics Olympiad", level: "national", award_date: "2025-03-01" }, 40),
    mk({ title: "Regional Robotics Award", level: "regional", award_date: "2024-05-01" }, 41),
  ],
  projects: [
    mk({ title: "Tutoring marketplace", start_date: "2023-06-01", end_date: null, ongoing: true, shipped: true, users_reached: 5000, revenue_amount: 4000, is_venture: true, role: "Founder" }, 50),
  ],
  researchExperiences: [
    mk({ title: "Economics of youth unemployment", field: "Economics", output_type: "preprint", methodology: "Panel regression across OECD data", mentor_name: "Dr Yilmaz", independence_level: "independent", start_date: "2024-09-01", end_date: null }, 80),
  ],
  workExperiences: [
    mk({ title: "Research intern", organization: "University Lab", employment_type: "internship", start_date: "2025-06-01", end_date: "2025-08-15" }, 60),
    mk({ title: "Barista", organization: "Cafe", employment_type: "part_time", start_date: "2024-06-01", end_date: "2024-09-01" }, 61),
  ],
  volunteeringExperiences: [
    mk({ title: "STEM outreach volunteer", organization: "Local NGO", ongoing: true, start_date: "2023-09-01", end_date: null, hours_per_week: 4, weeks_per_year: 44, cause_area: "Education" }, 20),
  ],
  certifications: [mk({ title: "CS50" }, 70), mk({ title: "Google Data Analytics" }, 71)],
});

function signalFor(f: ScoringFacts) {
  const result = computeCareerProfile(f);
  return buildProfileSignal(
    result.dimensions.map((d) => ({
      dimension: d.dimension,
      score: d.score,
      confidence: d.confidence,
      reasonCodes: d.reasonCodes,
    })),
  );
}

describe("persona: sparse new student", () => {
  test("nothing is presented as weakness — it's all simply unrecorded", () => {
    const signal = signalFor(SPARSE);
    expect(signal.every((s) => s.state === "not_assessed")).toBe(true);
    expect(signal.some((s) => isAssessed(s.state))).toBe(false);
  });
});

describe("persona: reasonably complete Grade 10 student", () => {
  test("Proxola assesses what it was told about and stays quiet on the rest", () => {
    const signal = signalFor(GRADE_10);
    const coverage = signalCoverage(signal);
    expect(coverage.assessed).toBeGreaterThan(0);
    // The areas this student genuinely hasn't touched must read as unrecorded, not weak.
    const research = signal.find((s) => s.dimension === "research")!;
    expect(research.state).toBe("not_assessed");
  });
});

describe("persona: highly engaged Grade 11 student", () => {
  const signal = signalFor(GRADE_11);

  test("has real assessed strengths", () => {
    expect(signal.some((s) => s.state === "strong" || s.state === "developing")).toBe(true);
  });

  // Three areas read as thin here, and that is the correct answer rather than a number to
  // tune away: this student has one regional medal, one small project and one tutoring
  // role. The founder's complaint was about a *near-complete* profile looking weak, which
  // the high-achiever persona below covers. Loosening the scale until this student showed
  // no thin areas would be inflation, which the brief rules out explicitly — the fix is
  // that "thin" now reads as "a good next area to strengthen" rather than a verdict.
  test("thin areas are named but never more than a third of the profile", () => {
    const thin = signal.filter((s) => s.state === "emerging");
    expect(thin.length).toBeLessThanOrEqual(3);
    expect(thin.length).toBeLessThan(signal.length / 2);
  });
});

describe("persona: near-complete high achiever", () => {
  const signal = signalFor(HIGH_ACHIEVER);

  // The founder's exact complaint, as an assertion.
  test("does not receive six simultaneous negative-looking dimensions", () => {
    const negativeLooking = signal.filter((s) => s.state === "emerging" || s.state === "limited_evidence");
    expect(negativeLooking.length).toBeLessThanOrEqual(2);
  });

  test("most dimensions are assessed, and several are strong", () => {
    const coverage = signalCoverage(signal);
    expect(coverage.assessed).toBeGreaterThanOrEqual(8);
    expect(coverage.strong).toBeGreaterThanOrEqual(3);
  });

  // The two rebalanced dimensions, on a profile that genuinely earns them.
  test("the two previously-capped dimensions can now read positively", () => {
    for (const dimension of ["intellectual_curiosity", "career_exploration"] as const) {
      const row = signal.find((s) => s.dimension === dimension)!;
      expect(["strong", "developing"]).toContain(row.state);
    }
  });
});

describe("the scale still discriminates", () => {
  // Guard against "fix" by inflation: a stronger profile must still outscore a weaker one.
  test("overall score rises strictly across the four personas", () => {
    const overall = (f: ScoringFacts) => computeCareerProfile(f).overallScore;
    expect(overall(SPARSE)).toBeLessThan(overall(GRADE_10));
    expect(overall(GRADE_10)).toBeLessThan(overall(GRADE_11));
    expect(overall(GRADE_11)).toBeLessThan(overall(HIGH_ACHIEVER));
  });

  test("a sparse profile still scores zero overall", () => {
    expect(computeCareerProfile(SPARSE).overallScore).toBe(0);
  });
});
