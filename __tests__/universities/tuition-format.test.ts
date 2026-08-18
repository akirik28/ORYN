import { describe, expect, test } from "vitest";
import { currencyPrefix, formatTuition, tuitionQualifier } from "@/lib/universities/tuition-format";

describe("currencyPrefix", () => {
  test("known currencies get a real symbol", () => {
    expect(currencyPrefix("GBP/year")).toBe("£");
    expect(currencyPrefix("EUR/year")).toBe("€");
    expect(currencyPrefix("CAD/credit")).toBe("CA$");
  });

  test("unrecognized currency falls back to the code plus a space, never a guessed symbol", () => {
    expect(currencyPrefix("CHF/year")).toBe("CHF ");
  });
});

describe("formatTuition", () => {
  test("zero is real verified data, shown as Free — not hidden, not shown as a bare 0", () => {
    expect(formatTuition(0, "EUR/year")).toBe("Free");
  });

  test("a normal figure gets the currency prefix and /yr suffix, rounded to whole units", () => {
    expect(formatTuition(29600, "GBP/year")).toBe("£29,600/yr");
  });
});

describe("tuitionQualifier", () => {
  test("range: 'From' prefix, 'varies by course' note", () => {
    expect(tuitionQualifier("range")).toEqual({ valuePrefix: "From ", note: "Varies by course. " });
  });

  test("upper_bound: 'Up to' prefix, income-based note — distinct wording from range, not reused", () => {
    const q = tuitionQualifier("upper_bound");
    expect(q.valuePrefix).toBe("Up to ");
    expect(q.note).toContain("Income-based");
    expect(q.note).not.toContain("course");
  });

  test("exact (and any other value) gets no prefix and no note", () => {
    expect(tuitionQualifier("exact")).toEqual({ valuePrefix: "", note: "" });
  });

  test("regression: international and domestic must be qualified independently — a range on one side must never leak its 'From ' prefix onto an exact figure on the other side", () => {
    // Edinburgh's real shape: international is a range, domestic is one flat national number.
    // A prior version of the detail page called tuitionQualifier() once (on the international
    // figure) and reused its prefix for domestic too, which silently mislabelled a flat
    // "£9,790/yr" as "From £9,790/yr" — caught live 2026-08-18. Each side must use its OWN
    // precision_state, which this test pins down at the pure-function level.
    const internationalQ = tuitionQualifier("range");
    const domesticQ = tuitionQualifier("exact");
    expect(internationalQ.valuePrefix).toBe("From ");
    expect(domesticQ.valuePrefix).toBe("");
    expect(domesticQ.valuePrefix).not.toBe(internationalQ.valuePrefix);
  });
});
