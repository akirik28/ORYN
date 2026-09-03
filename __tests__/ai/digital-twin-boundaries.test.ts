import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Architectural boundary tests for the Digital Twin / AI signal rules (spec Phase 10).
 *
 * These read source text rather than calling the modules, deliberately: the modules in
 * question are `server-only` and take a live Supabase client, so the only honest way to
 * assert "this pipeline never even asks for contact info" without a database is to check
 * that the query itself doesn't reference it. That makes these genuine regression guards
 * on an invariant that would otherwise fail silently and invisibly — a future developer
 * adding `contact_info` to the advisor's context assembler, or a phone number to the
 * scoring facts, breaks a named test instead of quietly shipping a privacy regression.
 *
 * The rules, from the spec:
 *   NEVER USE for scoring or Advisor reasoning: phone, email, Instagram, Discord,
 *   private messages.
 *   Popularity (endorsements, recommendations) must not become an admissions score.
 */

const ROOT = join(__dirname, "..", "..");
function source(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

/** Contact columns as they appear in a PostgREST `.select()` — the only way this data
 * could enter a pipeline. */
const CONTACT_COLUMNS = ["phone", "email", "instagram_handle", "discord_handle", "twitter_handle", "linkedin_url"];

describe("AI Advisor context never ingests contact info or message bodies", () => {
  const advisorContext = source("lib/ai/student-context.ts");

  test.each(CONTACT_COLUMNS)("does not select contact column %s", (column) => {
    expect(advisorContext).not.toContain(column);
  });

  test("never queries the contact_info table at all", () => {
    expect(advisorContext).not.toContain('from("contact_info")');
  });

  test("never queries private message bodies", () => {
    expect(advisorContext).not.toContain('from("messages")');
  });

  test("never ingests endorsements or recommendations — popularity is not an admissions signal", () => {
    expect(advisorContext).not.toContain('from("skill_endorsements")');
    expect(advisorContext).not.toContain('from("recommendations")');
  });

  test("still ingests the strong-evidence sources it is supposed to (guards against this test passing vacuously)", () => {
    expect(advisorContext).toContain('from("profiles")');
    expect(advisorContext).toContain('from("target_universities")');
    expect(advisorContext).toContain('from("sports_experiences")');
  });
});

describe("Career Profile scoring never ingests contact info, messages, or popularity", () => {
  const assembleFacts = source("lib/scoring/assemble-facts.ts");

  test("the scoring fact assembler never reads contact_info, messages, endorsements, or recommendations", () => {
    for (const table of ["contact_info", "messages", "skill_endorsements", "recommendations", "profile_views"]) {
      expect(assembleFacts).not.toContain(`from("${table}")`);
    }
  });

  test("it does read the strong-evidence achievement sources (not vacuous)", () => {
    for (const table of ["activities", "projects", "research_experiences", "awards", "courses"]) {
      expect(assembleFacts).toContain(`from("${table}")`);
    }
  });
});

describe("contact_info's one permitted consumer is completeness, never a dimension score", () => {
  const persist = source("lib/scoring/persist.ts");

  test("persist.ts reads contact_info only to derive a boolean for completeness", () => {
    // It is allowed to ask "does this student have any contact info at all" — that is
    // profile *completeness* (how much Proxola knows), an explicitly different concept from
    // profile *strength*. What it must never do is pass the values themselves onward.
    expect(persist).toContain('from("contact_info")');
    expect(persist).toContain("hasContactInfo");
  });

  test("the contact values are passed to computeCompleteness, never to computeCareerProfile", () => {
    // computeCareerProfile takes only `facts` (the achievement/academic assembler's
    // output). If contact data ever became an argument to it, this breaks.
    expect(persist).toMatch(/computeCareerProfile\(facts\)/);
    expect(persist).not.toMatch(/computeCareerProfile\([^)]*contact/i);
  });
});

describe("Counselor Core's student-state boundary (lib/counselor/state.ts) follows the same rules", () => {
  const state = source("lib/counselor/state.ts");

  test.each(CONTACT_COLUMNS)("does not select contact column %s outside the approved contact_info completeness check", (column) => {
    // contact_info itself is a legitimate, approved read here (same hasContactInfo-only
    // pattern as lib/scoring/persist.ts, asserted below) — this guards against a *second*,
    // wider contact surface sneaking in. Each column legitimately appears exactly twice:
    // once in the .select() list, once in the hasContactInfo boolean check — a third
    // occurrence would mean the value escaped that one boolean-deriving use.
    const occurrences = state.split(column).length - 1;
    expect(occurrences).toBeLessThanOrEqual(2);
  });

  test("never queries the messages, skill_endorsements, or recommendations tables", () => {
    for (const table of ["messages", "skill_endorsements", "recommendations"]) {
      expect(state).not.toContain(`from("${table}")`);
    }
  });

  test("reads contact_info only to derive hasContactInfo for the completeness checklist, same as lib/scoring/persist.ts", () => {
    expect(state).toContain('from("contact_info")');
    expect(state).toContain("hasContactInfo");
    expect(state).toMatch(/getCompletenessChecklist\(\{/);
  });

  test("never uses the admin/service-role client — every query stays RLS-scoped", () => {
    expect(state).not.toContain("createAdminClient");
    expect(state).toContain("createClient");
  });

  test("still reads the strong-evidence sources it's supposed to (guards against this test passing vacuously)", () => {
    for (const table of ["profile_scores", "opportunity_matches", "university_requirements", "opportunities"]) {
      expect(state).toContain(`from("${table}")`);
    }
  });
});
