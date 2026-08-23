import { describe, expect, test } from "vitest";
import { formatFeeCaveat } from "@/lib/ai/fee-text";

describe("formatFeeCaveat", () => {
  test("a positive cost produces an explicit fee line", () => {
    const line = formatFeeCaveat(7465);
    expect(line).not.toBeNull();
    expect(line).toContain("HAS A FEE");
    expect(line).toContain("7465");
  });

  test("never names a currency — the column has no currency to name", () => {
    // opportunities.cost is a bare numeric. Live rows carry GBP, EUR, CHF and TRY amounts
    // in that same column, so any symbol this helper printed would be wrong for some of
    // them. The student-facing renderer already gets this wrong by defaulting to USD; the
    // prompt layer must not repeat it.
    for (const amount of [365, 496, 2700, 80000]) {
      const line = formatFeeCaveat(amount)!;
      expect(line).not.toMatch(/[$£€₺]/);
      expect(line).not.toMatch(/\b(USD|GBP|EUR|TRY|CHF|dollars?|pounds?|euros?)\b/i);
    }
  });

  test("says the amount is unconfirmed and points at the official page", () => {
    const line = formatFeeCaveat(350)!;
    expect(line).toMatch(/unconfirmed/i);
    expect(line).toMatch(/official page/i);
  });

  test("a zero cost is silent — an unverified zero must not become a promise that it is free", () => {
    expect(formatFeeCaveat(0)).toBeNull();
  });

  test("a null cost is silent — nothing recorded is not the same as no fee", () => {
    expect(formatFeeCaveat(null)).toBeNull();
  });

  test("a negative cost is silent rather than rendered as a fee", () => {
    expect(formatFeeCaveat(-1)).toBeNull();
  });
});
