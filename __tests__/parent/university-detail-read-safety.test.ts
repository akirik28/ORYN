import { describe, expect, test, vi } from "vitest";
import { readFileSync } from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// getUniversity/getUniversityStatistics/getUniversityRequirements (lib/universities/
// detail-reads.ts) construct their own createClient() internally rather than accepting one
// — mocked here so their internal reads land on the exact same fakeClient instance each
// test injects explicitly, rather than hitting the real client (which throws in this
// worktree: no .env.local, by design — see B3c's own commit message).
const currentClient: { value: SupabaseClient<Database> | null } = { value: null };
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => currentClient.value }));

const { loadParentSafeUniversityDetail } = await import("@/lib/parent/university-detail");

/**
 * B6 (2026-09-04) — proves the parent-safe university detail page's data loader never
 * writes anything and never recomputes an admission outlook, the two guarantees CEO asked
 * for explicitly. Two layers, not one:
 *
 * 1. A structural check (below): the loader's own source neither imports from
 *    `@/lib/admissions/persist` nor calls `refreshAdmissionOutlook(` — a client-mock alone
 *    can't prove "this function was never called" the way it can prove "this client method
 *    was never called," since the loader could in principle call it through some other
 *    client. Reading the child's outlook only through get_parent_child_target_universities
 *    (already persisted, never recomputed) is what makes this check meaningful, not trivial.
 * 2. A `fakeClient` (same shape as __tests__/admissions/persist-confidence-gate.test.ts,
 *    today's own precedent for this exact kind of proof) tracking every mutating call —
 *    proves no `update`/`insert`/`upsert`/`delete` reaches the client on a realistic,
 *    fully-populated response set, not just an empty one.
 *
 * `getUniversity`/`getUniversityStatistics`/`getUniversityRequirements`
 * (lib/universities/detail-reads.ts) construct their own `createClient()` internally rather
 * than accepting one — mocking `@/lib/supabase/server` to return this same fakeClient
 * instance is what lets one client double stand in for both the explicitly-injected calls
 * and those three helpers' own internal ones.
 */

test("the loader's own source never imports or calls the outlook-computing/writing function", () => {
  // Checks import/call syntax specifically, not a bare substring — the file's own doc
  // comment names `refreshAdmissionOutlook` in prose to explain why it isn't used, which a
  // plain `.not.toContain("refreshAdmissionOutlook")` would also (wrongly) flag.
  const source = readFileSync(new URL("../../lib/parent/university-detail.ts", import.meta.url), "utf-8");
  expect(source).not.toContain('from "@/lib/admissions/persist"');
  expect(source).not.toContain("refreshAdmissionOutlook(");
});

type QueryResult = { data: unknown; error: { message: string } | null; count?: number };

function fakeClient(perTable: Record<string, QueryResult>, rpcResult: QueryResult): { client: SupabaseClient<Database>; calls: { update: number; insert: number; upsert: number; delete: number; rpc: number } } {
  const calls = { update: 0, insert: 0, upsert: 0, delete: 0, rpc: 0 };
  const client = {
    from: (table: string) => {
      const result = perTable[table] ?? { data: null, error: null };
      const builder = {
        select: () => builder,
        eq: () => builder,
        in: () => builder,
        order: () => builder,
        limit: () => builder,
        single: () => Promise.resolve(result),
        maybeSingle: () => Promise.resolve(result),
        update: () => {
          calls.update++;
          return builder;
        },
        insert: () => {
          calls.insert++;
          return builder;
        },
        upsert: () => {
          calls.upsert++;
          return builder;
        },
        delete: () => {
          calls.delete++;
          return builder;
        },
        then: (resolve: (value: QueryResult) => void) => resolve(result),
      };
      return builder;
    },
    rpc: () => {
      calls.rpc++;
      return Promise.resolve(rpcResult);
    },
  };
  return { client: client as unknown as SupabaseClient<Database>, calls };
}

const UNIVERSITY_ID = "uni-1";
const STUDENT_ID = "student-1";

const FULLY_POPULATED_TABLES: Record<string, QueryResult> = {
  universities: { data: { id: UNIVERSITY_ID, name: "Trinity College Dublin", country: "Ireland", city: "Dublin", website_url: "https://tcd.ie", student_size: 18000 }, error: null },
  university_statistics: { data: { admission_rate: 0.3, cost_of_attendance: null, source: "Official site", updated_at: "2026-08-01", data_confidence: "high" }, error: null },
  university_requirements: { data: [{ id: "req-1", title: "IB minimum", requirement_type: "academic", requirement_detail: "IB 36 points" }], error: null },
  university_deadlines: { data: [{ id: "dl-1", deadline_type: "application", deadline_date: "2027-01-15", cycle_label: null }], error: null },
  university_rankings: { data: [{ ranking_provider: "QS", ranking_edition: "2027", rank_display: "#150" }], error: null },
  university_profile_metrics: { data: [{ metric_code: "tuition_international_annual", value_numeric: 25000, unit: "EUR", stats_as_of: "2026/27", precision_state: "exact" }], error: null },
  university_sources: { data: null, error: null, count: 3 },
};

const RPC_WITH_MATCH: QueryResult = {
  data: [
    {
      id: "target-1",
      university_id: UNIVERSITY_ID,
      program_id: null,
      status: "target",
      academic_fit_score: 70,
      profile_fit_score: 65,
      outlook: "reach",
      estimate_range_low: 0.15,
      estimate_range_high: 0.25,
      outlook_confidence: "medium",
      created_at: "2026-08-01",
      updated_at: "2026-08-01",
    },
  ],
  error: null,
};

describe("loadParentSafeUniversityDetail — read safety", () => {
  test("a fully-populated response set issues zero mutating calls", async () => {
    const { client, calls } = fakeClient(FULLY_POPULATED_TABLES, RPC_WITH_MATCH);
    currentClient.value = client;

    const detail = await loadParentSafeUniversityDetail(client, UNIVERSITY_ID, STUDENT_ID);

    expect(detail).not.toBeNull();
    expect(calls.update).toBe(0);
    expect(calls.insert).toBe(0);
    expect(calls.upsert).toBe(0);
    expect(calls.delete).toBe(0);
    expect(calls.rpc).toBeGreaterThan(0);
  });

  test("surfaces the child's already-computed outlook from the RPC row, not a recomputed one", async () => {
    const { client } = fakeClient(FULLY_POPULATED_TABLES, RPC_WITH_MATCH);
    currentClient.value = client;
    const detail = await loadParentSafeUniversityDetail(client, UNIVERSITY_ID, STUDENT_ID);

    expect(detail?.childOutlook).toEqual({
      status: "target",
      outlook: "reach",
      estimateRangeLow: 0.15,
      estimateRangeHigh: 0.25,
      estimateConfidence: "medium",
      // CEO's dead-column audit, 2026-09-05: this fixture (RPC_WITH_MATCH above) already had
      // realistic academic_fit_score/profile_fit_score values before this fix — this
      // assertion just never checked for them, an under-matching verifier reporting a false
      // pass on the exact bug it should have caught. See
      // docs/target-fit-scores-surfaced-2026-09-05.md.
      academicFitScore: 70,
      profileFitScore: 65,
    });
  });

  test("no matching target row means no outlook shown, not a fabricated one", async () => {
    const { client } = fakeClient(FULLY_POPULATED_TABLES, { data: [], error: null });
    currentClient.value = client;
    const detail = await loadParentSafeUniversityDetail(client, UNIVERSITY_ID, STUDENT_ID);

    expect(detail?.childOutlook).toBeNull();
  });
});
