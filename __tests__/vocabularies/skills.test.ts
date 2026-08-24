import { describe, expect, test } from "vitest";
import {
  SKILL_TAXONOMY,
  SKILL_NAME_SUGGESTIONS,
  SKILL_GROUPS,
  canonicalSkillName,
  resolveSkill,
  searchSkills,
} from "@/lib/vocabularies/skills";
import { LANGUAGE_PROFICIENCY_LEVELS, languageProficiencyLabel } from "@/lib/vocabularies/languages";

describe("skill taxonomy shape", () => {
  test("covers the breadth a student profile needs, without becoming a dump", () => {
    // Big enough that an economics or design student finds themselves; small enough that
    // the list isn't full of near-synonyms competing for the same concept.
    expect(SKILL_TAXONOMY.length).toBeGreaterThan(150);
    expect(SKILL_TAXONOMY.length).toBeLessThan(400);
    expect(SKILL_GROUPS.length).toBeGreaterThanOrEqual(15);
  });

  test("canonical names are unique", () => {
    expect(new Set(SKILL_NAME_SUGGESTIONS).size).toBe(SKILL_NAME_SUGGESTIONS.length);
  });

  // An alias that collides with a canonical name would make one skill unreachable.
  test("no alias shadows a different skill's canonical name", () => {
    const canonical = new Set(SKILL_TAXONOMY.map((s) => s.name.toLowerCase()));
    for (const skill of SKILL_TAXONOMY) {
      for (const alias of skill.aliases ?? []) {
        if (canonical.has(alias.toLowerCase())) {
          expect(alias.toLowerCase()).toBe(skill.name.toLowerCase());
        }
      }
    }
  });

  test("every skill maps to a real skills.category value", () => {
    const allowed = new Set(["technical", "creative", "analytical", "communication", "leadership", "other"]);
    for (const skill of SKILL_TAXONOMY) expect(allowed.has(skill.category)).toBe(true);
  });

  // The gap that motivated the rewrite: the old 46-entry list was programming and music.
  test("the non-technical groups are genuinely populated", () => {
    for (const group of ["Business & economics", "Communication & debate", "Community & social impact", "Writing"] as const) {
      expect(SKILL_TAXONOMY.filter((s) => s.group === group).length).toBeGreaterThanOrEqual(6);
    }
  });
});

describe("alias resolution", () => {
  test("common shorthand resolves to the canonical skill", () => {
    expect(resolveSkill("ML")?.name).toBe("Machine Learning");
    expect(resolveSkill("Photoshop")?.name).toBe("Adobe Photoshop");
    expect(resolveSkill("Competition Math")?.name).toBe("Mathematical Olympiad");
    expect(resolveSkill("MUN")?.name).toBe("Model United Nations");
  });

  test("matching ignores case, spacing and separators", () => {
    expect(resolveSkill("  machine   learning ")?.name).toBe("Machine Learning");
    expect(resolveSkill("html/css")?.name).toBe("HTML & CSS");
    expect(resolveSkill("ui-ux design")?.name).toBe("UI/UX Design");
  });

  // Free text is the point of the fallback: an unknown skill must survive as typed.
  test("an unknown skill is kept as written rather than guessed at", () => {
    expect(resolveSkill("Falconry")).toBeNull();
    expect(canonicalSkillName("  Falconry  ")).toBe("Falconry");
  });

  test("a known skill is normalised to its canonical spelling on save", () => {
    expect(canonicalSkillName("ml")).toBe("Machine Learning");
    expect(canonicalSkillName("Data Analytics")).toBe("Data Analysis");
  });
});

describe("skill search", () => {
  test("finds by canonical name", () => {
    expect(searchSkills("public speak").map((s) => s.name)).toContain("Public Speaking");
  });

  test("finds by alias", () => {
    expect(searchSkills("golang").map((s) => s.name)).toContain("Go");
    expect(searchSkills("premiere").map((s) => s.name)).toContain("Video Editing");
  });

  test("a canonical skill appears at most once even when several aliases match", () => {
    const names = searchSkills("machine").map((s) => s.name);
    expect(names.filter((n) => n === "Machine Learning")).toHaveLength(1);
  });

  test("prefix matches rank above mid-string matches", () => {
    const [first] = searchSkills("data");
    expect(first.name.toLowerCase().startsWith("data")).toBe(true);
  });

  test("respects the limit and returns something for an empty query", () => {
    expect(searchSkills("design", 3)).toHaveLength(3);
    expect(searchSkills("").length).toBeGreaterThan(0);
  });
});

describe("language proficiency", () => {
  test("CEFR plus the two states CEFR does not cover", () => {
    const values = LANGUAGE_PROFICIENCY_LEVELS.map((l) => l.value);
    expect(values).toEqual(["native", "bilingual", "c2", "c1", "b2", "b1", "a2", "a1"]);
  });

  test("every level carries a hint, so a student picks the right rung", () => {
    for (const level of LANGUAGE_PROFICIENCY_LEVELS) expect(level.hint.length).toBeGreaterThan(10);
  });

  test("labels resolve, and a legacy free-text value survives rather than vanishing", () => {
    expect(languageProficiencyLabel("c1")).toBe("C1 — Advanced");
    expect(languageProficiencyLabel("native")).toBe("Native");
    // Rows predating the closed set must still render something.
    expect(languageProficiencyLabel("Advanced-ish")).toBe("Advanced-ish");
    expect(languageProficiencyLabel(null)).toBeNull();
  });
});
