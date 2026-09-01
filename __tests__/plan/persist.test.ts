import { beforeEach, describe, expect, test, vi } from "vitest";
import type { WeeklyAction, WeeklyPlan } from "@/types/database";

/**
 * lib/plan/persist.ts — docs/founder-blocked-backlog.md item 39 / migration 0077
 * (2026-09-02). "Regenerate" used to unconditionally wipe every weekly_actions row for the
 * plan, including completed ones and the reflections attached to them — confirmed live
 * before this fix: 4 completed actions across two accounts, all silently gone, zero
 * reflections left anywhere for the advisor to read. CEO's decision: only rows the student
 * never acted on get cleared; anything else (today, only `completed` — see
 * lib/plan/persist.ts's own comment on why `skipped`/`expired` are included in the rule even
 * though no code path produces them yet) survives, marked `carried_forward`.
 *
 * Scoped to `getOrCreateWeeklyPlan(userId, { force: true })` — the "Regenerate" button's own
 * call shape (`force: true` skips the existing-plan early return entirely, so
 * getCurrentWeeklyPlan's own behavior is irrelevant here). generateWeeklyPlan (the AI call),
 * createNotification, and the admin client are mocked at the module boundary; `avoidForNow:
 * null` throughout keeps the unrelated ai_recommendations dedup path (already covered,
 * unrelated to this package) from ever engaging.
 *
 * `actionsRef`/`planRef` are shared, test-mutated state read by one static `vi.mock` (same
 * "hoisted mutable ref behind a static factory" shape as __tests__/ai/limits/budget.test.ts
 * and the advisor-chat-usage.test.ts fix earlier this session) rather than a fresh `vi.doMock`
 * + dynamic import per test — simpler, and avoids relying on `vi.resetModules()` timing to
 * keep each test's module graph from bleeding into the next.
 */

const { generateWeeklyPlanMock, actionsRef } = vi.hoisted(() => ({
  generateWeeklyPlanMock: vi.fn(),
  actionsRef: { current: [] as WeeklyAction[] },
}));

vi.mock("@/lib/ai/weekly-plan", () => ({ generateWeeklyPlan: generateWeeklyPlanMock }));
vi.mock("@/lib/notifications/create", () => ({ createNotification: vi.fn(async () => {}) }));
vi.mock("@/lib/supabase/admin", () => ({ tryCreateAdminClient: () => null }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));

const USER_ID = "11111111-1111-4111-8111-111111111111";
const PLAN_ID = "22222222-2222-4222-8222-222222222222";

vi.mock("@/lib/supabase/server", () => {
  const weeklyActionsTable = {
    select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: actionsRef.current, error: null }) }) }),
    update: (patch: Partial<WeeklyAction>) => ({
      eq: () => ({
        in: (_column: string, statuses: WeeklyAction["status"][]) => {
          actionsRef.current = actionsRef.current.map((row) => (statuses.includes(row.status) ? { ...row, ...patch } : row));
          return Promise.resolve({ error: null });
        },
      }),
    }),
    delete: () => ({
      eq: () => ({
        in: (_column: string, statuses: WeeklyAction["status"][]) => {
          actionsRef.current = actionsRef.current.filter((row) => !statuses.includes(row.status));
          return Promise.resolve({ error: null });
        },
      }),
    }),
    insert: (rows: Array<Partial<WeeklyAction>>) => ({
      select: () => {
        const inserted = rows.map(
          (row, i) =>
            ({
              id: `fresh-${i + 1}`,
              plan_id: PLAN_ID,
              user_id: USER_ID,
              carried_forward: false,
              created_at: "2026-09-02T00:00:00.000Z",
              updated_at: "2026-09-02T00:00:00.000Z",
              ...row,
            }) as WeeklyAction,
        );
        actionsRef.current.push(...inserted);
        return Promise.resolve({ data: inserted, error: null });
      },
    }),
  };

  const weeklyPlansTable = {
    upsert: () => ({
      select: () => ({
        single: () =>
          Promise.resolve({
            data: {
              id: PLAN_ID,
              user_id: USER_ID,
              week_start_date: "2026-09-01",
              summary: "This week's plan.",
              status: "active",
              created_at: "2026-09-02T00:00:00.000Z",
              updated_at: "2026-09-02T00:00:00.000Z",
            } as WeeklyPlan,
            error: null,
          }),
      }),
    }),
  };

  const profilesTable = { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { preferred_language: "en" }, error: null }) }) }) };

  const notificationsTable = {
    select: () => ({ eq: () => ({ eq: () => ({ gte: () => ({ limit: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) }) }) }),
  };

  return {
    createClient: async () => ({
      from: (table: string) => {
        if (table === "weekly_actions") return weeklyActionsTable;
        if (table === "weekly_plans") return weeklyPlansTable;
        if (table === "profiles") return profilesTable;
        if (table === "notifications") return notificationsTable;
        throw new Error(`unexpected table in test: ${table}`);
      },
    }),
  };
});

import { getOrCreateWeeklyPlan } from "@/lib/plan/persist";

function existingAction(overrides: Partial<WeeklyAction> = {}): WeeklyAction {
  return {
    id: `existing-${Math.random().toString(36).slice(2, 8)}`,
    plan_id: PLAN_ID,
    user_id: USER_ID,
    title: "An existing action",
    description: null,
    reason: null,
    category: "research",
    priority: 1,
    estimated_minutes: 60,
    impact_level: "medium",
    deadline: null,
    status: "not_started",
    source_type: "weekly_plan_ai",
    source_id: null,
    reflection_outcome: null,
    reflection_note: null,
    completed_at: null,
    carried_forward: false,
    created_at: "2026-08-20T00:00:00.000Z",
    updated_at: "2026-08-20T00:00:00.000Z",
    ...overrides,
  };
}

function freshGeneration(count = 3) {
  return {
    summary: "Fresh plan.",
    avoidForNow: null,
    actions: Array.from({ length: count }, (_, i) => ({
      title: `Fresh action ${i + 1}`,
      description: "desc",
      reason: "reason",
      category: "research",
      estimatedMinutes: 60,
      impact: "medium" as const,
    })),
  };
}

beforeEach(() => {
  generateWeeklyPlanMock.mockReset();
  generateWeeklyPlanMock.mockResolvedValue(freshGeneration(3));
  actionsRef.current = [];
});

describe("getOrCreateWeeklyPlan(force: true) — preserving completed work (migration 0077)", () => {
  test("a completed action with a reflection survives regeneration, marked carried_forward, reflection untouched", async () => {
    actionsRef.current = [
      existingAction({
        id: "done-1",
        status: "completed",
        reflection_outcome: "completed_successfully",
        reflection_note: "Finished early.",
        completed_at: "2026-08-21T10:00:00.000Z",
      }),
    ];

    await getOrCreateWeeklyPlan(USER_ID, { force: true });

    const survivor = actionsRef.current.find((a) => a.id === "done-1");
    expect(survivor).toBeDefined();
    expect(survivor?.carried_forward).toBe(true);
    expect(survivor?.status).toBe("completed");
    expect(survivor?.reflection_outcome).toBe("completed_successfully");
    expect(survivor?.reflection_note).toBe("Finished early.");
  });

  test("not_started and in_progress actions are still deleted on regeneration", async () => {
    actionsRef.current = [existingAction({ id: "pending-1", status: "not_started" }), existingAction({ id: "pending-2", status: "in_progress" })];

    await getOrCreateWeeklyPlan(USER_ID, { force: true });

    expect(actionsRef.current.find((a) => a.id === "pending-1")).toBeUndefined();
    expect(actionsRef.current.find((a) => a.id === "pending-2")).toBeUndefined();
  });

  test("multiple completed actions are each independently preserved", async () => {
    actionsRef.current = [
      existingAction({ id: "done-a", status: "completed" }),
      existingAction({ id: "done-b", status: "completed" }),
      existingAction({ id: "pending-c", status: "not_started" }),
    ];

    await getOrCreateWeeklyPlan(USER_ID, { force: true });

    expect(actionsRef.current.filter((a) => a.carried_forward)).toHaveLength(2);
    expect(actionsRef.current.find((a) => a.id === "pending-c")).toBeUndefined();
  });

  test("the fresh batch is inserted alongside the preserved action, not instead of it", async () => {
    actionsRef.current = [existingAction({ id: "done-1", status: "completed" })];

    const result = await getOrCreateWeeklyPlan(USER_ID, { force: true });

    expect(actionsRef.current).toHaveLength(4); // 1 preserved + 3 fresh
    expect(result.actions.every((a) => a.status === "not_started" || a.id === "done-1")).toBe(true);
    const fresh = actionsRef.current.filter((a) => !a.carried_forward);
    expect(fresh).toHaveLength(3);
    expect(fresh.every((a) => a.status === "not_started")).toBe(true);
  });

  test("a carried-forward action's priority is left untouched, not renumbered against the fresh batch", async () => {
    actionsRef.current = [existingAction({ id: "done-1", status: "completed", priority: 2 })];
    generateWeeklyPlanMock.mockResolvedValue(freshGeneration(2));

    await getOrCreateWeeklyPlan(USER_ID, { force: true });

    // Deliberately allowed to collide with a fresh action's priority — the two numbering
    // passes are never compared directly; carried_forward is what a reader checks. See
    // lib/plan/persist.ts's comment on why renumbering would cost real information for no
    // real gain.
    expect(actionsRef.current.find((a) => a.id === "done-1")?.priority).toBe(2);
    const fresh = actionsRef.current
      .filter((a) => !a.carried_forward)
      .map((a) => a.priority)
      .sort();
    expect(fresh).toEqual([1, 2]);
  });

  test("a plan with nothing to preserve behaves exactly as before — clean insert, nothing left over", async () => {
    actionsRef.current = [];

    const result = await getOrCreateWeeklyPlan(USER_ID, { force: true });

    expect(result.actions).toHaveLength(3);
    expect(actionsRef.current.every((a) => !a.carried_forward)).toBe(true);
  });
});
