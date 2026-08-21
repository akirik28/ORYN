import type { PostModerationUpdate } from "@/types/database";

/**
 * Moderation rules for the social layer — the pure half.
 *
 * This module exists because of a specific past failure this repo already made once and
 * documented: `message_reports` shipped in migration 0027 as insert-only, so a report was
 * written and nothing — not an admin, not the reporter — could ever read it back.
 * Migration 0030 added the review states; migration 0058 routes post reports through that
 * same queue. What was still missing after all of that is ENFORCEMENT: a moderator could
 * mark a report "resolved" but had no mechanism to actually take content down. That is
 * what `removed_at`/`removed_by`/`removal_reason` on `posts` and this module are for.
 *
 * Scope note, matching migration 0030's own: this is content removal, NOT user suspension.
 * "Suspended" needs enforcement at every entry point (auth, connections, messaging, posts)
 * and answers to product questions — how long, appealable how — that a column cannot
 * settle. Still out of scope, still in the founder-blocked backlog.
 */

/** Bounds the free-text reason a moderator records. Long enough for a real note, short
 * enough that the column is not a dumping ground for case history. */
export const MAX_REMOVAL_REASON_LENGTH = 500;

/** Bounds a reporter's free-text reason, matching `reportMessage`'s existing 1000. */
export const MAX_REPORT_REASON_LENGTH = 1000;

/**
 * How a post renders to a given viewer once moderation is taken into account.
 *
 * `removed_notice`: the AUTHOR of a removed post still sees it, with a notice. Silent
 * removal was rejected deliberately — a 15-year-old whose post vanishes with no
 * explanation learns nothing, cannot appeal, and reasonably concludes the product is
 * broken. RLS backs this: the author branch of the read policy is the only one that does
 * not require `removed_at is null`.
 *
 * `hidden`: everyone else. Not "removed by a moderator" — a third party is told nothing
 * about why a post is not there, for the same non-disclosure reason `resolveRepostRender`
 * has exactly one unavailable state.
 */
export type PostModerationRender = "visible" | "removed_notice" | "hidden";

export function resolvePostModerationRender(input: { isAuthor: boolean; removedAt: string | null }): PostModerationRender {
  if (!input.removedAt) return "visible";
  return input.isAuthor ? "removed_notice" : "hidden";
}

export class ModerationInputError extends Error {}

/**
 * The exact column set a moderator removal writes. Built here rather than inline at the
 * call site so the three columns can never be written apart from each other — migration
 * 0058's `posts_removal_shape` check constraint enforces `(removed_at is null) =
 * (removed_by is null)` at the database, and this is the same invariant expressed where a
 * developer will actually read it.
 *
 * Applied through the admin (service-role) client: `posts_guard_system_columns` restores
 * these columns on any update that is not from `service_role` or from inside another
 * trigger, so an author cannot clear their own removal, and a moderator cannot set one by
 * accident from a normal session.
 */
export function buildPostRemovalUpdate(input: { moderatorId: string; reason: string; now?: Date }): PostModerationUpdate {
  const reason = input.reason.trim();
  if (!reason) throw new ModerationInputError("A removal reason is required.");
  if (!input.moderatorId) throw new ModerationInputError("A moderator id is required.");
  return {
    removed_at: (input.now ?? new Date()).toISOString(),
    removed_by: input.moderatorId,
    removal_reason: reason.slice(0, MAX_REMOVAL_REASON_LENGTH),
  };
}

/** Restoring clears all three together, for the same paired-invariant reason. The removal
 * itself is not retained anywhere after a restore — if an audit trail of moderator
 * actions is needed, that is a separate table and a separate decision, flagged in the
 * backlog rather than half-built here. */
export function buildPostRestoreUpdate(): PostModerationUpdate {
  return { removed_at: null, removed_by: null, removal_reason: null };
}

/**
 * Validates a report before it reaches `message_reports`. Returns the trimmed reason
 * rather than mutating, so the caller cannot forget to use the trimmed value.
 *
 * Self-reporting is rejected: it is never a real report, and allowing it would let a user
 * inflate the report count against themselves to muddy a genuine complaint.
 */
export function validatePostReport(input: { reporterId: string; reportedUserId: string; reason: string }): { reason: string } {
  if (input.reporterId === input.reportedUserId) throw new ModerationInputError("You can't report your own post.");
  const reason = input.reason.trim();
  if (!reason) throw new ModerationInputError("Please describe the issue.");
  return { reason: reason.slice(0, MAX_REPORT_REASON_LENGTH) };
}

/**
 * The placeholder the admin queue shows when a reported post has since been deleted.
 * Paired with `resolveReportedContentPreview` (lib/moderation/content-preview.ts), which
 * already handles the message and recommendation cases — this is only the third label,
 * not a third mechanism.
 *
 * This is the visible edge of a real trade-off: `message_reports.post_id` is
 * `on delete set null`, so a report survives its post being deleted but the evidence does
 * not. The alternative — snapshotting reported content into the moderation table — would
 * mean retaining a copy of a minor's deleted content specifically so staff can read it
 * later. Which side of that line is correct is a legal question, not an engineering one;
 * it is written down in docs/founder-blocked-backlog.md rather than decided here.
 */
export const REPORTED_POST_MISSING_LABEL = "(reported post no longer available)";
