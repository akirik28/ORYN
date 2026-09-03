import { describe, expect, test, vi, beforeEach } from "vitest";
import { buildStudentAdvisorContext } from "@/lib/ai/student-context";
import { assembleScoringFacts } from "@/lib/scoring/assemble-facts";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

vi.mock("@/lib/scoring/assemble-facts", () => ({
  assembleScoringFacts: vi.fn().mockResolvedValue({
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
    interests: [],
    goals: [],
    targetUniversities: [],
  }),
}));
vi.mock("@/lib/scoring", () => ({
  computeCareerProfile: vi.fn().mockReturnValue({ dimensions: [], overallScore: 50 }),
}));
vi.mock("@/lib/universities/canonical", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/universities/canonical")>();
  return { ...actual, loadSupersessionMap: vi.fn().mockResolvedValue(new Map()) };
});
vi.mock("@/lib/deadlines/upcoming", () => ({
  getUpcomingDeadlines: vi.fn().mockResolvedValue([]),
}));

/**
 * 2026-09-03: buildStudentAdvisorContext's own body had 5 direct `.data ?? []`/`.single()`
 * reads (profile, interests, sports, recentRecommendationTitles, recentActionOutcomes) with
 * no visibility on failure -- this is Tier 1 of docs/okuma-hatasi-vs-bos-sonuc-karari-
 * 2026-09-03.md by name ("everything entering AI context"), the highest-stakes instance in
 * the night's census: a swallowed read here doesn't produce a wrong number on a screen, it
 * produces an AI answer confidently reasoning about a student whose real data never arrived.
 * assembleScoringFacts/computeCareerProfile/loadSupersessionMap/getUpcomingDeadlines are
 * mocked -- none of their internals changed here, and each already has its own coverage
 * (assembleScoringFacts: __tests__/scoring/assemble-facts.test.ts). The two extracted
 * helpers (getPendingApplicationRequirements, getTargetUniversitiesForContext) run for real
 * against the fake client below and are separately covered in
 * __tests__/ai/student-context-safe-reads.test.ts -- given trivial empty-success table data
 * here so they add no noise to these assertions.
 */

type QueryResult = { data: unknown; error: { message: string } | null };

function fakeClient(perTable: Record<string, QueryResult>): SupabaseClient<Database> {
  const client = {
    from: (table: string) => {
      const result = perTable[table] ?? { data: [], error: null };
      const builder = {
        select: () => builder,
        eq: () => builder,
        in: () => builder,
        order: () => builder,
        limit: () => builder,
        single: () => Promise.resolve(result),
        then: (resolve: (value: QueryResult) => void) => resolve(result),
      };
      return builder;
    },
  };
  return client as unknown as SupabaseClient<Database>;
}

const EMPTY_HELPER_TABLES: Record<string, QueryResult> = {
  application_requirements: { data: [], error: null },
  target_universities: { data: [], error: null },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("buildStudentAdvisorContext — read-failure visibility", () => {
  test("every read succeeding produces real data and logs nothing", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const client = fakeClient({
      ...EMPTY_HELPER_TABLES,
      profiles: { data: { display_name: "Ada", preferred_language: "en", country: "Turkey" }, error: null },
      student_interests: { data: [{ label: "Economics" }], error: null },
      sports_experiences: { data: [], error: null },
      ai_recommendations: { data: [], error: null },
      weekly_actions: { data: [], error: null },
    });
    const context = await buildStudentAdvisorContext("user-1", client);
    expect(context.student.displayName).toBe("Ada");
    expect(context.interests).toEqual(["Economics"]);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  test("a failed profile read still returns a buildable context (defaults) instead of throwing, and is logged by name", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const client = fakeClient({
      ...EMPTY_HELPER_TABLES,
      profiles: { data: null, error: { message: "connection reset" } },
      student_interests: { data: [], error: null },
      sports_experiences: { data: [], error: null },
      ai_recommendations: { data: [], error: null },
      weekly_actions: { data: [], error: null },
    });
    const context = await buildStudentAdvisorContext("user-1", client);
    expect(context.student.displayName).toBe("Student"); // the pre-existing fallback, unchanged
    expect(spy.mock.calls.some(([message]) => typeof message === "string" && message.includes("profile"))).toBe(true);
    spy.mockRestore();
  });

  test("a failed interests read returns [] (unchanged from before) but is logged, not swallowed", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const client = fakeClient({
      ...EMPTY_HELPER_TABLES,
      profiles: { data: { display_name: "Ada" }, error: null },
      student_interests: { data: null, error: { message: "boom" } },
      sports_experiences: { data: [], error: null },
      ai_recommendations: { data: [], error: null },
      weekly_actions: { data: [], error: null },
    });
    const context = await buildStudentAdvisorContext("user-1", client);
    expect(context.interests).toEqual([]);
    expect(spy.mock.calls.some(([message]) => typeof message === "string" && message.includes("interests"))).toBe(true);
    spy.mockRestore();
  });

  test("a failed recentActionOutcomes read is logged with its own category name, distinct from a failed recentRecommendationTitles read", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const client = fakeClient({
      ...EMPTY_HELPER_TABLES,
      profiles: { data: { display_name: "Ada" }, error: null },
      student_interests: { data: [], error: null },
      sports_experiences: { data: [], error: null },
      ai_recommendations: { data: [], error: null },
      weekly_actions: { data: null, error: { message: "boom" } },
    });
    const context = await buildStudentAdvisorContext("user-1", client);
    expect(context.recentActionOutcomes).toEqual([]);
    const messages = spy.mock.calls.map(([message]) => message);
    expect(messages.some((m) => typeof m === "string" && m.includes("recentActionOutcomes"))).toBe(true);
    expect(messages.some((m) => typeof m === "string" && m.includes("recentRecommendationTitles"))).toBe(false);
    spy.mockRestore();
  });
});

/**
 * 2026-09-03, the six-category build: assembleScoringFacts already returned educationRecords/
 * courses/testScores/certifications/volunteeringExperiences/workExperiences before this change
 * (see the mock's shape above, unchanged) -- buildStudentAdvisorContext simply never read five
 * of its six own destructured fields into the returned context. This proves the mapping now
 * happens end-to-end through the real assembler, not just that a hand-built context renders
 * correctly (that half is __tests__/ai/student-context.test.ts's job) -- the two tests are
 * deliberately non-overlapping.
 */
describe("buildStudentAdvisorContext — the six previously-dropped categories are mapped through", () => {
  test("each category's raw DB shape reaches context under its camelCase field, unmodified in content", async () => {
    vi.mocked(assembleScoringFacts).mockResolvedValueOnce({
      educationRecords: [{ id: "e1", user_id: "u1", school_name: "Robert College", overall_gpa: 3.82, gpa_scale: 4 } as never],
      courses: [{ id: "c1", user_id: "u1", course_name: "Economics HL", level: "ib_hl", grade_value: "6", grade_scale: "IB 1-7" } as never],
      testScores: [{ id: "t1", user_id: "u1", test_name: "SAT", score: "1470", max_score: "1600", subscores: { math: 780 } } as never],
      certifications: [{ id: "cert1", user_id: "u1", title: "CS50x", organization: "HarvardX", evidence_status: "self_reported" } as never],
      volunteeringExperiences: [{ id: "v1", user_id: "u1", title: "Numeracy volunteer", organization: "TGV", ongoing: true, evidence_status: "self_reported" } as never],
      workExperiences: [
        { id: "w1", user_id: "u1", title: "Intern", organization: "Getir", employment_type: "internship", ongoing: false, paid: true, evidence_status: "self_reported" } as never,
      ],
      activities: [],
      awards: [],
      projects: [],
      researchExperiences: [],
      interests: [],
      goals: [],
      targetUniversities: [],
    });
    const client = fakeClient({
      ...EMPTY_HELPER_TABLES,
      profiles: { data: { display_name: "Ada" }, error: null },
      student_interests: { data: [], error: null },
      sports_experiences: { data: [], error: null },
      ai_recommendations: { data: [], error: null },
      weekly_actions: { data: [], error: null },
    });

    const context = await buildStudentAdvisorContext("user-1", client);

    expect(context.educationRecords).toEqual([{ schoolName: "Robert College", overallGpa: 3.82, gpaScale: 4 }]);
    expect(context.courses).toEqual([{ courseName: "Economics HL", level: "ib_hl", gradeValue: "6", gradeScale: "IB 1-7" }]);
    expect(context.testScores).toEqual([{ testName: "SAT", score: "1470", maxScore: "1600", subscores: { math: 780 } }]);
    expect(context.certifications).toEqual([{ title: "CS50x", organization: "HarvardX", evidenceStatus: "self_reported" }]);
    expect(context.volunteeringExperiences).toEqual([{ title: "Numeracy volunteer", organization: "TGV", ongoing: true, evidenceStatus: "self_reported" }]);
    expect(context.workExperiences).toEqual([
      { title: "Intern", organization: "Getir", employmentType: "internship", ongoing: false, paid: true, evidenceStatus: "self_reported" },
    ]);
  });
});
