import { describe, test, expect } from "vitest";
import {
  ActivitySchema,
  ProjectSchema,
  AwardSchema,
  ResearchExperienceSchema,
  VolunteeringSchema,
  WorkExperienceSchema,
  EducationRecordSchema,
  CourseSchema,
  TestScoreSchema,
  CertificationSchema,
  GoalSchema,
  SportsSchema,
  SkillSchema,
  LanguageSchema,
  translateAchievementValidationError,
} from "@/lib/validation/achievements";

/**
 * Guards the exhaustiveness claim in achievements.ts's own comment on
 * ACHIEVEMENT_ERROR_MESSAGES_TR: every custom Zod message these schemas can actually
 * produce must have a Turkish translation, checked against real parse failures (triggering
 * each schema's own validators), not a static re-read of the source text -- if a schema
 * gains a new field or a new `{ error: "..." }` string tomorrow, this fails immediately
 * instead of silently shipping an untranslated fallback the way the bug this table fixes
 * did in the first place.
 */

// Deliberately minimal/wrong-typed rather than {} for every field: some validators
// (e.g. hours_per_week's z.coerce.number()) only produce their own message against a
// specific bad shape, not a missing key, and .nullable() fields accept undefined/missing
// without erroring at all -- these are the inputs each schema actually rejects with one of
// the 14 known messages.
const INVALID_INPUTS: { name: string; schema: { safeParse: (input: unknown) => { success: boolean; error?: { issues: { message?: string }[] } } }; input: unknown }[] = [
  { name: "Activity", schema: ActivitySchema, input: { title: "", organization: null, category: "club", description: null, is_leadership_role: false, people_led: null, organization_scope: null, start_date: null, end_date: null, ongoing: false } },
  { name: "Project", schema: ProjectSchema, input: { title: "" } },
  { name: "Award", schema: AwardSchema, input: { title: "" } },
  { name: "ResearchExperience", schema: ResearchExperienceSchema, input: { title: "" } },
  { name: "Volunteering", schema: VolunteeringSchema, input: { title: "" } },
  { name: "WorkExperience (title)", schema: WorkExperienceSchema, input: { title: "", organization: "Acme" } },
  { name: "WorkExperience (organization)", schema: WorkExperienceSchema, input: { title: "Intern", organization: "" } },
  { name: "EducationRecord", schema: EducationRecordSchema, input: { school_name: "" } },
  { name: "Course", schema: CourseSchema, input: { course_name: "" } },
  { name: "TestScore (name)", schema: TestScoreSchema, input: { test_name: "", score: "1200", max_score: null, test_date: null } },
  { name: "TestScore (score negative)", schema: TestScoreSchema, input: { test_name: "SAT", score: "-1", max_score: null, test_date: null } },
  { name: "TestScore (max_score negative)", schema: TestScoreSchema, input: { test_name: "SAT", score: "1200", max_score: "-1", test_date: null } },
  { name: "TestScore (score > max)", schema: TestScoreSchema, input: { test_name: "SAT", score: "1600", max_score: "1400", test_date: null } },
  { name: "Certification", schema: CertificationSchema, input: { title: "" } },
  { name: "Goal", schema: GoalSchema, input: { title: "" } },
  { name: "Sports", schema: SportsSchema, input: { sport: "" } },
  { name: "Skill (name)", schema: SkillSchema, input: { name: "", category: "other" } },
  { name: "Skill (too long)", schema: SkillSchema, input: { name: "x".repeat(61), category: "other" } },
  { name: "Language (name)", schema: LanguageSchema, input: { name: "", proficiency: null } },
  { name: "Language (proficiency)", schema: LanguageSchema, input: { name: "Spanish", proficiency: "not-a-real-level" } },
];

describe("achievement schema error messages have a Turkish translation", () => {
  for (const { name, schema, input } of INVALID_INPUTS) {
    test(name, () => {
      const result = schema.safeParse(input);
      expect(result.success, `expected ${name} to fail validation on ${JSON.stringify(input)}`).toBe(false);
      const message = result.error?.issues[0]?.message;
      expect(message, `${name} produced no message`).toBeTruthy();
      const translated = translateAchievementValidationError(message, "tr");
      expect(translated, `"${message}" (from ${name}) has no Turkish translation in ACHIEVEMENT_ERROR_MESSAGES_TR`).not.toBe(message);
    });
  }

  test("an unknown message passes through unchanged rather than throwing", () => {
    expect(translateAchievementValidationError("Some future message nobody wrote yet.", "tr")).toBe("Some future message nobody wrote yet.");
  });

  test("English locale is never translated", () => {
    expect(translateAchievementValidationError("Title is required.", "en")).toBe("Title is required.");
  });

  test("undefined message passes through as undefined", () => {
    expect(translateAchievementValidationError(undefined, "tr")).toBeUndefined();
  });
});
