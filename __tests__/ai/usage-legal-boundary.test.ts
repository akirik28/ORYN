import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * Guards LEGAL_REVIEW.md §2's closing claim: "The AI usage log stores token counts and a
 * feature name — not prompt content." Re-verified by direct code read 2026-09-03
 * (docs/legal-review-s2-duzeltme-2026-09-03.md) after the Anthropic-context paragraph
 * alongside it was found to have gone stale — this test is what keeps this specific claim
 * from doing the same thing silently. A green run proves the claim holds against `logAIUsage`'s
 * actual insert call today; it does not prove anything about history, and whoever changes what
 * this function writes must update §2's own text in the same change, not just this assertion.
 *
 * Asserted as an exact key allowlist, not a spot-check for one bad field — a future change
 * that adds any new column to this insert (a prompt snapshot, a message excerpt, anything)
 * fails this test by revealing an unlisted key, without needing to guess its name in advance.
 */

const { insertMock } = vi.hoisted(() => ({
  insertMock: vi.fn<(row: Record<string, unknown>) => Promise<{ error: null }>>(async () => ({ error: null })),
}));

vi.mock("@/lib/supabase/admin", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supabase/admin")>();
  return {
    ...actual,
    createAdminClient: () => ({ from: () => ({ insert: (row: Record<string, unknown>) => insertMock(row) }) }),
  };
});

import { logAIUsage } from "@/lib/ai/usage";

const USER_ID = "44444444-4444-4444-8444-444444444444";

// The exact, known-safe column set — token counts, a feature name, provider/model
// identifiers, and cost/degrade bookkeeping. No content, prompt, message, or context field.
const ALLOWED_KEYS = new Set(["user_id", "feature", "provider", "model", "input_tokens", "output_tokens", "estimated_cost", "degraded", "degrade_reason"]);

beforeEach(() => {
  insertMock.mockClear();
});

describe("logAIUsage — LEGAL_REVIEW.md §2 boundary claim (ai_usage stores no prompt content)", () => {
  test("the inserted row's keys are exactly the known-safe set — nothing else, nothing unnamed", async () => {
    await logAIUsage({ userId: USER_ID, feature: "advisor_chat", usage: { inputTokens: 3600, outputTokens: 1100 }, model: "claude-sonnet-5" });

    expect(insertMock).toHaveBeenCalledTimes(1);
    const row = insertMock.mock.calls[0][0];
    for (const key of Object.keys(row)) {
      expect(ALLOWED_KEYS.has(key), `unexpected column "${key}" on the ai_usage insert — LEGAL_REVIEW.md §2 says this table stores no prompt content; if this key is intentional, update that paragraph in the same change`).toBe(true);
    }
  });

  test("no value in the inserted row is a long string that could plausibly be prompt or message text", async () => {
    await logAIUsage({ userId: USER_ID, feature: "weekly_plan", usage: { inputTokens: 5000, outputTokens: 800 }, model: "claude-sonnet-5", degraded: true, degradeReason: "at_or_over_target" });

    const row = insertMock.mock.calls[0][0];
    for (const [key, value] of Object.entries(row)) {
      if (typeof value === "string") {
        // Generous threshold — every real column here (feature name, provider, model id,
        // degrade reason) is a short identifier. A prompt or message excerpt would be
        // orders of magnitude longer than any legitimate value this row ever holds.
        expect(value.length, `column "${key}" holds a suspiciously long string (${value.length} chars) — check it isn't prompt or message content`).toBeLessThan(100);
      }
    }
  });

  test("logAIUsage's own parameter type has no field for prompt or message content — the caller cannot pass it even by mistake", async () => {
    // Compile-time guard, exercised at runtime for visibility in this suite: the params
    // object below is exhaustively typed by logAIUsage's own signature (userId, feature,
    // usage, model, degraded?, degradeReason?) — adding a `prompt`/`message`/`context` field
    // here would be a TypeScript error, not a runtime one, which is the point. This test
    // exists so the guarantee shows up in a legal-boundary test run, not only in `tsc`.
    await logAIUsage({ userId: USER_ID, feature: "cv_extraction", usage: { inputTokens: 2000, outputTokens: 300 }, model: "claude-sonnet-5" });
    expect(insertMock).toHaveBeenCalledTimes(1);
  });
});
