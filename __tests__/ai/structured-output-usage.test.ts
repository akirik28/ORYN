import { beforeEach, describe, expect, test, vi } from "vitest";
import { AIStructuredResponseFailedError } from "@/lib/ai/provider";
import { MockAIProvider } from "../stubs/mock-ai-provider";
import type { CounselorResult } from "@/lib/counselor/types";

/**
 * Cost-observability regression tests for the generateStructured path — the sibling of
 * __tests__/ai/advisor-chat-usage.test.ts's SEV-1 coverage for generateText.
 *
 * Found live, 2026-09-02, while sweeping for the same "spend recorded, artefact isn't"
 * shape the weekly-plan job bug turned up: cv_extraction and achievement_refinement both
 * called provider.generateStructured directly and only ever called logAIUsage on the
 * success path. A retry-exhausted schema-validation failure is up to two real, billed
 * calls with no way to recover what was spent — the identical shape the original SEV-1
 * fixed for generateText, just never extended to generateStructured's own failure mode.
 * Both now go through withUsageLogging, same as generateAdvisorReply already did.
 */

interface RecordedInsert {
  table: string;
  row: Record<string, unknown>;
}

const { insertMock, providerRef, monthToDateRowsRef } = vi.hoisted(() => ({
  insertMock: vi.fn<(call: RecordedInsert) => Promise<{ error: null }>>(async () => ({ error: null })),
  providerRef: { current: null as MockAIProvider | null },
  monthToDateRowsRef: { current: [] as Array<{ estimated_cost: number | null }> },
}));

// Same mock shape as advisor-chat-usage.test.ts's own — see that file's comment for why
// both createAdminClient and tryCreateAdminClient need mocking here.
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

// Hoisted to module scope, once each, matching __tests__/ai/weekly-plan.test.ts's own
// convention -- see research-generator.test.ts's identical fix (2026-09-05) for the full
// reasoning, including the cross-reference to docs/cron-jobs-pre-arm-audit-2026-09-05.md's
// 933-execution measurement of this exact failure shape on that file. Not independently
// reproduced live on THIS file specifically, but the mechanism is identical and unconditional:
// every test below re-ran its own `await import(...)`, so whichever test executed FIRST paid
// the real one-time module-transform cost for that import inside its own 20s testTimeout
// budget. This file carries five distinct imports across ten tests -- five separate
// first-mover risks, one per describe block, all removed the same way.
const { extractCVData, CVExtractionFailedError } = await import("@/lib/ai/cv-extraction");
const { generateEssayOutlines } = await import("@/lib/ai/essay-outlines");
const { interpretRequirementText } = await import("@/lib/ai/interpret-requirement");
const { explainCounselorRecommendations } = await import("@/lib/ai/counselor-explain");
const { refineAchievementDescription } = await import("@/lib/ai/refine-achievement");

const USER_ID = "22222222-2222-4222-8222-222222222222";

function usageInserts(): RecordedInsert[] {
  return insertMock.mock.calls.map((call) => call[0]).filter((arg) => arg.table === "ai_usage");
}

beforeEach(() => {
  insertMock.mockClear();
  providerRef.current = new MockAIProvider();
  monthToDateRowsRef.current = [];
});

describe("extractCVData — usage recording", () => {
  test("a successful extraction is recorded in ai_usage exactly once", async () => {
    providerRef.current!.queueStructured({
      education: [],
      activities: [],
      awards: [],
      projects: [],
      research: [],
      workExperience: [],
      skills: [],
      languages: [],
      unclassified: [],
    });

    await extractCVData({ userId: USER_ID, mimeType: "text/plain", buffer: Buffer.from("a resume"), tier: "standard" });

    const recorded = usageInserts();
    expect(recorded).toHaveLength(1);
    expect(recorded[0]?.row).toMatchObject({ user_id: USER_ID, feature: "cv_extraction", input_tokens: 10, output_tokens: 10 });
  });

  test("a retry-exhausted failure still records the real, billed usage before surfacing as CVExtractionFailedError", async () => {
    providerRef.current!.queueStructured(
      new AIStructuredResponseFailedError({ lastError: "education[0].title: Required", usage: { inputTokens: 5000, outputTokens: 800 }, model: "claude-sonnet-5" }),
    );

    await expect(extractCVData({ userId: USER_ID, mimeType: "text/plain", buffer: Buffer.from("a resume"), tier: "standard" })).rejects.toBeInstanceOf(
      CVExtractionFailedError,
    );

    // The whole point: this spend used to be invisible, swallowed into a generic
    // "couldn't read this document" error with no trace in ai_usage at all.
    const recorded = usageInserts();
    expect(recorded).toHaveLength(1);
    expect(recorded[0]?.row).toMatchObject({ user_id: USER_ID, feature: "cv_extraction", input_tokens: 5000, output_tokens: 800 });
  });
});

describe("generateEssayOutlines — usage recording", () => {
  const experiences = [
    {
      category: "activity",
      title: "Debate club captain",
      organization: "Lincoln High School",
      description: "Led weekly practice for 12 members.",
      storyNotes: "Nearly quit after a bad first tournament, then rebuilt the team's prep process.",
      startDate: "2025-09-01",
      endDate: null,
      ongoing: true,
    },
  ];

  test("a successful generation is recorded in ai_usage exactly once", async () => {
    providerRef.current!.queueStructured({
      candidates: [
        {
          experienceTitle: "Debate club captain",
          whyThisStory: "Real setback and recovery arc.",
          missingDetail: null,
          outlines: [
            {
              angle: "Resilience",
              hook: "The scoreboard read 0-3.",
              context: "First tournament as captain.",
              conflict: "The team's prep process was broken.",
              action: "Rebuilt it from scratch.",
              turningPoint: "The next tournament, they won two rounds.",
              reflection: "Leadership means fixing the system, not just showing up.",
              connectionToFuture: "Wants to study public policy.",
            },
          ],
        },
      ],
      notEnoughMaterial: null,
    });

    await generateEssayOutlines({ userId: USER_ID, essayPrompt: "Describe a challenge you overcame.", experiences, goals: [], tier: "standard" });

    const recorded = usageInserts();
    expect(recorded).toHaveLength(1);
    expect(recorded[0]?.row).toMatchObject({ user_id: USER_ID, feature: "essay_story_bank", input_tokens: 10, output_tokens: 10 });
  });

  test("a retry-exhausted failure still records the real, billed usage rather than throwing silently", async () => {
    providerRef.current!.queueStructured(
      new AIStructuredResponseFailedError({ lastError: "candidates: Required", usage: { inputTokens: 3200, outputTokens: 600 }, model: "claude-sonnet-5" }),
    );

    await expect(
      generateEssayOutlines({ userId: USER_ID, essayPrompt: "Describe a challenge you overcame.", experiences, goals: [], tier: "standard" }),
    ).rejects.toBeInstanceOf(AIStructuredResponseFailedError);

    const recorded = usageInserts();
    expect(recorded).toHaveLength(1);
    expect(recorded[0]?.row).toMatchObject({ user_id: USER_ID, feature: "essay_story_bank", input_tokens: 3200, output_tokens: 600 });
  });
});

describe("interpretRequirementText — usage recording", () => {
  test("a successful interpretation is recorded in ai_usage exactly once", async () => {
    providerRef.current!.queueStructured({ minGpa: 3.5, scale: 4 });

    await interpretRequirementText({
      adminUserId: USER_ID,
      category: "minimum_grade",
      title: "Minimum GPA",
      requirementDetail: "Applicants must have a minimum unweighted GPA of 3.5 on a 4.0 scale.",
    });

    const recorded = usageInserts();
    expect(recorded).toHaveLength(1);
    expect(recorded[0]?.row).toMatchObject({ user_id: USER_ID, feature: "requirement_interpretation", input_tokens: 10, output_tokens: 10 });
  });

  test("a retry-exhausted failure still records the real, billed usage rather than throwing silently", async () => {
    providerRef.current!.queueStructured(
      new AIStructuredResponseFailedError({ lastError: "minGpa: Required", usage: { inputTokens: 400, outputTokens: 90 }, model: "claude-sonnet-5" }),
    );

    await expect(
      interpretRequirementText({
        adminUserId: USER_ID,
        category: "minimum_grade",
        title: "Minimum GPA",
        requirementDetail: "Applicants must have a minimum unweighted GPA of 3.5 on a 4.0 scale.",
      }),
    ).rejects.toBeInstanceOf(AIStructuredResponseFailedError);

    const recorded = usageInserts();
    expect(recorded).toHaveLength(1);
    expect(recorded[0]?.row).toMatchObject({ user_id: USER_ID, feature: "requirement_interpretation", input_tokens: 400, output_tokens: 90 });
  });
});

describe("explainCounselorRecommendations — usage recording", () => {
  const counselorResult: CounselorResult = {
    scoreVersion: "counselor_ranking_v1",
    gaps: [],
    recommendations: [
      {
        id: "opportunity:opp-1",
        title: "Youth Economics Research Program",
        recommendationClass: "do",
        why: ["Addresses Research, a significant current gap (20/100)."],
        matchedGapDimensions: ["research"],
        impact: "high",
        effort: "high",
        urgency: "medium",
        deadline: null,
        costOnFile: null,
        applicationRequirements: [],
        eligibility: { verdict: "known_eligible", notes: [] },
        confidence: "high",
        evidence: [],
        warnings: [],
        nextAction: { label: "View opportunity", type: "VIEW", href: "/opportunities/opp-1" },
      },
    ],
    profileReadiness: { completenessPercent: 80, sufficientForJudgment: true },
    studentIdentity: { displayName: "Ada", country: "United States", graduationYear: 2027, curriculum: "ap" },
  };

  test("a successful explanation is recorded in ai_usage exactly once", async () => {
    providerRef.current!.queueStructured({
      summary: "Research is the clearest current gap.",
      perRecommendation: [{ id: "opportunity:opp-1", narrative: "A strong, achievable next step for research." }],
    });

    await explainCounselorRecommendations(USER_ID, counselorResult);

    const recorded = usageInserts();
    expect(recorded).toHaveLength(1);
    expect(recorded[0]?.row).toMatchObject({ user_id: USER_ID, feature: "counselor_explanation", input_tokens: 10, output_tokens: 10 });
  });

  test("a retry-exhausted failure still records the real, billed usage — even though the caller only ever sees null", async () => {
    providerRef.current!.queueStructured(
      new AIStructuredResponseFailedError({ lastError: "summary: Required", usage: { inputTokens: 1500, outputTokens: 300 }, model: "claude-sonnet-5" }),
    );

    // explainCounselorRecommendations swallows every failure into `null` (its own documented
    // contract — a narrated explanation is optional, never worth breaking the dashboard for) —
    // the point of this test is that the spend is still recorded before that swallow happens.
    const explanation = await explainCounselorRecommendations(USER_ID, counselorResult);
    expect(explanation).toBeNull();

    const recorded = usageInserts();
    expect(recorded).toHaveLength(1);
    expect(recorded[0]?.row).toMatchObject({ user_id: USER_ID, feature: "counselor_explanation", input_tokens: 1500, output_tokens: 300 });
  });
});

describe("refineAchievementDescription — usage recording", () => {
  test("a successful refinement is recorded in ai_usage exactly once", async () => {
    providerRef.current!.queueStructured({ improvedDescription: "Led weekly meetings for 12 members.", suggestedQuestions: [] });

    await refineAchievementDescription({ userId: USER_ID, achievementType: "activity", title: "Club lead", organization: null, description: "ran a club", tier: "standard" });

    const recorded = usageInserts();
    expect(recorded).toHaveLength(1);
    expect(recorded[0]?.row).toMatchObject({ user_id: USER_ID, feature: "achievement_refinement", input_tokens: 10, output_tokens: 10 });
  });

  test("a retry-exhausted failure still records the real, billed usage rather than throwing silently", async () => {
    providerRef.current!.queueStructured(
      new AIStructuredResponseFailedError({ lastError: "improvedDescription: Expected string, received number", usage: { inputTokens: 900, outputTokens: 200 }, model: "claude-sonnet-5" }),
    );

    await expect(
      refineAchievementDescription({ userId: USER_ID, achievementType: "activity", title: "Club lead", organization: null, description: "ran a club", tier: "standard" }),
    ).rejects.toBeInstanceOf(AIStructuredResponseFailedError);

    const recorded = usageInserts();
    expect(recorded).toHaveLength(1);
    expect(recorded[0]?.row).toMatchObject({ user_id: USER_ID, feature: "achievement_refinement", input_tokens: 900, output_tokens: 200 });
  });
});
