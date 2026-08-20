import { describe, expect, test } from "vitest";
import { formatNumber, formatCurrency, formatDate, formatDuration, parseDbDate } from "@/lib/i18n/format";

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

describe("parseDbDate", () => {
  test("parses a date-only string at UTC midnight, not the local timezone", () => {
    const parsed = parseDbDate("2027-02-14");
    expect(parsed.getUTCFullYear()).toBe(2027);
    expect(parsed.getUTCMonth()).toBe(1); // 0-indexed
    expect(parsed.getUTCDate()).toBe(14);
  });

  test("does not re-suffix a string that already carries a full timestamp", () => {
    // Dev fixtures build dates via `.toISOString()` (a full timestamp) rather than the
    // plain `YYYY-MM-DD` every production date column actually stores — appending
    // `T00:00:00Z` to one of those produces an unparseable (NaN) Date if not guarded.
    const parsed = parseDbDate("2027-02-14T09:30:00.000Z");
    expect(Number.isNaN(parsed.getTime())).toBe(false);
    expect(parsed.getUTCFullYear()).toBe(2027);
  });
});

describe("formatDate", () => {
  test("formats a date-only string as a full written date", () => {
    expect(formatDate("2027-02-14")).toBe("February 14, 2027");
  });

  test("respects custom Intl options", () => {
    expect(formatDate("2027-02-14", { month: "short", day: "numeric", year: undefined })).toBe("Feb 14");
  });
});

describe("formatDuration", () => {
  test("shows the year once when both ends fall in the same year", () => {
    expect(formatDuration("2026-06-15", "2026-08-07")).toBe("Jun 15 – Aug 7, 2026");
  });

  test("shows the year on both ends when they differ, without duplicating it", () => {
    expect(formatDuration("2026-12-18", "2027-01-29")).toBe("Dec 18, 2026 – Jan 29, 2027");
  });

  test("stays correct against full-timestamp fixture-shaped input (regression: previously produced a NaN year)", () => {
    const start = new Date("2026-12-18T00:00:00.000Z").toISOString();
    const end = new Date("2027-01-29T00:00:00.000Z").toISOString();
    const result = formatDuration(start, end);
    expect(result).toBe("Dec 18, 2026 – Jan 29, 2027");
    expect(result).not.toContain("NaN");
  });

  test("falls back to a single-ended label when only the start is known", () => {
    expect(formatDuration("2026-06-15", null)).toBe("Starts June 15, 2026");
  });

  test("falls back to a single-ended label when only the end is known", () => {
    expect(formatDuration(null, "2026-08-07")).toBe("Ends August 7, 2026");
  });

  test("returns null when neither end is known, rather than a fabricated placeholder", () => {
    expect(formatDuration(null, null)).toBeNull();
  });

  test("shows 'Present' for an ongoing activity, ignoring any endDate", () => {
    expect(formatDuration("2024-02-14", "2025-01-01", true)).toBe("February 14, 2024 – Present");
  });

  test("ongoing with no startDate returns null rather than a bare 'Present'", () => {
    expect(formatDuration(null, "2025-01-01", true)).toBeNull();
  });
});
