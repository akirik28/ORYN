import { describe, test, expect } from "vitest";
import { shouldShowUpgradePrompt, computeSoftDismissUntil, computeNotNowUpdate, NOT_YET_DISMISSED } from "@/lib/advisor/upgrade-prompt";
import type { UpgradePromptContext } from "@/lib/advisor/upgrade-prompt";

/**
 * The mechanism for the founder-approved, frequency-capped upgrade pop-up
 * (docs/upgrade-prompt-design-spec-2026-09-02.md,
 * docs/research/upgrade-prompt-frequency-precedent-2026-09-02.md). Every gate in
 * shouldShowUpgradePrompt is a hard `false` -- each one tested individually as the ONLY
 * failing condition, so a future edit that accidentally drops one gate fails here rather
 * than being masked by another gate also being false in the same test case.
 */

const BASE_CONTEXT: UpgradePromptContext = {
  tier: "standard",
  degraded: true,
  isStreaming: false,
  hasUnsentComposerText: false,
  alreadyShownThisSession: false,
};

const NOW = new Date("2026-09-15T12:00:00.000Z");

describe("shouldShowUpgradePrompt — the happy path", () => {
  test("shows when every gate passes", () => {
    expect(shouldShowUpgradePrompt(BASE_CONTEXT, NOT_YET_DISMISSED, NOW)).toBe(true);
  });
});

describe("shouldShowUpgradePrompt — each context gate, isolated", () => {
  test("never for Ultra", () => {
    expect(shouldShowUpgradePrompt({ ...BASE_CONTEXT, tier: "ultra" }, NOT_YET_DISMISSED, NOW)).toBe(false);
  });

  test("only the real event -- not degraded means no prompt regardless of everything else", () => {
    expect(shouldShowUpgradePrompt({ ...BASE_CONTEXT, degraded: false }, NOT_YET_DISMISSED, NOW)).toBe(false);
  });

  test("never mid-task -- streaming blocks it", () => {
    expect(shouldShowUpgradePrompt({ ...BASE_CONTEXT, isStreaming: true }, NOT_YET_DISMISSED, NOW)).toBe(false);
  });

  test("never over unsent work -- composer text blocks it", () => {
    expect(shouldShowUpgradePrompt({ ...BASE_CONTEXT, hasUnsentComposerText: true }, NOT_YET_DISMISSED, NOW)).toBe(false);
  });

  test("once per session -- already shown blocks it", () => {
    expect(shouldShowUpgradePrompt({ ...BASE_CONTEXT, alreadyShownThisSession: true }, NOT_YET_DISMISSED, NOW)).toBe(false);
  });
});

describe("shouldShowUpgradePrompt — each dismissal-state gate, isolated", () => {
  test("dismissedForever blocks it unconditionally", () => {
    expect(shouldShowUpgradePrompt(BASE_CONTEXT, { ...NOT_YET_DISMISSED, dismissedForever: true }, NOW)).toBe(false);
  });

  test("an active soft-dismiss window blocks it", () => {
    const state = { ...NOT_YET_DISMISSED, softDismissedUntil: "2026-09-16T00:00:00.000Z" }; // after NOW
    expect(shouldShowUpgradePrompt(BASE_CONTEXT, state, NOW)).toBe(false);
  });

  test("an expired soft-dismiss window no longer blocks it", () => {
    const state = { ...NOT_YET_DISMISSED, softDismissedUntil: "2026-09-14T00:00:00.000Z" }; // before NOW
    expect(shouldShowUpgradePrompt(BASE_CONTEXT, state, NOW)).toBe(true);
  });

  test("an explicit not-now still within the same calendar month blocks it", () => {
    const state = { ...NOT_YET_DISMISSED, notNowAt: "2026-09-01T00:00:00.000Z" }; // same month as NOW
    expect(shouldShowUpgradePrompt(BASE_CONTEXT, state, NOW)).toBe(false);
  });

  test("an explicit not-now from a prior calendar month no longer blocks it", () => {
    const state = { ...NOT_YET_DISMISSED, notNowAt: "2026-08-01T00:00:00.000Z" }; // month before NOW
    expect(shouldShowUpgradePrompt(BASE_CONTEXT, state, NOW)).toBe(true);
  });

  test("the boundary: the first instant of the next month after not-now already clears the suppression", () => {
    const state = { ...NOT_YET_DISMISSED, notNowAt: "2026-09-30T23:59:59.999Z" };
    expect(shouldShowUpgradePrompt(BASE_CONTEXT, state, new Date("2026-10-01T00:00:00.000Z"))).toBe(true);
    expect(shouldShowUpgradePrompt(BASE_CONTEXT, state, new Date("2026-09-30T23:59:59.999Z"))).toBe(false);
  });
});

describe("computeSoftDismissUntil", () => {
  test("exactly 7 days from now", () => {
    const now = new Date("2026-09-15T12:00:00.000Z");
    expect(computeSoftDismissUntil(now)).toBe("2026-09-22T12:00:00.000Z");
  });
});

describe("computeNotNowUpdate — the escalation rule", () => {
  test("a first-ever click never escalates, regardless of month math", () => {
    const now = new Date("2026-09-15T12:00:00.000Z");
    const update = computeNotNowUpdate(null, 0, now);
    expect(update).toEqual({ notNowAt: now.toISOString(), notNowCount: 1, dismissedForever: false });
  });

  test("a second click in the SAME calendar month does not escalate", () => {
    const priorNotNowAt = "2026-09-01T00:00:00.000Z";
    const now = new Date("2026-09-20T00:00:00.000Z");
    const update = computeNotNowUpdate(priorNotNowAt, 1, now);
    expect(update.dismissedForever).toBe(false);
    expect(update.notNowCount).toBe(2);
  });

  test("a second click in a LATER calendar month escalates to permanent", () => {
    const priorNotNowAt = "2026-08-01T00:00:00.000Z";
    const now = new Date("2026-09-15T00:00:00.000Z");
    const update = computeNotNowUpdate(priorNotNowAt, 1, now);
    expect(update.dismissedForever).toBe(true);
    expect(update.notNowCount).toBe(2);
  });

  test("a third click, already dismissed forever in practice, still computes correctly (idempotent shape, not a special case)", () => {
    const priorNotNowAt = "2026-09-01T00:00:00.000Z";
    const now = new Date("2026-10-01T00:00:00.000Z");
    const update = computeNotNowUpdate(priorNotNowAt, 2, now);
    expect(update.dismissedForever).toBe(true);
    expect(update.notNowCount).toBe(3);
  });

  test("year boundary counts as a later month, not a same-month wraparound bug", () => {
    const priorNotNowAt = "2026-12-15T00:00:00.000Z";
    const now = new Date("2027-01-05T00:00:00.000Z");
    const update = computeNotNowUpdate(priorNotNowAt, 1, now);
    expect(update.dismissedForever).toBe(true);
  });
});
