import { describe, expect, test } from "vitest";
import {
  resolvePostModerationRender,
  buildPostRemovalUpdate,
  buildPostRestoreUpdate,
  validatePostReport,
  ModerationInputError,
  MAX_REMOVAL_REASON_LENGTH,
  MAX_REPORT_REASON_LENGTH,
  REPORTED_POST_MISSING_LABEL,
} from "@/lib/social/posts-moderation";
import { resolveReportedContentPreview } from "@/lib/moderation/content-preview";

const AUTHOR = "11111111-1111-1111-1111-111111111111";
const MODERATOR = "99999999-9999-9999-9999-999999999999";
const REPORTER = "22222222-2222-2222-2222-222222222222";
const REMOVED_AT = "2026-08-21T12:00:00.000Z";

describe("removal is never silent to the author, and never explained to anyone else", () => {
  test("a live post renders normally for everyone", () => {
    expect(resolvePostModerationRender({ isAuthor: true, removedAt: null })).toBe("visible");
    expect(resolvePostModerationRender({ isAuthor: false, removedAt: null })).toBe("visible");
  });

  test("the author of a removed post still sees it, with a notice", () => {
    // A 15-year-old whose post vanishes without explanation learns nothing and cannot
    // appeal. RLS backs this: the author branch is the only one not gated on removed_at.
    expect(resolvePostModerationRender({ isAuthor: true, removedAt: REMOVED_AT })).toBe("removed_notice");
  });

  test("everyone else gets nothing at all — not a 'removed by a moderator' marker", () => {
    expect(resolvePostModerationRender({ isAuthor: false, removedAt: REMOVED_AT })).toBe("hidden");
  });
});

describe("buildPostRemovalUpdate — the three columns move together or not at all", () => {
  test("writes exactly removed_at, removed_by and removal_reason", () => {
    const now = new Date("2026-08-21T12:00:00.000Z");
    expect(buildPostRemovalUpdate({ moderatorId: MODERATOR, reason: " spam ", now })).toEqual({
      removed_at: "2026-08-21T12:00:00.000Z",
      removed_by: MODERATOR,
      removal_reason: "spam",
    });
  });

  test("never writes a content column — a removal must not double as an edit", () => {
    const update = buildPostRemovalUpdate({ moderatorId: MODERATOR, reason: "spam" });
    expect(Object.keys(update).sort()).toEqual(["removal_reason", "removed_at", "removed_by"]);
  });

  test("a missing reason is rejected — an unexplained removal is not an auditable one", () => {
    expect(() => buildPostRemovalUpdate({ moderatorId: MODERATOR, reason: "   " })).toThrow(ModerationInputError);
  });

  test("a missing moderator id is rejected — the schema's paired-null constraint depends on it", () => {
    expect(() => buildPostRemovalUpdate({ moderatorId: "", reason: "spam" })).toThrow(ModerationInputError);
  });

  test("an over-long reason is truncated, not rejected — a moderator should not lose their work", () => {
    const update = buildPostRemovalUpdate({ moderatorId: MODERATOR, reason: "x".repeat(MAX_REMOVAL_REASON_LENGTH + 50) });
    expect(update.removal_reason).toHaveLength(MAX_REMOVAL_REASON_LENGTH);
  });

  test("a restore clears all three together", () => {
    expect(buildPostRestoreUpdate()).toEqual({ removed_at: null, removed_by: null, removal_reason: null });
  });
});

describe("validatePostReport", () => {
  test("returns the trimmed reason rather than mutating, so the caller cannot forget to use it", () => {
    expect(validatePostReport({ reporterId: REPORTER, reportedUserId: AUTHOR, reason: "  harassment  " })).toEqual({
      reason: "harassment",
    });
  });

  test("an empty reason is rejected", () => {
    expect(() => validatePostReport({ reporterId: REPORTER, reportedUserId: AUTHOR, reason: " " })).toThrow(
      ModerationInputError
    );
  });

  test("self-reporting is rejected", () => {
    // Never a real report, and it would let someone inflate the report count against
    // themselves to muddy a genuine complaint.
    expect(() => validatePostReport({ reporterId: AUTHOR, reportedUserId: AUTHOR, reason: "test" })).toThrow(
      ModerationInputError
    );
  });

  test("an over-long reason is truncated to the same bound reportMessage already uses", () => {
    const { reason } = validatePostReport({
      reporterId: REPORTER,
      reportedUserId: AUTHOR,
      reason: "x".repeat(MAX_REPORT_REASON_LENGTH + 100),
    });
    expect(reason).toHaveLength(MAX_REPORT_REASON_LENGTH);
  });
});

describe("the report queue survives the reported post being deleted", () => {
  // message_reports.post_id is `on delete set null` (migration 0058), matching message_id
  // and recommendation_id: the reporter's own words survive, the content does not. This
  // is the third content type routed through resolveReportedContentPreview — one label,
  // not a third mechanism.
  test("a still-present post renders its body", () => {
    const bodies = new Map([["post-1", "the reported text"]]);
    expect(resolveReportedContentPreview("post-1", bodies, REPORTED_POST_MISSING_LABEL)).toBe("the reported text");
  });

  test("a deleted post renders the placeholder instead of throwing or 'undefined'", () => {
    expect(resolveReportedContentPreview("post-1", new Map(), REPORTED_POST_MISSING_LABEL)).toBe(
      REPORTED_POST_MISSING_LABEL
    );
  });

  test("a report that names no post at all renders nothing", () => {
    expect(resolveReportedContentPreview(null, new Map(), REPORTED_POST_MISSING_LABEL)).toBeNull();
  });
});
