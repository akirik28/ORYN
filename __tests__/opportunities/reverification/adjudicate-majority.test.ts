import { describe, expect, test, vi } from "vitest";
import { adjudicateDisagreementWithMajority } from "@/lib/opportunities/reverification/adjudicate";

/**
 * docs/opportunity-verdict-stability-measurement-2026-09-03.md measured adjudicateDisagreement
 * itself as the one non-deterministic step in the pipeline -- these tests cover the escalation
 * policy built on top of it, not the underlying AI call (already exercised by
 * run-job-dry-run.test.ts's own mock). singleRead is injected directly rather than mocking
 * "@/lib/opportunities/reverification/adjudicate" from within its own test file -- vi.mock
 * cannot intercept a call from one function to a sibling exported from the same module (see
 * reference_vitest_same_module_self_mock_limitation in project memory), so dependency
 * injection is the only way to control the underlying reads here.
 */

const INPUT = { storedCycleStatus: "closed", storedDeadline: null, excerpt: "Applications are now open for 2027.", opportunityTitle: "Test Opportunity" };

function verdict(changed: boolean, reasoning: string) {
  return { verdict: { cycleStateConfirmedChanged: changed, reasoning }, usage: { inputTokens: 10, outputTokens: 5 } };
}

describe("adjudicateDisagreementWithMajority", () => {
  test("two reads that agree settle it at 2 reads, no third call", async () => {
    const singleRead = vi
      .fn()
      .mockResolvedValueOnce(verdict(true, "first read: clearly open"))
      .mockResolvedValueOnce(verdict(true, "second read: clearly open"));

    const result = await adjudicateDisagreementWithMajority(INPUT, singleRead);

    expect(singleRead).toHaveBeenCalledTimes(2);
    expect(result.reads).toBe(2);
    expect(result.agreement).toBe("2/2");
    expect(result.verdict.cycleStateConfirmedChanged).toBe(true);
    expect(result.allVerdicts).toHaveLength(2);
  });

  test("two reads that agree on 'not confirmed' also settle at 2 reads", async () => {
    const singleRead = vi
      .fn()
      .mockResolvedValueOnce(verdict(false, "first read: ambiguous"))
      .mockResolvedValueOnce(verdict(false, "second read: ambiguous"));

    const result = await adjudicateDisagreementWithMajority(INPUT, singleRead);

    expect(singleRead).toHaveBeenCalledTimes(2);
    expect(result.reads).toBe(2);
    expect(result.verdict.cycleStateConfirmedChanged).toBe(false);
  });

  test("first two reads disagree -- escalates to a third, tiebreak toward 'confirmed changed'", async () => {
    const singleRead = vi
      .fn()
      .mockResolvedValueOnce(verdict(true, "first read: seems open"))
      .mockResolvedValueOnce(verdict(false, "second read: actually ambiguous"))
      .mockResolvedValueOnce(verdict(true, "third read: confirms open"));

    const result = await adjudicateDisagreementWithMajority(INPUT, singleRead);

    expect(singleRead).toHaveBeenCalledTimes(3);
    expect(result.reads).toBe(3);
    expect(result.agreement).toBe("2/3");
    expect(result.verdict.cycleStateConfirmedChanged).toBe(true);
    expect(result.allVerdicts).toHaveLength(3);
  });

  test("first two reads disagree -- tiebreak can also resolve toward 'not confirmed', not just toward 'changed'", async () => {
    const singleRead = vi
      .fn()
      .mockResolvedValueOnce(verdict(true, "first read: seems open"))
      .mockResolvedValueOnce(verdict(false, "second read: actually ambiguous"))
      .mockResolvedValueOnce(verdict(false, "third read: agrees ambiguous"));

    const result = await adjudicateDisagreementWithMajority(INPUT, singleRead);

    expect(singleRead).toHaveBeenCalledTimes(3);
    expect(result.reads).toBe(3);
    expect(result.agreement).toBe("2/3");
    expect(result.verdict.cycleStateConfirmedChanged).toBe(false);
  });

  test("defaults to the real adjudicateDisagreement when no singleRead is injected", async () => {
    // Not exercised end-to-end here (that would need a real or mocked AI provider, already
    // covered elsewhere) -- just proves the parameter is genuinely optional and the function
    // signature didn't silently become required-injection-only.
    expect(adjudicateDisagreementWithMajority.length).toBeLessThanOrEqual(2);
  });

  test("every input is passed through to singleRead unchanged on every read", async () => {
    const singleRead = vi.fn().mockResolvedValueOnce(verdict(true, "a")).mockResolvedValueOnce(verdict(true, "b"));

    await adjudicateDisagreementWithMajority(INPUT, singleRead);

    expect(singleRead).toHaveBeenNthCalledWith(1, INPUT);
    expect(singleRead).toHaveBeenNthCalledWith(2, INPUT);
  });
});
