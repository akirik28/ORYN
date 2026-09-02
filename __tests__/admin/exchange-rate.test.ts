import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { getConfiguredExchangeRate } from "@/lib/admin/queries";

/**
 * getConfiguredExchangeRate is the one function in lib/admin/queries.ts this package adds a
 * dedicated test for — every other function there reads a real Supabase client and has no
 * existing test coverage (grepped before writing this: no test file exercises
 * getSpendSummary/getPerUserSpend/getRemainingCredit directly), matching this codebase's
 * established practice of not unit-testing thin DB-read wrappers. This one is different: it
 * reads only process.env, no client, no I/O — a pure function in every sense that matters
 * for testing, and the exact honesty boundary CEO's assignment made a hard constraint
 * ("must not be invented... if unset, the dashboard says so"), which makes it worth pinning
 * directly rather than trusting by inspection alone.
 */
const ORIGINAL_RATE = process.env.ADMIN_USD_TRY_RATE;
const ORIGINAL_ENTERED_AT = process.env.ADMIN_USD_TRY_RATE_ENTERED_AT;

function setEnv(rate: string | undefined, enteredAt: string | undefined) {
  if (rate === undefined) delete process.env.ADMIN_USD_TRY_RATE;
  else process.env.ADMIN_USD_TRY_RATE = rate;
  if (enteredAt === undefined) delete process.env.ADMIN_USD_TRY_RATE_ENTERED_AT;
  else process.env.ADMIN_USD_TRY_RATE_ENTERED_AT = enteredAt;
}

beforeEach(() => setEnv(undefined, undefined));
afterEach(() => setEnv(ORIGINAL_RATE, ORIGINAL_ENTERED_AT));

describe("getConfiguredExchangeRate — never a guessed number", () => {
  test("returns null when neither var is set", () => {
    expect(getConfiguredExchangeRate()).toBeNull();
  });

  test("returns null when the rate is set but the entered-at date is missing", () => {
    // Same discipline as getRemainingCredit's own pairing: a value with no recorded date is
    // not distinguishable from a stale one, so it's treated as unconfigured, not "unknown
    // freshness but trust it anyway."
    setEnv("40", undefined);
    expect(getConfiguredExchangeRate()).toBeNull();
  });

  test("returns null when the entered-at date is set but the rate is missing", () => {
    setEnv(undefined, "2026-09-02T00:00:00.000Z");
    expect(getConfiguredExchangeRate()).toBeNull();
  });

  test("returns null for a non-numeric rate rather than NaN propagating downstream", () => {
    setEnv("not-a-number", "2026-09-02T00:00:00.000Z");
    expect(getConfiguredExchangeRate()).toBeNull();
  });

  test("returns null for a zero or negative rate — dividing by it would be nonsensical or invert the conversion", () => {
    setEnv("0", "2026-09-02T00:00:00.000Z");
    expect(getConfiguredExchangeRate()).toBeNull();
    setEnv("-40", "2026-09-02T00:00:00.000Z");
    expect(getConfiguredExchangeRate()).toBeNull();
  });

  test("returns the configured rate and date when both are valid", () => {
    setEnv("40.5", "2026-09-02T00:00:00.000Z");
    expect(getConfiguredExchangeRate()).toEqual({ rateTryPerUsd: 40.5, enteredAt: "2026-09-02T00:00:00.000Z" });
  });
});
