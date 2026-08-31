import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * ============================================================================
 * The admin post-moderation surface is safe for a DIFFERENT reason than the
 * student-facing layer, and nothing before this file said so out loud.
 * ============================================================================
 *
 * posts-hidden.test.ts proves the student-facing half of the social layer
 * (lib/social/post-actions.ts, lib/social/posts.ts) is unreachable via five independent
 * layers — route, nav, Server Action, flag, and migration 0058 itself being unapplied.
 *
 * app/(app)/admin/actions.ts's removeReportedPost/restoreReportedPost and
 * app/(app)/admin/page.tsx's post-report query are NOT covered by any of those layers:
 * they query `posts`/`post_likes` directly, they carry a real `"use server"` directive
 * (a genuine, callable Server Action — unlike anything in post-actions.ts), and none of
 * them call assertSocialFeedEnabled(). They are gated only by requireAdmin() and by one
 * fact this file exists specifically to pin: nothing anywhere can currently populate
 * `message_reports.post_id`, the one piece of data that makes any of them fire.
 *
 * If this file's assertions fail, that precondition chain has broken — a new insert path
 * can set message_reports.post_id, or reportPost itself has come loose from the flag —
 * and the admin path is one real post-report away from a "relation posts does not exist"
 * error, because migration 0058 is still unapplied. See
 * docs/migration-gap-audit-2026-08-31.md for the full trace this pins.
 */

const ROOT = join(import.meta.dirname, "..", "..");

function sourceFiles(dirs: string[]): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
    }
  };
  for (const dir of dirs) walk(join(ROOT, dir));
  return out;
}

/** The full body of one `export async function <name>(...)`, up to the next top-level
 * export (or end of file) — a fixed character slice is too fragile once a function grows
 * a few extra lines of validation before the line under test. */
function functionBody(contents: string, name: string): string {
  // The `(` right after the name is load-bearing: `reportPostForUser` starts with the
  // literal substring "reportPost", so a plain indexOf on the name alone would find the
  // wrong function whenever a same-prefixed sibling is declared first in the file (exactly
  // reportPostForUser's relationship to reportPost here).
  const match = new RegExp(`export async function ${name}\\(`).exec(contents);
  if (!match) throw new Error(`function ${name} not found`);
  const start = match.index;
  const rest = contents.slice(start + 1);
  const nextExportOffset = rest.search(/\nexport (async function|function|const)/);
  return nextExportOffset === -1 ? contents.slice(start) : contents.slice(start, start + 1 + nextExportOffset);
}

describe("message_reports.post_id has exactly one writer, and it is gated", () => {
  test("reportPost (lib/social/post-actions.ts) is the only insert anywhere that sets post_id on message_reports", () => {
    // Scans every source file's actual insert payload, not just files that mention
    // "message_reports" in passing (several do, in comments and unrelated reads).
    const offenders: string[] = [];
    for (const file of sourceFiles(["app", "features", "lib"])) {
      const contents = readFileSync(file, "utf8");
      const relPath = file.slice(ROOT.length + 1);
      const inserts = contents.matchAll(/\.from\(["']message_reports["']\)\s*\.insert\(\{([^}]*)\}/g);
      for (const match of inserts) {
        const payload = match[1];
        const setsPostId = /\bpost_id\s*:/.test(payload);
        if (setsPostId && relPath !== "lib/social/post-actions.ts") offenders.push(relPath);
      }
    }
    expect(offenders, "only lib/social/post-actions.ts may ever insert a post_id into message_reports").toEqual([]);
  });

  test("the two other live report-filing paths never set post_id", () => {
    // messages/actions.ts (reporting a message) and u/[id]/recommendation-actions.ts
    // (reporting a recommendation) are real, reachable report-filing Server Actions —
    // unlike reportPost. Confirms neither can accidentally become a second writer.
    const liveReportPaths = ["app/(app)/messages/actions.ts", "app/(app)/u/[id]/recommendation-actions.ts"];
    for (const relPath of liveReportPaths) {
      const contents = readFileSync(join(ROOT, relPath), "utf8");
      const insertCall = contents.slice(contents.indexOf('.from("message_reports")'));
      expect(insertCall.slice(0, 300), `${relPath} must never set post_id on message_reports`).not.toMatch(/\bpost_id\s*:/);
    }
  });

  test("reportPost itself is gated behind the social feed flag before it can reach that insert", () => {
    const contents = readFileSync(join(ROOT, "lib/social/post-actions.ts"), "utf8");
    expect(functionBody(contents, "reportPost")).toContain("assertSocialFeedEnabled()");
  });
});

describe("the admin moderation surface itself carries none of the five unreachability layers", () => {
  test("removeReportedPost, restoreReportedPost, and the admin page's post query all touch posts/post_likes directly, bypassing post-actions.ts and posts.ts", () => {
    const actions = readFileSync(join(ROOT, "app/(app)/admin/actions.ts"), "utf8");
    for (const fn of ["removeReportedPost", "restoreReportedPost"]) {
      expect(functionBody(actions, fn), `${fn} must query posts directly`).toMatch(/\.from\(["']posts["']\)/);
    }
    const page = readFileSync(join(ROOT, "app/(app)/admin/page.tsx"), "utf8");
    expect(page).toMatch(/\.from\(["']posts["']\)/);
  });

  test("none of the three admin call sites check the social feed flag — they rely entirely on the precondition chain, not the flag", () => {
    // This is the asymmetry the audit found: the student-facing layer is flag-gated
    // redundantly on top of four other guarantees; this admin path has no flag check at
    // all. If that ever changes, update this test to match — don't just delete it.
    const actions = readFileSync(join(ROOT, "app/(app)/admin/actions.ts"), "utf8");
    for (const fn of ["removeReportedPost", "restoreReportedPost"]) {
      expect(functionBody(actions, fn)).not.toContain("assertSocialFeedEnabled");
    }
  });

  test("requireAdmin is still the real gate on both admin actions — the precondition chain is a second, independent layer, not a replacement for authorization", () => {
    const actions = readFileSync(join(ROOT, "app/(app)/admin/actions.ts"), "utf8");
    for (const fn of ["removeReportedPost", "restoreReportedPost"]) {
      expect(functionBody(actions, fn)).toContain("requireAdmin()");
    }
  });
});
