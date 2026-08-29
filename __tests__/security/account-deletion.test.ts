import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Regression pin for the account-deletion Storage-cleanup fix (Security Gate 1, 2026-08-29).
 * No live Supabase in this test environment (same constraint as
 * __tests__/security/computed-writes-use-admin-client.test.ts), so this pins the source text
 * rather than exercising the function. Before this fix, `deleteMyAccount` never touched
 * Storage at all — every evidence/CV object survived account deletion while the
 * confirmation dialog (features/settings/delete-account-dialog.tsx) told the student the
 * opposite. A future edit that removes the Storage loop, or moves it after
 * `deleteUser` in a way that early-returns before reaching it, would silently reopen that
 * gap without any live-Supabase test ever catching it — this file is what catches it instead.
 */

function read(relPath: string): string {
  return readFileSync(join(import.meta.dirname, "..", "..", relPath), "utf8");
}

describe("app/(app)/settings/actions.ts — deleteMyAccount", () => {
  const src = read("app/(app)/settings/actions.ts");

  test("imports and constructs the admin client (tryCreateAdminClient, not the throwing createAdminClient)", () => {
    expect(src).toContain('import { tryCreateAdminClient } from "@/lib/supabase/admin";');
    expect(src).not.toContain('import { createAdminClient } from "@/lib/supabase/admin";');
    expect(src).toContain("const admin = tryCreateAdminClient();");
  });

  test("returns a clear error rather than throwing when the admin client is unavailable", () => {
    expect(src).toMatch(/if \(!admin\) \{\s*\n\s*console\.error\("\[account-deletion\]/);
    expect(src).toMatch(/return \{ error: ["'`]Account deletion is temporarily unavailable/);
  });

  test("enumerates both the evidence and cv-uploads buckets by the user's own storage prefix", () => {
    expect(src).toContain('const ACCOUNT_DELETION_STORAGE_BUCKETS = ["evidence", "cv-uploads"] as const;');
    expect(src).toContain("for (const bucket of ACCOUNT_DELETION_STORAGE_BUCKETS)");
    expect(src).toContain("admin.storage.from(bucket).list(userId)");
  });

  test("removes every listed object rather than trusting a possibly-stale DB reference", () => {
    expect(src).toContain("const paths = objects.map((object) => `${userId}/${object.name}`);");
    expect(src).toContain("admin.storage.from(bucket).remove(paths)");
  });

  test("a Storage failure is logged, not silently dropped and not reported as success", () => {
    expect(src).toContain("storageFailures.push(bucket);");
    expect(src).toContain("console.error(`[account-deletion] couldn't list ${bucket}/${userId}:");
    expect(src).toContain("console.error(`[account-deletion] couldn't remove objects from ${bucket}/${userId}:");
    expect(src).toContain("if (storageFailures.length > 0) {");
    expect(src).toContain("orphaned files may remain and need manual follow-up");
  });

  test("Storage cleanup runs BEFORE the auth.users delete, and a Storage failure does not block it (best-effort, matching deleteEvidence's own convention elsewhere in this codebase)", () => {
    const storageLoopIndex = src.indexOf("for (const bucket of ACCOUNT_DELETION_STORAGE_BUCKETS)");
    const deleteUserIndex = src.indexOf("admin.auth.admin.deleteUser(userId)");
    expect(storageLoopIndex).toBeGreaterThan(-1);
    expect(deleteUserIndex).toBeGreaterThan(-1);
    expect(storageLoopIndex).toBeLessThan(deleteUserIndex);
    // No `return` between the storage-failure log and the deleteUser call — a Storage
    // failure must fall through to the account deletion, not short-circuit before it.
    const betweenStorageAndDelete = src.slice(src.indexOf("if (storageFailures.length > 0) {"), deleteUserIndex);
    expect(betweenStorageAndDelete).not.toContain("return {");
  });

  test("still deletes the auth.users row, which cascades every DB table", () => {
    expect(src).toContain("await admin.auth.admin.deleteUser(userId);");
  });
});
