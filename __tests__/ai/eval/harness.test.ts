import { describe, expect, test, vi } from "vitest";
import { MockAIProvider } from "../../stubs/mock-ai-provider";

/**
 * Proves the harness's own logic — that it calls the right target function per case, runs
 * the deterministic checks against whatever comes back, and aggregates a report — using
 * MockAIProvider's queued fake responses. No live model call is ever made here, the same
 * discipline __tests__/ai/weekly-plan.test.ts already established for the real generator.
 *
 * counselor_explain's own real function (explainCounselorRecommendations) now goes through
 * withUsageLogging (2026-09-02, closing the same off-the-books-spend gap weekly-plan.test.ts's
 * own mock comment already describes for that surface) — reaches a real Supabase admin
 * client via logAIUsage, so both are mocked out here the identical way
 * weekly-plan.test.ts does: run the callback with a fixed model, skip the real
 * selectModelForUser/budget check and the real DB write.
 */
vi.mock("@/lib/ai/usage", () => ({
  logAIUsage: vi.fn().mockResolvedValue(undefined),
  withUsageLogging: async <T>(_meta: unknown, run: (model: string) => Promise<T>) => run("claude-sonnet-5"),
}));

const { runEvalCase, runEval } = await import("@/lib/ai/eval/harness");
const { FIXTURES } = await import("@/lib/ai/eval/fixtures");
const { ALL_CASES } = await import("@/lib/ai/eval/cases");
const { JudgeVerdictSchema } = await import("@/lib/ai/eval/judge");

const regressionFixture = FIXTURES.find((f) => f.id === "regression")!;
const baselineFixture = FIXTURES.find((f) => f.id === "baseline")!;

function cleanJudgeVerdict(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    scores: { specific: 4, concise: 4, analytical: 4, calm: 5, evidenceAware: 4, actionOriented: 4 },
    discourage: "n/a",
    notes: "Clear and grounded in the profile.",
    ...overrides,
  };
}

describe("ALL_CASES", () => {
  test("is the full 2 fixtures x 3 targets x 2 locales matrix", () => {
    expect(ALL_CASES).toHaveLength(12);
  });

  test("every case's fixture is one of the two known ones", () => {
    for (const c of ALL_CASES) expect(["regression", "baseline"]).toContain(c.fixture.id);
  });
});

describe("runEvalCase — advisor_chat", () => {
  test("a deliberately bad response is caught by the deterministic checks", async () => {
    const provider = new MockAIProvider();
    provider.queueText("I wouldn't start another club — your career_exploration gap matters more, and Research is 0/100 right now.");
    const result = await runEvalCase(provider, { fixture: regressionFixture, target: "advisor_chat", locale: "en" }, { includeJudge: false });

    expect(result.deterministicFindings.length).toBeGreaterThan(0);
    expect(result.deterministicFindings.map((f) => f.check)).toContain("raw_identifier_leak");
    expect(result.deterministicFindings.map((f) => f.check)).toContain("unassessed_dimension_scored");
    expect(result.judge).toBeNull();
  });

  test("a clean response produces zero findings", async () => {
    const provider = new MockAIProvider();
    provider.queueText("Leadership and entrepreneurship are already strong. Research hasn't been assessed yet — that's the clearer place to build evidence rather than starting a second club.");
    const result = await runEvalCase(provider, { fixture: regressionFixture, target: "advisor_chat", locale: "en" }, { includeJudge: false });

    expect(result.deterministicFindings).toHaveLength(0);
  });

  test("sends the question as the prompt and a system prompt containing the student's context", async () => {
    const provider = new MockAIProvider();
    provider.queueText("A clean reply.");
    await runEvalCase(provider, { fixture: regressionFixture, target: "advisor_chat", locale: "en" }, { includeJudge: false });

    expect(provider.textCalls).toHaveLength(1);
    expect(provider.textCalls[0].prompt).toBe("Should I start another entrepreneurship club?");
    expect(provider.textCalls[0].system).toContain("Deniz");
    expect(provider.textCalls[0].system).toContain("Proxola Advisor");
  });

  test("locale: tr appends the output-language instruction to the system prompt", async () => {
    const provider = new MockAIProvider();
    provider.queueText("Türkçe bir yanıt.");
    await runEvalCase(provider, { fixture: baselineFixture, target: "advisor_chat", locale: "tr" }, { includeJudge: false });

    expect(provider.textCalls[0].system).toContain("Turkish");
  });
});

describe("runEvalCase — weekly_plan", () => {
  function planResponse(overrides: Record<string, unknown> = {}) {
    return {
      summary: "Research is the clearest gap this week.",
      actions: [{ title: "Start a research project", description: "Pick a topic and begin.", reason: "Research hasn't been assessed yet.", category: "research", estimatedMinutes: 120, impact: "high" }],
      avoidForNow: { activity: "Starting another club", reason: "Leadership and entrepreneurship are already strong." },
      ...overrides,
    };
  }

  test("extracts response text from summary + action reasons + avoidForNow, and the deterministic checks read that text", async () => {
    const provider = new MockAIProvider();
    provider.queueStructured(planResponse({ summary: "Research is 0/100, the clear starting point." }));
    const result = await runEvalCase(provider, { fixture: regressionFixture, target: "weekly_plan", locale: "en" }, { includeJudge: false });

    expect(result.responseText).toContain("Research is 0/100");
    expect(result.deterministicFindings.map((f) => f.check)).toContain("unassessed_dimension_scored");
  });

  test("a clean plan produces zero findings", async () => {
    const provider = new MockAIProvider();
    provider.queueStructured(planResponse());
    const result = await runEvalCase(provider, { fixture: regressionFixture, target: "weekly_plan", locale: "en" }, { includeJudge: false });
    expect(result.deterministicFindings).toHaveLength(0);
  });

  test("a null avoidForNow doesn't crash text assembly", async () => {
    const provider = new MockAIProvider();
    provider.queueStructured(planResponse({ avoidForNow: null }));
    const result = await runEvalCase(provider, { fixture: baselineFixture, target: "weekly_plan", locale: "en" }, { includeJudge: false });
    expect(result.responseText).not.toContain("Avoid for now");
  });

  test("a compliant plan reports postProcessingChanged: false, not undefined", async () => {
    const provider = new MockAIProvider();
    provider.queueStructured(planResponse());
    const result = await runEvalCase(provider, { fixture: regressionFixture, target: "weekly_plan", locale: "en" }, { includeJudge: false });
    expect(result.postProcessingChanged).toBe(false);
  });

  /**
   * The exact bug found and fixed alongside this test: fixtures.ts's baselineFixture used
   * to set weeklyTimeBudget to "2-5 hours" (display prose), not the real "2_5h" enum key —
   * enforceTimeBudget's bucket lookup silently matched nothing, so a grossly over-budget
   * fixture plan passed through untouched, with no error, no warning, and no test to catch
   * it. baselineFixture's budget is 2_5h (300min upper bound, 360min with 20% tolerance).
   */
  test("runEvalCase applies enforceTimeBudget — an over-budget plan is trimmed before scoring, and postProcessingChanged is true", async () => {
    const provider = new MockAIProvider();
    provider.queueStructured(
      planResponse({
        avoidForNow: null,
        actions: [
          { title: "Action A", description: "d", reason: "r", category: "c", estimatedMinutes: 200, impact: "high" },
          { title: "Action B", description: "d", reason: "r", category: "c", estimatedMinutes: 200, impact: "medium" },
        ],
      }),
    );
    const result = await runEvalCase(provider, { fixture: baselineFixture, target: "weekly_plan", locale: "en" }, { includeJudge: false });
    expect(result.postProcessingChanged).toBe(true);
    // 400min raw, trimmed to the single higher-priority action (200min) — under the 360min threshold.
    expect(result.responseText).toContain("Action A");
    expect(result.responseText).not.toContain("Action B");
  });

  test("runEvalCase applies resolvePlanSelfContradiction — a self-contradictory avoidForNow is dropped before scoring, and postProcessingChanged is true", async () => {
    const provider = new MockAIProvider();
    provider.queueStructured(
      planResponse({
        actions: [{ title: "Start another entrepreneurship club", description: "d", reason: "r", category: "c", estimatedMinutes: 60, impact: "high" }],
        avoidForNow: { activity: "starting another entrepreneurship club", reason: "r" },
      }),
    );
    const result = await runEvalCase(provider, { fixture: regressionFixture, target: "weekly_plan", locale: "en" }, { includeJudge: false });
    expect(result.postProcessingChanged).toBe(true);
    expect(result.responseText).not.toContain("Avoid for now");
  });

  test("advisor_chat and counselor_explain leave postProcessingChanged undefined — the concept doesn't apply to them", async () => {
    const chatProvider = new MockAIProvider();
    chatProvider.queueText("A reply.");
    const chatResult = await runEvalCase(chatProvider, { fixture: regressionFixture, target: "advisor_chat", locale: "en" }, { includeJudge: false });
    expect(chatResult.postProcessingChanged).toBeUndefined();

    const explainProvider = new MockAIProvider();
    explainProvider.queueStructured({ summary: "s", perRecommendation: [] });
    const explainResult = await runEvalCase(explainProvider, { fixture: regressionFixture, target: "counselor_explain", locale: "en" }, { includeJudge: false });
    expect(explainResult.postProcessingChanged).toBeUndefined();
  });
});

describe("runEvalCase — counselor_explain", () => {
  test("calls the real explainCounselorRecommendations and reads its structured narrative", async () => {
    const provider = new MockAIProvider();
    provider.queueStructured({
      summary: "One strong opportunity, one thing to skip.",
      perRecommendation: [
        { id: "opportunity:fixture-1", narrative: "This addresses your unassessed research area." },
        { id: "activity:fixture-club", narrative: "career_exploration would not benefit from a second club." },
      ],
    });
    const result = await runEvalCase(provider, { fixture: regressionFixture, target: "counselor_explain", locale: "en" }, { includeJudge: false });

    expect(result.responseText).toContain("One strong opportunity");
    expect(result.deterministicFindings.map((f) => f.check)).toContain("raw_identifier_leak");
  });

  test("returns empty text (not a crash) when the model call fails, matching the real function's null-on-failure contract", async () => {
    const provider = new MockAIProvider();
    provider.queueStructured(new Error("provider error"));
    const result = await runEvalCase(provider, { fixture: baselineFixture, target: "counselor_explain", locale: "en" }, { includeJudge: false });
    expect(result.responseText).toBe("");
    expect(result.deterministicFindings).toHaveLength(0);
  });
});

describe("runEvalCase — judge", () => {
  test("includeJudge:false never queries the judge schema", async () => {
    const provider = new MockAIProvider();
    provider.queueText("A reply.");
    await runEvalCase(provider, { fixture: baselineFixture, target: "advisor_chat", locale: "en" }, { includeJudge: false });
    expect(provider.structuredCalls).toHaveLength(0);
  });

  test("includeJudge:true makes a second structured call and returns the parsed verdict", async () => {
    const provider = new MockAIProvider();
    provider.queueText("A reply.");
    provider.queueStructured(cleanJudgeVerdict());
    const result = await runEvalCase(provider, { fixture: baselineFixture, target: "advisor_chat", locale: "en" }, { includeJudge: true });

    expect(result.judge).not.toBeNull();
    expect(result.judge!.scores.calm).toBe(5);
    expect(provider.structuredCalls).toHaveLength(1);
    expect(provider.structuredCalls[0].prompt).toContain("A reply.");
  });

  test("the judge schema rejects an out-of-range score (sanity-checks the schema itself, not just the wiring)", () => {
    const parsed = JudgeVerdictSchema.safeParse(cleanJudgeVerdict({ scores: { ...cleanJudgeVerdict().scores, calm: 6 } }));
    expect(parsed.success).toBe(false);
  });
});

describe("runEval", () => {
  test("runs every case and aggregates deterministicFailureCount", async () => {
    const provider = new MockAIProvider();
    // 12 cases: queue a clean structured/text response for each in matrix order (fixtures
    // outer, targets middle, locales inner — matches cases.ts's own flatMap order).
    for (let i = 0; i < 12; i++) {
      const target = ALL_CASES[i].target;
      if (target === "weekly_plan") {
        provider.queueStructured({ summary: "Fine.", actions: [{ title: "Do a thing", description: "d", reason: "Grounded reason.", category: "research", estimatedMinutes: 60, impact: "medium" }], avoidForNow: null });
      } else if (target === "counselor_explain") {
        provider.queueStructured({ summary: "Fine.", perRecommendation: [{ id: "opportunity:fixture-1", narrative: "Grounded." }] });
      } else {
        provider.queueText("A clean, grounded reply with no issues.");
      }
    }

    const report = await runEval(provider, ALL_CASES, { includeJudge: false });
    expect(report.results).toHaveLength(12);
    expect(report.deterministicFailureCount).toBe(0);
  });

  test("one failing case does not destroy the run — the successes were already paid for", async () => {
    // 2026-09-02: a live run threw on a weekly_plan case (the model omitted a required
    // field twice — a known behaviour anthropic-provider.ts's own retry comment documents)
    // and the exception took the entire report with it: every case that had already
    // succeeded, every judge score already billed, and the usage total. ~$0.20-0.30 of real
    // spend produced nothing readable, and the operator could not even say how much
    // precisely, because totals are computed at the end.
    const provider = new MockAIProvider();
    provider.queueText("A reply that works.");
    // Second call has nothing queued — MockAIProvider throws, standing in for the real
    // schema-validation failure.
    const cases = [
      { fixture: baselineFixture, target: "advisor_chat" as const, locale: "en" as const },
      { fixture: baselineFixture, target: "advisor_chat" as const, locale: "tr" as const },
    ];
    const report = await runEval(provider, cases, { includeJudge: false });

    expect(report.results).toHaveLength(1);
    expect(report.failures).toHaveLength(1);
    expect(report.failures[0].case.locale).toBe("tr");
    expect(report.failures[0].message).toBeTruthy();
    // The surviving case's spend is still accounted for, which is the point.
    expect(report.totalUsage).toEqual({ inputTokens: 10, outputTokens: 10 });
  });

  test("totalUsage sums targetUsage across all cases", async () => {
    const provider = new MockAIProvider();
    provider.queueText("A reply.");
    provider.queueText("Another reply.");
    const cases = [
      { fixture: baselineFixture, target: "advisor_chat" as const, locale: "en" as const },
      { fixture: baselineFixture, target: "advisor_chat" as const, locale: "tr" as const },
    ];
    const report = await runEval(provider, cases, { includeJudge: false });
    // MockAIProvider always returns {inputTokens: 10, outputTokens: 10} per call.
    expect(report.totalUsage).toEqual({ inputTokens: 20, outputTokens: 20 });
  });
});
