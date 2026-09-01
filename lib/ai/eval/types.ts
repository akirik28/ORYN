import type { Locale } from "@/lib/i18n/config";

/** Which of the three prose-generating AI surfaces a case targets. Deliberately not a
 * fourth entry for "refine-achievement"/"essay-outlines"/"research-generator" — CEO's
 * assignment named these three specifically (the ones with an existing plumbing suite to
 * contrast against), and a rubric built for the counselor's demanding-mentor voice would
 * be the wrong instrument for those three, which have their own, different jobs. */
export type EvalTarget = "advisor_chat" | "weekly_plan" | "counselor_explain";

/** One thing a deterministic check found in a response — a fact, not a judgment call, so
 * it never needs a model to confirm it. */
export interface DeterministicFinding {
  check: string;
  /** The exact substring that tripped the check, for a human reading the report to verify
   * without re-deriving it. */
  evidence: string;
}

/** Phase 57's six adjectives, each scored independently rather than folded into one
 * number — a reply that is calm and evidence-aware but not action-oriented is a different
 * failure from one that's specific but praise-inflated, and averaging them would hide
 * which one broke. 1-5, not 0-10: fewer points on the scale is a deliberate push against
 * false precision from a judge that is itself just another model call. */
export interface RubricScores {
  specific: number;
  concise: number;
  analytical: number;
  calm: number;
  evidenceAware: number;
  actionOriented: number;
}

/** Phase 39's "don't do this" behavior is conditional, not universal — most replies have
 * no occasion to discourage anything, and scoring "did you discourage something" against a
 * case with nothing worth discouraging would punish the correct answer. `"n/a"` is a real
 * outcome, not a missing one. */
export type DiscourageVerdict = "said_dont_do_this" | "missed_the_opening" | "n/a";

/** The judge's structured verdict — same shape whether it came from a real model call or
 * (in this package's own tests) a MockAIProvider's queued fixture, which is the whole
 * point: the harness cannot tell the difference, and neither can its tests. */
export interface JudgeVerdict {
  scores: RubricScores;
  discourage: DiscourageVerdict;
  /** One or two sentences — the judge's own reasoning, kept so a human reviewing a low
   * score doesn't have to re-read the full reply to see what tripped it. */
  notes: string;
}

/** One fixture scenario: a student profile shaped to exercise something specific, paired
 * with the question/trigger that surfaces it. `expectDiscourage` records what a *correct*
 * reply should do here, independent of what the model actually said — the judge is scored
 * against this, not against its own unguided opinion of what "good" means. */
export interface EvalFixture {
  id: string;
  /** What this fixture is actually testing for — shown in the report next to any failure,
   * since "case advisor-3 failed" tells a reader nothing a week from now. */
  description: string;
  expectDiscourage: "yes" | "no";
}

/** One (fixture x target x locale) combination the harness actually runs. */
export interface EvalCase {
  fixture: EvalFixture;
  target: EvalTarget;
  locale: Locale;
}

export interface EvalCaseResult {
  case: EvalCase;
  /** The full response text/narrative actually produced — kept in the report so a human
   * can read what the model said, not just what the checks concluded about it. */
  responseText: string;
  deterministicFindings: DeterministicFinding[];
  /** Absent when the harness was run in deterministic-only mode (see harness.ts) — the
   * judge call is the second model call per case and is opt-in separately from the target
   * call itself, so a run can measure cost with zero judge calls before spending on any. */
  judge: JudgeVerdict | null;
  /** The target call's own usage. Always {0,0} for counselor_explain — that function
   * returns CounselorExplanation | null, not usage, so this harness has no way to observe
   * its actual token spend without changing that function's return type, which is out of
   * this package's scope. Never includes the judge call's usage — that's tracked
   * separately so a report can distinguish "grading the target" from "the target itself". */
  targetUsage: { inputTokens: number; outputTokens: number };
  judgeUsage: { inputTokens: number; outputTokens: number };
}

/** A case that threw instead of producing a result. Kept as data rather than allowed to
 * abort the run — see runEval's own comment on why. */
export interface EvalCaseFailure {
  case: EvalCase;
  message: string;
}

export interface EvalReport {
  results: EvalCaseResult[];
  /** Cases that threw. A run with failures is still a usable report for every case that
   * succeeded — and every one of those was paid for. */
  failures: EvalCaseFailure[];
  /** Cases with at least one deterministic finding — the thing this harness exists to
   * catch even when nobody reviews the qualitative scores. */
  deterministicFailureCount: number;
  totalUsage: { inputTokens: number; outputTokens: number };
}
