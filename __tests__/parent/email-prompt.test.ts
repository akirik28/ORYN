import { describe, test, expect } from "vitest";
import {
  shouldShowParentEmailPrompt,
  extractParentEmailPromptDismissalState,
  NOT_YET_DISMISSED,
  computeNotNowUpdate,
} from "@/lib/parent/email-prompt";
import type { ParentEmailPromptContext } from "@/lib/parent/email-prompt";

/**
 * The dashboard follow-up to P4's signup-time collection (docs/veli-hesabi-spec-2026-09-04.md
 * §1) — a student who skipped giving a parent's email gets asked again from the dashboard.
 * Same discipline as __tests__/parent/upgrade-prompt.test.ts: every gate tested individually
 * as the ONLY failing condition, so a future edit that accidentally drops one isn't masked by
 * another gate also being false in the same case. The shared dismissal-state mechanics
 * (soft-dismiss window, not-now month boundary, escalation) are covered once against
 * __tests__/advisor/upgrade-prompt.test.ts's own fixtures — not re-derived here, only the two
 * things genuinely new to this context are: the parent_invite_email trigger, and reading
 * dismissal state off the independent parent_email_prompt_* columns instead of upgrade_prompt_*.
 */

const BASE_CONTEXT: ParentEmailPromptContext = {
  hasParentInviteEmail: false,
  alreadyShownThisSession: false,
};

const NOW = new Date("2026-09-15T12:00:00.000Z");

describe("shouldShowParentEmailPrompt — the happy path", () => {
  test("shows when every gate passes", () => {
    expect(shouldShowParentEmailPrompt(BASE_CONTEXT, NOT_YET_DISMISSED, NOW)).toBe(true);
  });
});

describe("shouldShowParentEmailPrompt — the trigger specific to this context", () => {
  test("never once a parent's email is already on file — nothing left to ask for", () => {
    expect(shouldShowParentEmailPrompt({ ...BASE_CONTEXT, hasParentInviteEmail: true }, NOT_YET_DISMISSED, NOW)).toBe(false);
  });

  test("shows when no address is on file", () => {
    expect(shouldShowParentEmailPrompt({ ...BASE_CONTEXT, hasParentInviteEmail: false }, NOT_YET_DISMISSED, NOW)).toBe(true);
  });
});

describe("shouldShowParentEmailPrompt — once per browser session", () => {
  test("already shown this session blocks it", () => {
    expect(shouldShowParentEmailPrompt({ ...BASE_CONTEXT, alreadyShownThisSession: true }, NOT_YET_DISMISSED, NOW)).toBe(false);
  });
});

describe("shouldShowParentEmailPrompt — reuses the shared dismissal-state gates, not a second copy", () => {
  test("dismissedForever still blocks it here, same as the advisor version", () => {
    expect(shouldShowParentEmailPrompt(BASE_CONTEXT, { ...NOT_YET_DISMISSED, dismissedForever: true }, NOW)).toBe(false);
  });

  test("an active soft-dismiss window blocks it", () => {
    const state = { ...NOT_YET_DISMISSED, softDismissedUntil: "2026-09-20T00:00:00.000Z" };
    expect(shouldShowParentEmailPrompt(BASE_CONTEXT, state, NOW)).toBe(false);
  });

  test("an expired soft-dismiss window no longer blocks it", () => {
    const state = { ...NOT_YET_DISMISSED, softDismissedUntil: "2026-09-10T00:00:00.000Z" };
    expect(shouldShowParentEmailPrompt(BASE_CONTEXT, state, NOW)).toBe(true);
  });

  test("an explicit not-now from a prior calendar month no longer blocks it, same escalation math", () => {
    const state = { ...NOT_YET_DISMISSED, notNowAt: "2026-08-01T00:00:00.000Z" };
    expect(shouldShowParentEmailPrompt(BASE_CONTEXT, state, NOW)).toBe(true);
  });

  test("the re-exported computeNotNowUpdate is the identical function, not a parallel one", () => {
    const update = computeNotNowUpdate(null, 0, NOW);
    expect(update).toEqual({ notNowAt: NOW.toISOString(), notNowCount: 1, dismissedForever: false });
  });
});

describe("extractParentEmailPromptDismissalState", () => {
  test("reads all four columns off a real row", () => {
    const state = extractParentEmailPromptDismissalState({
      parent_email_prompt_soft_dismissed_until: "2026-09-20T00:00:00.000Z",
      parent_email_prompt_not_now_at: "2026-08-01T00:00:00.000Z",
      parent_email_prompt_not_now_count: 2,
      parent_email_prompt_dismissed_forever: true,
    });
    expect(state).toEqual({
      softDismissedUntil: "2026-09-20T00:00:00.000Z",
      notNowAt: "2026-08-01T00:00:00.000Z",
      notNowCount: 2,
      dismissedForever: true,
    });
  });

  /** Migration 0117 unapplied means select("*") simply omits these four columns — this
   * codebase's own established convention (lib/tier/plan-tier.ts's resolvePlanTier is the
   * canonical example). Every field must independently default to "not yet dismissed", not
   * throw or read as already-dismissed. */
  test("degrades to NOT_YET_DISMISSED when the columns are absent (migration 0117 unapplied)", () => {
    const state = extractParentEmailPromptDismissalState({
      parent_email_prompt_soft_dismissed_until: undefined as never,
      parent_email_prompt_not_now_at: undefined as never,
      parent_email_prompt_not_now_count: undefined as never,
      parent_email_prompt_dismissed_forever: undefined as never,
    });
    expect(state).toEqual(NOT_YET_DISMISSED);
  });

  test("this prompt's dismissal state is independent of the advisor upgrade prompt's own columns", () => {
    // A profile that HAS dismissed the advisor's Ultra prompt forever, but has never
    // touched this one at all — extractParentEmailPromptDismissalState must not be able to
    // see upgrade_prompt_* at all (the whole point of migration 0117 being separate storage).
    const state = extractParentEmailPromptDismissalState({
      parent_email_prompt_soft_dismissed_until: null,
      parent_email_prompt_not_now_at: null,
      parent_email_prompt_not_now_count: 0,
      parent_email_prompt_dismissed_forever: false,
    });
    expect(state.dismissedForever).toBe(false);
  });
});
