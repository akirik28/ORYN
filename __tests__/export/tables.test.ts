import { describe, expect, test } from "vitest";
import {
  EXPORT_TABLES,
  EXPORT_PARTICIPANT_TABLES,
  MESSAGE_REPORTS_EXPORT_COLUMNS,
  PROFILE_VIEWS_EXPORT_COLUMNS,
  messagesExportFilter,
  connectionsExportFilter,
  recommendationsExportFilter,
  BLOCKED_USERS_EXPORT_OWN_BLOCKS_COLUMN,
  SKILL_ENDORSEMENTS_EXPORT_OWN_COLUMN,
  SOCIAL_POSTS_EXPORT_TABLES,
  POSTS_EXPORT_OWN_COLUMN,
  POST_LIKES_EXPORT_OWN_COLUMN,
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
    // Professional Profile pack (migrations 0033-0036).
    "contact_info",
    "featured_items",
    "recommendations",
    "skill_endorsements",
    "profile_views",
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
  test.each(["id", "reporter_id", "reported_user_id", "message_id", "recommendation_id", "reason", "status", "created_at"])(
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

  test("recommendations filter references only the caller's own id, both directions (author or recipient)", () => {
    const filter = recommendationsExportFilter(me);
    expect(filter).toBe(`author_id.eq.${me},recipient_id.eq.${me}`);
    expect(filter).not.toContain(someoneElse);
  });

  test("skill_endorsements export uses the endorser (authorship) column", () => {
    expect(SKILL_ENDORSEMENTS_EXPORT_OWN_COLUMN).toBe("endorser_id");
  });
});

describe("social layer export surface — defined now, wired at switch-on", () => {
  // AGENTS.md Phase 12 requires data export, so the export shape for posts is decided
  // here rather than left to whoever switches the feature on. It is deliberately NOT in
  // the two live lists yet: those drive real queries on a route every student can reach,
  // and migration 0058's tables do not exist in any applied migration. This asserts the
  // decision in BOTH directions, so neither half can drift silently.
  test("the social tables are named and ordered for switch-on", () => {
    expect(SOCIAL_POSTS_EXPORT_TABLES).toEqual(["posts", "post_likes"]);
  });

  test("posts is keyed by author_id — it has no plain user_id column", () => {
    expect(POSTS_EXPORT_OWN_COLUMN).toBe("author_id");
  });

  test("post_likes has a plain user_id and fits the generic export path", () => {
    expect(POST_LIKES_EXPORT_OWN_COLUMN).toBe("user_id");
  });

  test.each(SOCIAL_POSTS_EXPORT_TABLES)("%s is NOT live in the export route yet", (table) => {
    const live = new Set<string>([...EXPORT_TABLES, ...EXPORT_PARTICIPANT_TABLES]);
    expect(live.has(table)).toBe(false);
  });

  test("post_revisions is deliberately absent from the export surface entirely", () => {
    // Superseded versions of the student's own content, retained so an edit cannot
    // silently rewrite what others already saw. Whether portability or erasure has to
    // include them is a legal question, recorded in docs/founder-blocked-backlog.md.
    expect((SOCIAL_POSTS_EXPORT_TABLES as readonly string[]).includes("post_revisions")).toBe(false);
  });

  test("a reporter's own report about a post exports which post it was about", () => {
    // Omitting recommendation_id was a real gap once; this is the same gap for posts.
    expect((MESSAGE_REPORTS_EXPORT_COLUMNS as readonly string[]).includes("post_id")).toBe(true);
  });
});

describe("PROFILE_VIEWS_EXPORT_COLUMNS — never exposes viewer identity", () => {
  // Regression guard: profile_views' entire product commitment (spec: PROFILE VIEWS) is
  // that a viewed user never learns who viewed them — that must hold in their own data
  // export too, not just the UI.
  test("never includes viewer_id", () => {
    expect((PROFILE_VIEWS_EXPORT_COLUMNS as readonly string[]).includes("viewer_id")).toBe(false);
  });

  test("still includes enough to be meaningful", () => {
    for (const column of ["id", "viewed_on", "created_at"]) {
      expect((PROFILE_VIEWS_EXPORT_COLUMNS as readonly string[]).includes(column)).toBe(true);
    }
  });
});
