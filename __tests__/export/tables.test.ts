import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  EXPORT_TABLES,
  EXPORT_PARTICIPANT_TABLES,
  EXPORT_EXCLUDED_TABLES,
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

  // Regression guard for the specific sequencing this table depends on: product_events
  // was excluded because migration 0073's "select own product_events" RLS policy hadn't
  // shipped yet. It has (confirmed 2026-09-02 against the live database's pg_policies,
  // not inferred from the migration file existing — see docs/migration-state.md), so this
  // table now belongs in EXPORT_TABLES, not EXPORT_EXCLUDED_TABLES. If this ever moves
  // back, it means someone reverted 0073 without reverting this line too.
  test("product_events is exported, not excluded — its RLS policy (migration 0073) is live", () => {
    expect((EXPORT_TABLES as readonly string[]).includes("product_events")).toBe(true);
    expect(EXPORT_EXCLUDED_TABLES).not.toHaveProperty("product_events");
  });

  // Same sequencing guard as product_events above, for the same reason: birth_year_changes
  // was excluded because RLS had zero policies (DATA_RIGHTS_AUDIT.md Part 3a), not because
  // the table was unapplied. Migration 0142 added a "select own birth year changes" policy,
  // confirmed live (see that migration's own header), so this now belongs in EXPORT_TABLES.
  // If this ever moves back, it means someone reverted that policy without reverting this
  // line too.
  test("birth_year_changes is exported, not excluded — its select-own RLS policy is live", () => {
    expect((EXPORT_TABLES as readonly string[]).includes("birth_year_changes")).toBe(true);
    expect(EXPORT_EXCLUDED_TABLES).not.toHaveProperty("birth_year_changes");
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
  // AGENTS.md section 12 requires data export, so the export shape for posts is decided
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

/**
 * The enumerated cases above are regression guards for gaps someone already found. This
 * one is derived, so it also catches the gap nobody has found yet.
 *
 * It reads the migrations rather than a hand-kept list, and asserts that every table
 * carrying a `user_id` is either exported or explicitly excluded with a reason. That is
 * exactly how the previous gap happened: five tables holding what Proxola concluded *about*
 * a student (opportunity_matches, student_requirement_evaluations, ai_recommendations,
 * ai_usage, rate_limit_events) matched EXPORT_TABLES' own stated rule and were simply
 * never added, with nothing anywhere recording a decision either way.
 */
describe("every user_id table is exported or excluded on purpose", () => {
  const migrationsDir = join(process.cwd(), "supabase", "migrations");
  // SOCIAL_POSTS_EXPORT_TABLES counts as covered: the export surface for the social layer
  // is defined and tested, just not wired into the route while migration 0058 stays
  // unapplied (see that constant's own header).
  const covered = new Set<string>([...EXPORT_TABLES, ...EXPORT_PARTICIPANT_TABLES, ...SOCIAL_POSTS_EXPORT_TABLES, "profiles"]);

  /** Tables created with a `user_id` column, minus any later dropped. */
  function userIdTablesFromMigrations(): string[] {
    const created = new Set<string>();
    const dropped = new Set<string>();

    for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort()) {
      const sql = readFileSync(join(migrationsDir, file), "utf8");

      // `create table public.x ( ... );` — body up to the closing paren at line start.
      for (const match of sql.matchAll(/create table (?:if not exists )?public\.([a-z_]+)\s*\(([\s\S]*?)^\);/gim)) {
        if (/\buser_id\b/.test(match[2])) created.add(match[1]);
      }
      // A user_id added afterwards counts the same.
      for (const match of sql.matchAll(/alter table (?:only )?public\.([a-z_]+)[\s\S]{0,200}?add column (?:if not exists )?user_id\b/gim)) {
        created.add(match[1]);
      }
      for (const match of sql.matchAll(/drop table (?:if exists )?public\.([a-z_]+)/gim)) {
        dropped.add(match[1]);
      }
    }
    return [...created].filter((t) => !dropped.has(t)).sort();
  }

  test("the migration scan finds a realistic number of tables — a broken regex must fail loudly, not silently pass", () => {
    // Without this, a regex that stops matching turns the assertion below into a no-op
    // that reports success forever, which is the failure mode this whole file exists to
    // catch elsewhere.
    expect(userIdTablesFromMigrations().length).toBeGreaterThan(25);
  });

  test.each(userIdTablesFromMigrations())("%s is covered or documented", (table) => {
    const isCovered = covered.has(table) || table in EXPORT_EXCLUDED_TABLES;
    expect(isCovered, `${table} has a user_id column but is neither in EXPORT_TABLES/EXPORT_PARTICIPANT_TABLES nor in EXPORT_EXCLUDED_TABLES. Add it to the export, or add it to the exclusion map with the reason.`).toBe(true);
  });

  test("every exclusion carries a reason", () => {
    for (const [table, reason] of Object.entries(EXPORT_EXCLUDED_TABLES)) {
      expect(reason.length, `${table} is excluded without a reason`).toBeGreaterThan(20);
    }
  });
});
