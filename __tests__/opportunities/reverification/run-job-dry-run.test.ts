import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * The one guarantee this whole package rests on before it ever touches real data (CEO
 * dispatch, 2026-09-03): "no writes, including no opportunity_verification_runs rows... if
 * dry-run can't currently suppress those, say so and stop rather than working around it."
 * This test is the automated proof, not just a reading of the code — it exercises the
 * branch with the MOST write opportunities in the whole pipeline (a confirmed disagreement
 * that resolves to a demotion-eligible p1_changed, which would otherwise trigger
 * claimLease + writeRun + writeSourceVerifiedAt + applyDemotion, all four) and asserts the
 * mock admin client's insert/update methods are never called at all when dryRun is true.
 *
 * Every real external call (fetch ladder, corroboration, LLM adjudication) is mocked here —
 * this test is about the WRITE-SUPPRESSION guarantee specifically, not about re-testing the
 * classification/priority logic already covered by this directory's other test files.
 */

const { insertMock, updateMock, eqUpdateMock } = vi.hoisted(() => ({
  insertMock: vi.fn(),
  updateMock: vi.fn(),
  eqUpdateMock: vi.fn(async () => ({ error: null })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => mockAdminClient(),
}));

vi.mock("@/lib/opportunities/reverification/fetch-ladder", () => ({
  runFetchLadder: vi.fn(async () => ({
    attempts: [{ rung: 1, method: "tavily_extract", httpStatus: 200, bytes: 2000, error: null }],
    content: "Boston University Summer Term: please note that applications are closed for this cycle. Notice published today.".padEnd(600, " filler "),
    finalUrl: "https://example.com/programme",
    succeededAtRung: 1,
    tavilyFailedResults: [],
  })),
}));

vi.mock("@/lib/opportunities/reverification/adjudicate", () => ({
  adjudicateDisagreement: vi.fn(async () => ({
    verdict: { cycleStateConfirmedChanged: true, reasoning: "The excerpt unambiguously states applications are closed." },
    usage: { inputTokens: 100, outputTokens: 20 },
  })),
}));

vi.mock("@/lib/providers/health", () => ({
  recordProviderSuccess: vi.fn(async () => {}),
  recordProviderFailure: vi.fn(async () => {}),
}));

const CANDIDATE_ROW = {
  id: "11111111-1111-1111-1111-111111111111",
  title: "Boston University Summer Term",
  organization: "Boston University",
  official_url: "https://example.com/programme",
  source_url: null,
  deadline: null,
  cycle_status: "open",
  source_verified_at: null,
};

// A second candidate, NOT due (next_check_at 30 days out) -- exists only for the
// candidateIds tests below, to prove candidateIds bypasses the due-set filter rather than
// merely narrowing within it (a due-only second row couldn't distinguish the two).
const NOT_DUE_CANDIDATE_ROW = {
  id: "22222222-2222-2222-2222-222222222222",
  title: "Yale Young Global Scholars",
  organization: "Yale University",
  official_url: "https://example.com/not-due-programme",
  source_url: null,
  deadline: null,
  cycle_status: "open",
  source_verified_at: null,
};

function chainable(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {
    eq: () => chain,
    select: () => chain,
    single: async () => result,
    then: (resolve: (value: { data: unknown; error: unknown }) => unknown) => Promise.resolve(result).then(resolve),
  };
  return chain;
}

function mockAdminClient() {
  return {
    from: (table: string) => ({
      select: () => {
        if (table === "opportunities") return chainable({ data: [CANDIDATE_ROW, NOT_DUE_CANDIDATE_ROW], error: null });
        if (table === "opportunity_matches") return chainable({ data: [{ opportunity_id: CANDIDATE_ROW.id, user_id: "u1", match_score: 90 }], error: null });
        if (table === "saved_opportunities") return chainable({ data: [], error: null });
        if (table === "opportunity_verification_latest")
          return chainable({
            data: [{ opportunity_id: NOT_DUE_CANDIDATE_ROW.id, next_check_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), consecutive_failures: 0 }],
            error: null,
          });
        return chainable({ data: [], error: null });
      },
      insert: (payload: unknown) => {
        insertMock(table, payload);
        return { select: () => ({ single: async () => ({ data: { id: "should-never-be-used" }, error: null }) }) };
      },
      update: (payload: unknown) => {
        updateMock(table, payload);
        return { eq: eqUpdateMock };
      },
    }),
  };
}

beforeEach(() => {
  insertMock.mockClear();
  updateMock.mockClear();
  eqUpdateMock.mockClear();
  process.env.REVERIFY_ALLOW_DEMOTION = "true"; // maximum write pressure -- see below
});

describe("runReverificationPass with dryRun: true", () => {
  test("never calls insert or update on the admin client, even on the branch with the most write opportunities", async () => {
    // REVERIFY_ALLOW_DEMOTION=true above is deliberate: without it, a real run wouldn't
    // even attempt the demotion write, which would make this test pass for the wrong
    // reason (an already-off switch, not the dryRun guard). This proves dryRun suppresses
    // the demotion write INDEPENDENTLY of the env flag, exactly as run-job.ts documents.
    const { runReverificationPass } = await import("@/lib/opportunities/reverification/run-job");

    const result = await runReverificationPass({ maxRows: 5, budgetMs: 60000, dryRun: true });

    expect(insertMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
    expect(eqUpdateMock).not.toHaveBeenCalled();

    // Confirms the pipeline actually ran for real (not a no-op that trivially made no
    // calls) -- one candidate, attempted, and its diagnostic report is present.
    expect(result.attempted).toBe(1);
    expect(result.committed).toBe(1);
    expect(result.rows).toBeDefined();
    expect(result.rows?.[0].outcome).toBe("p1_changed");
    expect(result.rows?.[0].wouldWriteSourceVerifiedAt).toBe(true);
    expect(result.rows?.[0].wouldProposeDemotion).toBe(true);
  });

  test("a non-dry-run call with the identical mocked pipeline DOES write -- confirms the mock setup itself is capable of catching a write, not just silent by construction", async () => {
    const { runReverificationPass } = await import("@/lib/opportunities/reverification/run-job");

    await runReverificationPass({ maxRows: 5, budgetMs: 60000, dryRun: false });

    expect(insertMock).toHaveBeenCalled();
  });
});

describe("runReverificationPass with candidateIds -- the representative-sample measurement affordance", () => {
  test("without candidateIds, the not-due second row is skipped (baseline)", async () => {
    const { runReverificationPass } = await import("@/lib/opportunities/reverification/run-job");

    const result = await runReverificationPass({ maxRows: 5, budgetMs: 60000, dryRun: true });

    expect(result.attempted).toBe(1);
    expect(result.rows?.[0].opportunityId).toBe(CANDIDATE_ROW.id);
  });

  test("candidateIds bypasses the due-set filter entirely, not just narrows within it -- the NOT-due second row is attempted when explicitly listed", async () => {
    const { runReverificationPass } = await import("@/lib/opportunities/reverification/run-job");

    const result = await runReverificationPass({ maxRows: 5, budgetMs: 60000, dryRun: true, candidateIds: [NOT_DUE_CANDIDATE_ROW.id] });

    expect(result.attempted).toBe(1);
    expect(result.rows?.[0].opportunityId).toBe(NOT_DUE_CANDIDATE_ROW.id);
  });

  test("candidateIds with both real ids attempts both, regardless of due status", async () => {
    const { runReverificationPass } = await import("@/lib/opportunities/reverification/run-job");

    const result = await runReverificationPass({ maxRows: 5, budgetMs: 60000, dryRun: true, candidateIds: [CANDIDATE_ROW.id, NOT_DUE_CANDIDATE_ROW.id] });

    expect(result.attempted).toBe(2);
    expect(result.rows?.map((r) => r.opportunityId).sort()).toEqual([CANDIDATE_ROW.id, NOT_DUE_CANDIDATE_ROW.id].sort());
  });

  test("an id that matches no active opportunity is silently absent from the result, not an error", async () => {
    const { runReverificationPass } = await import("@/lib/opportunities/reverification/run-job");

    const result = await runReverificationPass({ maxRows: 5, budgetMs: 60000, dryRun: true, candidateIds: ["99999999-9999-9999-9999-999999999999"] });

    expect(result.attempted).toBe(0);
    expect(result.rows).toEqual([]);
  });
});
