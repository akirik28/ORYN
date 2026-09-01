import { describe, expect, test } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  hasChangedSinceTracked,
  scanTargetUniversityChanges,
  scanNewUniversityRequirements,
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

describe("buildUniversityChangeNotification", () => {
  const translate = (key: string, values?: Record<string, string | number>) => {
    if (key === "universityDataChangedTitle") return `${values?.name} — information updated`;
    if (key === "universityDataChangedDigestTitle") return `${values?.count} universities updated`;
    return key;
  };

  function hit(overrides: Partial<UniversityChangeHit> = {}): UniversityChangeHit {
    return { userId: "u1", locale: "en", universityId: "univ-1", universityName: "Yale University", source: "university", lastChangedAt: "2026-09-01T00:00:00Z", ...overrides };
  }

  test("a single hit names the university in the title, no body, links to that university's own page", () => {
    const result = buildUniversityChangeNotification([hit()], translate);
    expect(result).toEqual({ title: "Yale University — information updated", body: null, link: "/universities/univ-1" });
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
      [hit({ source: "university" }), hit({ source: "requirement", lastChangedAt: "2026-09-02T00:00:00Z" }), hit({ universityId: "univ-2", universityName: "Stanford University" })],
      translate
    );
    expect(result.title).toBe("2 universities updated");
    expect(result.body).toBe("Stanford University; Yale University");
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
type UniversityRow = { id: string; name: string; last_changed_at: string | null };
type RequirementRow = { university_id: string; created_at: string };
type ProfileRow = { id: string; preferred_language: string | null };

function makeSupabase(tables: { target_universities: TargetRow[]; universities?: UniversityRow[]; university_requirements?: RequirementRow[]; profiles?: ProfileRow[] }) {
  const universities = tables.universities ?? [];
  const requirements = tables.university_requirements ?? [];
  const profiles = tables.profiles ?? [];
  return {
    from: (table: "target_universities" | "universities" | "university_requirements" | "profiles") => {
      if (table === "target_universities") {
        // status filtering (`.in("status", ACTIVE_TARGET_STATUSES)`) happens before
        // `.select()` is even relevant here — the fixture is pre-filtered to active-status
        // rows by each test, matching this codebase's own convention of keeping the mock
        // minimal rather than re-implementing every real filter.
        return makeQueryBuilder(tables.target_universities);
      }
      if (table === "universities") return makeQueryBuilder(universities);
      if (table === "university_requirements") return makeQueryBuilder(requirements);
      return makeQueryBuilder(profiles);
    },
  } as unknown as SupabaseClient<Database>;
}

const EMPTY_SUPERSESSION_MAP = new Map();
const STUDENT_ID = "student-1";

describe("scanTargetUniversityChanges", () => {
  test("a university whose core facts changed after the student started tracking it is a hit", async () => {
    const supabase = makeSupabase({
      target_universities: [{ user_id: STUDENT_ID, university_id: "univ-1", created_at: "2026-08-01T00:00:00Z", status: "target" }],
      universities: [{ id: "univ-1", name: "Yale University", last_changed_at: "2026-09-01T00:00:00Z" }],
      profiles: [{ id: STUDENT_ID, preferred_language: "en" }],
    });

    const result = await scanTargetUniversityChanges(supabase, EMPTY_SUPERSESSION_MAP);

    expect(result.checked).toBe(1);
    expect(result.hits).toEqual([{ userId: STUDENT_ID, locale: "en", universityId: "univ-1", universityName: "Yale University", source: "university", lastChangedAt: "2026-09-01T00:00:00Z" }]);
  });

  test("a university that changed BEFORE the student started tracking it is not a hit", async () => {
    const supabase = makeSupabase({
      target_universities: [{ user_id: STUDENT_ID, university_id: "univ-1", created_at: "2026-09-01T00:00:00Z", status: "target" }],
      universities: [{ id: "univ-1", name: "Yale University", last_changed_at: "2026-08-01T00:00:00Z" }],
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
  test("a requirement added after the student started tracking is a hit", async () => {
    const supabase = makeSupabase({
      target_universities: [{ user_id: STUDENT_ID, university_id: "univ-1", created_at: "2026-08-01T00:00:00Z", status: "target" }],
      universities: [{ id: "univ-1", name: "Yale University", last_changed_at: null }],
      university_requirements: [{ university_id: "univ-1", created_at: "2026-09-01T00:00:00Z" }],
      profiles: [{ id: STUDENT_ID, preferred_language: "en" }],
    });

    const result = await scanNewUniversityRequirements(supabase, EMPTY_SUPERSESSION_MAP);

    expect(result.checked).toBe(1);
    expect(result.hits).toEqual([{ userId: STUDENT_ID, locale: "en", universityId: "univ-1", universityName: "Yale University", source: "requirement", lastChangedAt: "2026-09-01T00:00:00Z" }]);
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
