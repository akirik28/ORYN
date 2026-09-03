import { describe, expect, test, vi, beforeEach } from "vitest";

/**
 * CEO, 2026-09-02: the same evidence-state question as cohort.test.ts, on the other side
 * of the comparison -- does a STUDENT'S OWN not_assessed dimension get offered a benchmark
 * at all? Comparing "no evidence recorded" (score 0 by construction) against real peers
 * would produce a percentile for a signal Proxola doesn't have, the same false-precision harm
 * Phase 68 forbids everywhere else this evidence-state machinery is used.
 */
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/benchmarking/cohort", () => ({ getCohortDimensionScores: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { getCohortDimensionScores } from "@/lib/benchmarking/cohort";
import { getPeerBenchmarks } from "@/lib/benchmarking";

function scoreRow(overrides: { dimension: string; score: number; confidence?: "low" | "medium" | "high"; reason_codes?: unknown[] }) {
  return { confidence: "medium" as const, reason_codes: [{ code: "x" }], ...overrides };
}

function builder(result: { data: unknown; error?: unknown }) {
  const b: Record<string, unknown> = {
    select: () => b,
    eq: () => b,
    single: () => Promise.resolve({ error: null, ...result }),
    then: (resolve: (r: typeof result) => unknown) => resolve({ error: null, ...result }),
  };
  return b;
}

function makeSupabase(opts: {
  profile: { graduation_year: number | null; curriculum: string | null; profile_strength_score: number | null } | null;
  myScores: ReturnType<typeof scoreRow>[];
}) {
  return {
    from: (table: string) => {
      if (table === "profiles") return builder({ data: opts.profile });
      if (table === "profile_scores") return builder({ data: opts.myScores });
      throw new Error(`unexpected table in test fixture: ${table}`);
    },
  };
}

beforeEach(() => {
  vi.mocked(createClient).mockReset();
  vi.mocked(getCohortDimensionScores).mockReset();
  vi.mocked(getCohortDimensionScores).mockResolvedValue(new Map());
});

describe("getPeerBenchmarks — my own evidence-state filtering", () => {
  test("an assessed dimension is offered a benchmark", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase({
        profile: { graduation_year: 2027, curriculum: null, profile_strength_score: 50 },
        myScores: [scoreRow({ dimension: "research", score: 55, confidence: "medium" })],
      }) as never
    );

    const summary = await getPeerBenchmarks("me");

    expect(summary.results.find((r) => r.dimension === "research")).toBeDefined();
  });

  test("a not_assessed dimension (no reason codes) is dropped entirely, not shown as 'not enough students'", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase({
        profile: { graduation_year: 2027, curriculum: null, profile_strength_score: 50 },
        myScores: [scoreRow({ dimension: "research", score: 0, confidence: "low", reason_codes: [] })],
      }) as never
    );

    const summary = await getPeerBenchmarks("me");

    // The distinction this guards: "not shown because Proxola has no signal for you here" and
    // "not shown because there aren't enough comparable peers" are different sentences.
    // Before this fix, a not_assessed dimension would appear in `results` with a null
    // percentile, indistinguishable in the UI's own withData filter from a genuinely
    // assessed-but-thin-cohort dimension.
    expect(summary.results.find((r) => r.dimension === "research")).toBeUndefined();
  });

  test("a limited_evidence dimension (reason codes present, confidence still low) is also dropped", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase({
        profile: { graduation_year: 2027, curriculum: null, profile_strength_score: 50 },
        myScores: [scoreRow({ dimension: "research", score: 15, confidence: "low", reason_codes: [{ code: "x" }] })],
      }) as never
    );

    const summary = await getPeerBenchmarks("me");

    expect(summary.results.find((r) => r.dimension === "research")).toBeUndefined();
  });

  test("overall is always offered when profile_strength_score is non-null, regardless of any dimension's evidence state", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase({
        profile: { graduation_year: 2027, curriculum: null, profile_strength_score: 42 },
        myScores: [scoreRow({ dimension: "research", score: 0, confidence: "low", reason_codes: [] })],
      }) as never
    );

    const summary = await getPeerBenchmarks("me");

    expect(summary.results.find((r) => r.dimension === "overall")).toMatchObject({ myScore: 42 });
  });

  test("mixed: assessed dimensions offered, not_assessed ones silently absent from the same result set", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase({
        profile: { graduation_year: 2027, curriculum: null, profile_strength_score: 50 },
        myScores: [
          scoreRow({ dimension: "research", score: 0, confidence: "low", reason_codes: [] }),
          scoreRow({ dimension: "leadership", score: 80, confidence: "high" }),
        ],
      }) as never
    );

    const summary = await getPeerBenchmarks("me");
    const dimensions = summary.results.map((r) => r.dimension);

    expect(dimensions).toContain("leadership");
    expect(dimensions).not.toContain("research");
  });
});
