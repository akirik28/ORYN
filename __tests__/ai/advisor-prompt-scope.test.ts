import { describe, expect, test } from "vitest";
import { ADVISOR_SYSTEM_PROMPT } from "@/lib/ai/advisor-prompt";

/**
 * Founder, 2026-09-03: "ai danışmanlık dışı soruları akademik olmayan kısımları
 * cevaplamamalı, trollendiğini fark edebilmeli" — the advisor must refuse non-academic
 * questions and notice trolling. The real behavioral proof is a live model call (run
 * manually against 4 cases — off-topic homework, an instruction-widening jailbreak
 * attempt, an obvious troll, and a legitimate control question — all four behaved
 * correctly; not re-run here since it costs a real API call per run). This test only pins
 * the deterministic part: the boundary text itself is present and says what it must say,
 * so a future edit can't silently delete the scope section without a test noticing.
 *
 * The one property worth a dedicated assertion, named explicitly because it's the actual
 * risk (oryn-45, same day): a student's own standing instruction (özelleşme piece 1,
 * lib/ai/student-context.ts's closing prompt line) must not be able to widen scope. The
 * live call confirmed this behaviorally; this test confirms the prompt still says it.
 */
describe("ADVISOR_SYSTEM_PROMPT — scope boundary", () => {
  test("states what's in scope and what isn't", () => {
    expect(ADVISOR_SYSTEM_PROMPT).toMatch(/in scope/i);
    expect(ADVISOR_SYSTEM_PROMPT).toMatch(/out of scope/i);
  });

  test("explicitly says the student's own stored instruction cannot widen scope", () => {
    expect(ADVISOR_SYSTEM_PROMPT).toMatch(/does not widen|cannot expand|cannot widen/i);
    expect(ADVISOR_SYSTEM_PROMPT).toContain("Current student context");
  });

  test("names refusal as brief and non-accusatory, not a lecture", () => {
    expect(ADVISOR_SYSTEM_PROMPT).toMatch(/don't lecture|not accuse/i);
  });

  test("still allows the advisor's own core job — research/project direction — so the boundary isn't over-broad", () => {
    expect(ADVISOR_SYSTEM_PROMPT).toMatch(/suggesting research directions|project ideas/i);
  });
});

/**
 * CEO, 2026-09-03, after 05's Haiku run showed the escalation path being named is model-
 * trained behavior we never wrote down, and it varies (Sonnet named it, Haiku didn't) —
 * on a surface (ANTHROPIC_MODEL) the founder can change from an env var. Same discipline
 * as the scope test above: a live model call is the real proof (not re-run here), this
 * only pins that the text survives a future edit. Author doesn't clear their own draft —
 * 05 runs the 3 wellbeing scenarios plus a negative (ordinary exam stress) case against
 * this branch before it merges.
 */
describe("ADVISOR_SYSTEM_PROMPT — wellbeing disclosures name a real person, never a resource", () => {
  test("requires naming a real person — a parent, adult, counselor, or doctor", () => {
    expect(ADVISOR_SYSTEM_PROMPT).toMatch(/parent/i);
    expect(ADVISOR_SYSTEM_PROMPT).toMatch(/counselor|counsellor/i);
    expect(ADVISOR_SYSTEM_PROMPT).toMatch(/doctor/i);
  });

  test("explicitly forbids a phone number, hotline, or named service — no country data to base one on", () => {
    expect(ADVISOR_SYSTEM_PROMPT).toMatch(/never a phone number|no.*hotline|hotline/i);
    expect(ADVISOR_SYSTEM_PROMPT).toMatch(/what country/i);
  });

  test("explicitly rules out ordinary academic stress — the over-trigger regression CEO named", () => {
    expect(ADVISOR_SYSTEM_PROMPT).toMatch(/bad exam/i);
    expect(ADVISOR_SYSTEM_PROMPT).toMatch(/is NOT this/);
  });

  test("says this is not a fixed script — engagement, not a recited paragraph", () => {
    expect(ADVISOR_SYSTEM_PROMPT).toMatch(/not\s+a\s+script/i);
  });
});
