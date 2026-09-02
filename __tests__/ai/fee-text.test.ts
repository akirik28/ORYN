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

  test("a negative cost is silent rather than rendered as a fee", () => {
    expect(formatFeeCaveat(-1)).toBeNull();
  });

  describe("a null cost — the third state (2026-09-03)", () => {
    test("produces a caveat, not silence", () => {
      expect(formatFeeCaveat(null)).not.toBeNull();
    });

    test("says the cost is unknown, and explicitly not to assume free", () => {
      const line = formatFeeCaveat(null)!;
      expect(line).toMatch(/not.*(recorded|on file)/i);
      expect(line).toMatch(/do not assume.*free/i);
    });

    test("reads differently from both the fee line and the (silent) free case — three distinguishable outcomes, not two", () => {
      const unknown = formatFeeCaveat(null);
      const free = formatFeeCaveat(0);
      const priced = formatFeeCaveat(500);

      expect(unknown).not.toBe(free);
      expect(unknown).not.toBe(priced);
      expect(free).not.toBe(priced);
      // free is the one silent case -- unknown must not collapse back into it.
      expect(free).toBeNull();
      expect(unknown).not.toBeNull();
    });

    test("never names a currency either — same reasoning as the priced case, nothing to name", () => {
      const line = formatFeeCaveat(null)!;
      expect(line).not.toMatch(/[$£€₺]/);
      expect(line).not.toMatch(/\b(USD|GBP|EUR|TRY|CHF|dollars?|pounds?|euros?)\b/i);
    });
  });
});
