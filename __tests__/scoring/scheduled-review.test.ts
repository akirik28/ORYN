import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * Coverage for the Phase 41 "or scheduled review" batch runner (2026-09-02). Same shape as
 * __tests__/plan/generate-for-active-students.test.ts (the Job D precedent this job
 * follows): drives runScheduledReview against a fake admin client (the profiles query) and
 * a mocked recomputeCareerProfile (already covered by profile-update-wiring.test.ts and the
 * new opts test in that same file) -- this file's job is the batching/error-isolation
 * behavior and the job's own client-threading, not re-testing recomputeCareerProfile's
 * internals.
 */

const h = vi.hoisted(() => ({
  profiles: [] as { id: string }[],
  profilesError: null as { message: string } | null,
  snapshotWrittenByUser: {} as Record<string, boolean>,
  failFor: new Set<string>(),
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

vi.mock("@/lib/scoring/persist", () => ({
  recomputeCareerProfile: vi.fn(async (userId: string) => {
    if (h.failFor.has(userId)) throw new Error(`recompute failed for ${userId}`);
    return { careerProfile: {}, completeness: 0, snapshotWritten: h.snapshotWrittenByUser[userId] ?? false };
  }),
}));

const { runScheduledReview } = await import("@/lib/scoring/scheduled-review");
const { recomputeCareerProfile } = await import("@/lib/scoring/persist");

beforeEach(() => {
  h.profiles = [];
  h.profilesError = null;
  h.snapshotWrittenByUser = {};
  h.failFor = new Set();
  vi.clearAllMocks();
});

describe("runScheduledReview", () => {
  test("returns an empty result set when there are no onboarded students", async () => {
    h.profiles = [];
    expect(await runScheduledReview()).toEqual([]);
  });

  test("scopes the student query to onboarding_completed = true, same gate as Job D", async () => {
    await runScheduledReview();
    expect(h.eqSpy).toHaveBeenCalledWith("onboarding_completed", true);
  });

  test("passes the job's own admin client as BOTH supabaseClient and adminClient -- this job has no session to scope reads to", async () => {
    h.profiles = [{ id: "student-1" }];
    await runScheduledReview();

    const call = (recomputeCareerProfile as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe("student-1");
    expect(call[1]?.snapshotReason).toBe("scheduled_review");
    expect(call[1]?.supabaseClient).toBeDefined();
    expect(call[1]?.adminClient).toBeDefined();
    expect(call[1]?.supabaseClient).toBe(call[1]?.adminClient);
  });

  test("a student whose score genuinely moved is reported as snapshot_written", async () => {
    h.profiles = [{ id: "student-moved" }];
    h.snapshotWrittenByUser["student-moved"] = true;

    expect(await runScheduledReview()).toEqual([{ userId: "student-moved", status: "snapshot_written" }]);
  });

  test("a student whose score didn't move is reported as no_meaningful_change, not an error -- this is the expected, common case every run", async () => {
    h.profiles = [{ id: "student-unchanged" }];
    h.snapshotWrittenByUser["student-unchanged"] = false;

    expect(await runScheduledReview()).toEqual([{ userId: "student-unchanged", status: "no_meaningful_change" }]);
  });

  test("one student's failure doesn't abort the run for the rest -- same discipline as Job D", async () => {
    h.profiles = [{ id: "student-fails" }, { id: "student-ok" }];
    h.failFor.add("student-fails");
    h.snapshotWrittenByUser["student-ok"] = true;

    const results = await runScheduledReview();

    expect(results).toEqual([
      { userId: "student-fails", status: "error", detail: "recompute failed for student-fails" },
      { userId: "student-ok", status: "snapshot_written" },
    ]);
  });

  test("throws when the profiles query itself fails, rather than silently processing zero students", async () => {
    h.profilesError = { message: "connection reset" };
    await expect(runScheduledReview()).rejects.toThrow("Failed to load onboarded students: connection reset");
  });

  test("processes multiple students independently, preserving order", async () => {
    h.profiles = [{ id: "a" }, { id: "b" }, { id: "c" }];
    h.snapshotWrittenByUser = { a: true, b: false, c: true };

    const results = await runScheduledReview();

    expect(results.map((r) => [r.userId, r.status])).toEqual([
      ["a", "snapshot_written"],
      ["b", "no_meaningful_change"],
      ["c", "snapshot_written"],
    ]);
  });
});
