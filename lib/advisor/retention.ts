import "server-only";

import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, AdvisorConversationRetentionAction } from "@/types/database";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAIProvider } from "@/lib/ai/index";
import { withUsageLogging } from "@/lib/ai/usage";
import { assertWithinJobBudget, JobBudgetExceededError } from "@/lib/ai/limits/job-budget";
import { resolvePlanTier } from "@/lib/tier/plan-tier";

/**
 * The 24-hour inactivity retention job — docs/ozellesme-spec-2026-09-03.md §3, founder
 * decision: a conversation untouched for 24 hours is summarised, its raw advisor_messages
 * are deleted, the summary stays. Ultra is exempt — no deletion, ever, for that tier.
 *
 * BUILT, DELIBERATELY NOT ARMED — same posture as canAutoApplyPromotion() in
 * lib/opportunities/reverification/demotion.ts, and for a stricter reason: the spec itself
 * says this "cannot be implemented before the privacy notice says so," and
 * LEGAL_REVIEW.md §3 item 5 lists retention as an open policy question with no answer today.
 * Nothing in this file, and nothing calling it, adds a cron entry (lib/jobs/schedule.ts /
 * vercel.json) — that is a founder decision gated on the privacy-notice and data-export
 * changes named in this module's own design doc, not a scheduling decision this file makes
 * for itself.
 *
 * Two independent gates, not one, because summarising and deleting are different-risk
 * actions: dryRun (default true in every real caller until explicitly overridden) suppresses
 * every write this module makes, matching lib/opportunities/reverification/run-job.ts's own
 * contract exactly — real reads, a real AI call, a real report, zero persistence. allowDelete
 * (env ADVISOR_RETENTION_ALLOW_DELETE, unset/false by default) additionally gates ONLY the
 * delete step, independent of dryRun — so a future decision to validate summary quality in
 * production without yet committing to irreversible deletion is expressible without a second
 * migration or a second job.
 */

const CANDIDATE_INACTIVITY_HOURS = 24; // §3: clock runs on conversation inactivity (updated_at), not message age
export const DEFAULT_MAX_ROWS = 25;
const SUMMARY_MODEL = "claude-haiku-4-5"; // §3 + job-budget.ts's own header: deliberately cheaper than the advisor's own model, not the default

function envAllowDelete(): boolean {
  // Read fresh, not cached at module load — same convention as run-job.ts's own
  // envAllowDemotion and job-budget.ts's envBudgetUsd, so a deploy-time change takes effect
  // on the next invocation without a redeploy of this module specifically.
  return (process.env.ADVISOR_RETENTION_ALLOW_DELETE ?? "").trim().toLowerCase() === "true";
}

const SummarySchema = z.object({
  summary: z
    .string()
    .describe(
      "A 2-4 sentence summary of this student's conversation with their career advisor: what topics were discussed, any goals, decisions, or profile facts established, and any question left open. Never invent anything not present in the conversation."
    ),
});

const SUMMARY_SYSTEM_PROMPT = `You are compressing one student's conversation with their own career advisor into a short summary, so the student's next conversation can pick up context after the raw messages are deleted for data-minimization reasons — not for any other reader.

Write 2-4 sentences. Cover: what the student was working on or asking about, anything the advisor and student agreed on or decided, and anything left unresolved. Never invent a fact, a number, a deadline, or a recommendation that isn't actually in the conversation — an inaccurate summary is worse than a short one.`;

interface RetentionCandidateRow {
  id: string;
  user_id: string;
  updated_at: string;
  summary: string | null;
  summarized_at: string | null;
}

export interface RetentionRowReport {
  conversationId: string;
  outcome: "summarized" | "messages_deleted" | "summarized_and_deleted" | "skipped_ultra" | "skipped_no_messages" | "skipped_budget";
  messagesConsidered: number;
  wouldWriteSummary: boolean;
  wouldDeleteMessages: boolean;
  messagesDeletedCount: number | null;
  error: string | null;
}

export interface RetentionRunOptions {
  /** Suppresses every write (summary, deletion, audit rows) — real reads and a real AI call
   * still happen, matching run-job.ts's own dryRun contract exactly. Defaults true so a
   * caller must opt in explicitly to write anything at all. */
  dryRun?: boolean;
  maxRows?: number;
  jobId?: string | null;
  /** Bypasses the 24h/due-set filter for a caller-supplied list — same affordance as
   * run-job.ts's own candidateIds, for a representative-sample measurement without waiting
   * on real conversations to age. */
  candidateIds?: string[];
}

export interface RetentionRunResult {
  attempted: number;
  summarized: number;
  messagesDeleted: number;
  skippedUltra: number;
  skippedNoMessages: number;
  skippedBudget: number;
  degraded: boolean;
  rows?: RetentionRowReport[];
}

async function loadCandidates(admin: SupabaseClient<Database>, options: RetentionRunOptions): Promise<RetentionCandidateRow[]> {
  let query = admin.from("advisor_conversations").select("id, user_id, updated_at, summary, summarized_at");

  if (options.candidateIds && options.candidateIds.length > 0) {
    query = query.in("id", options.candidateIds);
  } else {
    const cutoff = new Date(Date.now() - CANDIDATE_INACTIVITY_HOURS * 60 * 60 * 1000).toISOString();
    query = query.lt("updated_at", cutoff);
  }

  const { data, error } = await query.limit(options.maxRows ?? DEFAULT_MAX_ROWS);
  if (error) throw new Error(`[advisor-retention] failed to load candidate conversations: ${error.message}`);
  return data ?? [];
}

async function loadTier(admin: SupabaseClient<Database>, userId: string): Promise<"standard" | "ultra"> {
  const { data, error } = await admin.from("profiles").select("plan_tier, ultra_gift_expires_at").eq("id", userId).single();
  // Fails toward the safer side for a MINOR's data: an unreadable tier is treated as Ultra
  // (exempt, do nothing) rather than Standard (would delete) — the one place in this module
  // where "unknown" and "proceed cautiously" point the same direction as "don't touch it".
  if (error || !data) return "ultra";
  return resolvePlanTier(data);
}

async function processOneConversation(admin: SupabaseClient<Database>, candidate: RetentionCandidateRow, options: RetentionRunOptions, jobId: string | null): Promise<RetentionRowReport> {
  const dryRun = options.dryRun ?? true;
  const base = { conversationId: candidate.id, messagesConsidered: 0, wouldWriteSummary: false, wouldDeleteMessages: false, messagesDeletedCount: null as number | null, error: null as string | null };

  const tier = await loadTier(admin, candidate.user_id);
  if (tier === "ultra") {
    if (!dryRun) await writeAuditRow(admin, candidate.id, jobId, "skipped_ultra", null);
    return { ...base, outcome: "skipped_ultra" };
  }

  const { data: messages, error: messagesError } = await admin
    .from("advisor_messages")
    .select("id, role, content")
    .eq("conversation_id", candidate.id)
    .order("created_at", { ascending: true });
  if (messagesError) return { ...base, outcome: "skipped_no_messages", error: `failed to read messages: ${messagesError.message}` };

  const messageCount = messages?.length ?? 0;
  if (messageCount === 0) {
    // Already fully processed by an earlier pass (has a summary, raw rows already gone), or
    // genuinely empty — either way there is nothing left to summarise or delete.
    return { ...base, outcome: "skipped_no_messages", messagesConsidered: 0 };
  }

  let summaryText = candidate.summary;
  let wroteSummaryThisPass = false;

  if (!summaryText) {
    // Deliberately NOT caught here — JobBudgetExceededError propagates to runRetentionPass's
    // own loop, which stops attempting NEW summaries for the rest of this run (matching
    // run-job.ts's "stop, don't degrade" job-budget policy) while still letting
    // already-summarized candidates later in the batch proceed to deletion, since that step
    // is unpaid and unaffected by this exact budget.
    await assertWithinJobBudget("advisor_conversation_retention");

    const transcript = (messages ?? [])
      .map((m) => `${m.role === "user" ? "Student" : "Advisor"}: ${m.content ?? "[no content]"}`)
      .join("\n\n");

    const provider = getAIProvider();
    const result = await withUsageLogging(
      { userId: null, feature: "advisor_conversation_retention", selectModel: async () => ({ model: SUMMARY_MODEL, degraded: false, reason: "no_user", monthToDateSpendUsd: null }) },
      (model) =>
        provider.generateStructured({
          system: SUMMARY_SYSTEM_PROMPT,
          prompt: `<conversation>\n${transcript.slice(0, 40_000)}\n</conversation>`,
          schema: SummarySchema,
          schemaName: "summarize_advisor_conversation",
          schemaDescription: "A short, non-fabricated summary of a student's advisor conversation for data-minimization retention.",
          maxTokens: 512,
          model,
        })
    );
    summaryText = result.data.summary;
    wroteSummaryThisPass = true;
  }

  if (wroteSummaryThisPass && !dryRun) {
    const { error: updateError } = await admin.from("advisor_conversations").update({ summary: summaryText, summarized_at: new Date().toISOString() }).eq("id", candidate.id);
    if (updateError) return { ...base, outcome: "skipped_no_messages", messagesConsidered: messageCount, error: `failed to write summary: ${updateError.message}` };
    await writeAuditRow(admin, candidate.id, jobId, "summarized", null);
  }

  const wouldDelete = Boolean(summaryText); // never delete without a summary in hand, dry-run or real
  let deletedThisPass = false;
  if (wouldDelete && !dryRun && envAllowDelete()) {
    const { error: deleteError } = await admin.from("advisor_messages").delete().eq("conversation_id", candidate.id);
    if (deleteError) return { ...base, outcome: wroteSummaryThisPass ? "summarized" : "messages_deleted", messagesConsidered: messageCount, wouldWriteSummary: wroteSummaryThisPass, error: `failed to delete messages: ${deleteError.message}` };
    await writeAuditRow(admin, candidate.id, jobId, "messages_deleted", messageCount);
    deletedThisPass = true;
  }

  return {
    conversationId: candidate.id,
    outcome: deletedThisPass ? (wroteSummaryThisPass ? "summarized_and_deleted" : "messages_deleted") : wroteSummaryThisPass ? "summarized" : "skipped_no_messages",
    messagesConsidered: messageCount,
    wouldWriteSummary: wroteSummaryThisPass,
    wouldDeleteMessages: wouldDelete,
    messagesDeletedCount: deletedThisPass ? messageCount : null,
    error: null,
  };
}

async function writeAuditRow(admin: SupabaseClient<Database>, conversationId: string, jobId: string | null, action: AdvisorConversationRetentionAction, messagesDeletedCount: number | null): Promise<void> {
  const { error } = await admin.from("advisor_conversation_retention_runs").insert({ conversation_id: conversationId, run_id: jobId, action, messages_deleted_count: messagesDeletedCount });
  // Same rule as run-with-tracking.ts's own tracking write: an audit-log failure must never
  // fail the retention action it's describing — the summary/deletion already happened (or was
  // correctly suppressed); losing the audit row is a real gap worth logging, not a reason to
  // throw away real work or falsely report failure on a real success.
  if (error) console.error("[advisor-retention] failed to write audit row", { conversationId, action, error: error.message });
}

export async function runRetentionPass(options: RetentionRunOptions = {}): Promise<RetentionRunResult> {
  const dryRun = options.dryRun ?? true;
  const admin = createAdminClient();
  const candidates = await loadCandidates(admin, options);

  const rows: RetentionRowReport[] = [];
  let summarized = 0;
  let messagesDeleted = 0;
  let skippedUltra = 0;
  let skippedNoMessages = 0;
  let skippedBudget = 0;
  let degraded = false;
  // Once the monthly summarization budget is exhausted, every subsequent candidate that
  // needs a FRESH summary would immediately fail the same check — short-circuit those
  // without a wasted round trip, while still letting an already-summarized candidate
  // (deletion only, unpaid) proceed normally for the rest of this run.
  let budgetExhausted = false;

  for (const candidate of candidates) {
    if (budgetExhausted && !candidate.summary) {
      rows.push({ conversationId: candidate.id, outcome: "skipped_budget", messagesConsidered: 0, wouldWriteSummary: false, wouldDeleteMessages: false, messagesDeletedCount: null, error: "monthly summarization budget exhausted earlier this run" });
      skippedBudget++;
      continue;
    }

    let row: RetentionRowReport;
    try {
      row = await processOneConversation(admin, candidate, options, options.jobId ?? null);
    } catch (e) {
      if (e instanceof JobBudgetExceededError) {
        budgetExhausted = true;
        row = { conversationId: candidate.id, outcome: "skipped_budget", messagesConsidered: 0, wouldWriteSummary: false, wouldDeleteMessages: false, messagesDeletedCount: null, error: e.message };
      } else {
        throw e;
      }
    }
    rows.push(row);
    if (row.outcome === "summarized" || row.outcome === "summarized_and_deleted") summarized++;
    if (row.outcome === "messages_deleted" || row.outcome === "summarized_and_deleted") messagesDeleted += row.messagesDeletedCount ?? 0;
    if (row.outcome === "skipped_ultra") skippedUltra++;
    if (row.outcome === "skipped_no_messages") skippedNoMessages++;
    if (row.outcome === "skipped_budget") skippedBudget++;
    if (row.error) degraded = true;
  }

  return {
    attempted: candidates.length,
    summarized,
    messagesDeleted,
    skippedUltra,
    skippedNoMessages,
    skippedBudget,
    degraded,
    rows: dryRun ? rows : undefined, // same "rows only on a dry run" contract as run-job.ts's RunResult
  };
}
