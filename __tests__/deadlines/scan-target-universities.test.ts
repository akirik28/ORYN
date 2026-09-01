import { describe, expect, test } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Locale } from "@/lib/i18n/config";

/**
 * scanTargetUniversityDeadlines feeds the deadline-reminder job's target-university source
 * (Phase 24; see lib/deadlines/scan.ts's own scanDeadlines doc comment for why this is NOT
 * Phase 30 Job B). Isolated the same way its siblings are: mocks only `target_universities`,
 * `university_deadlines`, `universities`, and `profiles`. `canonicalUniversityId` is
 * exercised with a real, empty `SupersessionMap` rather than mocked — see
 * scan-applications.test.ts's header for why that's safe and representative.
 *
 * This package changed what the function DOES with a crossed threshold (returns a
 * DeadlineHit instead of calling createNotification directly) without changing the
 * program/verification-state eligibility logic itself — see scan-applications.test.ts's
 * header for the full "one file, one concern" split this reflects.
 *
 * `TRANSLATORS` reproduces messages/en.json and messages/tr.json's real notification
 * strings for this source's body shape.
 */

import { scanTargetUniversityDeadlines } from "@/lib/deadlines/scan";

type TargetUniversityRow = { id: string; user_id: string; university_id: string; program_id: string | null; status: string };
type UniversityDeadlineRow = {
  id: string;
  university_id: string;
  program_id: string | null;
  deadline_type: string;
  deadline_date: string | null;
  verification_state: string;
};
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

function makeSupabase(tables: {
  target_universities: TargetUniversityRow[];
  university_deadlines?: UniversityDeadlineRow[];
  universities?: UniversityRow[];
  profiles?: ProfileRow[];
}) {
  const universityDeadlines = tables.university_deadlines ?? [];
  const universities = tables.universities ?? [];
  const profiles = tables.profiles ?? [];
  return {
    from: (table: "target_universities" | "university_deadlines" | "universities" | "profiles") => {
      if (table === "target_universities") return makeQueryBuilder(tables.target_universities);
      if (table === "university_deadlines") return makeQueryBuilder(universityDeadlines);
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
    key === "universityDeadlineApproaching"
      ? `${values?.name} — ${values?.detail} deadline approaching.`
      : key === "unnamedTargetUniversity"
        ? "A target university"
        : key,
  tr: (key, values) =>
    key === "universityDeadlineApproaching"
      ? `${values?.name} — ${values?.detail} son tarihi yaklaşıyor.`
      : key === "unnamedTargetUniversity"
        ? "Bir hedef üniversite"
        : key,
};

describe("scanTargetUniversityDeadlines", () => {
  test("a university-level deadline (program_id null) produces a hit for any target of that university", async () => {
    const supabase = makeSupabase({
      target_universities: [{ id: "t1", user_id: STUDENT_ID, university_id: "univ-1", program_id: "some-program", status: "target" }],
      university_deadlines: [{ id: "ud-1", university_id: "univ-1", program_id: null, deadline_type: "regular_decision", deadline_date: DEADLINE_7_DAYS_OUT, verification_state: "VERIFIED_CURRENT" }],
      universities: [{ id: "univ-1", name: "Yale University" }],
    });

    const result = await scanTargetUniversityDeadlines(supabase, TODAY, EMPTY_SUPERSESSION_MAP, TRANSLATORS);

    expect(result.checked).toBe(1);
    expect(result.hits).toEqual([
      {
        userId: STUDENT_ID,
        locale: "en",
        source: "university_deadline",
        sourceId: "ud-1",
        daysUntil: 7,
        link: "/universities/univ-1",
        itemLabel: "Yale University — regular_decision",
        singleBody: "Yale University — regular_decision deadline approaching.",
      },
    ]);
  });

  test("a program-specific deadline only applies to a target that picked that exact program", async () => {
    const supabase = makeSupabase({
      target_universities: [{ id: "t1", user_id: STUDENT_ID, university_id: "univ-1", program_id: "econ-ba", status: "target" }],
      university_deadlines: [{ id: "ud-1", university_id: "univ-1", program_id: "econ-ba", deadline_type: "program_specific", deadline_date: DEADLINE_7_DAYS_OUT, verification_state: "VERIFIED_CURRENT" }],
      universities: [{ id: "univ-1", name: "Yale University" }],
    });
    const result = await scanTargetUniversityDeadlines(supabase, TODAY, EMPTY_SUPERSESSION_MAP, TRANSLATORS);
    expect(result.checked).toBe(1);
    expect(result.hits).toHaveLength(1);
  });

  test("a program-specific deadline for a DIFFERENT program than the one targeted does not apply", async () => {
    const supabase = makeSupabase({
      target_universities: [{ id: "t1", user_id: STUDENT_ID, university_id: "univ-1", program_id: "econ-ba", status: "target" }],
      university_deadlines: [{ id: "ud-1", university_id: "univ-1", program_id: "physics-ba", deadline_type: "program_specific", deadline_date: DEADLINE_7_DAYS_OUT, verification_state: "VERIFIED_CURRENT" }],
      universities: [{ id: "univ-1", name: "Yale University" }],
    });
    const result = await scanTargetUniversityDeadlines(supabase, TODAY, EMPTY_SUPERSESSION_MAP, TRANSLATORS);
    expect(result).toEqual({ hits: [], checked: 0 });
  });

  for (const nonActionableState of ["VERIFIED_HISTORICAL", "CONFLICTING_EVIDENCE", "NEEDS_REVIEW", "CURRENT_CYCLE_NOT_PUBLISHED"]) {
    test(`a deadline with verification_state='${nonActionableState}' never produces a hit, even at a reminder threshold`, async () => {
      const supabase = makeSupabase({
        target_universities: [{ id: "t1", user_id: STUDENT_ID, university_id: "univ-1", program_id: null, status: "target" }],
        university_deadlines: [{ id: "ud-1", university_id: "univ-1", program_id: null, deadline_type: "regular_decision", deadline_date: DEADLINE_7_DAYS_OUT, verification_state: nonActionableState }],
        universities: [{ id: "univ-1", name: "Yale University" }],
      });
      const result = await scanTargetUniversityDeadlines(supabase, TODAY, EMPTY_SUPERSESSION_MAP, TRANSLATORS);
      expect(result).toEqual({ hits: [], checked: 0 });
    });
  }

  test("verification_state='unverified' still produces a hit — only the four named states are excluded, not merely-unconfirmed ones", async () => {
    const supabase = makeSupabase({
      target_universities: [{ id: "t1", user_id: STUDENT_ID, university_id: "univ-1", program_id: null, status: "target" }],
      university_deadlines: [{ id: "ud-1", university_id: "univ-1", program_id: null, deadline_type: "regular_decision", deadline_date: DEADLINE_7_DAYS_OUT, verification_state: "unverified" }],
      universities: [{ id: "univ-1", name: "Yale University" }],
    });
    const result = await scanTargetUniversityDeadlines(supabase, TODAY, EMPTY_SUPERSESSION_MAP, TRANSLATORS);
    expect(result.checked).toBe(1);
    expect(result.hits).toHaveLength(1);
  });

  test("a target with two relevant deadlines (university-level + its own program) produces two separate hits", async () => {
    const supabase = makeSupabase({
      target_universities: [{ id: "t1", user_id: STUDENT_ID, university_id: "univ-1", program_id: "econ-ba", status: "target" }],
      university_deadlines: [
        { id: "ud-1", university_id: "univ-1", program_id: null, deadline_type: "regular_decision", deadline_date: DEADLINE_7_DAYS_OUT, verification_state: "VERIFIED_CURRENT" },
        { id: "ud-2", university_id: "univ-1", program_id: "econ-ba", deadline_type: "supplemental_essay", deadline_date: DEADLINE_7_DAYS_OUT, verification_state: "VERIFIED_CURRENT" },
      ],
      universities: [{ id: "univ-1", name: "Yale University" }],
    });
    const result = await scanTargetUniversityDeadlines(supabase, TODAY, EMPTY_SUPERSESSION_MAP, TRANSLATORS);
    expect(result.checked).toBe(2);
    expect(result.hits.map((h) => h.sourceId).sort()).toEqual(["ud-1", "ud-2"]);
  });

  test("only exploring/target/applying statuses are scanned — an accepted/withdrawn target is not", async () => {
    const supabase = makeSupabase({
      target_universities: [{ id: "t1", user_id: STUDENT_ID, university_id: "univ-1", program_id: null, status: "accepted" }],
      university_deadlines: [{ id: "ud-1", university_id: "univ-1", program_id: null, deadline_type: "regular_decision", deadline_date: DEADLINE_7_DAYS_OUT, verification_state: "VERIFIED_CURRENT" }],
      universities: [{ id: "univ-1", name: "Yale University" }],
    });
    const result = await scanTargetUniversityDeadlines(supabase, TODAY, EMPTY_SUPERSESSION_MAP, TRANSLATORS);
    expect(result).toEqual({ hits: [], checked: 0 });
  });

  test("no active targets returns zero without querying university_deadlines", async () => {
    const supabase = makeSupabase({ target_universities: [] });
    const result = await scanTargetUniversityDeadlines(supabase, TODAY, EMPTY_SUPERSESSION_MAP, TRANSLATORS);
    expect(result).toEqual({ hits: [], checked: 0 });
  });

  test("a university that can't be resolved by name falls back to a translated placeholder, not raw English inside a Turkish sentence", async () => {
    const supabase = makeSupabase({
      target_universities: [{ id: "t1", user_id: STUDENT_ID, university_id: "univ-missing", program_id: null, status: "target" }],
      university_deadlines: [{ id: "ud-1", university_id: "univ-missing", program_id: null, deadline_type: "regular_decision", deadline_date: DEADLINE_7_DAYS_OUT, verification_state: "VERIFIED_CURRENT" }],
      universities: [],
      profiles: [{ id: STUDENT_ID, preferred_language: "tr" }],
    });
    const result = await scanTargetUniversityDeadlines(supabase, TODAY, EMPTY_SUPERSESSION_MAP, TRANSLATORS);
    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].singleBody).toBe("Bir hedef üniversite — regular_decision son tarihi yaklaşıyor.");
    expect(result.hits[0].itemLabel).toBe("Bir hedef üniversite — regular_decision");
  });
});
