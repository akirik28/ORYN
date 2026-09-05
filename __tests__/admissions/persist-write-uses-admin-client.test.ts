import { describe, expect, test, vi, beforeEach } from "vitest";

/**
 * 2026-09-05 (evidence_status/target_universities RLS guard, docs/permissive-update-policy-
 * sweep-2026-09-04.md §1): both existing persist.ts test files (persist-confidence-gate,
 * persist-read-safety) always pass an explicit `client` argument, so neither ever exercises
 * the real production shape — the save action and the university detail page call
 * `refreshAdmissionOutlook` with NO client, which is exactly the path the new
 * target_universities guard trigger blocks if the write stays on the request-scoped session.
 * This file exists to pin that specific branch: with no `client` passed, the final write must
 * go through `tryCreateAdminClient()`'s client, not `createClient()`'s.
 *
 * Proved red first: before this session's own fix, the write ran on `supabase` (== the
 * request-scoped client here) unconditionally — the assertion below (`requestScopedUpdateCalls`
 * stays 0) would have failed against that code, since the request-scoped fake's own `update`
 * would have been the one called instead of the admin fake's.
 */

const { getCurrentProfileMock, getProfileScoresMock } = vi.hoisted(() => ({
  getCurrentProfileMock: vi.fn(),
  getProfileScoresMock: vi.fn(),
}));
vi.mock("@/lib/security/dal", () => ({ getCurrentProfile: getCurrentProfileMock, getProfileScores: getProfileScoresMock }));

const { tryCreateAdminClientMock } = vi.hoisted(() => ({ tryCreateAdminClientMock: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ tryCreateAdminClient: tryCreateAdminClientMock }));

const { createClientMock } = vi.hoisted(() => ({ createClientMock: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));

// getUniversity/getUniversityStatistics build their own client via lib/supabase/server's
// createClient() internally -- no existing test in this repo mocks those two functions
// directly (checked before writing this), so this file uses the same technique
// __tests__/parent/university-detail-read-safety.test.ts already established: mock
// createClient() itself and let the real helper functions run against the fake client.
import { refreshAdmissionOutlook } from "@/lib/admissions/persist";

type QueryResult = { data: unknown; error: null };

function makeFakeClient(perTable: Record<string, QueryResult>) {
  let updateCalls = 0;
  const client = {
    from: (table: string) => {
      const result = perTable[table] ?? { data: null, error: null };
      const builder = {
        select: () => builder,
        eq: () => builder,
        order: () => builder,
        limit: () => builder,
        single: () => Promise.resolve(result),
        maybeSingle: () => Promise.resolve(result),
        update: () => {
          updateCalls++;
          return builder;
        },
        then: (resolve: (value: QueryResult) => void) => resolve(result),
      };
      return builder;
    },
  };
  return { client, getUpdateCalls: () => updateCalls };
}

const TARGET_ID = "target-1";
const USER_ID = "user-1";

beforeEach(() => {
  getCurrentProfileMock.mockReset();
  getProfileScoresMock.mockReset();
  tryCreateAdminClientMock.mockReset();
  createClientMock.mockReset();
});

describe("refreshAdmissionOutlook — no explicit client (the real save-action/detail-page shape)", () => {
  test("the computed outlook is written via the admin client, never the request-scoped one", async () => {
    const requestScoped = makeFakeClient({
      target_universities: { data: { id: TARGET_ID, university_id: "uni-1", program_id: null }, error: null },
      universities: { data: { name: "Trinity College Dublin", country: "Ireland" }, error: null },
      university_statistics: { data: { admission_rate: 0.2, data_confidence: "high" }, error: null },
    });
    const admin = makeFakeClient({});

    createClientMock.mockResolvedValue(requestScoped.client);
    tryCreateAdminClientMock.mockReturnValue(admin.client);
    getCurrentProfileMock.mockResolvedValue({ profile_strength_score: 70, completeness_percent: 60, country: "Ireland" });
    getProfileScoresMock.mockResolvedValue([{ dimension: "execution_project_depth", score: 65, confidence: "high", reason_codes: ["project"] }]);

    const outlook = await refreshAdmissionOutlook(TARGET_ID, USER_ID);

    expect(outlook).not.toBeNull();
    expect(admin.getUpdateCalls()).toBeGreaterThan(0);
    expect(requestScoped.getUpdateCalls()).toBe(0);
  });

  test("admin client unavailable: outlook is still returned, but nothing is persisted and no request-scoped write happens either", async () => {
    const requestScoped = makeFakeClient({
      target_universities: { data: { id: TARGET_ID, university_id: "uni-1", program_id: null }, error: null },
      universities: { data: { name: "Trinity College Dublin", country: "Ireland" }, error: null },
      university_statistics: { data: { admission_rate: 0.2, data_confidence: "high" }, error: null },
    });

    createClientMock.mockResolvedValue(requestScoped.client);
    tryCreateAdminClientMock.mockReturnValue(null);
    getCurrentProfileMock.mockResolvedValue({ profile_strength_score: 70, completeness_percent: 60, country: "Ireland" });
    getProfileScoresMock.mockResolvedValue([{ dimension: "execution_project_depth", score: 65, confidence: "high", reason_codes: ["project"] }]);

    const outlook = await refreshAdmissionOutlook(TARGET_ID, USER_ID);

    expect(outlook).not.toBeNull();
    expect(requestScoped.getUpdateCalls()).toBe(0);
  });
});
