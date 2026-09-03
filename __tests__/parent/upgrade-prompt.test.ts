import { describe, test, expect } from "vitest";
import {
  shouldShowParentUpgradePrompt,
  NOT_YET_DISMISSED,
  computeNotNowUpdate,
} from "@/lib/parent/upgrade-prompt";
import type { ParentUpgradePromptContext } from "@/lib/parent/upgrade-prompt";

/**
 * P7 (docs/veli-hesabi-spec-2026-09-04.md §6). Same discipline as
 * __tests__/advisor/upgrade-prompt.test.ts: every gate in shouldShowParentUpgradePrompt is
 * a hard `false`, tested individually as the ONLY failing condition, so a future edit that
 * accidentally drops one doesn't get masked by another gate also being false in the same
 * case. The dismissal-state gates themselves (soft-dismiss window, not-now month boundary,
 * computeNotNowUpdate's escalation rule) are already covered by that file against the
 * shared helpers this module re-exports rather than re-implements — not re-tested here,
 * only the two gates genuinely new to the parent context are.
 */

const BASE_CONTEXT: ParentUpgradePromptContext = {
  linkedStudentTier: "standard",
  linkStatus: "active",
  alreadyShownThisSession: false,
};

const NOW = new Date("2026-09-15T12:00:00.000Z");

describe("shouldShowParentUpgradePrompt — the happy path", () => {
  test("shows when every gate passes", () => {
    expect(shouldShowParentUpgradePrompt(BASE_CONTEXT, NOT_YET_DISMISSED, NOW)).toBe(true);
  });
});

describe("shouldShowParentUpgradePrompt — link status, the gate specific to this context", () => {
  test("never for a pending link — the student hasn't confirmed it yet", () => {
    expect(shouldShowParentUpgradePrompt({ ...BASE_CONTEXT, linkStatus: "pending" }, NOT_YET_DISMISSED, NOW)).toBe(false);
  });

  test("never for a revoked link", () => {
    expect(shouldShowParentUpgradePrompt({ ...BASE_CONTEXT, linkStatus: "revoked" }, NOT_YET_DISMISSED, NOW)).toBe(false);
  });

  test("active is the only status that allows it", () => {
    expect(shouldShowParentUpgradePrompt({ ...BASE_CONTEXT, linkStatus: "active" }, NOT_YET_DISMISSED, NOW)).toBe(true);
  });
});

describe("shouldShowParentUpgradePrompt — inherited tier", () => {
  test("never when the linked student is already Ultra — nothing left to sell on a shared subscription", () => {
    expect(shouldShowParentUpgradePrompt({ ...BASE_CONTEXT, linkedStudentTier: "ultra" }, NOT_YET_DISMISSED, NOW)).toBe(false);
  });
});

describe("shouldShowParentUpgradePrompt — once per panel visit", () => {
  test("already shown this session blocks it", () => {
    expect(shouldShowParentUpgradePrompt({ ...BASE_CONTEXT, alreadyShownThisSession: true }, NOT_YET_DISMISSED, NOW)).toBe(false);
  });
});

describe("shouldShowParentUpgradePrompt — reuses the shared dismissal-state gates, not a second copy", () => {
  test("dismissedForever still blocks it here, same as the advisor version", () => {
    expect(shouldShowParentUpgradePrompt(BASE_CONTEXT, { ...NOT_YET_DISMISSED, dismissedForever: true }, NOW)).toBe(false);
  });

  test("an explicit not-now from a prior calendar month no longer blocks it, same escalation math", () => {
    const state = { ...NOT_YET_DISMISSED, notNowAt: "2026-08-01T00:00:00.000Z" };
    expect(shouldShowParentUpgradePrompt(BASE_CONTEXT, state, NOW)).toBe(true);
  });

  test("the re-exported computeNotNowUpdate is the identical function, not a parallel one", () => {
    const update = computeNotNowUpdate(null, 0, NOW);
    expect(update).toEqual({ notNowAt: NOW.toISOString(), notNowCount: 1, dismissedForever: false });
  });
});
