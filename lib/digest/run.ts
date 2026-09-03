import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildDigestContent, type DigestContent } from "@/lib/digest/build";

/**
 * The periodic email digest batch runner — docs/digest-email-design-2026-09-03.md, founder
 * decision, 2026-09-03: periodic email to students, same content shape for every plan tier,
 * weekly cadence.
 *
 * BUILT, DELIBERATELY NOT ARMED — same posture as lib/advisor/retention.ts (migration 0112)
 * and opportunity_reverification's canAutoApplyPromotion(). **This file contains no
 * email-sending call anywhere, dry run or not** — there is nothing to wire even if the legal
 * question were already settled, since no email-sending infrastructure exists anywhere in this
 * codebase (confirmed by grep,
 * docs/email-audit-transactional-vs-commercial-2026-09-03.md). A non-dry run composes content
 * and records that a digest *would have been* sent (advancing last_digest_sent_at) — it does
 * not, and structurally cannot yet, deliver anything to a student.
 *
 * Nothing in this file, and nothing calling it, adds a cron entry (lib/jobs/schedule.ts) —
 * arming the schedule is a founder decision gated on (1) counsel confirming the classification
 * in the design doc, and (2) an actual email provider being chosen and integrated. Shipping
 * this is preparation for that decision, not an implementation of it.
 */

export interface DigestRowReport {
  userId: string;
  outcome: "would_send" | "sent" | "skipped_opted_out" | "skipped_no_content";
  content: DigestContent | null;
}

export interface DigestRunOptions {
  /** Suppresses the one write this module makes (last_digest_sent_at) — real reads still
   * happen, matching run-job.ts's and retention.ts's own dryRun contract exactly. Defaults
   * true so a caller must opt in explicitly to write anything at all. */
  dryRun?: boolean;
  maxRows?: number;
  /** Bypasses the "opted in" filter for a caller-supplied list — same affordance as
   * retention.ts's own candidateIds, for a representative-sample measurement without waiting
   * on real preference data. */
  candidateIds?: string[];
}

export interface DigestRunResult {
  attempted: number;
  wouldSend: number;
  sent: number;
  skippedOptedOut: number;
  skippedNoContent: number;
  rows?: DigestRowReport[];
}

const DEFAULT_MAX_ROWS = 100;

interface CandidateRow {
  id: string;
  digest_email_enabled: boolean;
  last_digest_sent_at: string | null;
}

async function loadCandidates(admin: SupabaseClient<Database>, options: DigestRunOptions): Promise<CandidateRow[]> {
  let query = admin.from("profiles").select("id, digest_email_enabled, last_digest_sent_at");
  if (options.candidateIds && options.candidateIds.length > 0) {
    query = query.in("id", options.candidateIds);
  }
  const { data, error } = await query.limit(options.maxRows ?? DEFAULT_MAX_ROWS);
  if (error) throw new Error(`[digest] failed to load candidate profiles: ${error.message}`);
  return data ?? [];
}

async function processOneStudent(admin: SupabaseClient<Database>, candidate: CandidateRow, dryRun: boolean): Promise<DigestRowReport> {
  if (!candidate.digest_email_enabled) {
    return { userId: candidate.id, outcome: "skipped_opted_out", content: null };
  }

  const content = await buildDigestContent(admin, candidate.id, candidate.last_digest_sent_at);
  if (content === null) {
    return { userId: candidate.id, outcome: "skipped_no_content", content: null };
  }

  if (!dryRun) {
    const { error } = await admin.from("profiles").update({ last_digest_sent_at: new Date().toISOString() }).eq("id", candidate.id);
    if (error) throw new Error(`[digest] failed to record last_digest_sent_at for ${candidate.id}: ${error.message}`);
    // "sent" here means "this run recorded a send" — see this file's own header: no email
    // API is called anywhere in this module. A future caller that wires real delivery must
    // call the actual send between buildDigestContent and this update, not treat this
    // outcome as proof delivery happened.
    return { userId: candidate.id, outcome: "sent", content };
  }

  return { userId: candidate.id, outcome: "would_send", content };
}

export async function runDigestPass(options: DigestRunOptions = {}): Promise<DigestRunResult> {
  const dryRun = options.dryRun ?? true;
  const admin = createAdminClient();
  const candidates = await loadCandidates(admin, options);

  const rows: DigestRowReport[] = [];
  let wouldSend = 0;
  let sent = 0;
  let skippedOptedOut = 0;
  let skippedNoContent = 0;

  for (const candidate of candidates) {
    const row = await processOneStudent(admin, candidate, dryRun);
    rows.push(row);
    if (row.outcome === "would_send") wouldSend++;
    if (row.outcome === "sent") sent++;
    if (row.outcome === "skipped_opted_out") skippedOptedOut++;
    if (row.outcome === "skipped_no_content") skippedNoContent++;
  }

  return {
    attempted: candidates.length,
    wouldSend,
    sent,
    skippedOptedOut,
    skippedNoContent,
    rows: dryRun ? rows : undefined, // same "rows only on a dry run" contract as run-job.ts/retention.ts
  };
}
