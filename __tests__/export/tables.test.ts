import { describe, expect, test } from "vitest";
import {
  EXPORT_TABLES,
  EXPORT_PARTICIPANT_TABLES,
  MESSAGE_REPORTS_EXPORT_COLUMNS,
  messagesExportFilter,
  connectionsExportFilter,
  BLOCKED_USERS_EXPORT_OWN_BLOCKS_COLUMN,
} from "@/lib/export/tables";

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

describe("MESSAGE_REPORTS_EXPORT_COLUMNS", () => {
  // Regression guard for the cross-user/admin-internal leak found during the migration
  // 0030 safety audit (docs/migration-safety-audit-0028-0031.md): RLS on message_reports
  // is row-level, so a naive `select("*")` on a reporter's own report would also hand
  // back reviewed_by (an admin's id) and resolution_note (admin-internal by the
  // moderation UI's own copy). This list must never include either.
  test.each(["reviewed_by", "resolution_note"])("never includes admin-internal column %s", (column) => {
    expect((MESSAGE_REPORTS_EXPORT_COLUMNS as readonly string[]).includes(column)).toBe(false);
  });

  // And it must still be useful — a reporter's export of their own report should keep
  // enough to be meaningful (what they reported, why, and its current review status).
  test.each(["id", "reporter_id", "reported_user_id", "message_id", "reason", "status", "created_at"])(
    "includes reporter-relevant column %s",
    (column) => {
      expect((MESSAGE_REPORTS_EXPORT_COLUMNS as readonly string[]).includes(column)).toBe(true);
    }
  );
});

describe("participant-pair export filters — scoped to the current user only", () => {
  const me = "11111111-1111-1111-1111-111111111111";
  const someoneElse = "22222222-2222-2222-2222-222222222222";

  test("messages filter references only the caller's own id, both directions", () => {
    const filter = messagesExportFilter(me);
    expect(filter).toBe(`sender_id.eq.${me},recipient_id.eq.${me}`);
    expect(filter).not.toContain(someoneElse);
  });

  test("connections filter references only the caller's own id, both directions", () => {
    const filter = connectionsExportFilter(me);
    expect(filter).toBe(`requester_id.eq.${me},recipient_id.eq.${me}`);
    expect(filter).not.toContain(someoneElse);
  });

  // Regression guard: exporting the blocked_id direction instead would leak "who
  // blocked me" — the exact disclosure the block-direction fix
  // (lib/messaging/authorization.ts) and is_blocked_between's security-definer design
  // both deliberately withhold.
  test("blocked_users export uses the blocker direction, never the blocked direction", () => {
    expect(BLOCKED_USERS_EXPORT_OWN_BLOCKS_COLUMN).toBe("blocker_id");
    expect(BLOCKED_USERS_EXPORT_OWN_BLOCKS_COLUMN).not.toBe("blocked_id");
  });
});
