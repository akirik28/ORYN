import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * Coverage for the Phase 30 Job D batch runner. Drives generateWeeklyPlansForActiveStudents
 * against a fake admin client (the profiles query) and mocked persist.ts functions (the
 * per-student generation itself, already covered by its own callers' tests) -- this file's
 * job is the batching/dedup/error-isolation behavior around those, not re-testing
 * getOrCreateWeeklyPlan's own internals.
 */

const h = vi.hoisted(() => ({
  profiles: [] as { id: string }[],
  profilesError: null as { message: string } | null,
  currentPlanByUser: {} as Record<string, unknown>,
  failOnCreate: new Set<string>(),
  eqSpy: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table !== "profiles") throw new Error(`unexpected table: ${table}`);
      return {
        select: () => ({
          eq: async (column: string, value: unknown) => {
            h.eqSpy(column, value);
            return { data: h.profiles, error: h.profilesError };
          },
        }),
      };
    },
  }),
}));

vi.mock("@/lib/plan/persist", () => ({
  getCurrentWeeklyPlan: vi.fn(async (userId: string) => h.currentPlanByUser[userId] ?? null),
  getOrCreateWeeklyPlan: vi.fn(async (userId: string) => {
    if (h.failOnCreate.has(userId)) throw new Error(`generation failed for ${userId}`);
    return { plan: { id: `plan-${userId}` }, actions: [] };
  }),
}));

const { generateWeeklyPlansForActiveStudents } = await import("@/lib/plan/generate-for-active-students");
const { getOrCreateWeeklyPlan } = await import("@/lib/plan/persist");

beforeEach(() => {
  h.profiles = [];
  h.profilesError = null;
  h.currentPlanByUser = {};
  h.failOnCreate = new Set();
  vi.clearAllMocks();
});

describe("generateWeeklyPlansForActiveStudents", () => {
  test("returns an empty result set when there are no onboarded students", async () => {
    h.profiles = [];
    const results = await generateWeeklyPlansForActiveStudents();
    expect(results).toEqual([]);
  });

  test("scopes the student query to onboarding_completed = true -- the same gate the dashboard itself uses, not a bespoke 'active' definition", async () => {
    await generateWeeklyPlansForActiveStudents();
    expect(h.eqSpy).toHaveBeenCalledWith("onboarding_completed", true);
  });

  test("marks a student with an existing plan for the week as already_current, without calling getOrCreateWeeklyPlan", async () => {
    h.profiles = [{ id: "student-1" }];
    h.currentPlanByUser["student-1"] = { plan: { id: "existing-plan" }, actions: [] };

    const results = await generateWeeklyPlansForActiveStudents();

    expect(results).toEqual([{ userId: "student-1", status: "already_current" }]);
    expect(getOrCreateWeeklyPlan).not.toHaveBeenCalled();
  });

  test("generates a fresh plan for a student with none yet this week", async () => {
    h.profiles = [{ id: "student-2" }];

    const results = await generateWeeklyPlansForActiveStudents();

    expect(results).toEqual([{ userId: "student-2", status: "generated" }]);
    // Never force: true (the one thing that would make this job capable of the destructive
    // delete path), and the job's own admin client must actually be passed through --
    // omitting it is a real, previously-live bug: getOrCreateWeeklyPlan defaults to the
    // session-scoped client, which has no session in a job context, so a real AI call
    // would still be spent and then silently fail to save (RLS-blocked write) on every
    // student, every run. See lib/plan/persist.ts's own comment on getOrCreateWeeklyPlan.
    const call = (getOrCreateWeeklyPlan as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe("student-2");
    expect(call[1]?.force).not.toBe(true);
    expect(call[1]?.supabaseClient).toBeDefined();
  });

  test("records a per-student failure without aborting the batch for the rest", async () => {
    h.profiles = [{ id: "student-fails" }, { id: "student-ok" }];
    h.failOnCreate.add("student-fails");

    const results = await generateWeeklyPlansForActiveStudents();

    expect(results).toEqual([
      { userId: "student-fails", status: "error", detail: "generation failed for student-fails" },
      { userId: "student-ok", status: "generated" },
    ]);
  });

  test("throws when the profiles query itself fails, rather than silently processing zero students", async () => {
    h.profilesError = { message: "connection reset" };
    await expect(generateWeeklyPlansForActiveStudents()).rejects.toThrow("Failed to load active students: connection reset");
  });

  test("processes multiple students independently, preserving order", async () => {
    h.profiles = [{ id: "a" }, { id: "b" }, { id: "c" }];
    h.currentPlanByUser["b"] = { plan: { id: "existing" }, actions: [] };

    const results = await generateWeeklyPlansForActiveStudents();

    expect(results.map((r) => [r.userId, r.status])).toEqual([
      ["a", "generated"],
      ["b", "already_current"],
      ["c", "generated"],
    ]);
  });
});
