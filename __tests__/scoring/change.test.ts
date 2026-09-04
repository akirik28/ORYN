import { describe, expect, test } from "vitest";
import { buildProfileChange, describeProfileChange, describeProfileChangeForParent, NO_PROFILE_CHANGE } from "@/lib/scoring/change";
import type { ProfileDimension } from "@/types/database";

const row = (dimension: ProfileDimension, score: number) => ({ dimension, score });

describe("buildProfileChange", () => {
  test("splits movement by direction, largest first", () => {
    const change = buildProfileChange(
      [row("research", 50), row("leadership", 40), row("academics", 80), row("awards_distinction", 30)],
      { research: 42, leadership: 55, academics: 80, awards_distinction: 12 },
    );
    expect(change.improved.map((c) => c.dimension)).toEqual(["awards_distinction", "research"]);
    expect(change.declined.map((c) => c.dimension)).toEqual(["leadership"]);
    expect(change.steady).toBe(1);
  });

  // "No previous snapshot" and "nothing moved" look identical if you only count deltas,
  // and they mean opposite things to a student.
  test("no baseline means no history, not a flat month", () => {
    const change = buildProfileChange([row("research", 50)], null);
    expect(change).toEqual(NO_PROFILE_CHANGE);
    expect(change.hasHistory).toBe(false);
    expect(describeProfileChange(change)).toBeNull();
  });

  test("a dimension absent from the baseline is skipped rather than counted as steady", () => {
    const change = buildProfileChange([row("research", 50), row("entrepreneurship", 20)], { research: 50 });
    expect(change.steady).toBe(1);
    expect(change.improved).toEqual([]);
    expect(change.declined).toEqual([]);
  });
});

describe("describeProfileChange", () => {
  test("names the dimension that moved most, and counts the rest", () => {
    const sentence = describeProfileChange(
      buildProfileChange([row("research", 50), row("leadership", 60)], { research: 42, leadership: 58 }),
    );
    expect(sentence).toContain("Research");
    expect(sentence).toContain("1 other area");
  });

  test("a flat month says so instead of going silent", () => {
    const sentence = describeProfileChange(buildProfileChange([row("research", 50)], { research: 50 }));
    expect(sentence).toBe("Your profile has held steady since your last review.");
  });

  test("a decline is reported rather than hidden", () => {
    const sentence = describeProfileChange(buildProfileChange([row("research", 30)], { research: 42 }));
    expect(sentence).toContain("Nothing moved forward");
    expect(sentence).toContain("research");
  });

  // The whole point of the replacement: no aggregate, no bare index.
  test("never reports an overall figure", () => {
    for (const change of [
      buildProfileChange([row("research", 50), row("leadership", 61)], { research: 42, leadership: 58 }),
      buildProfileChange([row("research", 50)], { research: 50 }),
      buildProfileChange([row("research", 30)], { research: 42 }),
    ]) {
      const sentence = describeProfileChange(change)!;
      expect(sentence.toLowerCase()).not.toContain("career profile");
      expect(sentence).not.toMatch(/\/100/);
      expect(sentence).not.toMatch(/\boverall\b/i);
    }
  });
});

describe("describeProfileChange — locale: tr", () => {
  test("a single improvement, Turkish", () => {
    const change = buildProfileChange([row("research", 55)], { research: 42 });
    expect(describeProfileChange(change, "tr")).toBe("Son incelemenden bu yana en çok Araştırma alanı ilerledi.");
  });

  test("an improvement plus others uses a plain count, no English-style pluralization", () => {
    const change = buildProfileChange(
      [row("research", 55), row("leadership", 50), row("academics", 90)],
      { research: 42, leadership: 40, academics: 85 },
    );
    const sentence = describeProfileChange(change, "tr")!;
    expect(sentence).toContain("2 alan daha ilerledi.");
    expect(sentence).not.toMatch(/alanlar/); // never pluralized with a suffix
  });

  test("a decline is reported rather than hidden, Turkish", () => {
    const sentence = describeProfileChange(buildProfileChange([row("research", 30)], { research: 42 }), "tr");
    expect(sentence).toContain("hiçbir alan ilerlemedi");
    expect(sentence).toContain("Araştırma");
  });

  test("steady, Turkish", () => {
    const change = buildProfileChange([row("research", 42)], { research: 42 });
    expect(describeProfileChange(change, "tr")).toBe("Profilin son incelemenden bu yana sabit kaldı.");
  });

  test("omitting locale is identical to passing 'en' explicitly (default-locale backward compatibility)", () => {
    const change = buildProfileChange([row("research", 55)], { research: 42 });
    expect(describeProfileChange(change)).toBe(describeProfileChange(change, "en"));
  });
});

/**
 * Turkish voice pass (2026-09-04, docs/veli-hesabi-spec-2026-09-04.md) — describeProfileChange
 * itself is correct and unchanged (it addresses the STUDENT, "sen", about their own profile);
 * this is the parent-reading sibling lib/digest/parent-commentary.ts's no-AI fallback needs,
 * found calling describeProfileChange directly and sending a student-voiced "since YOUR last
 * review" sentence to a parent who had no review of their own. Same selection logic (same
 * fixtures work for both, reused below), genuinely different copy: third person, names the
 * student, never says "you" in any form/register.
 */
describe("describeProfileChangeForParent", () => {
  test("names the dimension that moved most and the student, in third person", () => {
    const sentence = describeProfileChangeForParent(
      buildProfileChange([row("research", 50), row("leadership", 60)], { research: 42, leadership: 58 }),
      "Ada",
    );
    expect(sentence).toContain("Research");
    expect(sentence).toContain("Ada");
    expect(sentence).toContain("1 other area");
    expect(sentence!.toLowerCase()).not.toMatch(/\byour\b|\byou\b/);
  });

  test("a flat period names the student instead of saying 'your profile'", () => {
    const sentence = describeProfileChangeForParent(buildProfileChange([row("research", 50)], { research: 50 }), "Ada");
    expect(sentence).toBe("Ada's profile held steady this week.");
  });

  test("a decline names the student, never 'your'", () => {
    const sentence = describeProfileChangeForParent(buildProfileChange([row("research", 30)], { research: 42 }), "Ada");
    expect(sentence).toContain("Nothing moved forward");
    expect(sentence).toContain("Ada");
    expect(sentence!.toLowerCase()).not.toMatch(/\byour\b|\byou\b/);
  });

  describe("locale: tr", () => {
    test("a single improvement never says 'senin'/'sen' — names the student with 'için' instead", () => {
      const change = buildProfileChange([row("research", 55)], { research: 42 });
      const sentence = describeProfileChangeForParent(change, "Ada", "tr")!;
      expect(sentence).toBe("Ada için bu hafta en çok Araştırma alanı ilerledi.");
      expect(sentence).not.toContain("Son incelemenden"); // the student-voiced original's opener — must not leak here
      expect(sentence).not.toMatch(/\bsen\b|\bsenin\b|-din\b|-din\.|değiştiremezsin|göreceksin/i);
    });

    test("a decline names the student via 'için', not 'senin'", () => {
      const sentence = describeProfileChangeForParent(buildProfileChange([row("research", 30)], { research: 42 }), "Ada", "tr")!;
      expect(sentence).toContain("Ada için");
      expect(sentence).toContain("Araştırma");
      expect(sentence).not.toContain("Son incelemenden");
    });

    test("steady period names the student, not 'Profilin' (your profile)", () => {
      const change = buildProfileChange([row("research", 42)], { research: 42 });
      expect(describeProfileChangeForParent(change, "Ada", "tr")).toBe("Ada için profil bu hafta sabit kaldı.");
    });

    /** The actual bug found live: an arbitrary, dynamically-supplied name must never be
     * possessive-suffixed (vowel harmony needs the name's real last vowel, which this
     * function cannot know at compile time) — "için" is why this is safe regardless of what
     * the name is. Names picked to span different final-vowel classes a hardcoded suffix
     * would get wrong for at least one of them. */
    test.each(["Ada", "Deniz", "Kaan", "Ömer", "Gül", "Utku"])("never suffixes the name '%s' with a possessive", (name) => {
      const change = buildProfileChange([row("research", 55)], { research: 42 });
      const sentence = describeProfileChangeForParent(change, name, "tr")!;
      expect(sentence.startsWith(`${name} için`)).toBe(true);
    });
  });

  /** B3b, 2026-09-04: the weekly-to-monthly conversion parameterized this function's own
   * period noun rather than duplicating the whole function — proven here directly, both
   * directions (an explicit "week" reproduces the exact original strings above unchanged, an
   * explicit "month" says "ay"/"month" in the same three positions), plus the default with no
   * fourth argument at all still means "week" so every un-migrated caller (and every test
   * above this one) keeps its exact original meaning. */
  describe("period parameter (week vs. month)", () => {
    test("period: 'month' says 'ay', not 'hafta', in a Turkish improvement sentence", () => {
      const change = buildProfileChange([row("research", 55)], { research: 42 });
      const sentence = describeProfileChangeForParent(change, "Ada", "tr", "month")!;
      expect(sentence).toBe("Ada için bu ay en çok Araştırma alanı ilerledi.");
      expect(sentence).not.toContain("hafta");
    });

    test("period: 'month' says 'this month', not 'this week', in an English steady sentence", () => {
      const change = buildProfileChange([row("research", 42)], { research: 42 });
      const sentence = describeProfileChangeForParent(change, "Ada", "en", "month");
      expect(sentence).toBe("Ada's profile held steady this month.");
    });

    test("period: 'week' (explicit) is byte-identical to the no-argument default", () => {
      const change = buildProfileChange([row("research", 30)], { research: 42 });
      expect(describeProfileChangeForParent(change, "Ada", "en", "week")).toBe(describeProfileChangeForParent(change, "Ada", "en"));
    });
  });
});
