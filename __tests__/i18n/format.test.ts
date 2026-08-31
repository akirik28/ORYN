import { describe, expect, test } from "vitest";
import { formatNumber, formatCurrency, formatDuration } from "@/lib/i18n/format";

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

describe("formatDuration", () => {
  test("shows seconds only under a minute", () => {
    expect(formatDuration(45_000)).toBe("45s");
  });

  test("shows minutes and seconds under an hour", () => {
    expect(formatDuration(3 * 60_000 + 12_000)).toBe("3m 12s");
  });

  test("shows hours and minutes at an hour or more", () => {
    expect(formatDuration(2 * 3_600_000 + 5 * 60_000)).toBe("2h 5m");
  });

  test("drops seconds once minutes are shown", () => {
    expect(formatDuration(90_000)).toBe("1m 30s");
  });

  test("floors partial seconds rather than rounding up", () => {
    expect(formatDuration(1_999)).toBe("1s");
  });

  test("zero duration reads as 0s, not blank", () => {
    expect(formatDuration(0)).toBe("0s");
  });

  test("never returns a negative duration", () => {
    expect(formatDuration(-500)).toBe("0s");
  });
});
