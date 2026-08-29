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
 * opposite. A future edit that removes the Storage loop, or that early-returns before
 * reaching it, would silently reopen that gap without any live-Supabase test ever catching
 * it — this file is what catches it instead.
 *
 * Ordering (Security Gate 1 second-pass review, 2026-08-29): deleteUser runs BEFORE Storage
 * cleanup, not after — an earlier version of this fix had it backwards. If deleteUser were
 * to fail AFTER Storage cleanup already succeeded, the student would be left with a live
 * account and permanently broken evidence/CV links; with deleteUser first, a Storage
 * failure after a successful account deletion only orphans bytes nothing can reference
 * again. See the function's own doc comment for the full failure-mode reasoning.
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

  test("the auth.users delete runs BEFORE Storage cleanup, not after (failure-mode reasoning in the doc comment)", () => {
    const deleteUserIndex = src.indexOf("admin.auth.admin.deleteUser(userId)");
    const storageLoopIndex = src.indexOf("for (const bucket of ACCOUNT_DELETION_STORAGE_BUCKETS)");
    expect(deleteUserIndex).toBeGreaterThan(-1);
    expect(storageLoopIndex).toBeGreaterThan(-1);
    expect(deleteUserIndex).toBeLessThan(storageLoopIndex);
  });

  test("a failed deleteUser call returns early, before Storage cleanup is attempted at all", () => {
    const deleteUserCallIndex = src.indexOf("const { error } = await admin.auth.admin.deleteUser(userId);");
    const errorReturnIndex = src.indexOf('if (error) return { error: "Couldn\'t delete your account', deleteUserCallIndex);
    const storageLoopIndex = src.indexOf("for (const bucket of ACCOUNT_DELETION_STORAGE_BUCKETS)");
    expect(deleteUserCallIndex).toBeGreaterThan(-1);
    expect(errorReturnIndex).toBeGreaterThan(deleteUserCallIndex);
    expect(errorReturnIndex).toBeLessThan(storageLoopIndex);
  });

  test("a Storage failure after a successful deleteUser does not throw or return an error — it falls through to sign-out", () => {
    const storageFailureLogIndex = src.indexOf("if (storageFailures.length > 0) {");
    const signOutIndex = src.indexOf("supabase.auth.signOut()");
    expect(storageFailureLogIndex).toBeGreaterThan(-1);
    expect(signOutIndex).toBeGreaterThan(storageFailureLogIndex);
    const betweenFailureLogAndSignOut = src.slice(storageFailureLogIndex, signOutIndex);
    expect(betweenFailureLogAndSignOut).not.toContain("return {");
  });

  test("still deletes the auth.users row, which cascades every DB table", () => {
    expect(src).toContain("await admin.auth.admin.deleteUser(userId);");
  });
});
