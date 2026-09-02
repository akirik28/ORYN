import { describe, expect, test } from "vitest";
import { buildCohortCsv } from "@/lib/admin/cohort-csv";
import type { AdminUserRow } from "@/lib/admin/queries";

function row(overrides: Partial<AdminUserRow> = {}): AdminUserRow {
  return {
    userId: "00000000-0000-0000-0000-000000000001",
    displayName: "Ada Öğrenci",
    tier: "standard",
    signedUpAt: "2026-08-20T10:00:00.000Z",
    lastSeenAt: "2026-09-02T08:00:00.000Z",
    lifetimeSpendUsd: 1.2345,
    ...overrides,
  };
}

describe("buildCohortCsv", () => {
  test("header row matches the documented column order", () => {
    const csv = buildCohortCsv([]);
    expect(csv.split("\n")[0]).toBe("user_id,display_name,tier,signed_up_at,last_seen_at,lifetime_spend_usd");
  });

  test("empty cohort renders only the header, with a trailing newline", () => {
    expect(buildCohortCsv([])).toBe("user_id,display_name,tier,signed_up_at,last_seen_at,lifetime_spend_usd\n");
  });

  test("a plain row round-trips every field", () => {
    const csv = buildCohortCsv([row()]);
    const dataLine = csv.split("\n")[1];
    expect(dataLine).toBe("00000000-0000-0000-0000-000000000001,Ada Öğrenci,standard,2026-08-20T10:00:00.000Z,2026-09-02T08:00:00.000Z,1.2345");
  });

  test("an ultra-tier row renders the real tier, not the standard default", () => {
    const csv = buildCohortCsv([row({ tier: "ultra" })]);
    expect(csv.split("\n")[1]).toContain(",ultra,");
  });

  test("null displayName and lastSeenAt render as empty fields, not the literal word null", () => {
    const csv = buildCohortCsv([row({ displayName: null, lastSeenAt: null })]);
    const dataLine = csv.split("\n")[1];
    expect(dataLine).toBe("00000000-0000-0000-0000-000000000001,,standard,2026-08-20T10:00:00.000Z,,1.2345");
  });

  test("a display name containing a comma is quoted", () => {
    const csv = buildCohortCsv([row({ displayName: "Smith, John" })]);
    expect(csv.split("\n")[1]).toContain('"Smith, John"');
  });

  test("a display name containing a double quote is quoted and the quote is doubled", () => {
    const csv = buildCohortCsv([row({ displayName: 'Ada "the founder" K.' })]);
    expect(csv.split("\n")[1]).toContain('"Ada ""the founder"" K."');
  });

  test("a display name containing a newline is quoted rather than breaking the row", () => {
    const csv = buildCohortCsv([row({ displayName: "Line1\nLine2" })]);
    const lines = csv.split("\n");
    // 1 header + 1 quoted multi-line data row (itself spanning 2 lines) + trailing empty
    // from the final "\n" -- proves the embedded newline didn't fragment into an extra row.
    expect(lines).toHaveLength(4);
    expect(csv).toContain('"Line1\nLine2"');
  });

  test("lifetime spend keeps four decimal places even for a whole-dollar amount", () => {
    const csv = buildCohortCsv([row({ lifetimeSpendUsd: 3 })]);
    expect(csv.split("\n")[1]).toContain(",3.0000");
  });

  test("multiple rows preserve input order", () => {
    const csv = buildCohortCsv([row({ userId: "a" }), row({ userId: "b" })]);
    const lines = csv.trim().split("\n");
    expect(lines[1].startsWith("a,")).toBe(true);
    expect(lines[2].startsWith("b,")).toBe(true);
  });
});
