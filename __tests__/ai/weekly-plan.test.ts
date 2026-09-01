import { beforeEach, describe, expect, test, vi } from "vitest";
import { MockAIProvider } from "../stubs/mock-ai-provider";
import type { CounselorRecommendation } from "@/lib/counselor/types";
import type { AIProvider } from "@/lib/ai/provider";

/**
 * Regression suite for the dashboard's self-contradicting weekly plan: a benchmark run found
 * two of the three recommended priorities also listed under "one thing not to do", on the
 * same account, in the same minute.
 *
 * These tests deliberately drive the real `generateWeeklyPlan` end to end with the AI
 * provider mocked out, rather than only unit-testing the formatter. The contradiction was
 * never a formatting bug in isolation — it lived in what the assembled prompt actually said
 * to the model, and in the absence of any check on what the model said back.
 *
 * No live model call is ever made here: `@/lib/ai/index` is mocked so `getAIProvider()`
 * returns a MockAIProvider whose responses are queued by the test.
 */

const h = vi.hoisted(() => ({
  provider: null as AIProvider | null,
  recommendations: [] as CounselorRecommendation[],
  counselorFails: false,
}));

vi.mock("@/lib/ai/index", () => ({
  getAIProvider: () => h.provider,
}));

vi.mock("@/lib/ai/usage", () => ({
  logAIUsage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/ai/student-context", () => ({
  // `student` is required by StudentAdvisorContext, and generateWeeklyPlan reads
  // preferredLanguage off it to pick the response language — an empty object typechecked
  // only because the mock is untyped.
  buildStudentAdvisorContext: vi.fn().mockResolvedValue({ student: { preferredLanguage: "en" } }),
  formatContextForPrompt: () => "STUDENT CONTEXT BLOCK",
}));

vi.mock("@/lib/counselor", () => ({
  getCounselorRecommendations: vi.fn(async () => {
    if (h.counselorFails) throw new Error("db unavailable");
    return {
      scoreVersion: "counselor_ranking_v1",
      gaps: [],
      recommendations: h.recommendations,
      profileReadiness: { completenessPercent: 80, sufficientForJudgment: true },
    };
  }),
}));

const { generateWeeklyPlan, formatCounselorGrounding, resolvePlanSelfContradiction } = await import("@/lib/ai/weekly-plan");
const { formatEligibilityCaveat } = await import("@/lib/ai/eligibility-text");

function rec(overrides: Partial<CounselorRecommendation> = {}): CounselorRecommendation {
  return {
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
    evidence: [{ sourceType: "opportunity", sourceId: "opp-1", sourceUrl: "https://example.org", verificationState: "verified_current" }],
    warnings: [],
    nextAction: { label: "View opportunity", type: "VIEW", href: "/opportunities/opp-1" },
    ...overrides,
  };
}

function planResponse(overrides: Record<string, unknown> = {}) {
  return {
    summary: "Research remains the clearest gap this week.",
    actions: [
      {
        title: "Finish the youth-unemployment dataset",
        description: "Clean and chart the OECD extract you already pulled.",
        reason: "Research is your weakest dimension at 42/100.",
        category: "research",
        estimatedMinutes: 150,
        impact: "very_high" as const,
      },
    ],
    avoidForNow: null,
    ...overrides,
  };
}

/**
 * Returns the single blank-line-delimited block of the prompt that begins at `marker`.
 * The grounding is assembled as `\n\n`-separated sections, so this isolates exactly one
 * section — which is the whole point of the fix: a "prefer these" section and a "ruled out"
 * section must not be the same block of text.
 */
function sectionContaining(prompt: string, marker: string): string {
  const start = prompt.indexOf(marker);
  expect(start, `prompt did not contain the marker ${JSON.stringify(marker)}`).toBeGreaterThanOrEqual(0);
  const sectionStart = prompt.lastIndexOf("\n\n", start) + 2;
  const end = prompt.indexOf("\n\n", start);
  return prompt.slice(sectionStart, end === -1 ? undefined : end);
}

async function runPlan(response: Record<string, unknown> = planResponse()) {
  const provider = new MockAIProvider().queueStructured(response);
  h.provider = provider;
  const plan = await generateWeeklyPlan("user-1");
  return { plan, prompt: provider.structuredCalls[0].prompt };
}

beforeEach(() => {
  h.recommendations = [];
  h.counselorFails = false;
  h.provider = null;
});

describe("counselor grounding — recommendation classes must not be flattened into one list", () => {
  test("a deprioritized candidate is never offered to the model as a preferred action", async () => {
    h.recommendations = [
      rec({ recommendationClass: "do", title: "Youth Economics Research Program" }),
      rec({ id: "opportunity:opp-2", recommendationClass: "deprioritize", title: "Regional Debate League officer role" }),
    ];

    const { prompt } = await runPlan();
    const preferred = sectionContaining(prompt, "prefer these");

    expect(preferred).toContain("Youth Economics Research Program");
    expect(preferred).not.toContain("Regional Debate League officer role");
  });

  test("an avoid_for_now candidate is never offered to the model as a preferred action", async () => {
    h.recommendations = [
      rec({ recommendationClass: "do", title: "Youth Economics Research Program" }),
      rec({ id: "opportunity:opp-3", recommendationClass: "avoid_for_now", title: "Start another entrepreneurship club" }),
    ];

    const { prompt } = await runPlan();
    const preferred = sectionContaining(prompt, "prefer these");

    expect(preferred).toContain("Youth Economics Research Program");
    expect(preferred).not.toContain("Start another entrepreneurship club");
  });

  test("ruled-out candidates still reach the model, in a section that says plainly not to recommend them", async () => {
    h.recommendations = [
      rec({ recommendationClass: "do", title: "Youth Economics Research Program" }),
      rec({ id: "opportunity:opp-3", recommendationClass: "avoid_for_now", title: "Start another entrepreneurship club" }),
    ];

    const { prompt } = await runPlan();
    const ruledOut = sectionContaining(prompt, "Start another entrepreneurship club");

    expect(ruledOut).toMatch(/not|never|avoid/i);
    expect(ruledOut).not.toContain("prefer these");
  });

  test("no ruled-out candidates means no ruled-out section at all — an empty heading is noise", async () => {
    h.recommendations = [rec({ recommendationClass: "do" }), rec({ id: "opportunity:opp-2", recommendationClass: "consider", title: "Model UN research brief" })];

    const { prompt } = await runPlan();

    expect(prompt).toContain("Youth Economics Research Program");
    expect(prompt).toContain("Model UN research brief");
    expect(prompt).not.toMatch(/ruled (these )?out/i);
  });
});

describe("counselor grounding — eligibility must not be silently dropped", () => {
  /** The caveat must be on the candidate's own line. Asserting against the whole prompt
   * would pass off the section heading alone, which names both tokens to explain them. */
  function candidateLine(prompt: string): string {
    const lines = prompt.split("\n").filter((l) => l.startsWith("- ["));
    expect(lines).toHaveLength(1);
    return lines[0];
  }

  test("an unknown-eligibility candidate carries its caveat into the prompt", async () => {
    h.recommendations = [
      rec({
        title: "TechGirls",
        eligibility: { verdict: "unknown", notes: ["Country eligibility hasn't been verified for this opportunity yet."] },
      }),
    ];

    const line = candidateLine((await runPlan()).prompt);

    expect(line).toContain("TechGirls");
    expect(line).toContain("ELIGIBILITY UNKNOWN");
    expect(line).toContain("Country eligibility hasn't been verified");
  });

  test("an unknown-eligibility candidate with no notes still says so, rather than reading as eligible", async () => {
    h.recommendations = [rec({ title: "TechGirls", eligibility: { verdict: "unknown", notes: [] } })];

    expect(candidateLine((await runPlan()).prompt)).toContain("ELIGIBILITY UNKNOWN");
  });

  test("defense in depth: a known-ineligible candidate is labelled, never presented as a real option", async () => {
    h.recommendations = [
      rec({
        title: "QuestBridge National College Match",
        eligibility: { verdict: "known_ineligible", notes: ["Not currently open to students in Turkey."] },
      }),
    ];

    const line = candidateLine((await runPlan()).prompt);

    expect(line).toContain("NOT ELIGIBLE");
    expect(line).toContain("Not currently open to students in Turkey.");
  });

  test("a known-eligible candidate stays quiet — no caveat noise on the normal path", async () => {
    h.recommendations = [rec()];

    const { prompt } = await runPlan();
    // Scoped to the candidate lines: the section heading names both caveat tokens on
    // purpose (it tells the model what they mean), so a whole-prompt assertion would be
    // testing the heading, not the rendering of this candidate.
    const candidateLines = prompt.split("\n").filter((l) => l.startsWith("- ["));

    expect(candidateLines).toHaveLength(1);
    expect(candidateLines[0]).toContain("Youth Economics Research Program");
    expect(candidateLines[0]).not.toContain("ELIGIBILITY UNKNOWN");
    expect(candidateLines[0]).not.toContain("NOT ELIGIBLE");
  });
});

describe("output guard — actions and avoidForNow must never name the same thing", () => {
  test("an exact-title contradiction is resolved by dropping avoidForNow, keeping the action", async () => {
    const { plan } = await runPlan(
      planResponse({
        actions: [
          {
            title: "Start another entrepreneurship club",
            description: "Recruit a founding team.",
            reason: "Leadership is strong.",
            category: "leadership",
            estimatedMinutes: 120,
            impact: "medium" as const,
          },
        ],
        avoidForNow: { activity: "Start another entrepreneurship club", reason: "Leadership is already one of your strongest areas." },
      }),
    );

    expect(plan.avoidForNow).toBeNull();
    expect(plan.actions).toHaveLength(1);
    expect(plan.actions[0].title).toBe("Start another entrepreneurship club");
  });

  test("a phrase-level contradiction is caught too — the model rarely repeats a title verbatim", async () => {
    const { plan } = await runPlan(
      planResponse({
        actions: [
          {
            title: "Apply to the Economics Challenge",
            description: "Submit the entry form before the deadline.",
            reason: "Competition exposure is a gap.",
            category: "competition",
            estimatedMinutes: 90,
            impact: "high" as const,
          },
        ],
        avoidForNow: { activity: "Economics Challenge", reason: "It clashes with your exam week." },
      }),
    );

    expect(plan.avoidForNow).toBeNull();
  });

  test("the intersection of action titles and avoidForNow is empty for every action, not just the first", async () => {
    const { plan } = await runPlan(
      planResponse({
        actions: [
          { title: "Finish the youth-unemployment dataset", description: "d", reason: "r", category: "research", estimatedMinutes: 150, impact: "very_high" as const },
          { title: "Write the research conclusion", description: "d", reason: "r", category: "research", estimatedMinutes: 45, impact: "high" as const },
          { title: "Start another entrepreneurship club", description: "d", reason: "r", category: "leadership", estimatedMinutes: 120, impact: "low" as const },
        ],
        avoidForNow: { activity: "starting another entrepreneurship club", reason: "Leadership is already strong." },
      }),
    );

    const avoided = plan.avoidForNow;
    const overlap = plan.actions.filter((a) => avoided !== null && a.title.toLowerCase().includes(avoided.activity.toLowerCase()));
    expect(overlap).toHaveLength(0);
    expect(avoided).toBeNull();
  });

  test("a genuinely different avoidForNow survives untouched — the guard must not eat the feature", async () => {
    const { plan } = await runPlan(
      planResponse({
        avoidForNow: { activity: "Start another entrepreneurship club", reason: "Leadership is already one of your strongest areas." },
      }),
    );

    expect(plan.avoidForNow).not.toBeNull();
    expect(plan.avoidForNow?.activity).toBe("Start another entrepreneurship club");
  });

  test("a single shared word is a topic overlap, not the same activity — avoidForNow survives", async () => {
    const { plan } = await runPlan(
      planResponse({
        actions: [
          { title: "Finish your economics research paper", description: "d", reason: "r", category: "research", estimatedMinutes: 150, impact: "high" as const },
        ],
        avoidForNow: { activity: "research", reason: "Too vague to act on." },
      }),
    );

    expect(plan.avoidForNow).not.toBeNull();
  });

  test("a null avoidForNow passes through unchanged", async () => {
    const { plan } = await runPlan();
    expect(plan.avoidForNow).toBeNull();
    expect(plan.actions).toHaveLength(1);
  });
});

describe("formatCounselorGrounding (pure)", () => {
  test("keeps Counselor Core's own score order inside each section — grouping must never re-rank", () => {
    const text = formatCounselorGrounding([
      rec({ id: "a", recommendationClass: "do", title: "First do" }),
      rec({ id: "b", recommendationClass: "deprioritize", title: "First ruled out" }),
      rec({ id: "c", recommendationClass: "consider", title: "Second recommended" }),
      rec({ id: "d", recommendationClass: "avoid_for_now", title: "Second ruled out" }),
    ]);

    expect(text.indexOf("First do")).toBeLessThan(text.indexOf("Second recommended"));
    expect(text.indexOf("First ruled out")).toBeLessThan(text.indexOf("Second ruled out"));
    expect(text.indexOf("Second recommended")).toBeLessThan(text.indexOf("First ruled out"));
  });

  test("caps each section independently so a flood of ruled-out items cannot crowd out the recommendations", () => {
    const text = formatCounselorGrounding([
      ...Array.from({ length: 12 }, (_, i) => rec({ id: `do-${i}`, recommendationClass: "do", title: `Recommended ${i}` })),
      ...Array.from({ length: 12 }, (_, i) => rec({ id: `dep-${i}`, recommendationClass: "deprioritize", title: `Ruled out ${i}` })),
    ]);

    expect(text.split("\n").filter((l) => l.startsWith("- [do]"))).toHaveLength(8);
    expect(text.split("\n").filter((l) => l.startsWith("- [deprioritize]"))).toHaveLength(4);
  });

  test("returns an empty string, not a bare heading, when there is nothing to ground on", () => {
    expect(formatCounselorGrounding([])).toBe("");
  });

  test("a list containing only ruled-out candidates still produces the ruled-out section", () => {
    const text = formatCounselorGrounding([rec({ recommendationClass: "avoid_for_now", title: "Start another club" })]);
    expect(text).toContain("Start another club");
    expect(text).not.toContain("prefer these");
  });
});

describe("resolvePlanSelfContradiction (pure)", () => {
  function plan(actionTitles: string[], avoidActivity: string | null) {
    return {
      summary: "s",
      actions: actionTitles.map((title) => ({
        title,
        description: "d",
        reason: "r",
        category: "c",
        estimatedMinutes: 60,
        impact: "high" as const,
      })),
      avoidForNow: avoidActivity === null ? null : { activity: avoidActivity, reason: "r" },
    };
  }

  test("catches an inflected restatement of the same activity", () => {
    expect(resolvePlanSelfContradiction(plan(["Start another entrepreneurship club"], "starting another entrepreneurship club")).avoidForNow).toBeNull();
  });

  test("catches punctuation and casing differences", () => {
    expect(resolvePlanSelfContradiction(plan(["Apply to the Economics Challenge!"], "apply to the economics challenge")).avoidForNow).toBeNull();
  });

  test("does not match a word appearing inside a longer word", () => {
    expect(resolvePlanSelfContradiction(plan(["Study macroeconomics theory"], "economics theory")).avoidForNow).not.toBeNull();
  });

  test("leaves two genuinely different activities alone", () => {
    expect(resolvePlanSelfContradiction(plan(["Finish the youth-unemployment dataset"], "Start another entrepreneurship club")).avoidForNow).not.toBeNull();
  });

  test("an empty or whitespace-only avoid activity is never treated as matching everything", () => {
    expect(resolvePlanSelfContradiction(plan(["Finish the dataset"], "   ")).avoidForNow).not.toBeNull();
  });
});

describe("formatEligibilityCaveat (shared with the advisor's opportunity context)", () => {
  test("known_eligible renders nothing", () => {
    expect(formatEligibilityCaveat({ verdict: "known_eligible", notes: [] })).toBeNull();
  });

  test("unknown always says so, with or without notes", () => {
    expect(formatEligibilityCaveat({ verdict: "unknown", notes: [] })).toContain("ELIGIBILITY UNKNOWN");
    expect(formatEligibilityCaveat({ verdict: "unknown", notes: ["Country not verified."] })).toContain("Country not verified.");
  });

  test("known_ineligible is labelled", () => {
    expect(formatEligibilityCaveat({ verdict: "known_ineligible", notes: ["Not open in Turkey."] })).toBe("NOT ELIGIBLE: Not open in Turkey.");
  });
});

describe("resilience — counselor grounding stays strictly additive", () => {
  test("a counselor failure omits the grounding but still produces a plan", async () => {
    h.counselorFails = true;

    const { plan, prompt } = await runPlan();

    expect(plan.summary).toBe("Research remains the clearest gap this week.");
    expect(prompt).toContain("STUDENT CONTEXT BLOCK");
    expect(prompt).not.toContain("prefer these");
  });

  test("zero recommendations omits the grounding entirely rather than emitting an empty heading", async () => {
    h.recommendations = [];

    const { prompt } = await runPlan();

    expect(prompt).toContain("STUDENT CONTEXT BLOCK");
    expect(prompt).not.toContain("prefer these");
  });
});
