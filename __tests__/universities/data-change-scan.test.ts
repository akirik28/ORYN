import { describe, expect, test } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  hasChangedSinceTracked,
  scanTargetUniversityChanges,
  scanNewUniversityRequirements,
  scanNewUniversityDeadlines,
  scanUniversityStatisticsChanges,
  buildUniversityChangeNotification,
  type UniversityChangeHit,
} from "@/lib/universities/data-change-scan";

describe("hasChangedSinceTracked", () => {
  test("a change after the student started tracking is detected", () => {
    expect(hasChangedSinceTracked("2026-09-01T00:00:00Z", "2026-08-01T00:00:00Z")).toBe(true);
  });

  test("a change before the student started tracking is not reported — it predates their interest", () => {
    expect(hasChangedSinceTracked("2026-07-01T00:00:00Z", "2026-08-01T00:00:00Z")).toBe(false);
  });

  test("null source timestamp (no recorded event) is not reported, not treated as unknown-therefore-notify", () => {
    expect(hasChangedSinceTracked(null, "2026-08-01T00:00:00Z")).toBe(false);
  });

  test("an exact-same-instant event is not reported — it did not happen while the student was watching", () => {
    expect(hasChangedSinceTracked("2026-08-01T00:00:00Z", "2026-08-01T00:00:00Z")).toBe(false);
  });
});

/**
 * 2026-09-05, the university-notification first-fill fix: `translate` now handles the three
 * single-hit claims and two digest tiers `buildUniversityChangeNotification` picks between
 * (see that function's own header) instead of the one generic "updated" string every source
 * used to share.
 */
function translate(key: string, values?: Record<string, string | number>): string {
  if (key === "universityDataAddedTitle") return `${values?.name} — information added for the first time`;
  if (key === "universityDataChangedTitle") return `${values?.name} — information updated`;
  if (key === "universityNewInformationTitle") return `${values?.name} — new information available`;
  if (key === "universityDataChangedDigestTitle") return `${values?.count} universities updated`;
  if (key === "universityNewInformationDigestTitle") return `${values?.count} universities have new information`;
  return key;
}

describe("buildUniversityChangeNotification", () => {
  function hit(overrides: Partial<UniversityChangeHit> = {}): UniversityChangeHit {
    return {
      userId: "u1",
      locale: "en",
      universityId: "univ-1",
      universityName: "Yale University",
      source: "university",
      lastChangedAt: "2026-09-01T00:00:00Z",
      changeKind: "changed",
      ...overrides,
    };
  }

  test("a single 'changed' hit names the university, no body, links to that university's own page", () => {
    const result = buildUniversityChangeNotification([hit({ changeKind: "changed" })], translate);
    expect(result).toEqual({ title: "Yale University — information updated", body: null, link: "/universities/univ-1" });
  });

  test("THE FIX: a single 'added' hit gets its own honest claim, not the 'updated' one", () => {
    const result = buildUniversityChangeNotification([hit({ changeKind: "added" })], translate);
    expect(result.title).toBe("Yale University — information added for the first time");
  });

  test("THE OTHER FIX: a single hit with unknown provenance (changeKind: null) gets the weak, non-committal claim, never 'updated' and never 'added'", () => {
    const result = buildUniversityChangeNotification([hit({ changeKind: null })], translate);
    expect(result.title).toBe("Yale University — new information available");
  });

  test("a 'new_row' hit (requirement/deadline) shares the same weak claim as unknown provenance — both are 'something's new, not asserting which kind'", () => {
    const result = buildUniversityChangeNotification([hit({ changeKind: "new_row", source: "requirement" })], translate);
    expect(result.title).toBe("Yale University — new information available");
  });

  test("multiple hits use a count-based title, a joined name list, and link to the dashboard", () => {
    const result = buildUniversityChangeNotification(
      [hit({ universityId: "univ-2", universityName: "Stanford University" }), hit({ universityId: "univ-1", universityName: "Yale University" })],
      translate
    );
    expect(result.title).toBe("2 universities updated");
    expect(result.body).toBe("Stanford University; Yale University");
    expect(result.link).toBe("/dashboard");
  });

  test("the same university appearing from both sources in one run is not named twice", () => {
    const result = buildUniversityChangeNotification(
      [hit({ source: "university" }), hit({ source: "requirement", changeKind: "new_row", lastChangedAt: "2026-09-02T00:00:00Z" }), hit({ universityId: "univ-2", universityName: "Stanford University" })],
      translate
    );
    expect(result.title).toBe("2 universities updated");
    expect(result.body).toBe("Stanford University; Yale University");
  });

  test("a digest with any genuine 'changed' hit uses the stronger digest claim, even mixed with softer ones", () => {
    const result = buildUniversityChangeNotification(
      [hit({ changeKind: "added" }), hit({ universityId: "univ-2", universityName: "Stanford University", changeKind: "changed" })],
      translate
    );
    expect(result.title).toBe("2 universities updated");
  });

  test("a digest with no 'changed' hit at all — only added/new_row/null — uses the softer digest claim", () => {
    const result = buildUniversityChangeNotification(
      [hit({ changeKind: "added" }), hit({ universityId: "univ-2", universityName: "Stanford University", changeKind: null })],
      translate
    );
    expect(result.title).toBe("2 universities have new information");
  });
});

/** Same thenable chainable-builder mock shape as __tests__/deadlines/scan-target-universities.test.ts's
 * makeQueryBuilder — this file's two scan sources only ever call `.select().in()`. */
function makeQueryBuilder<T extends Record<string, unknown>>(rows: T[]) {
  let filtered = [...rows];
  const builder = {
    select: () => builder,
    in: (column: keyof T, values: unknown[]) => {
      filtered = filtered.filter((row) => values.includes(row[column]));
      return builder;
    },
    then(onFulfilled: (result: { data: T[]; error: null }) => unknown, onRejected?: (reason: unknown) => unknown) {
      return Promise.resolve({ data: filtered, error: null }).then(onFulfilled, onRejected);
    },
  };
  return builder;
}

type TargetRow = { user_id: string; university_id: string; created_at: string; status: string };
// `last_change_kind` optional, not required, on these two mock row types specifically: the
// real select queries always request it now, but a fixture that omits it exercises the exact
// "row predates migration 0143 / column briefly unmigrated" case the real code's own `?? null`
// read handles — see scanTargetUniversityChanges/scanUniversityStatisticsChanges.
type UniversityRow = { id: string; name: string; last_changed_at: string | null; last_change_kind?: "added" | "changed" | null };
type RequirementRow = { university_id: string; created_at: string };
type DeadlineRow = { university_id: string; created_at: string };
type StatisticsRow = { university_id: string; last_changed_at: string | null; last_change_kind?: "added" | "changed" | null };
type ProfileRow = { id: string; preferred_language: string | null };

function makeSupabase(tables: {
  target_universities: TargetRow[];
  universities?: UniversityRow[];
  university_requirements?: RequirementRow[];
  university_deadlines?: DeadlineRow[];
  university_statistics?: StatisticsRow[];
  profiles?: ProfileRow[];
}) {
  const universities = tables.universities ?? [];
  const requirements = tables.university_requirements ?? [];
  const deadlines = tables.university_deadlines ?? [];
  const statistics = tables.university_statistics ?? [];
  const profiles = tables.profiles ?? [];
  return {
    from: (table: "target_universities" | "universities" | "university_requirements" | "university_deadlines" | "university_statistics" | "profiles") => {
      if (table === "target_universities") {
        // status filtering (`.in("status", ACTIVE_TARGET_STATUSES)`) happens before
        // `.select()` is even relevant here — the fixture is pre-filtered to active-status
        // rows by each test, matching this codebase's own convention of keeping the mock
        // minimal rather than re-implementing every real filter.
        return makeQueryBuilder(tables.target_universities);
      }
      if (table === "universities") return makeQueryBuilder(universities);
      if (table === "university_requirements") return makeQueryBuilder(requirements);
      if (table === "university_deadlines") return makeQueryBuilder(deadlines);
      if (table === "university_statistics") return makeQueryBuilder(statistics);
      return makeQueryBuilder(profiles);
    },
  } as unknown as SupabaseClient<Database>;
}

const EMPTY_SUPERSESSION_MAP = new Map();
const STUDENT_ID = "student-1";

describe("scanTargetUniversityChanges", () => {
  test("a university whose core facts genuinely changed after the student started tracking it is a 'changed' hit", async () => {
    const supabase = makeSupabase({
      target_universities: [{ user_id: STUDENT_ID, university_id: "univ-1", created_at: "2026-08-01T00:00:00Z", status: "target" }],
      universities: [{ id: "univ-1", name: "Yale University", last_changed_at: "2026-09-01T00:00:00Z", last_change_kind: "changed" }],
      profiles: [{ id: STUDENT_ID, preferred_language: "en" }],
    });

    const result = await scanTargetUniversityChanges(supabase, EMPTY_SUPERSESSION_MAP);

    expect(result.checked).toBe(1);
    expect(result.hits).toEqual([
      { userId: STUDENT_ID, locale: "en", universityId: "univ-1", universityName: "Yale University", source: "university", lastChangedAt: "2026-09-01T00:00:00Z", changeKind: "changed" },
    ]);
  });

  test("THE FIX: a stub's core facts being filled in for the first time is an 'added' hit, not 'changed'", async () => {
    const supabase = makeSupabase({
      target_universities: [{ user_id: STUDENT_ID, university_id: "univ-1", created_at: "2026-08-01T00:00:00Z", status: "target" }],
      universities: [{ id: "univ-1", name: "University of Oxford", last_changed_at: "2026-09-05T00:00:00Z", last_change_kind: "added" }],
      profiles: [{ id: STUDENT_ID, preferred_language: "en" }],
    });

    const result = await scanTargetUniversityChanges(supabase, EMPTY_SUPERSESSION_MAP);

    expect(result.hits).toEqual([
      { userId: STUDENT_ID, locale: "en", universityId: "univ-1", universityName: "University of Oxford", source: "university", lastChangedAt: "2026-09-05T00:00:00Z", changeKind: "added" },
    ]);
  });

  test("THE OTHER FIX: a row whose last_change_kind predates migration 0143 (or the column isn't live yet) reads as unknown provenance, not defaulted to 'changed'", async () => {
    const supabase = makeSupabase({
      target_universities: [{ user_id: STUDENT_ID, university_id: "univ-1", created_at: "2026-08-01T00:00:00Z", status: "target" }],
      // No last_change_kind at all on this fixture row -- exactly what a real pre-migration
      // row (or a not-yet-migrated column) looks like.
      universities: [{ id: "univ-1", name: "Yale University", last_changed_at: "2026-09-01T00:00:00Z" }],
      profiles: [{ id: STUDENT_ID, preferred_language: "en" }],
    });

    const result = await scanTargetUniversityChanges(supabase, EMPTY_SUPERSESSION_MAP);

    expect(result.hits[0].changeKind).toBeNull();
  });

  test("a university that changed BEFORE the student started tracking it is not a hit", async () => {
    const supabase = makeSupabase({
      target_universities: [{ user_id: STUDENT_ID, university_id: "univ-1", created_at: "2026-09-01T00:00:00Z", status: "target" }],
      universities: [{ id: "univ-1", name: "Yale University", last_changed_at: "2026-08-01T00:00:00Z", last_change_kind: "changed" }],
    });

    const result = await scanTargetUniversityChanges(supabase, EMPTY_SUPERSESSION_MAP);
    expect(result.hits).toEqual([]);
  });

  test("a university with no recorded change (null last_changed_at) is not a hit", async () => {
    const supabase = makeSupabase({
      target_universities: [{ user_id: STUDENT_ID, university_id: "univ-1", created_at: "2026-08-01T00:00:00Z", status: "target" }],
      universities: [{ id: "univ-1", name: "Yale University", last_changed_at: null }],
    });

    const result = await scanTargetUniversityChanges(supabase, EMPTY_SUPERSESSION_MAP);
    expect(result.hits).toEqual([]);
  });

  test("no target universities at all short-circuits cleanly", async () => {
    const result = await scanTargetUniversityChanges(makeSupabase({ target_universities: [] }), EMPTY_SUPERSESSION_MAP);
    expect(result).toEqual({ hits: [], checked: 0 });
  });
});

describe("scanNewUniversityRequirements", () => {
  test("a requirement added after the student started tracking is a 'new_row' hit — never 'changed', matching this file's own deliberately weaker claim for this source", async () => {
    const supabase = makeSupabase({
      target_universities: [{ user_id: STUDENT_ID, university_id: "univ-1", created_at: "2026-08-01T00:00:00Z", status: "target" }],
      universities: [{ id: "univ-1", name: "Yale University", last_changed_at: null }],
      university_requirements: [{ university_id: "univ-1", created_at: "2026-09-01T00:00:00Z" }],
      profiles: [{ id: STUDENT_ID, preferred_language: "en" }],
    });

    const result = await scanNewUniversityRequirements(supabase, EMPTY_SUPERSESSION_MAP);

    expect(result.checked).toBe(1);
    expect(result.hits).toEqual([
      { userId: STUDENT_ID, locale: "en", universityId: "univ-1", universityName: "Yale University", source: "requirement", lastChangedAt: "2026-09-01T00:00:00Z", changeKind: "new_row" },
    ]);
  });

  test("a requirement that predates the student tracking the university is not a hit", async () => {
    const supabase = makeSupabase({
      target_universities: [{ user_id: STUDENT_ID, university_id: "univ-1", created_at: "2026-09-01T00:00:00Z", status: "target" }],
      universities: [{ id: "univ-1", name: "Yale University", last_changed_at: null }],
      university_requirements: [{ university_id: "univ-1", created_at: "2026-08-01T00:00:00Z" }],
    });

    const result = await scanNewUniversityRequirements(supabase, EMPTY_SUPERSESSION_MAP);
    expect(result.hits).toEqual([]);
  });

  test("of several requirements for one university, only the newest one's timestamp is used", async () => {
    const supabase = makeSupabase({
      target_universities: [{ user_id: STUDENT_ID, university_id: "univ-1", created_at: "2026-07-01T00:00:00Z", status: "target" }],
      universities: [{ id: "univ-1", name: "Yale University", last_changed_at: null }],
      university_requirements: [
        { university_id: "univ-1", created_at: "2026-08-01T00:00:00Z" },
        { university_id: "univ-1", created_at: "2026-09-15T00:00:00Z" },
        { university_id: "univ-1", created_at: "2026-08-20T00:00:00Z" },
      ],
      profiles: [{ id: STUDENT_ID, preferred_language: "en" }],
    });

    const result = await scanNewUniversityRequirements(supabase, EMPTY_SUPERSESSION_MAP);
    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].lastChangedAt).toBe("2026-09-15T00:00:00Z");
  });

  test("a university with zero requirements is checked but produces no hit", async () => {
    const supabase = makeSupabase({
      target_universities: [{ user_id: STUDENT_ID, university_id: "univ-1", created_at: "2026-08-01T00:00:00Z", status: "target" }],
      universities: [{ id: "univ-1", name: "Yale University", last_changed_at: null }],
      university_requirements: [],
    });

    const result = await scanNewUniversityRequirements(supabase, EMPTY_SUPERSESSION_MAP);
    expect(result.checked).toBe(0);
    expect(result.hits).toEqual([]);
  });
});

describe("scanNewUniversityDeadlines", () => {
  test("a deadline added after the student started tracking is a 'new_row' hit", async () => {
    const supabase = makeSupabase({
      target_universities: [{ user_id: STUDENT_ID, university_id: "univ-1", created_at: "2026-08-01T00:00:00Z", status: "target" }],
      universities: [{ id: "univ-1", name: "Yale University", last_changed_at: null }],
      university_deadlines: [{ university_id: "univ-1", created_at: "2026-09-01T00:00:00Z" }],
      profiles: [{ id: STUDENT_ID, preferred_language: "en" }],
    });

    const result = await scanNewUniversityDeadlines(supabase, EMPTY_SUPERSESSION_MAP);

    expect(result.checked).toBe(1);
    expect(result.hits).toEqual([
      { userId: STUDENT_ID, locale: "en", universityId: "univ-1", universityName: "Yale University", source: "deadline", lastChangedAt: "2026-09-01T00:00:00Z", changeKind: "new_row" },
    ]);
  });

  test("a deadline that predates the student tracking the university is not a hit", async () => {
    const supabase = makeSupabase({
      target_universities: [{ user_id: STUDENT_ID, university_id: "univ-1", created_at: "2026-09-01T00:00:00Z", status: "target" }],
      universities: [{ id: "univ-1", name: "Yale University", last_changed_at: null }],
      university_deadlines: [{ university_id: "univ-1", created_at: "2026-08-01T00:00:00Z" }],
    });

    const result = await scanNewUniversityDeadlines(supabase, EMPTY_SUPERSESSION_MAP);
    expect(result.hits).toEqual([]);
  });

  test("of several deadlines for one university (e.g. several programs' rounds), only the newest one's timestamp is used", async () => {
    const supabase = makeSupabase({
      target_universities: [{ user_id: STUDENT_ID, university_id: "univ-1", created_at: "2026-07-01T00:00:00Z", status: "target" }],
      universities: [{ id: "univ-1", name: "Yale University", last_changed_at: null }],
      university_deadlines: [
        { university_id: "univ-1", created_at: "2026-08-01T00:00:00Z" },
        { university_id: "univ-1", created_at: "2026-09-15T00:00:00Z" },
        { university_id: "univ-1", created_at: "2026-08-20T00:00:00Z" },
      ],
      profiles: [{ id: STUDENT_ID, preferred_language: "en" }],
    });

    const result = await scanNewUniversityDeadlines(supabase, EMPTY_SUPERSESSION_MAP);
    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].lastChangedAt).toBe("2026-09-15T00:00:00Z");
  });

  test("a university with zero deadline rows is checked but produces no hit", async () => {
    const supabase = makeSupabase({
      target_universities: [{ user_id: STUDENT_ID, university_id: "univ-1", created_at: "2026-08-01T00:00:00Z", status: "target" }],
      universities: [{ id: "univ-1", name: "Yale University", last_changed_at: null }],
      university_deadlines: [],
    });

    const result = await scanNewUniversityDeadlines(supabase, EMPTY_SUPERSESSION_MAP);
    expect(result.checked).toBe(0);
    expect(result.hits).toEqual([]);
  });
});

describe("scanUniversityStatisticsChanges", () => {
  test("a statistics row that genuinely changed after tracking started is a 'changed' hit", async () => {
    const supabase = makeSupabase({
      target_universities: [{ user_id: STUDENT_ID, university_id: "univ-1", created_at: "2026-08-01T00:00:00Z", status: "target" }],
      universities: [{ id: "univ-1", name: "Yale University", last_changed_at: null }],
      university_statistics: [{ university_id: "univ-1", last_changed_at: "2026-09-01T00:00:00Z", last_change_kind: "changed" }],
      profiles: [{ id: STUDENT_ID, preferred_language: "en" }],
    });

    const result = await scanUniversityStatisticsChanges(supabase, EMPTY_SUPERSESSION_MAP);

    expect(result.checked).toBe(1);
    expect(result.hits).toEqual([
      { userId: STUDENT_ID, locale: "en", universityId: "univ-1", universityName: "Yale University", source: "statistics", lastChangedAt: "2026-09-01T00:00:00Z", changeKind: "changed" },
    ]);
  });

  test("THE FIX: a university's first-ever statistics row is an 'added' hit, not 'changed' — this was the former `!existingStats ||` special case", async () => {
    const supabase = makeSupabase({
      target_universities: [{ user_id: STUDENT_ID, university_id: "univ-1", created_at: "2026-08-01T00:00:00Z", status: "target" }],
      universities: [{ id: "univ-1", name: "University of Oxford", last_changed_at: null }],
      university_statistics: [{ university_id: "univ-1", last_changed_at: "2026-09-05T00:00:00Z", last_change_kind: "added" }],
      profiles: [{ id: STUDENT_ID, preferred_language: "en" }],
    });

    const result = await scanUniversityStatisticsChanges(supabase, EMPTY_SUPERSESSION_MAP);

    expect(result.hits[0]).toMatchObject({ changeKind: "added" });
  });

  test("THE OTHER FIX: a statistics row with no recorded change_kind (pre-migration history) reads as unknown provenance", async () => {
    const supabase = makeSupabase({
      target_universities: [{ user_id: STUDENT_ID, university_id: "univ-1", created_at: "2026-08-01T00:00:00Z", status: "target" }],
      universities: [{ id: "univ-1", name: "Yale University", last_changed_at: null }],
      university_statistics: [{ university_id: "univ-1", last_changed_at: "2026-09-01T00:00:00Z" }],
      profiles: [{ id: STUDENT_ID, preferred_language: "en" }],
    });

    const result = await scanUniversityStatisticsChanges(supabase, EMPTY_SUPERSESSION_MAP);
    expect(result.hits[0].changeKind).toBeNull();
  });

  test("of several stat_year rows for one university, the NEWEST row's own change_kind is used, not any other row's", async () => {
    const supabase = makeSupabase({
      target_universities: [{ user_id: STUDENT_ID, university_id: "univ-1", created_at: "2026-07-01T00:00:00Z", status: "target" }],
      universities: [{ id: "univ-1", name: "Yale University", last_changed_at: null }],
      university_statistics: [
        { university_id: "univ-1", last_changed_at: "2026-08-01T00:00:00Z", last_change_kind: "added" },
        { university_id: "univ-1", last_changed_at: "2026-09-15T00:00:00Z", last_change_kind: "changed" },
        { university_id: "univ-1", last_changed_at: null },
      ],
      profiles: [{ id: STUDENT_ID, preferred_language: "en" }],
    });

    const result = await scanUniversityStatisticsChanges(supabase, EMPTY_SUPERSESSION_MAP);
    expect(result.hits).toHaveLength(1);
    expect(result.hits[0]).toMatchObject({ lastChangedAt: "2026-09-15T00:00:00Z", changeKind: "changed" });
  });

  test("a statistics row that has never been observed to change (null last_changed_at) is checked but not a hit", async () => {
    const supabase = makeSupabase({
      target_universities: [{ user_id: STUDENT_ID, university_id: "univ-1", created_at: "2026-08-01T00:00:00Z", status: "target" }],
      universities: [{ id: "univ-1", name: "Yale University", last_changed_at: null }],
      university_statistics: [{ university_id: "univ-1", last_changed_at: null }],
    });

    const result = await scanUniversityStatisticsChanges(supabase, EMPTY_SUPERSESSION_MAP);
    expect(result.checked).toBe(1);
    expect(result.hits).toEqual([]);
  });

  test("a university with zero statistics rows at all is not checked and produces no hit", async () => {
    const supabase = makeSupabase({
      target_universities: [{ user_id: STUDENT_ID, university_id: "univ-1", created_at: "2026-08-01T00:00:00Z", status: "target" }],
      universities: [{ id: "univ-1", name: "Yale University", last_changed_at: null }],
      university_statistics: [],
    });

    const result = await scanUniversityStatisticsChanges(supabase, EMPTY_SUPERSESSION_MAP);
    expect(result.checked).toBe(0);
    expect(result.hits).toEqual([]);
  });
});

/**
 * The measured shape, end to end. docs/university-change-notification-first-fill-audit-
 * 2026-09-05.md live-counted 19 active target_universities: 5 pointing at a university
 * missing a core fact, 8 pointing at one with zero statistics on file — CEO's own "5+8=13"
 * framing for how many would have false-fired "information updated" before this fix. Student
 * and university identities were never fetched for that measurement (aggregate counts and
 * public-catalog joins only, no PII) — this reconstructs the MEASURED SHAPE with synthetic
 * ids, not a replay of the real 19 rows, to prove the mechanism a live re-query can't safely
 * prove here.
 *
 * Before this fix, all 13 of these — being null-to-real-value transitions — used the same
 * `hasUniversityDataChanged`/`hasStatisticsChanged` boolean the "changed" case does, so
 * `buildUniversityChangeNotification` gave every one of them the identical "information
 * updated" claim. That old code path no longer exists to re-run directly (the functions were
 * replaced, not wrapped), so the "before" half is the documented fact this suite's own git
 * history proves, not a live re-execution; the "after" half below is what's actually testable
 * now, and is the real proof this pass can make.
 */
describe("the measured 19-row shape: 13 that would have false-fired, split correctly after the fix", () => {
  test("5 university-core-fact fills split into 3 freshly-classified 'added' and 2 unknown-provenance (pre-migration) hits — never 'changed', and the unknown count is genuinely non-zero", async () => {
    const targets = [1, 2, 3, 4, 5].map((n) => ({ user_id: `student-${n}`, university_id: `univ-${n}`, created_at: "2026-08-01T00:00:00Z", status: "target" }));
    const universities = [
      { id: "univ-1", name: "University A", last_changed_at: "2026-09-05T00:00:00Z", last_change_kind: "added" as const },
      { id: "univ-2", name: "University B", last_changed_at: "2026-09-05T00:00:00Z", last_change_kind: "added" as const },
      { id: "univ-3", name: "University C", last_changed_at: "2026-09-05T00:00:00Z", last_change_kind: "added" as const },
      // These two carry no last_change_kind at all -- exactly what a row already fleshed out
      // BEFORE migration 0143 existed looks like: a real, already-recorded last_changed_at
      // with no classification behind it.
      { id: "univ-4", name: "University D", last_changed_at: "2026-08-20T00:00:00Z" },
      { id: "univ-5", name: "University E", last_changed_at: "2026-08-25T00:00:00Z" },
    ];
    const supabase = makeSupabase({
      target_universities: targets,
      universities,
      profiles: targets.map((t) => ({ id: t.user_id, preferred_language: "en" as const })),
    });

    const result = await scanTargetUniversityChanges(supabase, EMPTY_SUPERSESSION_MAP);

    expect(result.hits).toHaveLength(5);
    expect(result.hits.filter((h) => h.changeKind === "added")).toHaveLength(3);
    expect(result.hits.filter((h) => h.changeKind === null)).toHaveLength(2);
    expect(result.hits.filter((h) => h.changeKind === "changed")).toHaveLength(0);

    // And the actual student-facing sentence for each is correct and distinct.
    for (const hit of result.hits) {
      const { title } = buildUniversityChangeNotification([hit], translate);
      if (hit.changeKind === "added") expect(title).toContain("added for the first time");
      else expect(title).toBe(`${hit.universityName} — new information available`);
      expect(title).not.toContain("— information updated");
    }
  });

  test("8 first-ever-statistics fills split into 5 freshly-classified 'added' and 3 unknown-provenance hits — never 'changed'", async () => {
    const targets = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ user_id: `student-${n}`, university_id: `univ-${n}`, created_at: "2026-08-01T00:00:00Z", status: "target" }));
    const universities = targets.map((t) => ({ id: t.university_id, name: `University ${t.university_id}`, last_changed_at: null }));
    const statistics = [
      ...[1, 2, 3, 4, 5].map((n) => ({ university_id: `univ-${n}`, last_changed_at: "2026-09-05T00:00:00Z", last_change_kind: "added" as const })),
      // Three more first-ever statistics rows, but classified before migration 0143 existed.
      ...[6, 7, 8].map((n) => ({ university_id: `univ-${n}`, last_changed_at: "2026-08-22T00:00:00Z" })),
    ];
    const supabase = makeSupabase({
      target_universities: targets,
      universities,
      university_statistics: statistics,
      profiles: targets.map((t) => ({ id: t.user_id, preferred_language: "en" as const })),
    });

    const result = await scanUniversityStatisticsChanges(supabase, EMPTY_SUPERSESSION_MAP);

    expect(result.hits).toHaveLength(8);
    expect(result.hits.filter((h) => h.changeKind === "added")).toHaveLength(5);
    expect(result.hits.filter((h) => h.changeKind === null)).toHaveLength(3);
    expect(result.hits.filter((h) => h.changeKind === "changed")).toHaveLength(0);
  });
});
