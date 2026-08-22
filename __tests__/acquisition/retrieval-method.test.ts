import { describe, expect, test } from "vitest";
import { RETRIEVAL_METHODS, isRetrievalMethod, judgeRetrievalEvidence, looksPageConfirmed } from "@/lib/acquisition/retrieval-method";

// The real Université de Montréal attestation the prose gate wrongly rejected — a stronger
// claim than the word "verified", worded differently. See
// docs/handoffs/evidence-gate-false-rejections-2026-08-22.md.
const MONTREAL_PROSE =
  "Retrieved directly from Université de Montréal's own official admissions site (admission.umontreal.ca), which returned HTTP 200 with no bot-mitigation gate.";

// The real McGill attestation the prose gate rightly rejected — an honestly-disclosed
// archive capture, not a live fetch.
const MCGILL_PROSE =
  "Retrieved from the Internet Archive Wayback Machine's capture of this program's own dedicated page on McGill's official eCalendar.";

const LEGACY_CONFIRMED = "Verified - official page fetched and read";
const LEGACY_BLOCKED = "Verified - official programme result; page retrieval blocked";

describe("isRetrievalMethod", () => {
  test("accepts every declared enum value", () => {
    for (const m of RETRIEVAL_METHODS) expect(isRetrievalMethod(m)).toBe(true);
  });

  test("rejects non-members, wrong case, and non-strings", () => {
    expect(isRetrievalMethod("direct_fetch")).toBe(false);
    expect(isRetrievalMethod("LIVE_FETCH")).toBe(false);
    expect(isRetrievalMethod("")).toBe(false);
    expect(isRetrievalMethod(42)).toBe(false);
    expect(isRetrievalMethod(null)).toBe(false);
  });
});

describe("judgeRetrievalEvidence — each enum value", () => {
  test("live_fetch passes, regardless of whether the prose contains the legacy vocabulary", () => {
    expect(judgeRetrievalEvidence("live_fetch", MONTREAL_PROSE).ok).toBe(true);
    expect(judgeRetrievalEvidence("live_fetch", LEGACY_CONFIRMED).ok).toBe(true);
  });

  test("browser_render passes", () => {
    const mcmaster = "Retrieved live from McMaster's official Acalog academic calendar, fetched via browser after the site's AWS WAF challenge cleared automatically.";
    expect(judgeRetrievalEvidence("browser_render", mcmaster).ok).toBe(true);
  });

  test("archived_capture fails — an honest archive disclosure is still not a live confirmed fetch", () => {
    const verdict = judgeRetrievalEvidence("archived_capture", MCGILL_PROSE);
    expect(verdict.ok).toBe(false);
    expect(verdict.detail).toContain("archived_capture");
    expect(verdict.detail).toContain("not a live confirmed fetch");
  });

  test("archived_capture fails even when the prose contains the legacy passing vocabulary", () => {
    // The structured field is authoritative in the failing direction too: prose saying
    // "Verified" cannot rescue a record that declares its content came from an archive.
    expect(judgeRetrievalEvidence("archived_capture", LEGACY_CONFIRMED).ok).toBe(false);
  });

  test("search_summary fails — discovery evidence is not verification", () => {
    const verdict = judgeRetrievalEvidence("search_summary", "Found via search results for the programme name.");
    expect(verdict.ok).toBe(false);
    expect(verdict.detail).toContain("search_summary");
  });
});

describe("judgeRetrievalEvidence — legacy records (no retrieval_method)", () => {
  test("undefined, null, and empty string all route to the legacy prose matcher", () => {
    for (const missing of [undefined, null, ""] as const) {
      expect(judgeRetrievalEvidence(missing, LEGACY_CONFIRMED).ok).toBe(true);
      expect(judgeRetrievalEvidence(missing, LEGACY_BLOCKED).ok).toBe(false);
    }
  });

  test("the bar does not drop: a legacy record with a strong-but-differently-worded attestation still fails", () => {
    // This is exactly the false rejection the structured field exists to fix — but the fix is
    // the field, never a widened prose matcher. Without the field, Montréal's attestation
    // stays blocked, same as before this change.
    const verdict = judgeRetrievalEvidence(undefined, MONTREAL_PROSE);
    expect(verdict.ok).toBe(false);
    expect(verdict.detail).toContain("reads as a search result");
  });
});

describe("judgeRetrievalEvidence — malformed values fail closed", () => {
  test("an unrecognized value fails, and does NOT fall back to a passing prose match", () => {
    // "direct_fetch" is a plausible near-miss for "live_fetch"; the prose here would pass the
    // legacy matcher. A declared-but-invalid field must not be quietly forgiven either way.
    const verdict = judgeRetrievalEvidence("direct_fetch", LEGACY_CONFIRMED);
    expect(verdict.ok).toBe(false);
    expect(verdict.detail).toContain('"direct_fetch"');
    expect(verdict.detail).toContain("not a recognized value");
  });

  test("case matters — the enum is closed, not normalized", () => {
    expect(judgeRetrievalEvidence("Live_Fetch", LEGACY_CONFIRMED).ok).toBe(false);
  });
});

describe("judgeRetrievalEvidence — contradiction guard", () => {
  test("live_fetch declared while the prose discloses a blocked retrieval fails", () => {
    const verdict = judgeRetrievalEvidence("live_fetch", LEGACY_BLOCKED);
    expect(verdict.ok).toBe(false);
    expect(verdict.detail).toContain("contradicts");
  });

  test("live_fetch declared while the prose discloses an archive capture fails", () => {
    const verdict = judgeRetrievalEvidence("live_fetch", MCGILL_PROSE);
    expect(verdict.ok).toBe(false);
    expect(verdict.detail).toContain("contradicts");
  });

  test("browser_render gets the same guard", () => {
    expect(judgeRetrievalEvidence("browser_render", "page unfetched — WAF interstitial never cleared").ok).toBe(false);
  });
});

describe("looksPageConfirmed (legacy matcher, unchanged semantics after the move)", () => {
  test("true only for an explicit verified confirmation without blocked markers", () => {
    expect(looksPageConfirmed(LEGACY_CONFIRMED)).toBe(true);
    expect(looksPageConfirmed(LEGACY_BLOCKED)).toBe(false);
    expect(looksPageConfirmed("Review")).toBe(false);
    expect(looksPageConfirmed(MONTREAL_PROSE)).toBe(false);
  });
});
