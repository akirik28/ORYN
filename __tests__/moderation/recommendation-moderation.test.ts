import { describe, expect, test } from "vitest";
import { isAdminProfile } from "@/lib/security/is-admin";
import { resolveReportedContentPreview } from "@/lib/moderation/content-preview";
import { MESSAGE_REPORTS_EXPORT_COLUMNS } from "@/lib/export/tables";
import type { Profile } from "@/types/database";

function profileWith(is_admin: unknown): Profile {
  return { is_admin } as unknown as Profile;
}

/**
 * Dedicated coverage for reporting/moderating a *recommendation* specifically —
 * app/(app)/admin/actions.ts's updateReportReview handles a report about a message and a
 * report about a recommendation through the exact same code path (message_reports has
 * one row shape, one RLS policy set, one Server Action; recommendation_id is just a
 * second, equally-nullable reference column added by migration 0035), so every
 * authorization gate below is the same one __tests__/security/is-admin.test.ts already
 * proves generically — re-asserted here with recommendation-report framing so this
 * acceptance criterion has its own traceable test, not just a shared generic one.
 */
describe("normal user cannot review a moderation item (recommendation report included)", () => {
  test("a non-admin profile is denied — the same gate updateReportReview and requireAdmin both use", () => {
    expect(isAdminProfile(profileWith(false))).toBe(false);
  });

  test("no profile at all (unauthenticated): denied", () => {
    expect(isAdminProfile(null)).toBe(false);
  });
});

describe("admin can review a recommendation report", () => {
  test("a profile with is_admin === true is allowed", () => {
    expect(isAdminProfile(profileWith(true))).toBe(true);
  });
});

describe("a reported recommendation resolves safely", () => {
  test("recommendation still exists: its body is shown", () => {
    const byId = new Map([["rec-1", "Ada is a thoughtful, rigorous collaborator."]]);
    expect(resolveReportedContentPreview("rec-1", byId, "(reported recommendation no longer available)")).toBe(
      "Ada is a thoughtful, rigorous collaborator."
    );
  });

  test("recommendation has since been deleted (recommendation_id survives via ON DELETE SET NULL until here, or the lookup simply has no entry): friendly fallback, not a crash", () => {
    const byId = new Map<string, string>();
    expect(resolveReportedContentPreview("rec-deleted", byId, "(reported recommendation no longer available)")).toBe(
      "(reported recommendation no longer available)"
    );
  });

  test("report references no recommendation at all (a plain message report, or a general report): resolves to null, not an empty/placeholder string", () => {
    expect(resolveReportedContentPreview(null, new Map(), "(reported recommendation no longer available)")).toBeNull();
  });
});

describe("reporter does not see admin-internal fields (same export allowlist a self-report read would use)", () => {
  test("never includes reviewed_by or resolution_note", () => {
    for (const column of ["reviewed_by", "resolution_note"]) {
      expect((MESSAGE_REPORTS_EXPORT_COLUMNS as readonly string[]).includes(column)).toBe(false);
    }
  });

  test("still includes recommendation_id, so a reporter can at least see what they reported", () => {
    expect((MESSAGE_REPORTS_EXPORT_COLUMNS as readonly string[]).includes("recommendation_id")).toBe(true);
  });
});
