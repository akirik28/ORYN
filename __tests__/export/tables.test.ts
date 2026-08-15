import { describe, expect, test } from "vitest";
import { EXPORT_TABLES, EXPORT_PARTICIPANT_TABLES } from "@/lib/export/tables";

describe("data export table coverage", () => {
  const allTables = new Set<string>([...EXPORT_TABLES, ...EXPORT_PARTICIPANT_TABLES, "profiles"]);

  // Regression guard for the confirmed audit gap (docs/qa-environment-readiness-audit.md
  // §6.4): export previously covered 25 tables but silently dropped Sports and every
  // social/messaging table. A student's own sports entries, connections, messages, blocks,
  // and filed reports are all first-party data a minor-safe export must include.
  test.each([
    "sports_experiences",
    "messages",
    "connections",
    "blocked_users",
    "message_reports",
    "notifications",
  ])("includes %s", (table) => {
    expect(allTables.has(table)).toBe(true);
  });

  test("no table name is duplicated between the two lists", () => {
    const dupes = EXPORT_TABLES.filter((t) => (EXPORT_PARTICIPANT_TABLES as readonly string[]).includes(t));
    expect(dupes).toEqual([]);
  });
});
