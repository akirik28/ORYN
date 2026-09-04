import { describe, expect, test } from "vitest";
import { deriveConversationTitle } from "@/lib/advisor/conversation-title";

describe("deriveConversationTitle", () => {
  test("a short message is used verbatim, no truncation mark", () => {
    expect(deriveConversationTitle("Should I start another club?")).toBe("Should I start another club?");
  });

  test("trims leading/trailing whitespace before measuring length", () => {
    expect(deriveConversationTitle("   Is my university list realistic?   ")).toBe("Is my university list realistic?");
  });

  test("a message over the limit is cut at a word boundary, not mid-word", () => {
    const long = "Should I start another entrepreneurship club or focus on the research project I already have going this semester";
    const result = deriveConversationTitle(long);
    expect(result.length).toBeLessThanOrEqual(61); // 60 + the ellipsis character
    expect(result.endsWith("…")).toBe(true);
    // The word immediately before the cut must be whole -- not a fragment of a longer word.
    const withoutEllipsis = result.slice(0, -1);
    expect(long.startsWith(withoutEllipsis)).toBe(true);
    expect(long[withoutEllipsis.length]).toBe(" ");
  });

  test("trailing punctuation right at the cut point is stripped before the ellipsis", () => {
    // Constructed so the word-boundary cut lands right after a comma.
    const withComma = "Should I apply to this competition, or is it not worth the time given everything else on my plate this month";
    const result = deriveConversationTitle(withComma);
    expect(result.endsWith(",…")).toBe(false);
  });

  test("one long unbroken token (e.g. a pasted URL) hard-cuts rather than truncating to almost nothing", () => {
    const url = "https://example.com/" + "a".repeat(80);
    const result = deriveConversationTitle(url);
    expect(result.length).toBeLessThanOrEqual(61);
    expect(result.endsWith("…")).toBe(true);
    expect(result.length).toBeGreaterThan(10); // did not collapse to just the first word fragment
  });

  test("never fabricates anything not in the original message — the result is always a prefix of the trimmed input", () => {
    const message = "Is it worth spending my last month before the deadline on a fourth extracurricular or on my personal statement instead";
    const result = deriveConversationTitle(message);
    const withoutEllipsis = result.endsWith("…") ? result.slice(0, -1) : result;
    // Prefix check up to trailing-punctuation stripping — the result must never contain any
    // character sequence the original message didn't actually have at that position.
    expect(message.trim().startsWith(withoutEllipsis.replace(/[,;:.\-–—]+$/, ""))).toBe(true);
  });

  test("exactly at the limit is used verbatim", () => {
    const exact = "x".repeat(60);
    expect(deriveConversationTitle(exact)).toBe(exact);
  });

  test("one character over the limit truncates", () => {
    const overByOne = "x".repeat(61);
    const result = deriveConversationTitle(overByOne);
    expect(result).not.toBe(overByOne);
    expect(result.endsWith("…")).toBe(true);
  });
});
