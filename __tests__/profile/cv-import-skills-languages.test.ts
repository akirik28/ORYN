import { describe, test, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * 2026-09-02: skills and languages extracted from a CV were never previously reachable from
 * either review surface or the save path — paid for by the same AI call as everything else,
 * always discarded (flagged during [[project_oryn_cv_review_parity]], built here).
 *
 * The behaviour most worth locking is not the happy path. Unlike the six achievement
 * categories `insertCvImportItems` already handles, skills and languages carry real
 * constraints a bare bulk insert would violate: migration 0034's unique index on
 * `skills(user_id, lower(name))` and the 15-active-skill cap (lib/social/skills.ts) — both
 * enforced here by pre-filtering candidates rather than firing an insert and hoping.
 * `source` (migration 0084) is written and left unapplied like every migration in this
 * repo's history — the graceful-degrade-on-missing-column tests below pin that
 * lib/plan/persist.ts's own weekly_actions.carried_forward pattern (migration 0077) is
 * followed here too.
 */

import { flattenCvSkills, flattenCvLanguages, skillCategoryLabel, insertCvImportSkills, insertCvImportLanguages } from "@/lib/profile/cv-import";
import type { CVExtractionResult } from "@/lib/ai/cv-extraction";

function extraction(overrides: Partial<CVExtractionResult> = {}): CVExtractionResult {
  return {
    education: [],
    activities: [],
    awards: [],
    projects: [],
    research: [],
    workExperience: [],
    skills: [],
    languages: [],
    unclassified: [],
    ...overrides,
  };
}

describe("flattenCvSkills / flattenCvLanguages", () => {
  test("a skill flattens with its model-guessed category and starts included — no confidence signal to default it off", () => {
    const result = extraction({ skills: [{ name: "Python", category: "technical" }] });
    expect(flattenCvSkills(result)).toEqual([{ id: "skill-1", name: "Python", category: "technical", included: true }]);
  });

  test("a language flattens with statedLevel preserved as a hint, but proficiency starts null — nothing is guessed into the real column", () => {
    const result = extraction({ languages: [{ name: "Spanish", statedLevel: "conversational" }] });
    expect(flattenCvLanguages(result)).toEqual([
      { id: "language-1", name: "Spanish", statedLevel: "conversational", proficiency: null, included: true },
    ]);
  });

  test("a language with no stated level flattens with statedLevel null too, not an empty string", () => {
    const result = extraction({ languages: [{ name: "German", statedLevel: null }] });
    expect(flattenCvLanguages(result)[0].statedLevel).toBeNull();
  });
});

describe("skillCategoryLabel", () => {
  test("reuses field-config.ts's own English->Turkish table rather than a second translation", () => {
    expect(skillCategoryLabel("technical", "en")).toBe("Technical");
    expect(skillCategoryLabel("technical", "tr")).toBe("Teknik");
    expect(skillCategoryLabel("leadership", "tr")).toBe("Liderlik");
  });
});

function makeSupabase(existingSkillNames: string[], existingLanguageNames: string[], insertImpl: (table: string, rows: unknown[]) => Promise<{ error: { code?: string; message?: string } | null }>) {
  const insert = vi.fn((rows: unknown[]) => insertImpl(currentTable, rows));
  let currentTable = "";
  const from = vi.fn((table: string) => {
    currentTable = table;
    const names = table === "skills" ? existingSkillNames : existingLanguageNames;
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: names.map((name) => ({ name })), error: null })),
      })),
      insert,
    };
  });
  return { client: { from } as unknown as SupabaseClient<Database>, insert };
}

describe("insertCvImportSkills", () => {
  test("an empty candidate list touches the database for nothing", async () => {
    const { client, insert } = makeSupabase([], [], async () => ({ error: null }));
    const result = await insertCvImportSkills(client, "user-1", []);
    expect(result).toEqual({ inserted: 0, skippedDuplicate: 0, skippedCap: 0 });
    expect(insert).not.toHaveBeenCalled();
  });

  test("a name matching an existing skill (case-insensitive) is skipped as a duplicate, not inserted twice", async () => {
    const { client, insert } = makeSupabase(["Python"], [], async () => ({ error: null }));
    const result = await insertCvImportSkills(client, "user-1", [{ name: "python", category: "technical", proficiency: null }]);
    expect(result).toEqual({ inserted: 0, skippedDuplicate: 1, skippedCap: 0 });
    expect(insert).not.toHaveBeenCalled();
  });

  test("two candidates in the same batch that only differ by case count as one duplicate, not two inserts", async () => {
    const { client, insert } = makeSupabase([], [], async () => ({ error: null }));
    const result = await insertCvImportSkills(client, "user-1", [
      { name: "Public Speaking", category: "communication", proficiency: null },
      { name: "public speaking", category: "communication", proficiency: null },
    ]);
    expect(result).toEqual({ inserted: 1, skippedDuplicate: 1, skippedCap: 0 });
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith([expect.objectContaining({ name: "Public Speaking" })]);
  });

  test("the 15-cap is respected: only the remaining room is inserted, the rest counted as skippedCap", async () => {
    const existing = Array.from({ length: 13 }, (_, i) => `Existing skill ${i}`);
    const { client, insert } = makeSupabase(existing, [], async () => ({ error: null }));
    const candidates = [
      { name: "A", category: "technical" as const, proficiency: null },
      { name: "B", category: "technical" as const, proficiency: null },
      { name: "C", category: "technical" as const, proficiency: null },
    ];
    const result = await insertCvImportSkills(client, "user-1", candidates);
    // 13 existing + room for 2 more = 15
    expect(result).toEqual({ inserted: 2, skippedDuplicate: 0, skippedCap: 1 });
    expect(insert).toHaveBeenCalledWith([expect.objectContaining({ name: "A" }), expect.objectContaining({ name: "B" })]);
  });

  test("already at the 15-cap: every candidate is skipped, nothing inserted", async () => {
    const existing = Array.from({ length: 15 }, (_, i) => `Existing skill ${i}`);
    const { client, insert } = makeSupabase(existing, [], async () => ({ error: null }));
    const result = await insertCvImportSkills(client, "user-1", [{ name: "New", category: "other", proficiency: null }]);
    expect(result).toEqual({ inserted: 0, skippedDuplicate: 0, skippedCap: 1 });
    expect(insert).not.toHaveBeenCalled();
  });

  test("a successful insert writes source: 'cv_import' on the surviving rows", async () => {
    const { client, insert } = makeSupabase([], [], async () => ({ error: null }));
    await insertCvImportSkills(client, "user-1", [{ name: "Chess", category: "analytical", proficiency: "Advanced" }]);
    expect(insert).toHaveBeenCalledWith([
      { user_id: "user-1", name: "Chess", category: "analytical", proficiency: "Advanced", source: "cv_import" },
    ]);
  });

  test("migration 0084 unapplied: a 42703 'source' error degrades to a retry without source, and still reports success", async () => {
    let call = 0;
    const { client, insert } = makeSupabase([], [], async (_table, rows) => {
      call += 1;
      if (call === 1) {
        expect((rows[0] as { source?: string }).source).toBe("cv_import");
        return { error: { code: "42703", message: 'column "source" of relation "skills" does not exist' } };
      }
      expect((rows[0] as { source?: string }).source).toBeUndefined();
      return { error: null };
    });
    const result = await insertCvImportSkills(client, "user-1", [{ name: "Chess", category: "analytical", proficiency: null }]);
    expect(result).toEqual({ inserted: 1, skippedDuplicate: 0, skippedCap: 0 });
    expect(insert).toHaveBeenCalledTimes(2);
  });

  test("a genuine (non-missing-column) DB error is caught and reported as zero inserted, not thrown", async () => {
    const { client } = makeSupabase([], [], async () => ({ error: { code: "23505", message: "duplicate key" } }));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await insertCvImportSkills(client, "user-1", [{ name: "Chess", category: "analytical", proficiency: null }]);
    expect(result).toEqual({ inserted: 0, skippedDuplicate: 0, skippedCap: 0 });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

describe("insertCvImportLanguages", () => {
  test("an empty candidate list touches the database for nothing", async () => {
    const { client, insert } = makeSupabase([], [], async () => ({ error: null }));
    const result = await insertCvImportLanguages(client, "user-1", []);
    expect(result).toEqual({ inserted: 0, skippedDuplicate: 0 });
    expect(insert).not.toHaveBeenCalled();
  });

  test("no cap on languages — every deduped candidate is inserted regardless of existing count", async () => {
    const existing = Array.from({ length: 20 }, (_, i) => `Existing language ${i}`);
    const { client } = makeSupabase([], existing, async () => ({ error: null }));
    const result = await insertCvImportLanguages(client, "user-1", [{ name: "Klingon", proficiency: null }]);
    expect(result).toEqual({ inserted: 1, skippedDuplicate: 0 });
  });

  test("a name matching an existing language (case-insensitive) is skipped as a duplicate", async () => {
    const { client, insert } = makeSupabase([], ["english"], async () => ({ error: null }));
    const result = await insertCvImportLanguages(client, "user-1", [{ name: "English", proficiency: "c1" }]);
    expect(result).toEqual({ inserted: 0, skippedDuplicate: 1 });
    expect(insert).not.toHaveBeenCalled();
  });

  test("a successful insert writes source: 'cv_import'", async () => {
    const { client, insert } = makeSupabase([], [], async () => ({ error: null }));
    await insertCvImportLanguages(client, "user-1", [{ name: "French", proficiency: null }]);
    expect(insert).toHaveBeenCalledWith([{ user_id: "user-1", name: "French", proficiency: null, source: "cv_import" }]);
  });

  test("migration 0084 unapplied: degrades the same way insertCvImportSkills does", async () => {
    let call = 0;
    const { client, insert } = makeSupabase([], [], async (_table, rows) => {
      call += 1;
      if (call === 1) return { error: { code: "42703", message: 'column "source" of relation "languages" does not exist' } };
      expect((rows[0] as { source?: string }).source).toBeUndefined();
      return { error: null };
    });
    const result = await insertCvImportLanguages(client, "user-1", [{ name: "French", proficiency: null }]);
    expect(result).toEqual({ inserted: 1, skippedDuplicate: 0 });
    expect(insert).toHaveBeenCalledTimes(2);
  });
});
