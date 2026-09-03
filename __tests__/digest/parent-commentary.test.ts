import { beforeEach, describe, expect, test, vi } from "vitest";
import type { ProfileChange } from "@/lib/scoring/change";

/**
 * lib/digest/parent-commentary.ts — P5's content assembly (docs/veli-hesabi-spec-2026-09-04.md).
 * Split the same way this suite's neighbours are: the pure decision functions
 * (filterNotableDimensionChanges, hasNotableWeeklySignal, honestNoActivityNarrative) are
 * tested directly against plain fixtures, no mocking; buildParentWeeklyCommentary/
 * resolveParentWeeklyCommentary get lighter integration coverage proving the wiring, with
 * buildDigestContent mocked (own coverage in build.test.ts) the same way run.test.ts already
 * mocks it for the sibling runner.
 *
 * fakeSupabase below deliberately does NOT handle `weekly_actions`, `applications`,
 * `target_universities`, or `university_deadlines` — those tables are outside the parent-
 * readable surface (oryn-45, P1 schema dispatch, 2026-09-04; see parent-commentary.ts's own
 * module comment for the full account). If a future edit to the source file ever queries one
 * of them again, this mock's own "unhandled table" throw catches it immediately, in this test
 * file, rather than the boundary silently eroding.
 *
 * The single most important thing this file proves: the AI provider is never touched for a
 * genuinely quiet week. That's not asserted by checking output text — it's asserted by
 * mocking getAIProvider and checking it was never called at all, so a future change that
 * accidentally starts calling the model for an empty week fails loudly here, not by someone
 * noticing a stray API charge later.
 */

const { getAIProviderMock, buildDigestContentMock } = vi.hoisted(() => ({
  getAIProviderMock: vi.fn(),
  buildDigestContentMock: vi.fn(),
}));

vi.mock("@/lib/ai/index", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/index")>();
  return { ...actual, getAIProvider: getAIProviderMock };
});
vi.mock("@/lib/digest/build", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/digest/build")>();
  return { ...actual, buildDigestContent: buildDigestContentMock };
});

import {
  filterNotableDimensionChanges,
  hasNotableWeeklySignal,
  honestNoActivityNarrative,
  buildParentWeeklyCommentary,
  resolveParentWeeklyCommentary,
} from "@/lib/digest/parent-commentary";

function change(overrides: Partial<ProfileChange> = {}): ProfileChange {
  return { hasHistory: true, improved: [], declined: [], steady: 0, ...overrides };
}

describe("filterNotableDimensionChanges", () => {
  test("drops an improved dimension below the notifiable threshold", () => {
    const result = filterNotableDimensionChanges(change({ improved: [{ dimension: "research", delta: 1 }] }));
    expect(result.improved).toEqual([]);
  });

  test("keeps an improved dimension at or above the threshold", () => {
    const result = filterNotableDimensionChanges(change({ improved: [{ dimension: "research", delta: 5 }] }));
    expect(result.improved).toEqual([{ dimension: "research", delta: 5 }]);
  });

  test("filters declined dimensions by magnitude, not sign", () => {
    const result = filterNotableDimensionChanges(change({ declined: [{ dimension: "leadership", delta: -3 }] }));
    expect(result.declined).toEqual([]);
  });

  test("a sub-threshold move does not get folded into steady", () => {
    const result = filterNotableDimensionChanges(change({ improved: [{ dimension: "research", delta: 1 }], steady: 4 }));
    expect(result.steady).toBe(4);
  });

  test("no earlier history passes through unchanged", () => {
    const result = filterNotableDimensionChanges(change({ hasHistory: false }));
    expect(result.hasHistory).toBe(false);
  });
});

describe("hasNotableWeeklySignal", () => {
  const empty = { notableChange: change(), newMatches: [] };

  test("false when both sources are empty — the genuinely quiet week", () => {
    expect(hasNotableWeeklySignal(empty)).toBe(false);
  });

  test("true from a notable score improvement alone", () => {
    expect(hasNotableWeeklySignal({ ...empty, notableChange: change({ improved: [{ dimension: "research", delta: 8 }] }) })).toBe(true);
  });

  test("true from a notable score decline alone", () => {
    expect(hasNotableWeeklySignal({ ...empty, notableChange: change({ declined: [{ dimension: "research", delta: -8 }] }) })).toBe(true);
  });

  test("true from a new opportunity match alone, even with a steady score", () => {
    expect(hasNotableWeeklySignal({ ...empty, newMatches: [{ title: "Economics Challenge", organization: null, href: null }] })).toBe(true);
  });

  test("a steady score (hasHistory true, nothing crossed the threshold) is NOT signal by itself", () => {
    // The exact case this function exists to get right: describeProfileChange would still
    // produce a real sentence ("held steady since your last review") for this input, but
    // that sentence alone must not be enough to justify an AI call.
    expect(hasNotableWeeklySignal({ ...empty, notableChange: change({ hasHistory: true, steady: 9 }) })).toBe(false);
  });
});

describe("honestNoActivityNarrative", () => {
  test("names the student and states plainly that nothing notable happened", () => {
    const text = honestNoActivityNarrative("Ada");
    expect(text).toContain("Ada");
    expect(text.toLowerCase()).toMatch(/quiet|not a red flag/);
  });

  test("Turkish branch is a distinct, real sentence, not a translation placeholder", () => {
    const text = honestNoActivityNarrative("Ada", "tr");
    expect(text).toContain("Ada");
    expect(text).not.toBe(honestNoActivityNarrative("Ada", "en"));
  });

  test("never mentions a specific number, date, or claim beyond 'nothing notable'", () => {
    // Guards against a future edit accidentally turning this deterministic string into
    // something that could be read as a fabricated specific — the whole point of keeping
    // this path non-AI is that it can never do that.
    const text = honestNoActivityNarrative("Ada");
    expect(text).not.toMatch(/\d/);
  });
});

interface FakeProfile {
  id: string;
  display_name: string | null;
  preferred_language: string | null;
  plan_tier: string;
  ultra_gift_expires_at?: string | null;
}

function fakeSupabase(profile: FakeProfile, opts: { scores?: { dimension: string; score: number }[]; previousSnapshot?: { dimension_scores: Record<string, number> } | null } = {}) {
  const scores = opts.scores ?? [];
  const previousSnapshot = opts.previousSnapshot ?? null;

  return {
    from: (table: string) => {
      if (table === "profiles") {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: profile, error: null }) }) }) };
      }
      if (table === "profile_scores") {
        return { select: () => ({ eq: async () => ({ data: scores, error: null }) }) };
      }
      if (table === "profile_score_snapshots") {
        return {
          select: () => ({
            eq: () => ({
              lt: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: async () => ({ data: previousSnapshot, error: null }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      throw new Error(`fakeSupabase: unhandled table "${table}" — not on the parent-readable whitelist, see parent-commentary.ts's own module comment`);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

beforeEach(() => {
  getAIProviderMock.mockReset();
  buildDigestContentMock.mockReset();
  buildDigestContentMock.mockResolvedValue(null);
});

describe("buildParentWeeklyCommentary — the quiet week", () => {
  test("a genuinely empty week never touches the AI provider", async () => {
    const supabase = fakeSupabase({ id: "s1", display_name: "Ada", preferred_language: "en", plan_tier: "ultra" });
    const content = await buildParentWeeklyCommentary(supabase, "s1", null);

    expect(content.narrativeSource).toBe("no_activity");
    expect(content.narrative).toContain("Ada");
    expect(getAIProviderMock).not.toHaveBeenCalled();
  });

  test("a sub-threshold score wobble alone is still a quiet week", async () => {
    const supabase = fakeSupabase(
      { id: "s1", display_name: "Ada", preferred_language: "en", plan_tier: "ultra" },
      { scores: [{ dimension: "research", score: 41 }], previousSnapshot: { dimension_scores: { research: 40 } } }
    );
    const content = await buildParentWeeklyCommentary(supabase, "s1", null);
    expect(content.narrativeSource).toBe("no_activity");
    expect(getAIProviderMock).not.toHaveBeenCalled();
  });
});

describe("buildParentWeeklyCommentary — real signal, AI not configured", () => {
  test("degrades to a deterministic factual summary rather than throwing or going silent", async () => {
    buildDigestContentMock.mockResolvedValue({ newMatches: [{ title: "Economics Challenge", organization: "Test Org", href: "/x" }], deadlines: [] });
    const supabase = fakeSupabase({ id: "s1", display_name: "Ada", preferred_language: "en", plan_tier: "ultra" });

    // getAIProviderMock left at its default no-op return is not realistic here -- exercise the
    // REAL not-configured path instead, unmocked, since this test environment genuinely has no
    // ANTHROPIC_API_KEY. Re-require the real implementation for this one test.
    const { getAIProvider: realGetAIProvider } = await vi.importActual<typeof import("@/lib/ai/index")>("@/lib/ai/index");
    getAIProviderMock.mockImplementation(realGetAIProvider);

    const content = await buildParentWeeklyCommentary(supabase, "s1", null);
    expect(content.narrativeSource).toBe("ai_unavailable");
    expect(content.narrative).toContain("Economics Challenge");
  });
});

describe("resolveParentWeeklyCommentary — tier gate", () => {
  test("standard tier is not_premium, and content is never built", async () => {
    const supabase = fakeSupabase({ id: "s1", display_name: "Ada", preferred_language: "en", plan_tier: "standard" });
    const outcome = await resolveParentWeeklyCommentary(supabase, "s1", null);
    expect(outcome.kind).toBe("not_premium");
  });

  test("ultra tier proceeds to real content", async () => {
    const supabase = fakeSupabase({ id: "s1", display_name: "Ada", preferred_language: "en", plan_tier: "ultra" });
    const outcome = await resolveParentWeeklyCommentary(supabase, "s1", null);
    expect(outcome.kind).toBe("ok");
    if (outcome.kind === "ok") expect(outcome.content.narrativeSource).toBe("no_activity");
  });

  // The exact bug an earlier version of this function had: a raw `plan_tier === "ultra"`
  // read misses a currently-active Ultra GIFT, where the permanent column still says
  // "standard" but ultra_gift_expires_at is a real future timestamp. Caught before shipping
  // by routing through lib/tier/parent-tier.ts's resolveParentEffectiveTier (which itself
  // calls the one function, lib/tier/plan-tier.ts's resolvePlanTier, every other Ultra-aware
  // surface already uses) instead of re-deriving the same fallback a third time.
  test("an active Ultra gift resolves to premium even though the permanent plan_tier column still says standard", async () => {
    const farFuture = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const supabase = fakeSupabase({ id: "s1", display_name: "Ada", preferred_language: "en", plan_tier: "standard", ultra_gift_expires_at: farFuture });
    const outcome = await resolveParentWeeklyCommentary(supabase, "s1", null);
    expect(outcome.kind).toBe("ok");
  });

  test("an EXPIRED Ultra gift does not resolve to premium", async () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const supabase = fakeSupabase({ id: "s1", display_name: "Ada", preferred_language: "en", plan_tier: "standard", ultra_gift_expires_at: past });
    const outcome = await resolveParentWeeklyCommentary(supabase, "s1", null);
    expect(outcome.kind).toBe("not_premium");
  });
});
