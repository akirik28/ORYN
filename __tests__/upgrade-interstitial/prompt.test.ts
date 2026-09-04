import { describe, test, expect } from "vitest";
import { shouldShowUpgradeInterstitial, extractUpgradeInterstitialDismissalState, NOT_YET_DISMISSED } from "@/lib/upgrade-interstitial/prompt";
import type { UpgradeInterstitialContext } from "@/lib/upgrade-interstitial/prompt";

/**
 * Same isolated-gate discipline as __tests__/advisor/upgrade-prompt.test.ts: every gate in
 * shouldShowUpgradeInterstitial tested individually as the ONLY failing condition, so a
 * future edit that accidentally drops one gate fails here rather than being masked by
 * another gate also being false in the same test case.
 *
 * computeNotNowUpdate/computeSoftDismissUntil themselves are NOT re-tested here — they're
 * lib/advisor/upgrade-prompt.ts's own functions, already fully covered there, and this
 * module only re-exports them. What's new here is shouldShowUpgradeInterstitial's own
 * (smaller) gate set and extractUpgradeInterstitialDismissalState's own column mapping.
 */

const BASE_CONTEXT: UpgradeInterstitialContext = {
  tier: "standard",
  alreadyShownThisSession: false,
};

const NOW = new Date("2026-09-15T12:00:00.000Z");

describe("shouldShowUpgradeInterstitial — the happy path", () => {
  test("shows when every gate passes", () => {
    expect(shouldShowUpgradeInterstitial(BASE_CONTEXT, NOT_YET_DISMISSED, NOW)).toBe(true);
  });
});

describe("shouldShowUpgradeInterstitial — each context gate, isolated", () => {
  test("never for Ultra", () => {
    expect(shouldShowUpgradeInterstitial({ ...BASE_CONTEXT, tier: "ultra" }, NOT_YET_DISMISSED, NOW)).toBe(false);
  });

  test("once per session — already shown blocks it", () => {
    expect(shouldShowUpgradeInterstitial({ ...BASE_CONTEXT, alreadyShownThisSession: true }, NOT_YET_DISMISSED, NOW)).toBe(false);
  });
});

describe("shouldShowUpgradeInterstitial — each dismissal-state gate, isolated", () => {
  test("dismissedForever blocks it unconditionally", () => {
    expect(shouldShowUpgradeInterstitial(BASE_CONTEXT, { ...NOT_YET_DISMISSED, dismissedForever: true }, NOW)).toBe(false);
  });

  test("an active soft-dismiss window blocks it", () => {
    const state = { ...NOT_YET_DISMISSED, softDismissedUntil: "2026-09-16T00:00:00.000Z" }; // after NOW
    expect(shouldShowUpgradeInterstitial(BASE_CONTEXT, state, NOW)).toBe(false);
  });

  test("an expired soft-dismiss window no longer blocks it", () => {
    const state = { ...NOT_YET_DISMISSED, softDismissedUntil: "2026-09-14T00:00:00.000Z" }; // before NOW
    expect(shouldShowUpgradeInterstitial(BASE_CONTEXT, state, NOW)).toBe(true);
  });

  test("an explicit not-now still within the same calendar month blocks it", () => {
    const state = { ...NOT_YET_DISMISSED, notNowAt: "2026-09-01T00:00:00.000Z" }; // same month as NOW
    expect(shouldShowUpgradeInterstitial(BASE_CONTEXT, state, NOW)).toBe(false);
  });

  test("an explicit not-now from a prior calendar month no longer blocks it", () => {
    const state = { ...NOT_YET_DISMISSED, notNowAt: "2026-08-01T00:00:00.000Z" }; // month before NOW
    expect(shouldShowUpgradeInterstitial(BASE_CONTEXT, state, NOW)).toBe(true);
  });
});

describe("extractUpgradeInterstitialDismissalState — derives from an already-loaded profile, never fetches", () => {
  test("a fully-populated row maps through field for field", () => {
    const state = extractUpgradeInterstitialDismissalState({
      upgrade_interstitial_soft_dismissed_until: "2026-09-22T12:00:00.000Z",
      upgrade_interstitial_not_now_at: "2026-08-01T00:00:00.000Z",
      upgrade_interstitial_not_now_count: 2,
      upgrade_interstitial_dismissed_forever: false,
    });
    expect(state).toEqual({
      softDismissedUntil: "2026-09-22T12:00:00.000Z",
      notNowAt: "2026-08-01T00:00:00.000Z",
      notNowCount: 2,
      dismissedForever: false,
    });
  });

  test("a genuinely never-dismissed row (nulls, zero, false) matches NOT_YET_DISMISSED", () => {
    const state = extractUpgradeInterstitialDismissalState({
      upgrade_interstitial_soft_dismissed_until: null,
      upgrade_interstitial_not_now_at: null,
      upgrade_interstitial_not_now_count: 0,
      upgrade_interstitial_dismissed_forever: false,
    });
    expect(state).toEqual(NOT_YET_DISMISSED);
  });

  // Migration 0124 unapplied: select("*") omits an unknown column rather than erroring
  // (same behavior __tests__/advisor/upgrade-prompt.test.ts's own identical case documents
  // for migration 0093), so these fields are `undefined` at runtime despite the Profile type
  // saying otherwise — exactly the case this function exists to default safely rather than
  // throw on.
  test("columns absent (migration unapplied) default to not-yet-dismissed, not a throw", () => {
    const rowFromAnUnmigratedDatabase = {} as {
      upgrade_interstitial_soft_dismissed_until: string | null;
      upgrade_interstitial_not_now_at: string | null;
      upgrade_interstitial_not_now_count: number;
      upgrade_interstitial_dismissed_forever: boolean;
    };
    expect(extractUpgradeInterstitialDismissalState(rowFromAnUnmigratedDatabase)).toEqual(NOT_YET_DISMISSED);
  });
});

describe("column independence — this dismissal state never reads the advisor or parent-email prompts' own columns", () => {
  test("a profile shape with only the interstitial's own columns is sufficient — no cross-feature column needed", () => {
    // Deliberately typed as exactly the four upgrade_interstitial_* fields, nothing else —
    // if extractUpgradeInterstitialDismissalState ever grew a dependency on
    // upgrade_prompt_* or a parent-email-prompt column, this call site would stop
    // compiling, which is the actual guarantee this test wants (the assertion below is
    // secondary confirmation, not the main point).
    const state = extractUpgradeInterstitialDismissalState({
      upgrade_interstitial_soft_dismissed_until: null,
      upgrade_interstitial_not_now_at: "2026-08-01T00:00:00.000Z",
      upgrade_interstitial_not_now_count: 1,
      upgrade_interstitial_dismissed_forever: false,
    });
    expect(state.notNowAt).toBe("2026-08-01T00:00:00.000Z");
  });
});
