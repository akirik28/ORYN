import { describe, expect, test } from "vitest";
import { formatNumber, formatCurrency } from "@/lib/i18n/format";

describe("formatNumber", () => {
  test("adds thousands separators", () => {
    expect(formatNumber(12000)).toBe("12,000");
  });

  test("passes through Intl.NumberFormat options", () => {
    expect(formatNumber(0.42, { style: "percent" })).toBe("42%");
  });
});

describe("formatCurrency", () => {
  test("formats USD with no decimal places by default", () => {
    expect(formatCurrency(85000)).toBe("$85,000");
  });

  test("supports a different currency", () => {
    expect(formatCurrency(1000, "EUR")).toBe("€1,000");
  });
});
