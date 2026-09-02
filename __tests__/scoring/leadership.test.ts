import { describe, expect, test } from "vitest";
import { scoreLeadership } from "@/lib/scoring/dimensions/leadership";
import type { ScoringFacts } from "@/lib/scoring/types";
import type { Activity } from "@/types/database";

function activity(overrides: Partial<Activity>): Activity {
  return {
    id: "a1",
    user_id: "u1",
    title: "Member",
    organization: "Some Club",
    organization_entity_id: null,
    category: "club",
    description: null,
    is_leadership_role: false,
    people_led: null,
    organization_scope: null,
    opportunity_id: null,
    start_date: null,
    end_date: null,
    ongoing: false,
    hours_per_week: null,
    weeks_per_year: null,
    location: null,
    story_notes: null,
    source: "manual",
    evidence_status: "self_reported",
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

function facts(activities: Activity[], referenceDate: Date = new Date("2025-06-01")): ScoringFacts {
  return {
    educationRecords: [],
    courses: [],
    testScores: [],
    activities,
    awards: [],
    certifications: [],
    projects: [],
    researchExperiences: [],
    volunteeringExperiences: [],
    workExperiences: [],
    referenceDate,
  };
}

describe("scoreLeadership", () => {
  test("scores 0 with low confidence when there are no leadership roles", () => {
    const result = scoreLeadership(facts([activity({ is_leadership_role: false })]));
    expect(result.score).toBe(0);
    expect(result.confidence).toBe("low");
  });

  test("a title alone — no measurable scope, people led, or duration — stays a low score", () => {
    // Directly encodes the spec's own example: typing "President" should not produce an
    // extremely high leadership score on its own.
    const result = scoreLeadership(
      facts([
        activity({
          title: "President",
          is_leadership_role: true,
          start_date: "2025-04-01",
          end_date: "2025-06-01",
        }),
      ])
    );
    expect(result.score).toBeLessThan(30);
  });

  test("real responsibility — people led, organizational scope, sustained duration — scores meaningfully higher", () => {
    const titleOnly = scoreLeadership(
      facts([activity({ title: "President", is_leadership_role: true, start_date: "2025-04-01", end_date: "2025-06-01" })])
    );
    const realResponsibility = scoreLeadership(
      facts([
        activity({
          title: "Regional Director",
          is_leadership_role: true,
          people_led: 40,
          organization_scope: "5 regional chapters",
          start_date: "2024-08-01",
          end_date: "2025-06-01",
        }),
      ])
    );
    expect(realResponsibility.score).toBeGreaterThan(titleOnly.score + 20);
  });
});

/**
 * 2026-09-02 scheduled-review audit: the empirical premise the whole job is built on —
 * lib/scoring/math.ts's own comment says `end_date: null` measures "up to referenceDate
 * (defaults to now)", so an ongoing role's duration bonus (and therefore its score) grows
 * with real-world elapsed time even with ZERO edits to the underlying row. Proven directly
 * here — same activity row, only `referenceDate` differs — rather than inferred from
 * reading the code, since a scheduled job that recomputes for no observable reason would
 * be a real waste if this claim turned out to be wrong.
 */
describe("scoreLeadership — scores move without an edit, for an ongoing role", () => {
  test("an ongoing leadership role (end_date: null) scores higher a year later, from the identical row", () => {
    const ongoingRole = activity({
      title: "Founder",
      is_leadership_role: true,
      people_led: 12,
      organization_scope: "school-wide",
      start_date: "2025-01-01",
      end_date: null,
    });

    const sixMonthsIn = scoreLeadership(facts([ongoingRole], new Date("2025-07-01")));
    const eighteenMonthsIn = scoreLeadership(facts([ongoingRole], new Date("2026-07-01")));

    expect(eighteenMonthsIn.score).toBeGreaterThan(sixMonthsIn.score);
  });

  test("a CLOSED role (a real end_date) does not move at all as referenceDate advances -- only 'ongoing' has this property", () => {
    const closedRole = activity({
      title: "Founder",
      is_leadership_role: true,
      start_date: "2025-01-01",
      end_date: "2025-07-01",
    });

    const scoredSoonAfter = scoreLeadership(facts([closedRole], new Date("2025-08-01")));
    const scoredMuchLater = scoreLeadership(facts([closedRole], new Date("2026-08-01")));

    expect(scoredMuchLater.score).toBe(scoredSoonAfter.score);
  });
});
