import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUndefinedTableError } from "@/lib/supabase/errors";
import { resolveParentMonthlyCommentary, type ParentMonthlyCommentaryContent } from "./parent-commentary";

/**
 * P5's batch runner — the missing piece named explicitly in parent-commentary.ts's own module
 * comment and docs/parent-weekly-commentary-p5-2026-09-04.md's "Scope not built here" section:
 * "for every ACTIVE parent_link, call this." Migration 0116 (parent_links) is merged now,
 * where it was staged-not-applied when that file was written — this is the runner it was
 * waiting on, built as a separate lane extending that branch (not editing its content-assembly
 * files) per CEO's own division of the work.
 *
 * Mirrors lib/digest/run.ts's contract exactly — same dry-run-by-default posture, same
 * candidate/outcome/result shape, same "the one write this module makes" scoping — because
 * it is the identical kind of mechanism (periodic content, gated by a preference/entitlement
 * check, nothing sends) applied to a different candidate table and a different gate.
 *
 * Converted from weekly to monthly 2026-09-04 (B3b — founder: "ayda bir AI özet versin
 * gelişimi"). This file is where the cadence itself actually lives, not parent-commentary.ts:
 * no cron is armed (lib/jobs/schedule.ts, unchanged by this migration or this build) — nothing
 * guarantees this runner is invoked on any particular schedule, today or once armed. "Monthly"
 * therefore cannot mean "however often the job happens to run" — it has to be provable from
 * parent_links.last_commentary_sent_at, the one durable record of when a parent last actually
 * got commentary. isDueForMonthlyCommentary below is that check, applied per-candidate before
 * any tier check or AI call — a link commentaried three days ago is skipped here regardless of
 * how many times this pass runs in the meantime, the same way createConversation's session
 * wall doesn't care how many times it's called, only what the data already says.
 *
 * BUILT, DELIBERATELY NOT ARMED. This file contains no email-sending call anywhere, dry run or
 * not, for the same two reasons lib/digest/run.ts gives: no email-sending infrastructure
 * exists anywhere in this codebase, and the legal question isn't settled — with one addition
 * specific to this feature: the content here is about a minor, addressed to their guardian,
 * which is its own open question independent of the digest's. A non-dry run composes content
 * and records that commentary *would have been* generated (advancing
 * parent_links.last_commentary_sent_at) — it does not, and structurally cannot yet, deliver
 * anything to a parent. Nothing in this file, and nothing calling it, adds a cron entry —
 * arming the schedule is a founder decision, same as Job D and the student digest; shipping
 * this is preparation for that decision, not an implementation of it.
 */

/** ~30 days, not a calendar-month lookup (no "same day next month" edge case to get wrong for
 * the 29th-31st) — "ayda bir" (once a month) read as a rolling cadence off the last real send,
 * matching parent-commentary.ts's own periodStart fallback reasoning: a parent confirmed
 * mid-month gets their first note ~30 days later, not snapped to a calendar boundary. */
const MONTHLY_CADENCE_DAYS = 30;

/** Exported for its own direct test coverage — the single most important line in this file,
 * per B3b's own framing: prove the gate before the content, same standard the session-wall
 * fix (app/(app)/advisor/actions.ts's assertConversationLimitNotExceeded) was held to. `null`
 * (never sent) is immediately due — same "null = eligible" contract as
 * lib/digest/build.ts/parent-commentary.ts's own `since` handling throughout this feature. */
export function isDueForMonthlyCommentary(lastCommentarySentAt: string | null, now: Date = new Date()): boolean {
  if (!lastCommentarySentAt) return true;
  const daysSinceLastSent = (now.getTime() - new Date(lastCommentarySentAt).getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceLastSent >= MONTHLY_CADENCE_DAYS;
}

export interface ParentCommentaryRowReport {
  linkId: string;
  parentUserId: string;
  studentUserId: string;
  outcome: "would_send" | "sent" | "skipped_not_premium" | "skipped_not_due";
  content: ParentMonthlyCommentaryContent | null;
}

export interface ParentCommentaryRunOptions {
  /** Suppresses the one write this module makes (last_commentary_sent_at) — real reads, and
   * real AI calls when there's real signal, still happen. Defaults true so a caller must opt
   * in explicitly to write anything, matching lib/digest/run.ts's own DigestRunOptions. */
  dryRun?: boolean;
  maxRows?: number;
  /** Bypasses the `status = 'active'` filter for a caller-supplied list of parent_links row
   * ids — same affordance as DigestRunOptions.candidateIds, and the concrete mechanism the
   * design doc's own open item needs: running a handful of representative links through the
   * real `ai` path (not `ai_unavailable`) once real API access is available, without waiting
   * on genuine active links to exist. Does NOT bypass the tier gate inside
   * resolveParentMonthlyCommentary, or the due-date gate below — this option widens WHICH rows
   * are considered, never WHAT they're entitled to or WHEN they're actually due. */
  linkIds?: string[];
}

export interface ParentCommentaryRunResult {
  attempted: number;
  wouldSend: number;
  sent: number;
  skippedNotPremium: number;
  skippedNotDue: number;
  rows?: ParentCommentaryRowReport[];
}

const DEFAULT_MAX_ROWS = 100;

interface CandidateLink {
  id: string;
  parent_user_id: string;
  student_user_id: string;
  last_commentary_sent_at: string | null;
}

/**
 * `status = 'active'` filtered here, before resolveParentMonthlyCommentary is ever called —
 * per parent-commentary.ts's own contract comment: "a pending link grants nothing... this
 * function has no way to independently confirm that without parent_links, so it trusts its
 * caller." This is that caller, and the trust is placed correctly: a pending or revoked link
 * never reaches processOneLink at all, not even as a skipped_not_premium row, the same way a
 * digest_email_enabled=false profile never reaches buildDigestContent.
 *
 * Degrades to an empty candidate list if parent_links doesn't exist yet — same posture as
 * every other reader in lib/parent/, lib/tier/parent-tier.ts included, for the same reason:
 * this migration (0116) is merged in code but the founder applies it by hand, so "table
 * doesn't exist yet" is this environment's normal state until he runs it, not an error.
 */
async function loadCandidates(admin: SupabaseClient<Database>, options: ParentCommentaryRunOptions): Promise<CandidateLink[]> {
  let query = admin.from("parent_links").select("id, parent_user_id, student_user_id, last_commentary_sent_at");
  query = options.linkIds && options.linkIds.length > 0 ? query.in("id", options.linkIds) : query.eq("status", "active");

  const { data, error } = await query.limit(options.maxRows ?? DEFAULT_MAX_ROWS);
  if (error) {
    if (isUndefinedTableError(error, "parent_links")) return [];
    throw new Error(`[parent-commentary-run] failed to load candidate parent_links: ${error.message}`);
  }
  return data ?? [];
}

function baseRow(candidate: CandidateLink): Omit<ParentCommentaryRowReport, "outcome" | "content"> {
  return { linkId: candidate.id, parentUserId: candidate.parent_user_id, studentUserId: candidate.student_user_id };
}

async function processOneLink(admin: SupabaseClient<Database>, candidate: CandidateLink, dryRun: boolean): Promise<ParentCommentaryRowReport> {
  // The cadence gate, first — before the tier check, before any AI spend. A not-yet-due
  // Standard link and a not-yet-due Ultra link both stop here identically; which one it would
  // have been is a question this function never needs to answer for a link that isn't due.
  if (!isDueForMonthlyCommentary(candidate.last_commentary_sent_at)) {
    return { ...baseRow(candidate), outcome: "skipped_not_due", content: null };
  }

  const outcome = await resolveParentMonthlyCommentary(admin, candidate.student_user_id, candidate.last_commentary_sent_at);

  if (outcome.kind === "not_premium") {
    return { ...baseRow(candidate), outcome: "skipped_not_premium", content: null };
  }

  if (!dryRun) {
    const { error } = await admin.from("parent_links").update({ last_commentary_sent_at: new Date().toISOString() }).eq("id", candidate.id);
    if (error) throw new Error(`[parent-commentary-run] failed to record last_commentary_sent_at for link ${candidate.id}: ${error.message}`);
    // "sent" here means "this run recorded a send", matching lib/digest/run.ts's own
    // processOneStudent comment verbatim — no delivery API is called anywhere in this module.
    return { ...baseRow(candidate), outcome: "sent", content: outcome.content };
  }

  return { ...baseRow(candidate), outcome: "would_send", content: outcome.content };
}

export async function runParentMonthlyCommentaryPass(options: ParentCommentaryRunOptions = {}): Promise<ParentCommentaryRunResult> {
  const dryRun = options.dryRun ?? true;
  const admin = createAdminClient();
  const candidates = await loadCandidates(admin, options);

  const rows: ParentCommentaryRowReport[] = [];
  let wouldSend = 0;
  let sent = 0;
  let skippedNotPremium = 0;
  let skippedNotDue = 0;

  for (const candidate of candidates) {
    const row = await processOneLink(admin, candidate, dryRun);
    rows.push(row);
    if (row.outcome === "would_send") wouldSend++;
    if (row.outcome === "sent") sent++;
    if (row.outcome === "skipped_not_premium") skippedNotPremium++;
    if (row.outcome === "skipped_not_due") skippedNotDue++;
  }

  return {
    attempted: candidates.length,
    wouldSend,
    sent,
    skippedNotPremium,
    skippedNotDue,
    rows: dryRun ? rows : undefined, // same "rows only on a dry run" contract as run-job.ts/retention.ts/lib/digest/run.ts
  };
}
