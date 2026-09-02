import { describe, expect, test, vi, beforeEach } from "vitest";

/**
 * CEO, 2026-09-02: does peer benchmarking correctly exclude not_assessed/limited_evidence
 * dimensions from the peer pool? getCohortDimensionScores had zero test coverage before
 * this — the filter it needed didn't exist either, this is the first pass covering both.
 * A peer's not_assessed row is score 0 by construction (lib/scoring/persist.ts always
 * upserts all 9 dimensions regardless of evidence) -- pooling it in would let peers with
 * nothing recorded quietly skew a dimension's distribution with phantom near-zeros.
 */
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { createAdminClient } from "@/lib/supabase/admin";
import { getCohortDimensionScores } from "@/lib/benchmarking/cohort";

function scoreRow(overrides: { user_id: string; dimension: string; score: number; confidence?: "low" | "medium" | "high"; reason_codes?: unknown[] }) {
  return { confidence: "medium" as const, reason_codes: [{ code: "x" }], ...overrides };
}

/** Chainable + directly awaitable, matching this codebase's established mock convention
 *  (e.g. __tests__/universities/queries-outlook-refresh.test.ts's own builder()). */
function builder(result: { data: unknown; error?: unknown }) {
  const b: Record<string, unknown> = {
    select: () => b,
    eq: () => b,
    neq: () => b,
    in: () => b,
    limit: () => b,
    then: (resolve: (r: typeof result) => unknown) => resolve({ error: null, ...result }),
  };
  return b;
}

function makeAdmin(opts: { peers: { id: string; profile_strength_score: number | null }[]; scores: ReturnType<typeof scoreRow>[] }) {
  return {
    from: (table: string) => {
      if (table === "profiles") return builder({ data: opts.peers });
      if (table === "profile_scores") return builder({ data: opts.scores });
      throw new Error(`unexpected table in test fixture: ${table}`);
    },
  };
}

beforeEach(() => {
  vi.mocked(createAdminClient).mockReset();
});

describe("getCohortDimensionScores — evidence-state filtering", () => {
  test("a genuinely assessed peer score is included", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdmin({
        peers: [{ id: "p1", profile_strength_score: 60 }],
        scores: [scoreRow({ user_id: "p1", dimension: "research", score: 55, confidence: "medium" })],
      }) as never
    );

    const result = await getCohortDimensionScores({ graduationYear: null, curriculum: null }, "me");

    expect(result.get("research")).toEqual([55]);
  });

  test("a not_assessed peer row (no reason codes) is excluded, not pooled as a phantom zero", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdmin({
        peers: [{ id: "p1", profile_strength_score: 0 }],
        scores: [scoreRow({ user_id: "p1", dimension: "research", score: 0, confidence: "low", reason_codes: [] })],
      }) as never
    );

    const result = await getCohortDimensionScores({ graduationYear: null, curriculum: null }, "me");

    expect(result.get("research")).toBeUndefined();
  });

  test("a limited_evidence peer row (reason codes present, but confidence still low) is excluded", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdmin({
        peers: [{ id: "p1", profile_strength_score: 20 }],
        scores: [scoreRow({ user_id: "p1", dimension: "research", score: 15, confidence: "low", reason_codes: [{ code: "x" }] })],
      }) as never
    );

    const result = await getCohortDimensionScores({ graduationYear: null, curriculum: null }, "me");

    expect(result.get("research")).toBeUndefined();
  });

  test("mixed peers: only the assessed one's score is pooled", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdmin({
        peers: [
          { id: "assessed", profile_strength_score: 60 },
          { id: "unassessed", profile_strength_score: 0 },
        ],
        scores: [
          scoreRow({ user_id: "assessed", dimension: "leadership", score: 70, confidence: "high" }),
          scoreRow({ user_id: "unassessed", dimension: "leadership", score: 0, confidence: "low", reason_codes: [] }),
        ],
      }) as never
    );

    const result = await getCohortDimensionScores({ graduationYear: null, curriculum: null }, "me");

    expect(result.get("leadership")).toEqual([70]);
  });

  test("overall (profile_strength_score) is unaffected by the evidence-state filter — it stays the product-wide average for every peer, assessed or not", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdmin({
        peers: [
          { id: "p1", profile_strength_score: 60 },
          { id: "p2", profile_strength_score: 0 },
        ],
        scores: [],
      }) as never
    );

    const result = await getCohortDimensionScores({ graduationYear: null, curriculum: null }, "me");

    expect(result.get("overall")).toEqual([60, 0]);
  });

  test("no peers at all: empty map, no crash", async () => {
    vi.mocked(createAdminClient).mockReturnValue(makeAdmin({ peers: [], scores: [] }) as never);

    const result = await getCohortDimensionScores({ graduationYear: null, curriculum: null }, "me");

    expect(result.size).toBe(0);
  });
});
