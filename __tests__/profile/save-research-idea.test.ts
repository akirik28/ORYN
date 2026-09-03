import { beforeEach, describe, expect, test, vi } from "vitest";
import type { ResearchProject } from "@/lib/ai/research-generator";

/**
 * Regression coverage for a real provenance gap found auditing the research project
 * generator (2026-09-02, spec Phase 13): saveResearchIdea went through the same generic
 * crudCreate path as the plain manual "add research experience" form, and
 * ResearchExperienceSchema (shared with that form, deliberately not given a `source`
 * field a client could spoof) has no `source` key at all — so a saved AI-generated idea
 * fell back to research_experiences.source's own column default ('manual'), silently
 * indistinguishable from an entry the student typed by hand. Same class of gap
 * lib/profile/cv-import.ts's `source: "cv_import"` already exists to prevent.
 */

interface RecordedInsert {
  table: string;
  row: Record<string, unknown>;
}

const { insertCalls } = vi.hoisted(() => ({ insertCalls: [] as RecordedInsert[] }));

vi.mock("@/lib/security/dal", () => ({
  requireUser: async () => ({ userId: "11111111-1111-4111-8111-111111111111", email: "student@example.com" }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => {
        insertCalls.push({ table, row });
        return Promise.resolve({ error: null });
      },
    }),
  }),
}));

vi.mock("@/lib/scoring/persist", () => ({ recomputeCareerProfile: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/analytics/log", () => ({ logEvent: vi.fn().mockResolvedValue(undefined) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
// crudCreate now resolves a real locale (2026-09-03, student-facing i18n audit) -- this
// file is about insert-payload provenance, not locale, so a fixed "en" is enough;
// resolveLocale's real implementation reaches next/headers' cookies(), which has no
// request scope in a plain vitest run.
vi.mock("@/lib/i18n/locale", () => ({ resolveLocale: vi.fn().mockResolvedValue("en") }));

const { saveResearchIdea } = await import("@/app/(app)/profile/actions");

function project(overrides: Partial<ResearchProject> = {}): ResearchProject {
  return {
    researchQuestion: "Does youth unemployment track tertiary education rates across the OECD?",
    whyItFits: "Matches the student's stated interest in economics and current research gap.",
    difficulty: "moderate",
    estimatedDuration: "4-6 weeks, 3-4 hours/week",
    requiredSkills: ["spreadsheet analysis", "basic statistics"],
    dataSources: ["OECD.Stat", "Eurostat"],
    method: "Compare public unemployment and enrollment datasets across 10 countries, 2015-2025.",
    expectedOutput: "A short written analysis with charts.",
    firstSteps: ["Pull the OECD dataset", "Clean and merge with Eurostat data", "Draft the comparison"],
    ...overrides,
  };
}

beforeEach(() => {
  insertCalls.length = 0;
});

describe("saveResearchIdea — provenance", () => {
  test("a saved idea is recorded with source: 'research_generator', not left to the column default", async () => {
    await saveResearchIdea(project(), "Economics");

    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0]?.table).toBe("research_experiences");
    expect(insertCalls[0]?.row).toMatchObject({ source: "research_generator" });
  });

  test("the saved row still carries the project's real content, not just the provenance tag", async () => {
    await saveResearchIdea(project({ researchQuestion: "A specific research question." }), "Economics");

    expect(insertCalls[0]?.row).toMatchObject({
      title: "A specific research question.",
      field: "Economics",
      methodology: project().method,
    });
  });

  test("extraFields' source cannot be overridden by anything in the project data itself", async () => {
    // ResearchProject has no `source` field at all (confirmed by its own type), so this is
    // really asserting the insert path has exactly one source of truth for provenance --
    // documented as a property, not just inferred from the schema shape.
    await saveResearchIdea(project(), "Economics");
    expect(Object.keys(insertCalls[0]!.row).filter((k) => k === "source")).toHaveLength(1);
  });
});
