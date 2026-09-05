import { beforeEach, describe, expect, test, vi } from "vitest";
import type { WeeklyAction, WeeklyPlan } from "@/types/database";

/**
 * lib/plan/persist.ts:92 — found in the 2026-09-04 weekly-plan recheck
 * (docs/weekly-plan-recheck-2026-09-04.md): an unconditional, unwrapped getTranslations()
 * call inside getOrCreateWeeklyPlan, reached by every caller including Job D
 * (generate-for-active-students.ts), which has no request of its own. Same root cause
 * persist-matches.ts's notifyNewlyEligibleMatches was already fixed for on 2026-09-03 —
 * getTranslations() throws outside a real Next.js request lifecycle regardless of the
 * explicit locale argument, confirmed live there. This one is worse: it sits BEFORE the AI
 * call and the weekly_plans/weekly_actions writes, so the failure isn't "plan generated with
 * less grounding" (the already-fixed case) — it's zero plan, every time, for every student,
 * the moment Job D is armed.
 *
 * The bug is silent by construction: generateForStudent's own per-student try/catch (see
 * generate-for-active-students.ts) turns the throw into `{status: "error"}` and moves on to
 * the next student — the job itself reports success. A test that only checks "did it throw"
 * can't tell that apart from a real generated plan, so every assertion below checks for an
 * ACTUAL plan (a real weekly_plans row, real weekly_actions rows) coming back through the
 * exported job entrypoint, not merely the absence of an exception.
 *
 * Drives the REAL getOrCreateWeeklyPlan through the REAL generateWeeklyPlansForActiveStudents
 * (neither mocked) — unlike persist.test.ts (mocks next-intl/server into a harmless no-op,
 * which is exactly why that suite stayed green through this bug) and
 * generate-for-active-students.test.ts (mocks persist.ts entirely, so it never touches
 * getTranslations at all). getTranslations is mocked here to unconditionally REJECT,
 * simulating its real, confirmed-live outside-of-request failure — reproducing an actual
 * request-less Next.js server runtime inside Vitest isn't practical and isn't what this test
 * needs to prove. Left this way (not a toggle), this file doubles as a permanent regression
 * guard: if a future edit reintroduces any getTranslations() call reachable from Job D, this
 * fails again immediately.
 */

const { generateWeeklyPlanMock, weeklyPlansRef, weeklyActionsRef } = vi.hoisted(() => ({
  generateWeeklyPlanMock: vi.fn(),
  weeklyPlansRef: { current: [] as WeeklyPlan[] },
  weeklyActionsRef: { current: [] as WeeklyAction[] },
}));

vi.mock("@/lib/ai/weekly-plan", () => ({ generateWeeklyPlan: generateWeeklyPlanMock }));
vi.mock("@/lib/notifications/create", () => ({ createNotification: vi.fn(async () => {}) }));
vi.mock("@/lib/ai/rate-limit", () => ({
  assertWithinAIRateLimit: vi.fn().mockResolvedValue(undefined),
  RateLimitExceededError: class RateLimitExceededError extends Error {},
}));

vi.mock("next-intl/server", () => ({
  getTranslations: async () => {
    throw new Error("next-intl: no request context available outside a Next.js request lifecycle");
  },
}));

const USER_ID = "33333333-3333-4333-8333-333333333333";
const PLAN_ID = "44444444-4444-4444-8444-444444444444";

function fakeAdminClient() {
  const weeklyActionsTable = {
    select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: weeklyActionsRef.current, error: null }) }) }),
    update: () => ({ eq: () => ({ in: () => Promise.resolve({ error: null }) }) }),
    delete: () => ({ eq: () => ({ in: () => Promise.resolve({ error: null }) }) }),
    insert: (rows: Array<Partial<WeeklyAction>>) => ({
      select: () => {
        const inserted = rows.map((row, i) => ({ id: `action-${i + 1}`, plan_id: PLAN_ID, user_id: USER_ID, carried_forward: false, ...row }) as WeeklyAction);
        weeklyActionsRef.current.push(...inserted);
        return Promise.resolve({ data: inserted, error: null });
      },
    }),
  };

  const weeklyPlansTable = {
    select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: weeklyPlansRef.current[0] ?? null, error: null }) }) }) }),
    upsert: () => ({
      select: () => ({
        single: () => {
          const plan = { id: PLAN_ID, user_id: USER_ID, week_start_date: "2026-09-01", summary: "This week's plan.", status: "active" } as WeeklyPlan;
          weeklyPlansRef.current = [plan];
          return Promise.resolve({ data: plan, error: null });
        },
      }),
    }),
  };

  // Serves both real callers: generateWeeklyPlansForActiveStudents' own
  // select("id").eq("onboarding_completed", true) (awaited directly, no further chaining)
  // and getOrCreateWeeklyPlan's select("preferred_language").eq("id", userId).maybeSingle().
  // A plain object with no `.then` passes through `await` unchanged, so the same returned
  // value can carry a `.maybeSingle()` method for the second shape without breaking the first.
  const profilesTable = {
    select: () => ({
      eq: (column: string) => {
        if (column === "onboarding_completed") return { data: [{ id: USER_ID }], error: null };
        return { data: { preferred_language: "en" }, error: null, maybeSingle: () => Promise.resolve({ data: { preferred_language: "en" }, error: null }) };
      },
    }),
  };

  const notificationsTable = {
    select: () => ({ eq: () => ({ eq: () => ({ gte: () => ({ limit: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) }) }) }),
  };

  return {
    from: (table: string) => {
      if (table === "weekly_actions") return weeklyActionsTable;
      if (table === "weekly_plans") return weeklyPlansTable;
      if (table === "profiles") return profilesTable;
      if (table === "notifications") return notificationsTable;
      throw new Error(`unexpected table in test: ${table}`);
    },
  };
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => fakeAdminClient(),
  tryCreateAdminClient: () => null,
}));

const { generateWeeklyPlansForActiveStudents } = await import("@/lib/plan/generate-for-active-students");

beforeEach(() => {
  generateWeeklyPlanMock.mockReset();
  generateWeeklyPlanMock.mockResolvedValue({
    summary: "This week's plan.",
    avoidForNow: null,
    actions: [{ title: "Fresh action", description: "desc", reason: "reason", category: "research", estimatedMinutes: 60, impact: "medium" as const }],
  });
  weeklyPlansRef.current = [];
  weeklyActionsRef.current = [];
});

describe("Job D through getOrCreateWeeklyPlan — a real plan must come back, not just 'no throw'", () => {
  test("a student with no plan yet this week ends up with a real, persisted weekly plan and actions — not a silent per-student error", async () => {
    const results = await generateWeeklyPlansForActiveStudents();

    expect(results).toEqual([{ userId: USER_ID, status: "generated" }]);
    // The load-bearing check CEO asked for by name: a real plan row actually exists, and it
    // actually has actions — {status: "generated"} alone would also be true of a bug that
    // returned early with an empty plan, so this checks the persisted data directly.
    expect(weeklyPlansRef.current).toHaveLength(1);
    expect(weeklyPlansRef.current[0]?.summary).toBe("This week's plan.");
    expect(weeklyActionsRef.current).toHaveLength(1);
    expect(weeklyActionsRef.current[0]?.title).toBe("Fresh action");
    // generateWeeklyPlan (the billed AI call) must actually have been reached — proves the
    // failure, when it happens, happens before this, not that this itself is what's broken.
    expect(generateWeeklyPlanMock).toHaveBeenCalledTimes(1);
  });

  test("does not silently downgrade to already_current or skip generation — a genuinely fresh plan was created this run", async () => {
    const results = await generateWeeklyPlansForActiveStudents();
    expect(results[0]?.status).not.toBe("already_current");
    expect(results[0]?.status).not.toBe("error");
  });
});
