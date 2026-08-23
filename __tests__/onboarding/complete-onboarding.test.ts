import { describe, expect, test, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { shouldRunOnboardingSecondaryWrites, writeStudentInterests } from "@/lib/onboarding/complete-onboarding";

/**
 * Two bugs found live 2026-08-23 on the same completeOnboarding code path (see
 * lib/onboarding/complete-onboarding.ts's own comments for the full story):
 *
 * Bug 1 — completeOnboarding had no idempotency guard. A second call for an
 * already-onboarded account re-appended goals/education rows instead of being a no-op.
 * shouldRunOnboardingSecondaryWrites is the extracted decision; the first describe block
 * covers it directly.
 *
 * Bug 2 — student_interests carries `unique (user_id, label)`. The pre-fix code used a
 * plain multi-row `.insert()`, which Postgres rejects as a WHOLE BATCH the moment any one
 * row conflicts — silently discarding every OTHER interest selected in the same session,
 * not just the duplicate. writeStudentInterests fixes this with
 * `.upsert(..., { onConflict: "user_id,label", ignoreDuplicates: true })`. The second
 * describe block below mocks a query builder that models exactly that Postgres behavior
 * (insert on any conflicting row fails the whole call; upsert with ignoreDuplicates
 * succeeds and keeps the non-duplicate rows) — confirmed red against the pre-fix `.insert`
 * call and green against the fix by stashing/restoring this package's diff, per this
 * repo's established practice (see __tests__/deadlines/upcoming.test.ts's own comment for
 * the same convention).
 */
describe("shouldRunOnboardingSecondaryWrites", () => {
  test("a fresh, not-yet-onboarded profile should run the one-time writes", () => {
    expect(shouldRunOnboardingSecondaryWrites({ onboarding_completed: false })).toBe(true);
  });

  test("null (no profile row yet resolved, or the column genuinely unset) still runs — fails open toward the normal first-time path, not toward silently skipping a real student's data", () => {
    expect(shouldRunOnboardingSecondaryWrites({ onboarding_completed: null })).toBe(true);
  });

  test("an already-onboarded profile must NOT run the writes again — the exact guard that closes the duplicate-row bug", () => {
    expect(shouldRunOnboardingSecondaryWrites({ onboarding_completed: true })).toBe(false);
  });
});

/**
 * Hand-rolled chainable mock, same approach __tests__/deadlines/upcoming.test.ts and
 * __tests__/entities/search.test.ts already use (no local Postgres to exercise the real
 * unique-constraint rejection against). `existingLabels` models rows the constraint would
 * already reject a plain INSERT on.
 */
function makeStudentInterestsClient(existingLabels: Set<string>) {
  const upsert = vi.fn((rows: { label: string }[], options?: { ignoreDuplicates?: boolean }) => {
    if (!options?.ignoreDuplicates) {
      // Faithful to real Postgres upsert semantics without ignoreDuplicates: a conflicting
      // row still aborts the statement.
      if (rows.some((r) => existingLabels.has(r.label))) {
        return Promise.resolve({ error: { message: "duplicate key value violates unique constraint", code: "23505" } });
      }
      return Promise.resolve({ error: null });
    }
    // ignoreDuplicates: true — conflicting rows are skipped, everything else still lands.
    return Promise.resolve({ error: null });
  });
  const insert = vi.fn((rows: { label: string }[]) => {
    // Plain multi-row insert: ANY conflicting row fails the WHOLE batch — this is the bug.
    if (rows.some((r) => existingLabels.has(r.label))) {
      return Promise.resolve({ error: { message: "duplicate key value violates unique constraint", code: "23505" } });
    }
    return Promise.resolve({ error: null });
  });
  const from = vi.fn(() => ({ upsert, insert }));
  return { from, upsert, insert } as unknown as SupabaseClient<Database> & { upsert: typeof upsert; insert: typeof insert };
}

describe("writeStudentInterests", () => {
  test("no existing rows: both interests are written, no conflict", async () => {
    const client = makeStudentInterestsClient(new Set());
    await expect(writeStudentInterests(client, "user-1", ["Economics", "Computer Science"], new Set(["Economics", "Computer Science"]))).resolves.toBeUndefined();
    expect(client.upsert).toHaveBeenCalledWith(
      [
        { user_id: "user-1", label: "Economics", is_custom: false },
        { user_id: "user-1", label: "Computer Science", is_custom: false },
      ],
      { onConflict: "user_id,label", ignoreDuplicates: true }
    );
  });

  test("one pre-existing label ('Economics', from an earlier onboarding attempt on the same account) does NOT block the other interest in the same call — the exact live bug", async () => {
    const client = makeStudentInterestsClient(new Set(["Economics"]));
    await expect(writeStudentInterests(client, "user-1", ["Economics", "Computer Science"], new Set(["Economics", "Computer Science"]))).resolves.toBeUndefined();
    // The call used upsert with ignoreDuplicates, not a plain insert that a duplicate would kill outright.
    expect(client.upsert).toHaveBeenCalled();
    expect(client.insert).not.toHaveBeenCalled();
  });

  test("no-op on an empty interests list — never calls the DB for nothing", async () => {
    const client = makeStudentInterestsClient(new Set());
    await writeStudentInterests(client, "user-1", [], new Set());
    expect(client.upsert).not.toHaveBeenCalled();
  });

  test("a genuine, non-duplicate DB error (not a conflict) still surfaces to the caller", async () => {
    const client = makeStudentInterestsClient(new Set());
    const upsertMock = client.upsert as ReturnType<typeof vi.fn>;
    upsertMock.mockResolvedValueOnce({ error: { message: "connection reset", code: "08006" } });
    await expect(writeStudentInterests(client, "user-1", ["Economics"], new Set(["Economics"]))).rejects.toMatchObject({ code: "08006" });
  });
});
