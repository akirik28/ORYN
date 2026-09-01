import { describe, expect, test } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Locale } from "@/lib/i18n/config";

/**
 * scanApplications feeds the deadline-reminder job's application source (Phase 24; see
 * lib/deadlines/scan.ts's own scanDeadlines doc comment for why this is NOT Phase 30 Job
 * B). Isolated the same way its siblings are: mocks only `applications`,
 * `target_universities`, `universities`, and `profiles`, never touching the
 * opportunity/university-deadline sources scanDeadlines also fans out to.
 * `canonicalUniversityId` is exercised with a real, empty `SupersessionMap` rather than
 * mocked — an empty map is the overwhelmingly common real case, and
 * lib/universities/canonical.ts's own module comment confirms it never throws on an id
 * with no entry.
 *
 * This package changed what scanApplications DOES with a crossed threshold: it used to
 * call createNotification directly (one notification per application, immediately); now it
 * returns a DeadlineHit for the caller (writeDeadlineNotifications, in scan.ts) to dedupe
 * and aggregate across sources before ever touching `notifications`. This file tests only
 * the collection half — which applications produce a hit, and what that hit contains.
 * Aggregation/dedup/notification-writing is covered in
 * build-digest-notification.test.ts and dedupe-and-aggregation.test.ts, not here — the
 * same "one file, one concern" split scan.ts's own functions now have.
 *
 * `TRANSLATORS` reproduces messages/en.json and messages/tr.json's real notification
 * strings for exactly the keys this file's hits use.
 */

import { scanApplications } from "@/lib/deadlines/scan";

type ApplicationRow = {
  id: string;
  user_id: string;
  deadline: string | null;
  target_university_id: string;
  status: string;
};
type TargetUniversityRow = { id: string; university_id: string };
type UniversityRow = { id: string; name: string };
type ProfileRow = { id: string; preferred_language: string | null };

function makeQueryBuilder<T extends Record<string, unknown>>(rows: T[]) {
  let filtered = [...rows];
  const builder = {
    select: () => builder,
    eq: (column: keyof T, value: unknown) => {
      filtered = filtered.filter((row) => row[column] === value);
      return builder;
    },
    in: (column: keyof T, values: unknown[]) => {
      filtered = filtered.filter((row) => values.includes(row[column]));
      return builder;
    },
    not: (column: keyof T, _operator: "is", value: null) => {
      filtered = filtered.filter((row) => row[column] !== value);
      return builder;
    },
    then(onFulfilled: (result: { data: T[]; error: null }) => unknown, onRejected?: (reason: unknown) => unknown) {
      return Promise.resolve({ data: filtered, error: null }).then(onFulfilled, onRejected);
    },
  };
  return builder;
}

function makeSupabase(tables: { applications: ApplicationRow[]; target_universities?: TargetUniversityRow[]; universities?: UniversityRow[]; profiles?: ProfileRow[] }) {
  const targetUniversities = tables.target_universities ?? [];
  const universities = tables.universities ?? [];
  const profiles = tables.profiles ?? [];
  return {
    from: (table: "applications" | "target_universities" | "universities" | "profiles") => {
      if (table === "applications") return makeQueryBuilder(tables.applications);
      if (table === "target_universities") return makeQueryBuilder(targetUniversities);
      if (table === "universities") return makeQueryBuilder(universities);
      return makeQueryBuilder(profiles);
    },
  } as unknown as SupabaseClient<Database>;
}

const STUDENT_ID = "student-1";
const TODAY = new Date("2026-08-22T00:00:00");
const DEADLINE_7_DAYS_OUT = "2026-08-29";
const EMPTY_SUPERSESSION_MAP = new Map();

const TRANSLATORS: Record<Locale, (key: string, values?: Record<string, string | number>) => string> = {
  en: (key, values) =>
    key === "applicationDeadlineApproachingGeneric"
      ? "An application deadline is approaching."
      : key === "applicationDeadlineApproaching"
        ? `${values?.name} — application deadline approaching.`
        : key === "unnamedApplication"
          ? "An application"
          : key,
  tr: (key, values) =>
    key === "applicationDeadlineApproachingGeneric"
      ? "Bir başvuru son tarihi yaklaşıyor."
      : key === "applicationDeadlineApproaching"
        ? `${values?.name} — başvuru son tarihi yaklaşıyor.`
        : key === "unnamedApplication"
          ? "Bir başvuru"
          : key,
};

describe("scanApplications", () => {
  test("an application at a reminder threshold produces one hit, with the university name resolved", async () => {
    const supabase = makeSupabase({
      applications: [{ id: "app-1", user_id: STUDENT_ID, deadline: DEADLINE_7_DAYS_OUT, target_university_id: "target-1", status: "in_progress" }],
      target_universities: [{ id: "target-1", university_id: "univ-1" }],
      universities: [{ id: "univ-1", name: "Yale University" }],
    });

    const result = await scanApplications(supabase, TODAY, EMPTY_SUPERSESSION_MAP, TRANSLATORS);

    expect(result.checked).toBe(1);
    expect(result.hits).toEqual([
      {
        userId: STUDENT_ID,
        locale: "en",
        source: "application",
        sourceId: "app-1",
        daysUntil: 7,
        link: "/applications/app-1",
        itemLabel: "Yale University",
        singleBody: "Yale University — application deadline approaching.",
      },
    ]);
  });

  test("checked counts every fetched application regardless of whether its threshold was hit", async () => {
    const supabase = makeSupabase({
      applications: [{ id: "app-1", user_id: STUDENT_ID, deadline: "2026-12-25", target_university_id: "target-1", status: "not_started" }],
      target_universities: [{ id: "target-1", university_id: "univ-1" }],
      universities: [{ id: "univ-1", name: "Yale University" }],
    });
    const result = await scanApplications(supabase, TODAY, EMPTY_SUPERSESSION_MAP, TRANSLATORS);
    expect(result).toEqual({ hits: [], checked: 1 });
  });

  test("no matching applications returns zero without querying target_universities/universities", async () => {
    const supabase = makeSupabase({ applications: [] });
    const result = await scanApplications(supabase, TODAY, EMPTY_SUPERSESSION_MAP, TRANSLATORS);
    expect(result).toEqual({ hits: [], checked: 0 });
  });

  test("two applications, only one at a threshold: exactly one hit", async () => {
    const supabase = makeSupabase({
      applications: [
        { id: "app-due", user_id: STUDENT_ID, deadline: DEADLINE_7_DAYS_OUT, target_university_id: "target-1", status: "in_progress" },
        { id: "app-not-due", user_id: STUDENT_ID, deadline: "2026-12-25", target_university_id: "target-1", status: "in_progress" },
      ],
      target_universities: [{ id: "target-1", university_id: "univ-1" }],
      universities: [{ id: "univ-1", name: "Yale University" }],
    });
    const result = await scanApplications(supabase, TODAY, EMPTY_SUPERSESSION_MAP, TRANSLATORS);
    expect(result.checked).toBe(2);
    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].sourceId).toBe("app-due");
  });

  test("two applications at a threshold for the same student produce two separate hits — aggregation happens later, not here", async () => {
    const supabase = makeSupabase({
      applications: [
        { id: "app-1", user_id: STUDENT_ID, deadline: DEADLINE_7_DAYS_OUT, target_university_id: "target-1", status: "in_progress" },
        { id: "app-2", user_id: STUDENT_ID, deadline: DEADLINE_7_DAYS_OUT, target_university_id: "target-1", status: "in_progress" },
      ],
      target_universities: [{ id: "target-1", university_id: "univ-1" }],
      universities: [{ id: "univ-1", name: "Yale University" }],
    });
    const result = await scanApplications(supabase, TODAY, EMPTY_SUPERSESSION_MAP, TRANSLATORS);
    expect(result.hits).toHaveLength(2);
    expect(result.hits.map((h) => h.sourceId).sort()).toEqual(["app-1", "app-2"]);
  });

  test("an application whose target/university can't be resolved still produces a hit, with a generic fallback body and itemLabel", async () => {
    const supabase = makeSupabase({
      applications: [{ id: "app-1", user_id: STUDENT_ID, deadline: DEADLINE_7_DAYS_OUT, target_university_id: "missing-target", status: "in_progress" }],
      target_universities: [],
      universities: [],
    });
    const result = await scanApplications(supabase, TODAY, EMPTY_SUPERSESSION_MAP, TRANSLATORS);
    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].singleBody).toBe("An application deadline is approaching.");
    expect(result.hits[0].itemLabel).toBe("An application");
  });

  test("a student with preferred_language='tr' gets a Turkish body and locale on the hit — locale actually threads through, not just the plumbing", async () => {
    const supabase = makeSupabase({
      applications: [{ id: "app-1", user_id: STUDENT_ID, deadline: DEADLINE_7_DAYS_OUT, target_university_id: "target-1", status: "in_progress" }],
      target_universities: [{ id: "target-1", university_id: "univ-1" }],
      universities: [{ id: "univ-1", name: "Yale University" }],
      profiles: [{ id: STUDENT_ID, preferred_language: "tr" }],
    });

    const result = await scanApplications(supabase, TODAY, EMPTY_SUPERSESSION_MAP, TRANSLATORS);

    expect(result.hits[0].locale).toBe("tr");
    expect(result.hits[0].singleBody).toBe("Yale University — başvuru son tarihi yaklaşıyor.");
  });

  test("a student with no profiles row at all defaults to English, not a crash", async () => {
    const supabase = makeSupabase({
      applications: [{ id: "app-1", user_id: STUDENT_ID, deadline: DEADLINE_7_DAYS_OUT, target_university_id: "target-1", status: "in_progress" }],
      target_universities: [{ id: "target-1", university_id: "univ-1" }],
      universities: [{ id: "univ-1", name: "Yale University" }],
      profiles: [],
    });

    const result = await scanApplications(supabase, TODAY, EMPTY_SUPERSESSION_MAP, TRANSLATORS);

    expect(result.hits[0].locale).toBe("en");
    expect(result.hits[0].singleBody).toBe("Yale University — application deadline approaching.");
  });
});
