import { describe, expect, test } from "vitest";
import { isUuidLike } from "@/lib/validation/uuid";

describe("isUuidLike", () => {
  test("accepts a well-formed v4-shaped uuid", () => {
    expect(isUuidLike("11111111-1111-1111-1111-111111111111")).toBe(true);
    expect(isUuidLike("a3bb189e-8bf9-3888-9912-ace4e6543002")).toBe(true);
  });

  test("is case-insensitive", () => {
    expect(isUuidLike("11111111-1111-1111-1111-111111111111".toUpperCase())).toBe(true);
  });

  test("rejects non-uuid input", () => {
    expect(isUuidLike("not-a-uuid")).toBe(false);
    expect(isUuidLike("")).toBe(false);
    expect(isUuidLike("11111111-1111-1111-1111-11111111111")).toBe(false); // one char short
  });

  test("rejects a value carrying SQL/Postgres syntax", () => {
    // This is the gate app/(app)/u/[id]/page.tsx and getConnectionWith rely on before
    // an id ever reaches a query — an attacker-controlled route param that isn't a UUID
    // must never reach `.eq("id", value)` and get silently coerced or error oddly.
    expect(isUuidLike("11111111-1111-1111-1111-111111111111' or '1'='1")).toBe(false);
  });
});
