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

const { insertMock, monthToDateRowsRef, providerRef, graduationYearRef, skillsRef } = vi.hoisted(() => ({
  insertMock: vi.fn<(call: RecordedInsert) => Promise<{ error: null }>>(async () => ({ error: null })),
  monthToDateRowsRef: { current: [] as Array<{ estimated_cost: number | null }> },
  providerRef: { current: null as MockAIProvider | null },
  graduationYearRef: { current: null as number | null },
  skillsRef: { current: [] as { name: string; category: string; proficiency: string | null }[] },
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

// 2026-09-04, research-generator audit follow-up: partial mock, not a full replacement —
// generateResearchProjects now also imports timeBudgetLabel from this module (fixing the
// raw-enum leak below), and a full replacement without it would throw
// "timeBudgetLabel is not a function" the moment that code runs. Keeping the real accessor
// (via importActual, the same module __tests__/ai/student-context.test.ts already loads
// directly with no mocking at all) also makes the new tests below meaningful — a hand-faked
// "always returns X" stub would pass even if the production code called it with the wrong
// argument. weeklyTimeBudget corrected from the previous fixture's display-prose value
// ("3-4 hours", not a real TimeBudget member — the exact fixture-shape drift the 2026-09-02
// eval-fixture sweep fixed elsewhere in lib/ai/eval/fixtures.ts, just not here) to a real enum
// key, since it now actually reaches timeBudgetLabel's lookup table instead of only ever being
// echoed raw.
vi.mock("@/lib/ai/student-context", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ai/student-context")>("@/lib/ai/student-context");
  return {
    ...actual,
    buildStudentAdvisorContext: async () => ({
      student: { preferredLanguage: "en", graduationYear: graduationYearRef.current, weeklyTimeBudget: "5_10h" },
      profileScores: [{ dimension: "research", score: 42, confidence: "medium", state: "some_evidence" }],
      skills: skillsRef.current,
    }),
  };
});

vi.mock("@/lib/providers/openalex", () => ({
  openAlexProvider: { searchWorks: async () => ({ success: false, error: { message: "not queried in this test" } }) },
}));

// Hoisted to module scope, once, matching __tests__/ai/weekly-plan.test.ts's own convention.
// 2026-09-05: docs/cron-jobs-pre-arm-audit-2026-09-05.md's billing-flake section already
// measured this rigorously (933 executions under deliberate contention, 5 failures, every one
// "Error: Test timed out in 20000ms", zero assertion-count mismatches) and explicitly concluded
// "not fixed -- measured and reported per standing instruction." This is that fix, independently
// re-derived and reproduced (twice, via genuine concurrent full-suite contention) before reading
// that doc: every test below re-ran its own `await import(...)`, so whichever test happened to
// execute FIRST in this file paid the real one-time module-transform cost for the whole
// research-generator.ts dependency graph inside its OWN 20s testTimeout budget -- vitest's own
// "import" timing bucket is untimed by testTimeout, unlike a per-test dynamic import, so moving
// the import here removes the mechanism rather than just the symptom. Not a race in
// generateResearchProjects itself, confirmed independently the same way that doc did:
// withUsageLogging calls its callback exactly once, no loop, no retry -- a single call cannot
// double-insert regardless of import timing.
const { generateResearchProjects } = await import("@/lib/ai/research-generator");

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
  skillsRef.current = [];
});

describe("generateResearchProjects — usage recording", () => {
  test("a successful generation is recorded in ai_usage exactly once", async () => {
    providerRef.current!.queueStructured(sampleProjectList());

    await generateResearchProjects({ userId: USER_ID, interests: ["Economics"], field: "Economics", tier: "standard" });

    const recorded = usageInserts();
    expect(recorded).toHaveLength(1);
    expect(recorded[0]?.row).toMatchObject({ user_id: USER_ID, feature: "research_generator" });
  });
});

describe("generateResearchProjects — grade-level context", () => {
  test("a known graduation year reaches the actual prompt sent to the model", async () => {
    graduationYearRef.current = new Date().getFullYear() + 2;
    providerRef.current!.queueStructured(sampleProjectList());

    await generateResearchProjects({ userId: USER_ID, interests: [], field: "Economics", tier: "standard" });

    const sentPrompt = providerRef.current!.structuredCalls[0]?.prompt as string;
    expect(sentPrompt).toContain(`Graduating ${graduationYearRef.current}`);
    expect(sentPrompt).toContain("2 years from now");
  });

  test("a missing graduation year degrades to an explicit 'not on file', not a silent omission", async () => {
    graduationYearRef.current = null;
    providerRef.current!.queueStructured(sampleProjectList());

    await generateResearchProjects({ userId: USER_ID, interests: [], field: "Economics", tier: "standard" });

    const sentPrompt = providerRef.current!.structuredCalls[0]?.prompt as string;
    expect(sentPrompt).toContain("Graduation year not on file.");
  });
});

/**
 * 2026-09-04, research-generator audit follow-up
 * (docs/handoffs/research-project-generator-audit-2026-09-04.md): this function builds its
 * own prompt rather than calling formatContextForPrompt, so it missed the 2026-09-02
 * raw-enum-leak sweep entirely — the model was seeing the literal stored token ("5_10h"), not
 * "5-10 hours a week", the exact spec-named input Phase 64 says to reason from ("Do not
 * recommend 15 hours of extracurricular work to a student with 3 free hours").
 */
describe("generateResearchProjects — weekly time budget uses the real label", () => {
  test("the readable label reaches the prompt, not the raw enum member", async () => {
    providerRef.current!.queueStructured(sampleProjectList());

    await generateResearchProjects({ userId: USER_ID, interests: [], field: "Economics", tier: "standard" });

    const sentPrompt = providerRef.current!.structuredCalls[0]?.prompt as string;
    expect(sentPrompt).toContain("Weekly time budget: 5-10 hours");
    expect(sentPrompt).not.toContain("5_10h");
  });
});

/**
 * Same audit, same follow-up: `skills` reached StudentAdvisorContext for the first time in
 * this pass — before this, `requiredSkills` on a generated project was the model inventing
 * what a project needs with zero signal about what the student already has.
 */
describe("generateResearchProjects — existing skills reach the prompt", () => {
  test("skills render with a readable category label, not the raw enum member", async () => {
    skillsRef.current = [{ name: "Financial modeling", category: "analytical", proficiency: null }];
    providerRef.current!.queueStructured(sampleProjectList());

    await generateResearchProjects({ userId: USER_ID, interests: [], field: "Economics", tier: "standard" });

    const sentPrompt = providerRef.current!.structuredCalls[0]?.prompt as string;
    expect(sentPrompt).toContain("Existing skills: Financial modeling [Analytical]");
    expect(sentPrompt).not.toContain("[analytical]");
  });

  test("no skills on file degrades to an explicit 'none listed', not a silent omission or a crash", async () => {
    skillsRef.current = [];
    providerRef.current!.queueStructured(sampleProjectList());

    await generateResearchProjects({ userId: USER_ID, interests: [], field: "Economics", tier: "standard" });

    const sentPrompt = providerRef.current!.structuredCalls[0]?.prompt as string;
    expect(sentPrompt).toContain("Existing skills: none listed");
  });
});

/**
 * 2026-09-04, CEO's follow-up call after the first pass shipped without `proficiency`: 7 of
 * 9 live skill rows carry a real, student-entered level. Not just carried in the data —
 * referenced in the closing instruction too, so it actually changes what the model does
 * with it (matches Phase 13's own "scale difficulty to the student's ... experience").
 */
describe("generateResearchProjects — skill proficiency calibrates difficulty, not just decoration", () => {
  test("a stated proficiency reaches the prompt appended to its skill", async () => {
    skillsRef.current = [{ name: "Python", category: "technical", proficiency: "Advanced" }];
    providerRef.current!.queueStructured(sampleProjectList());

    await generateResearchProjects({ userId: USER_ID, interests: [], field: "Economics", tier: "standard" });

    const sentPrompt = providerRef.current!.structuredCalls[0]?.prompt as string;
    expect(sentPrompt).toContain("Python [Technical] — Advanced");
  });

  test("a skill with no proficiency on file shows the name and category alone, no stray dash", async () => {
    skillsRef.current = [{ name: "Java", category: "technical", proficiency: null }];
    providerRef.current!.queueStructured(sampleProjectList());

    await generateResearchProjects({ userId: USER_ID, interests: [], field: "Economics", tier: "standard" });

    const sentPrompt = providerRef.current!.structuredCalls[0]?.prompt as string;
    expect(sentPrompt).toContain("Java [Technical]");
    expect(sentPrompt).not.toContain("Java [Technical] —");
  });

  test("the closing instruction tells the model to use stated proficiency to calibrate, not just note it", async () => {
    providerRef.current!.queueStructured(sampleProjectList());

    await generateResearchProjects({ userId: USER_ID, interests: [], field: "Economics", tier: "standard" });

    const sentPrompt = providerRef.current!.structuredCalls[0]?.prompt as string;
    expect(sentPrompt).toMatch(/stated level.*calibrate/i);
  });
});
