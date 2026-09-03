import { describe, expect, test, vi, beforeEach } from "vitest";

/**
 * isProfilesCurriculumOtherTextLive / isEducationRecordsCurriculumOtherTextLive
 * (lib/profile/curriculum-other-text.ts) — migration 0109, proposed and not yet applied.
 * Two independent checks against two different tables, same `.select(col).limit`... actually
 * `head: true` mechanism as every other column-liveness check this session built
 * (columnExistsLive, lib/supabase/errors.ts) -- `head: true` is the correct, safe choice
 * specifically for a missing-COLUMN check (unlike the missing-TABLE case, where it masks a
 * false-success 204), confirmed by this exact codebase's own reference memory.
 */

const { headMock } = vi.hoisted(() => ({ headMock: vi.fn() }));

function makeAdminForColumn(expectedTable: string, expectedColumn: string) {
  return {
    from: (table: string) => {
      if (table !== expectedTable) throw new Error(`curriculum-other-text.test.ts: unexpected table "${table}", expected "${expectedTable}"`);
      return {
        select: (col: string, opts: { head?: boolean }) => {
          if (col !== expectedColumn || !opts?.head) throw new Error(`curriculum-other-text.test.ts: unexpected select("${col}", ${JSON.stringify(opts)})`);
          return headMock();
        },
      };
    },
  } as never;
}

beforeEach(() => {
  headMock.mockReset();
});

describe("isProfilesCurriculumOtherTextLive", () => {
  test("column genuinely missing (PGRST204) -- reports false", async () => {
    const { isProfilesCurriculumOtherTextLive } = await import("@/lib/profile/curriculum-other-text");
    headMock.mockResolvedValue({ error: { code: "PGRST204", message: "Could not find the 'curriculum_other_text' column of 'profiles' in the schema cache" } });

    expect(await isProfilesCurriculumOtherTextLive(makeAdminForColumn("profiles", "curriculum_other_text"))).toBe(false);
  });

  test("no error -- the column genuinely exists -- reports true", async () => {
    const { isProfilesCurriculumOtherTextLive } = await import("@/lib/profile/curriculum-other-text");
    headMock.mockResolvedValue({ error: null });

    expect(await isProfilesCurriculumOtherTextLive(makeAdminForColumn("profiles", "curriculum_other_text"))).toBe(true);
  });

  test("an indeterminate result (columnExistsLive's null case) collapses to not-live, not to live", async () => {
    const { isProfilesCurriculumOtherTextLive } = await import("@/lib/profile/curriculum-other-text");
    headMock.mockResolvedValue({ error: { code: "PGRST301", message: "JWT expired" } });

    expect(await isProfilesCurriculumOtherTextLive(makeAdminForColumn("profiles", "curriculum_other_text"))).toBe(false);
  });
});

describe("isEducationRecordsCurriculumOtherTextLive", () => {
  test("checks education_records specifically, not profiles -- the two tables are independent", async () => {
    const { isEducationRecordsCurriculumOtherTextLive } = await import("@/lib/profile/curriculum-other-text");
    headMock.mockResolvedValue({ error: null });

    expect(await isEducationRecordsCurriculumOtherTextLive(makeAdminForColumn("education_records", "curriculum_other_text"))).toBe(true);
  });

  test("column missing on education_records -- reports false", async () => {
    const { isEducationRecordsCurriculumOtherTextLive } = await import("@/lib/profile/curriculum-other-text");
    headMock.mockResolvedValue({ error: { code: "PGRST204", message: "Could not find the 'curriculum_other_text' column of 'education_records' in the schema cache" } });

    expect(await isEducationRecordsCurriculumOtherTextLive(makeAdminForColumn("education_records", "curriculum_other_text"))).toBe(false);
  });
});
