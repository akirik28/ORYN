import { describe, expect, test } from "vitest";
import { outputLanguageInstruction, withOutputLanguage } from "@/lib/ai/output-language";

/**
 * Every AI surface wrote English regardless of the student's locale until 2026-09-01. These
 * assert the mechanism — that the instruction is built and attached — and deliberately do not
 * claim anything about the quality of the Turkish that results. Measuring register costs real
 * model calls and the eval suite is English-only; that gap is stated in
 * lib/ai/output-language.ts and docs/i18n-coverage.md rather than papered over here.
 */
describe("outputLanguageInstruction", () => {
  test("English adds nothing — the prompts were written in it", () => {
    expect(outputLanguageInstruction("en")).toBeNull();
    expect(withOutputLanguage("SYSTEM", "en")).toBe("SYSTEM");
  });

  test("Turkish names the language unambiguously", () => {
    const instruction = outputLanguageInstruction("tr")!;
    expect(instruction).toContain("Turkish (Türkçe)");
    expect(instruction).toMatch(/answering in English is not an option/i);
  });

  test("it protects the things a translation would break", () => {
    const instruction = outputLanguageInstruction("tr")!;
    // Traceability: a translated university or programme name cannot be checked against its
    // source, which is the entire point of the product's source discipline.
    expect(instruction).toMatch(/proper names/i);
    expect(instruction).toMatch(/quoted/i);
    // Inventing a term reads as authority the product has not earned.
    expect(instruction).toMatch(/inventing/i);
    // Phase 57's voice is a property of the counsel, not of English.
    expect(instruction).toMatch(/analytical/i);
    expect(instruction).toMatch(/no praise inflation/i);
  });

  test("appending keeps the original prompt intact and separated", () => {
    const combined = withOutputLanguage("ORIGINAL PROMPT", "tr");
    expect(combined.startsWith("ORIGINAL PROMPT\n\n")).toBe(true);
    expect(combined).toContain("Türkçe");
  });
});
