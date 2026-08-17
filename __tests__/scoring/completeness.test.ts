import { describe, expect, test } from "vitest";
import { computeCompleteness, getCompletenessChecklist } from "@/lib/scoring/completeness";
import type { CompletenessFacts } from "@/lib/scoring/completeness";

function emptyFacts(): CompletenessFacts {
  return {
    profile: { country: null, school_name: null, graduation_year: null, curriculum: null, headline: null, about: null },
    educationRecords: [],
    courses: [],
    testScores: [],
    activities: [],
    awards: [],
    certifications: [],
    projects: [],
    researchExperiences: [],
    volunteeringExperiences: [],
    workExperiences: [],
    interests: [],
    goals: [],
    targetUniversities: [],
    skillCount: 0,
    featuredCount: 0,
    hasContactInfo: false,
  };
}

describe("computeCompleteness", () => {
  test("is 0 for a completely empty profile", () => {
    expect(computeCompleteness(emptyFacts())).toBe(0);
  });

  test("is different from (not derived from) profile strength — it only measures how much Oryn knows, not how strong it is", () => {
    // A single, very strong leadership activity fills in almost none of the checklist.
    const facts = emptyFacts();
    facts.activities = [
      {
        id: "a1",
        user_id: "u1",
        title: "Founder & President",
        organization: "Model UN",
        organization_entity_id: null,
        category: "club",
        description: null,
        is_leadership_role: true,
        people_led: 50,
        organization_scope: "National",
        opportunity_id: null,
        start_date: "2023-01-01",
        end_date: null,
        ongoing: true,
        hours_per_week: 6,
        weeks_per_year: 30,
        location: null,
        story_notes: null,
        source: "manual",
        evidence_status: "self_reported",
        created_at: "",
        updated_at: "",
      },
    ];
    const result = computeCompleteness(facts);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(50);
  });

  test("is 100 when every checklist section has at least one entry", () => {
    const facts = emptyFacts();
    facts.profile = {
      country: "US",
      school_name: "Lincoln High",
      graduation_year: 2027,
      curriculum: "ap",
      headline: "Aspiring Economist",
      about: "I like building things.",
    };
    facts.educationRecords = [{ id: "e1" } as never];
    facts.courses = [{ id: "c1" } as never];
    facts.activities = [{ id: "a1" } as never, { id: "a2" } as never, { id: "a3" } as never];
    facts.awards = [{ id: "aw1" } as never];
    facts.projects = [{ id: "p1" } as never];
    facts.researchExperiences = [{ id: "r1" } as never];
    facts.goals = [{ id: "g1" } as never];
    facts.interests = [{ id: "i1" } as never];
    facts.targetUniversities = [{ id: "tu1" } as never];
    facts.skillCount = 3;
    facts.featuredCount = 1;
    facts.hasContactInfo = true;
    expect(computeCompleteness(facts)).toBe(100);
  });

  // Professional Profile pack additions (2026-08-16) — each is its own checklist item,
  // independent of the original 10 Digital Twin ones.
  test("headline, About, skills, featured, and contact info each count as their own item", () => {
    const base = computeCompleteness(emptyFacts());

    const withHeadline = emptyFacts();
    withHeadline.profile.headline = "Aspiring Economist";
    expect(computeCompleteness(withHeadline)).toBeGreaterThan(base);

    const withSkillsUnderThreshold = emptyFacts();
    withSkillsUnderThreshold.skillCount = 2;
    expect(computeCompleteness(withSkillsUnderThreshold)).toBe(base); // fewer than 3 doesn't count

    const withSkillsAtThreshold = emptyFacts();
    withSkillsAtThreshold.skillCount = 3;
    expect(computeCompleteness(withSkillsAtThreshold)).toBeGreaterThan(base);
  });

  test("never conflated with the unrelated 9-dimension Career Profile score — same strong-activity, low-completeness case as above, with the new fields still all empty", () => {
    const facts = emptyFacts();
    facts.activities = [{ id: "a1" } as never];
    const result = computeCompleteness(facts);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(20); // 1 of 15 items now, not 1 of 10
  });
});

describe("getCompletenessChecklist", () => {
  test("labels stay in sync with computeCompleteness — same completed count either way", () => {
    const facts = emptyFacts();
    facts.profile.headline = "Aspiring Economist";
    facts.skillCount = 5;

    const checklist = getCompletenessChecklist(facts);
    const completedCount = checklist.filter((item) => item.done).length;
    const expectedPercent = Math.round((completedCount / checklist.length) * 100);
    expect(computeCompleteness(facts)).toBe(expectedPercent);
  });

  test("includes an actionable, specific label for each new professional-profile item", () => {
    const labels = getCompletenessChecklist(emptyFacts()).map((item) => item.label);
    expect(labels).toContain("Add a headline");
    expect(labels).toContain("Write an About summary");
    expect(labels).toContain("Add 3 or more skills");
    expect(labels).toContain("Feature a project or achievement");
    expect(labels).toContain("Add contact information");
  });
});
