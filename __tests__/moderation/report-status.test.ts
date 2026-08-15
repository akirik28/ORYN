import { describe, expect, test } from "vitest";
import { REPORT_STATUS_OPTIONS } from "@/lib/moderation/report-status";

describe("REPORT_STATUS_OPTIONS", () => {
  test("matches the message_report_status Postgres enum exactly (migration 0030)", () => {
    const values = REPORT_STATUS_OPTIONS.map((o) => o.value).sort();
    expect(values).toEqual(["dismissed", "open", "resolved", "reviewing"]);
  });

  test("every option has a non-empty label", () => {
    for (const option of REPORT_STATUS_OPTIONS) {
      expect(option.label.trim().length).toBeGreaterThan(0);
    }
  });

  test("open is the default a freshly filed report should start in", () => {
    // Guards against silently reordering this list in a way that changes which option a
    // careless <Select> default would land on — migration 0030's column default is 'open'.
    expect(REPORT_STATUS_OPTIONS[0].value).toBe("open");
  });
});
