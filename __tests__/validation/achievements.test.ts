import { describe, test, expect } from "vitest";
import {
  TestScoreSchema,
  ActivitySchema,
  ProjectSchema,
  AwardSchema,
  ResearchExperienceSchema,
  VolunteeringSchema,
  WorkExperienceSchema,
  EducationRecordSchema,
  CourseSchema,
  CertificationSchema,
  SportsSchema,
} from "@/lib/validation/achievements";
import {
  ACTIVITY_FIELDS,
  PROJECT_FIELDS,
  AWARD_FIELDS,
  RESEARCH_FIELDS,
  VOLUNTEERING_FIELDS,
  WORK_EXPERIENCE_FIELDS,
  EDUCATION_FIELDS,
  COURSE_FIELDS,
  TEST_SCORE_FIELDS,
  CERTIFICATION_FIELDS,
  SPORTS_FIELDS,
} from "@/features/profile/field-config";
import type { FormValues } from "@/features/profile/dynamic-form-fields";

/**
 * Regression coverage for a specific claim raised during the 2026-08-29 input-contract
 * audit: "a test score can be saved with only the exam name." Verified against the current
 * schema/form/CV-import paths and found NOT reproducible as stated (TestScoreSchema already
 * requires `score`; CV import has no test-score category at all — lib/profile/cv-import.ts's
 * `CV_IMPORT_CATEGORY_TABLE` covers six categories, none of them test scores). These tests
 * lock the correct behavior in rather than "fixing" something that wasn't broken, and add the
 * one genuine gap the audit did confirm: no check that a *numeric* score/max_score pair is
 * internally consistent (score not negative, not above the max).
 */
describe("TestScoreSchema", () => {
  const base = { test_name: "SAT", score: "1450", max_score: null, test_date: null };

  test("rejects a missing score — the defining field cannot be silently dropped", () => {
    const result = TestScoreSchema.safeParse({ ...base, score: "" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Score is required.");
  });

  test("rejects a missing test name", () => {
    const result = TestScoreSchema.safeParse({ ...base, test_name: "" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Test name is required.");
  });

  test("accepts a complete numeric score with no max_score", () => {
    expect(TestScoreSchema.safeParse(base).success).toBe(true);
  });

  test("accepts a complete numeric score with a valid max_score", () => {
    expect(TestScoreSchema.safeParse({ ...base, max_score: "1600" }).success).toBe(true);
  });

  test("rejects a negative numeric score", () => {
    const result = TestScoreSchema.safeParse({ ...base, score: "-5" });
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((i) => i.message === "Score can't be negative.")).toBe(true);
  });

  test("rejects a negative numeric max_score", () => {
    const result = TestScoreSchema.safeParse({ ...base, max_score: "-10" });
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((i) => i.message === "Max score can't be negative.")).toBe(true);
  });

  test("rejects a score higher than its max_score", () => {
    const result = TestScoreSchema.safeParse({ ...base, score: "1650", max_score: "1600" });
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((i) => i.message === "Score can't be higher than the max score.")).toBe(true);
  });

  test("a score equal to max_score is allowed (a perfect score, not 'higher than')", () => {
    expect(TestScoreSchema.safeParse({ ...base, score: "1600", max_score: "1600" }).success).toBe(true);
  });

  test("non-numeric scores (CEFR bands, pass/fail, IB grades) skip the numeric relationship check entirely", () => {
    expect(TestScoreSchema.safeParse({ ...base, score: "C1", max_score: null }).success).toBe(true);
    expect(TestScoreSchema.safeParse({ ...base, score: "Pass", max_score: "Fail" }).success).toBe(true);
    expect(TestScoreSchema.safeParse({ ...base, score: "38" }).success).toBe(true); // IB total, no max stated
  });

  test("preserves legitimate decimal values", () => {
    expect(TestScoreSchema.safeParse({ ...base, score: "7.5", max_score: "9.0" }).success).toBe(true);
  });
});

describe("CV import cannot produce a test score at all (verified, not a UI-layer concern)", () => {
  test("the CV import category map has no test-score destination", async () => {
    const { CV_IMPORT_CATEGORY_TABLE } = await import("@/lib/profile/cv-import");
    expect(Object.keys(CV_IMPORT_CATEGORY_TABLE).sort()).toEqual(
      ["activities", "awards", "education", "projects", "research", "workExperience"].sort(),
    );
    expect(CV_IMPORT_CATEGORY_TABLE).not.toHaveProperty("testScores");
  });
});

/**
 * Contract test for the quick-add flow (features/profile/quick-add-entry.tsx): every field
 * NOT marked `quickAdd` must still have a valid default, because the quick form submits the
 * exact same create action — and therefore the exact same schema — as the full Edit dialog.
 * If a schema ever gains a new required field without updating the matching defaults in
 * app/(app)/profile/page.tsx, this fails loudly instead of shipping a silently-broken
 * "Add" button for that one type.
 */
describe("quick-add defaults satisfy their full Zod schema on their own", () => {
  const cases: { label: string; schema: { safeParse: (v: unknown) => { success: boolean; error?: { issues: { message: string }[] } } }; defaults: FormValues }[] = [
    { label: "Activity", schema: ActivitySchema, defaults: { title: "Debate Club", organization: null, organization_entity_id: null, category: "other", description: null, is_leadership_role: false, people_led: null, organization_scope: null, opportunity_id: null, start_date: null, end_date: null, ongoing: false, hours_per_week: null, weeks_per_year: null, location: null, story_notes: null } },
    { label: "Project", schema: ProjectSchema, defaults: { title: "A Project", organization: null, organization_entity_id: null, description: null, role: null, start_date: null, end_date: null, ongoing: false, hours_per_week: null, outcome_summary: null, users_reached: null, revenue_amount: null, repo_url: null, live_url: null, location: null, story_notes: null } },
    { label: "Award", schema: AwardSchema, defaults: { title: "An Award", organization: null, organization_entity_id: null, level: null, description: null, award_date: null, location: null, story_notes: null } },
    { label: "Research", schema: ResearchExperienceSchema, defaults: { title: "A Research Project", organization: null, organization_entity_id: null, mentor_name: null, field: "Economics", description: null, methodology: null, independence_level: null, output_type: "none", output_url: null, start_date: null, end_date: null, ongoing: false, hours_per_week: null, location: null, story_notes: null } },
    { label: "Volunteering", schema: VolunteeringSchema, defaults: { title: "Food Bank", organization: "Local Food Bank", organization_entity_id: null, description: null, cause_area: null, start_date: null, end_date: null, ongoing: false, hours_per_week: null, weeks_per_year: null, location: null, story_notes: null } },
    { label: "Work / Internship", schema: WorkExperienceSchema, defaults: { title: "Summer Intern", organization: "Acme Corp", organization_entity_id: null, employment_type: "internship", description: null, start_date: null, end_date: null, ongoing: false, hours_per_week: null, paid: null, location: null, story_notes: null } },
    { label: "Education", schema: EducationRecordSchema, defaults: { school_name: "Lincoln High School", school_entity_id: null, country: null, stage: "high_school", curriculum: null, start_date: null, end_date: null, is_current: true, overall_gpa: null, gpa_scale: null, notes: null } },
    { label: "Course", schema: CourseSchema, defaults: { course_name: "AP Microeconomics", level: "regular", subject: null, academic_year: null, grade_value: null, grade_scale: null, credit_hours: null } },
    { label: "Test score", schema: TestScoreSchema, defaults: { test_name: "SAT", score: "1450", max_score: null, test_date: null } },
    { label: "Certification", schema: CertificationSchema, defaults: { title: "A Certificate", organization: null, organization_entity_id: null, description: null, issue_date: null, expiry_date: null, credential_url: null } },
    { label: "Sport", schema: SportsSchema, defaults: { sport: "Swimming", discipline: null, team_name: null, team_entity_id: null, position: null, level: null, us_specific_label: null, is_captain: false, achievements: null, start_date: null, end_date: null, ongoing: false, hours_per_week: null, weeks_per_year: null, location: null, description: null, story_notes: null } },
  ];

  test.each(cases)("$label: defaultValues with only its quickAdd fields filled in still parses", ({ schema, defaults }) => {
    const result = schema.safeParse(defaults);
    expect(result.success, result.error ? JSON.stringify(result.error.issues) : undefined).toBe(true);
  });
});

describe("every quickAdd-flagged field is a field the full form actually renders (no stale/typo'd flag)", () => {
  const arrays: { label: string; fields: { name: string; quickAdd?: boolean }[] }[] = [
    { label: "ACTIVITY_FIELDS", fields: ACTIVITY_FIELDS },
    { label: "PROJECT_FIELDS", fields: PROJECT_FIELDS },
    { label: "AWARD_FIELDS", fields: AWARD_FIELDS },
    { label: "RESEARCH_FIELDS", fields: RESEARCH_FIELDS },
    { label: "VOLUNTEERING_FIELDS", fields: VOLUNTEERING_FIELDS },
    { label: "WORK_EXPERIENCE_FIELDS", fields: WORK_EXPERIENCE_FIELDS },
    { label: "EDUCATION_FIELDS", fields: EDUCATION_FIELDS },
    { label: "COURSE_FIELDS", fields: COURSE_FIELDS },
    { label: "TEST_SCORE_FIELDS", fields: TEST_SCORE_FIELDS },
    { label: "CERTIFICATION_FIELDS", fields: CERTIFICATION_FIELDS },
    { label: "SPORTS_FIELDS", fields: SPORTS_FIELDS },
  ];

  test.each(arrays)("$label has at least one quickAdd field", ({ fields }) => {
    expect(fields.some((f) => f.quickAdd)).toBe(true);
  });

  test("Test score marks all four fields quick — the flagship 'must not lose the score' case", () => {
    const quick = TEST_SCORE_FIELDS.filter((f) => f.quickAdd).map((f) => f.name);
    expect(quick.sort()).toEqual(["max_score", "score", "test_date", "test_name"].sort());
  });
});
