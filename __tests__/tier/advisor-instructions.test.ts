import { describe, expect, test } from "vitest";
import { advisorInstructionsMaxLength, resolveAdvisorInstructions } from "@/lib/tier/advisor-instructions";

describe("advisorInstructionsMaxLength", () => {
  test("standard: 500 (docs/ozellesme-spec-2026-09-03.md §1)", () => {
    expect(advisorInstructionsMaxLength("standard")).toBe(500);
  });

  test("ultra: 2,000 — four times standard, the exact ratio the UI shows a student at the limit", () => {
    expect(advisorInstructionsMaxLength("ultra")).toBe(2000);
    expect(advisorInstructionsMaxLength("ultra")).toBe(advisorInstructionsMaxLength("standard") * 4);
  });
});

describe("resolveAdvisorInstructions — mirrors resolveResponseMode's degrade-to-null shape", () => {
  test("a real stored instruction is returned as-is", () => {
    expect(resolveAdvisorInstructions({ advisor_instructions: "Keep it short." })).toBe("Keep it short.");
  });

  test("null (no instruction set) stays null", () => {
    expect(resolveAdvisorInstructions({ advisor_instructions: null })).toBeNull();
  });

  test("undefined (migration 0111 not applied on this environment) degrades to null, not a crash", () => {
    expect(resolveAdvisorInstructions({ advisor_instructions: undefined as unknown as null })).toBeNull();
  });
});
