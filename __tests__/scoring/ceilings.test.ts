import { describe, expect, test } from "vitest";
import { scoreIntellectualCuriosity } from "@/lib/scoring/dimensions/intellectual-curiosity";
import { scoreCareerExploration } from "@/lib/scoring/dimensions/career-exploration";
import type { ScoringFacts } from "@/lib/scoring/types";
import type { Activity, Certification, Course, ResearchExperience, WorkExperience } from "@/types/database";

/**
 * Every dimension's maximum must be reachable.
 *
 * This file exists because two of them weren't. `intellectual_curiosity` summed to a
 * maximum of 35/100 and `career_exploration` to 32/100, so both were permanently stuck in
 * the lowest band: a student who had done everything the dimension measures was still
 * shown "needs attention" for it, forever, with no action available that could change it.
 *
 * The existing per-dimension tests didn't catch it because they all assert *relative*
 * behaviour ("broad scores higher than narrow"), which stays true no matter how low the
 * ceiling is. Absolute reachability is a different property and needs its own test.
 *
 * If you rebalance a dimension, this is the test that tells you whether the scale still
 * means anything.
 */

const EMPTY: ScoringFacts = {
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
};

function facts(overrides: Partial<ScoringFacts> = {}): ScoringFacts {
  return { ...EMPTY, ...overrides };
}

function course(subject: string, id: string): Course {
  return {
    id,
    user_id: "u1",
    education_record_id: null,
    course_name: subject,
    subject,
    level: "regular",
    academic_year: null,
    grade_value: null,
    grade_scale: null,
    credit_hours: null,
    created_at: "",
    updated_at: "",
  } as Course;
}

function certification(id: string): Certification {
  return {
    id,
    user_id: "u1",
    title: `Certification ${id}`,
    organization: "Org",
    organization_entity_id: null,
    description: null,
    issue_date: null,
    expiry_date: null,
    credential_url: null,
    evidence_status: "self_reported",
    created_at: "",
    updated_at: "",
  } as Certification;
}

function research(field: string, id: string): ResearchExperience {
  return {
    id,
    user_id: "u1",
    title: `Research ${id}`,
    field,
    output_type: "none",
    created_at: "",
    updated_at: "",
  } as unknown as ResearchExperience;
}

function activity(category: string, id: string): Activity {
  return {
    id,
    user_id: "u1",
    title: `Activity ${id}`,
    category,
    is_leadership_role: false,
    ongoing: false,
    created_at: "",
    updated_at: "",
  } as unknown as Activity;
}

function work(organization: string, id: string, employmentType = "internship"): WorkExperience {
  return {
    id,
    user_id: "u1",
    title: `Role ${id}`,
    organization,
    employment_type: employmentType,
    ongoing: false,
    created_at: "",
    updated_at: "",
  } as unknown as WorkExperience;
}

/** The band `lib/scoring/signal.ts` uses for "strong". */
const STRONG = 70;

describe("dimension ceilings are reachable", () => {
  test("intellectual curiosity: a genuinely curious profile reaches strong", () => {
    const result = scoreIntellectualCuriosity(
      facts({
        courses: ["Maths", "Physics", "Economics", "History", "Biology", "Computer Science"].map((subject, i) => course(subject, `c${i}`)),
        certifications: ["c1", "c2", "c3", "c4"].map((id) => certification(id)),
        researchExperiences: [research("Economics", "r1"), research("Biology", "r2")],
      }),
    );
    expect(result.score).toBeGreaterThanOrEqual(STRONG);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  test("career exploration: a widely-explored profile reaches strong", () => {
    const result = scoreCareerExploration(
      facts({
        activities: [
          activity("community_service", "a1"),
          activity("stem", "a2"),
          activity("arts", "a3"),
          activity("entrepreneurship", "a4"),
        ],
        workExperiences: [work("Acme", "w1"), work("Globex", "w2", "part_time")],
      }),
    );
    expect(result.score).toBeGreaterThanOrEqual(STRONG);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  // The specific regression: these two used to top out at 35 and 32, below the 40 floor
  // for "developing", so no amount of real achievement could move them out of the worst
  // band. A ceiling under 70 means the dimension can never be reported as a strength.
  test("neither dimension can be capped below the strong band again", () => {
    const maxCuriosity = scoreIntellectualCuriosity(
      facts({
        courses: Array.from({ length: 12 }, (_, i) => course(`Subject ${i}`, `c${i}`)),
        certifications: Array.from({ length: 10 }, (_, i) => certification(`k${i}`)),
        researchExperiences: Array.from({ length: 5 }, (_, i) => research(`Field ${i}`, `r${i}`)),
      }),
    ).score;

    const maxExploration = scoreCareerExploration(
      facts({
        activities: Array.from({ length: 10 }, (_, i) => activity(`cat_${i}`, `a${i}`)),
        workExperiences: Array.from({ length: 6 }, (_, i) => work(`Org ${i}`, `w${i}`)),
      }),
    ).score;

    expect(maxCuriosity).toBeGreaterThanOrEqual(STRONG);
    expect(maxExploration).toBeGreaterThanOrEqual(STRONG);
  });

  test("an empty profile still scores zero — the fix raises the ceiling, not the floor", () => {
    expect(scoreIntellectualCuriosity(EMPTY).score).toBe(0);
    expect(scoreCareerExploration(EMPTY).score).toBe(0);
  });
});
