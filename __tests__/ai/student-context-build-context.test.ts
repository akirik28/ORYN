import { describe, expect, test, vi, beforeEach } from "vitest";
import { buildStudentAdvisorContext } from "@/lib/ai/student-context";
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
