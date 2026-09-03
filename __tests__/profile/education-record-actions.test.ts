import { describe, expect, test, vi, beforeEach } from "vitest";

/**
 * createEducationRecord / updateEducationRecord (app/(app)/profile/actions.ts) --
 * stripCurriculumOtherTextIfNotLive's actual effect on the write payload, migration 0109
 * (proposed, not yet applied). The thing this exists to prevent: an unstripped
 * curriculum_other_text reaching a database where the column doesn't exist yet fails the
 * *entire* save with PGRST204 -- not just silently dropping the new field, breaking every
 * education-record edit. These tests pin that the key is genuinely absent from the payload
 * when not live (not merely null -- Postgres validates the column list before touching any
 * row, so a present-but-null key still fails the same way), and genuinely present when live.
 */

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/security/dal", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/scoring/persist", () => ({ recomputeCareerProfile: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/analytics/log", () => ({ logEvent: vi.fn().mockResolvedValue(undefined) }));
// crudCreate/crudUpdate now resolve a real locale (2026-09-03, student-facing i18n audit) --
// this file's own tests are about the curriculum_other_text payload shape, not locale, so a
// fixed "en" is enough; resolveLocale's real implementation reaches next/headers' cookies(),
// which has no request scope in a plain vitest run.
vi.mock("@/lib/i18n/locale", () => ({ resolveLocale: vi.fn().mockResolvedValue("en") }));

const { curriculumOtherTextLiveMock, insertMock, updateSelectMock } = vi.hoisted(() => ({
  curriculumOtherTextLiveMock: vi.fn(),
  insertMock: vi.fn(),
  updateSelectMock: vi.fn(),
}));

vi.mock("@/lib/profile/curriculum-other-text", () => ({
  isEducationRecordsCurriculumOtherTextLive: curriculumOtherTextLiveMock,
  CURRICULUM_OTHER_TEXT_MAX_LENGTH: 100,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => {
      if (table !== "education_records") throw new Error(`education-record-actions.test.ts: unexpected table "${table}"`);
      return {
        insert: (payload: Record<string, unknown>) => insertMock(payload),
        update: (payload: Record<string, unknown>) => ({ eq: () => ({ eq: () => updateSelectMock(payload) }) }),
      };
    },
  }),
}));

import { createEducationRecord, updateEducationRecord } from "@/app/(app)/profile/actions";
import { requireUser } from "@/lib/security/dal";

const BASE_INPUT = {
  school_name: "Alman Lisesi Istanbul",
  school_entity_id: null,
  country: "Turkiye",
  stage: "high_school" as const,
  curriculum: "other" as const,
  curriculum_other_text: "German Abitur (DIA)",
  start_date: null,
  end_date: null,
  is_current: true,
  overall_gpa: null,
  gpa_scale: null,
  notes: null,
};

beforeEach(() => {
  vi.mocked(requireUser).mockResolvedValue({ userId: "student-1" } as never);
  curriculumOtherTextLiveMock.mockReset();
  insertMock.mockReset();
  updateSelectMock.mockReset();
  insertMock.mockResolvedValue({ error: null });
  updateSelectMock.mockResolvedValue({ error: null });
});

describe("createEducationRecord — curriculum_other_text degrade", () => {
  test("column not live -- the key is genuinely absent from the insert payload, not null", async () => {
    curriculumOtherTextLiveMock.mockResolvedValue(false);

    await createEducationRecord(BASE_INPUT);

    const payload = insertMock.mock.calls[0][0];
    expect("curriculum_other_text" in payload).toBe(false);
    // Confirms the rest of the record still saves -- this is a degrade, not a broken save.
    expect(payload.school_name).toBe("Alman Lisesi Istanbul");
  });

  test("column live -- the value the student typed reaches the insert", async () => {
    curriculumOtherTextLiveMock.mockResolvedValue(true);

    await createEducationRecord(BASE_INPUT);

    const payload = insertMock.mock.calls[0][0];
    expect(payload.curriculum_other_text).toBe("German Abitur (DIA)");
  });
});

describe("updateEducationRecord — curriculum_other_text degrade", () => {
  test("column not live -- stripped from the update payload the same way", async () => {
    curriculumOtherTextLiveMock.mockResolvedValue(false);

    await updateEducationRecord("edu-1", BASE_INPUT);

    const payload = updateSelectMock.mock.calls[0][0];
    expect("curriculum_other_text" in payload).toBe(false);
  });

  test("column live -- included in the update payload", async () => {
    curriculumOtherTextLiveMock.mockResolvedValue(true);

    await updateEducationRecord("edu-1", BASE_INPUT);

    const payload = updateSelectMock.mock.calls[0][0];
    expect(payload.curriculum_other_text).toBe("German Abitur (DIA)");
  });
});
