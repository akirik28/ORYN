import { beforeEach, describe, expect, test, vi } from "vitest";
import { MockAIProvider } from "../stubs/mock-ai-provider";

/**
 * Coverage for lib/ai/research-generator.ts (spec Phase 13), audited 2026-09-02 after
 * establishing it had never once appeared in ai_usage — confirmed genuinely unused (not
 * broken), then migrated to withUsageLogging and fixed to actually pass the student's
 * graduation year into the prompt. graduationYear/birthYear were already fetched into
 * StudentAdvisorContext (Counselor Core's eligibility checks need them) but
 * student-context.ts's own comment on both admits "not used in prompt text today" -- true
 * here specifically, since this function builds its own prompt rather than calling
 * formatContextForPrompt. Without this, Phase 13's "scale difficulty to the student's age
 * and experience" was only ever true in the generic "pitched at roughly 14-18" sense, never
 * adjusted for whether a specific student is 14 or 18.
 */

interface RecordedInsert {
  table: string;
  row: Record<string, unknown>;
}

const { insertMock, monthToDateRowsRef, providerRef, graduationYearRef } = vi.hoisted(() => ({
  insertMock: vi.fn<(call: RecordedInsert) => Promise<{ error: null }>>(async () => ({ error: null })),
  monthToDateRowsRef: { current: [] as Array<{ estimated_cost: number | null }> },
  providerRef: { current: null as MockAIProvider | null },
  graduationYearRef: { current: null as number | null },
}));

vi.mock("@/lib/supabase/admin", () => {
  const adminClient = {
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => insertMock({ table, row }),
      select: () => ({
        eq: () => ({
          gte: async () => ({ data: monthToDateRowsRef.current, error: null }),
        }),
      }),
    }),
  };
  return {
    createAdminClient: () => adminClient,
    tryCreateAdminClient: () => adminClient,
  };
});

vi.mock("@/lib/ai/index", () => ({ getAIProvider: () => providerRef.current }));

vi.mock("@/lib/ai/student-context", () => ({
  buildStudentAdvisorContext: async () => ({
    student: { preferredLanguage: "en", graduationYear: graduationYearRef.current, weeklyTimeBudget: "3-4 hours" },
    profileScores: [{ dimension: "research", score: 42, confidence: "medium", state: "some_evidence" }],
  }),
}));

vi.mock("@/lib/providers/openalex", () => ({
  openAlexProvider: { searchWorks: async () => ({ success: false, error: { message: "not queried in this test" } }) },
}));

const USER_ID = "33333333-3333-4333-8333-333333333333";

function usageInserts(): RecordedInsert[] {
  return insertMock.mock.calls.map((call) => call[0]).filter((arg) => arg.table === "ai_usage");
}

function sampleProjectList() {
  return {
    projects: [
      {
        researchQuestion: "Does X track Y?",
        whyItFits: "Matches interests.",
        difficulty: "moderate",
        estimatedDuration: "4-6 weeks",
        requiredSkills: ["spreadsheets"],
        dataSources: ["OECD.Stat"],
        method: "Compare public datasets.",
        expectedOutput: "A short analysis.",
        firstSteps: ["Pull the dataset"],
      },
    ],
  };
}

beforeEach(() => {
  insertMock.mockClear();
  providerRef.current = new MockAIProvider();
  monthToDateRowsRef.current = [];
  graduationYearRef.current = null;
});

describe("generateResearchProjects — usage recording", () => {
  test("a successful generation is recorded in ai_usage exactly once", async () => {
    const { generateResearchProjects } = await import("@/lib/ai/research-generator");
    providerRef.current!.queueStructured(sampleProjectList());

    await generateResearchProjects({ userId: USER_ID, interests: ["Economics"], field: "Economics" });

    const recorded = usageInserts();
    expect(recorded).toHaveLength(1);
    expect(recorded[0]?.row).toMatchObject({ user_id: USER_ID, feature: "research_generator" });
  });
});

describe("generateResearchProjects — grade-level context", () => {
  test("a known graduation year reaches the actual prompt sent to the model", async () => {
    graduationYearRef.current = new Date().getFullYear() + 2;
    const { generateResearchProjects } = await import("@/lib/ai/research-generator");
    providerRef.current!.queueStructured(sampleProjectList());

    await generateResearchProjects({ userId: USER_ID, interests: [], field: "Economics" });

    const sentPrompt = providerRef.current!.structuredCalls[0]?.prompt as string;
    expect(sentPrompt).toContain(`Graduating ${graduationYearRef.current}`);
    expect(sentPrompt).toContain("2 years from now");
  });

  test("a missing graduation year degrades to an explicit 'not on file', not a silent omission", async () => {
    graduationYearRef.current = null;
    const { generateResearchProjects } = await import("@/lib/ai/research-generator");
    providerRef.current!.queueStructured(sampleProjectList());

    await generateResearchProjects({ userId: USER_ID, interests: [], field: "Economics" });

    const sentPrompt = providerRef.current!.structuredCalls[0]?.prompt as string;
    expect(sentPrompt).toContain("Graduation year not on file.");
  });
});
