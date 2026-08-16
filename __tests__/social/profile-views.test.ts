import { describe, expect, test } from "vitest";
import { shouldRecordProfileView, isBenignDuplicateViewError, aggregateProfileViewCounts } from "@/lib/social/profile-views-rules";

const OWNER = "11111111-1111-1111-1111-111111111111";
const VIEWER = "22222222-2222-2222-2222-222222222222";

describe("self-view excluded (shouldRecordProfileView)", () => {
  test("viewing someone else's profile: records", () => {
    expect(shouldRecordProfileView(OWNER, VIEWER)).toBe(true);
  });

  test("viewing your own profile: does not record", () => {
    expect(shouldRecordProfileView(OWNER, OWNER)).toBe(false);
  });
});

describe("same-day duplicate behavior (isBenignDuplicateViewError)", () => {
  test("a unique-violation (23505) from the same-day dedup constraint is benign, not an error", () => {
    expect(isBenignDuplicateViewError("23505")).toBe(true);
  });

  test("any other Postgres error code is a real failure, not swallowed", () => {
    expect(isBenignDuplicateViewError("23503")).toBe(false); // foreign_key_violation
    expect(isBenignDuplicateViewError("42501")).toBe(false); // insufficient_privilege
  });

  test("no code at all (network/unknown error): not treated as benign", () => {
    expect(isBenignDuplicateViewError(undefined)).toBe(false);
    expect(isBenignDuplicateViewError(null)).toBe(false);
  });
});

describe("7d/30d aggregation (aggregateProfileViewCounts)", () => {
  const NOW = new Date("2026-08-16T12:00:00.000Z");

  test("no views at all: both counts zero", () => {
    expect(aggregateProfileViewCounts([], NOW)).toEqual({ last7Days: 0, last30Days: 0 });
  });

  test("a view exactly 7 days ago counts toward the 7-day window (inclusive boundary)", () => {
    // NOW is 2026-08-16; 7 days back is 2026-08-09.
    const counts = aggregateProfileViewCounts(["2026-08-09"], NOW);
    expect(counts.last7Days).toBe(1);
    expect(counts.last30Days).toBe(1);
  });

  test("a view 8 days ago falls outside the 7-day window but still counts toward 30", () => {
    const counts = aggregateProfileViewCounts(["2026-08-08"], NOW);
    expect(counts.last7Days).toBe(0);
    expect(counts.last30Days).toBe(1);
  });

  test("mixed dates split correctly between the two windows", () => {
    // Caller (lib/social/profile-views.ts) already scopes the input to the last 30 days
    // via its own DB query, so last30Days is always the full input length — this fixture
    // stays within that same 30-day scoping.
    const counts = aggregateProfileViewCounts(["2026-08-16", "2026-08-15", "2026-08-01", "2026-07-25"], NOW);
    expect(counts.last7Days).toBe(2); // 08-16 and 08-15
    expect(counts.last30Days).toBe(4); // every date in the (already 30-day-scoped) input
  });

  test("today's view counts toward both windows", () => {
    const counts = aggregateProfileViewCounts(["2026-08-16"], NOW);
    expect(counts.last7Days).toBe(1);
    expect(counts.last30Days).toBe(1);
  });
});

describe("owner-only + viewer_id never exposed", () => {
  // aggregateProfileViewCounts' input type is `string[]` (bare viewed_on dates) and its
  // output type is `{ last7Days, last30Days }` — there is no parameter or field anywhere
  // in this function's signature capable of carrying a viewer id. Combined with
  // lib/social/profile-views.ts's query only ever selecting `viewed_on` (never
  // `viewer_id`) and the RLS policy scoping reads to the caller's own
  // `viewed_user_id = auth.uid()` rows (owner-only), viewer identity has no path out of
  // this feature at all — not through the query, not through the aggregator, not
  // through what reaches the UI. (Export-path coverage for the same commitment already
  // exists in __tests__/export/tables.test.ts's PROFILE_VIEWS_EXPORT_COLUMNS tests.)
  test("the aggregated result never contains anything but the two counts", () => {
    const result = aggregateProfileViewCounts(["2026-08-16"], new Date("2026-08-16T00:00:00.000Z"));
    expect(Object.keys(result).sort()).toEqual(["last30Days", "last7Days"]);
  });
});
