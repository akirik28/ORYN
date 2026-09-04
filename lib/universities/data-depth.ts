import { NON_ACTIONABLE_VERIFICATION_STATES } from "@/lib/deadlines/ingest";
import { isDatedDeadlineUpcoming } from "@/lib/deadlines/lifecycle";

/**
 * Whether Oryn has recorded any real depth for this university — at least one program,
 * requirement, source, or statistics row — as opposed to just the identity fields
 * (name, country, city, website) a bulk institutional import populates on its own.
 *
 * 734 of 1,019 universities came from one bulk INSERT (2026-08-16, `data_status =
 * 'needs_review'`) and are real institutions, not placeholders: 724 of 734 have been
 * touched since insert, all have `last_checked_at`, only 16 lack a website. What they
 * lack is everything downstream of identity — of the 734, only 4 have any
 * `university_sources` row, 25 have programs, 18 have requirements (see
 * docs/handoffs/university-data-depth-honesty-2026-09-02.md). The detail page rendered
 * this silently: every section below the header is independently conditional on its own
 * table having rows, so a university with none of the four simply skipped straight from
 * the header to a stat grid whose cards all read "Unavailable" — indistinguishable from
 * an ordinary university missing one or two unpublished figures.
 *
 * Deliberately does NOT gate on `data_status` itself: that column is written by
 * `detect-stale-data` and never reflects anything about program/requirement/source
 * coverage (see the same handoff) — a university could plausibly be freshly re-checked
 * and still have never had programs or requirements acquired for it. Depth is measured
 * directly from what the page itself already needs to fetch to render, not from a
 * column that was never meant to answer this question.
 */
export function lacksResearchDepth(counts: {
  hasStatistics: boolean;
  programCount: number;
  requirementCount: number;
  sourceCount: number;
}): boolean {
  return !counts.hasStatistics && counts.programCount === 0 && counts.requirementCount === 0 && counts.sourceCount === 0;
}

/**
 * D6 (docs/PROXOLA-PLAN.md), 2026-09-04 — a different failure shape than
 * `lacksResearchDepth` above, found generalizing a real instance rather than proposed in
 * the abstract: MIT is targeted by students 10 times (the second-most of any university
 * with a real target_universities row) and has exactly one `university_deadlines` row —
 * `deadline_type: "scholarship"`, undated. `lacksResearchDepth`'s own row-count signals
 * would call this university fully depth-covered on the deadlines axis; a student opening
 * the page to answer "when do I apply" finds nothing that answers it. The row isn't
 * missing — it's the wrong kind of row. `lacksResearchDepth` cannot see this class of gap
 * by construction: it counts whether a table has any row at all, never what's in it.
 *
 * `deadlineTypes` is the caller's own list of `deadline_type` values for one university —
 * intentionally not the raw row objects, so this stays a pure predicate over exactly the
 * one fact that matters, testable without a fixture that carries the other dozen columns
 * `university_deadlines` has. "early" counts as a real application deadline alongside
 * "application" — Caltech's Restrictive Early Action deadline is exactly this shape (see
 * data/research/sql-dry-runs/universities/d5-caltech-deadlines-2026-09-04.sql), and a
 * student applying early has just as real an answer to "when do I apply" as one applying
 * regular decision.
 */
export function lacksApplicationDeadline(deadlineTypes: readonly string[]): boolean {
  return !deadlineTypes.includes("application") && !deadlineTypes.includes("early");
}

/**
 * D6's second confirmed instance of the same shape, in a different table: of the 12
 * universities on any student's real target_universities list, Oxford has exactly one
 * `university_statistics` row — and `admission_rate`, `sat_range_low`/`act_range_low`, and
 * `university_statistics.cost_of_attendance` are all null within it (only `stat_year`/
 * `source`/`data_confidence`-shaped bookkeeping columns are populated). A row-presence check
 * (`hasStatistics: true`, `lacksResearchDepth`'s own signal) marks Oxford as covered.
 *
 * All four fields null is the bar, not "missing any one" — a university with a real
 * admission rate but no published test-score range (score-optional policies are common
 * and not a data gap) should not trip this; only a row that answers none of the headline
 * questions does.
 *
 * **Correction, 2026-09-04, this file's own earlier version of this comment overstated the
 * render impact**: it claimed the detail page renders "four figures reading Unavailable" for
 * a university like Oxford. Checked directly and that's not accurate — Oxford's cost figure
 * comes from `university_profile_metrics` (tuition), a completely different table with its
 * own real, populated row (£9,790 domestic / £37,380 international), which the page's cost
 * `StatCard` already successfully falls back to regardless of what this function returns.
 * This function is still a correct measure of whether `university_statistics` itself has any
 * real content — the wrong claim was about what a student sees, not about what this checks.
 * See `lacksCoreAdmissionStats` below for the narrower, cost-excluded version actually wired
 * into the page's own empty-state decision, specifically to avoid repeating this mistake at
 * the render site.
 */
export function lacksAdmissionStatistics(stats: {
  admissionRate: number | null;
  satRangeLow: number | null;
  actRangeLow: number | null;
  costOfAttendance: number | null;
} | null): boolean {
  if (!stats) return true;
  return stats.admissionRate === null && stats.satRangeLow === null && stats.actRangeLow === null && stats.costOfAttendance === null;
}

/**
 * The version actually wired into `app/(app)/universities/[id]/page.tsx`'s own empty-state
 * decision — deliberately narrower than `lacksAdmissionStatistics` above, excluding
 * `costOfAttendance` on purpose. That field's own `StatCard` already has an independent
 * fallback chain (`university_profile_metrics`'s international/domestic tuition), so a
 * university like Oxford — `university_statistics.cost_of_attendance` null, but a real
 * tuition figure on file elsewhere — must not have its real, correctly-sourced tuition card
 * hidden behind a "no data" note that only the OTHER three fields actually earn. Using the
 * 4-field function for this render decision would produce that false positive, and the
 * opposite false negative too: a university with a real `cost_of_attendance` but nothing else
 * would read as "fine" under the 4-field check even though admission rate, test scores, and
 * graduation rate are all genuinely unresearched.
 */
export function lacksCoreAdmissionStats(stats: {
  admissionRate: number | null;
  satRangeLow: number | null;
  actRangeLow: number | null;
  graduationRate: number | null;
} | null): boolean {
  if (!stats) return true;
  return stats.admissionRate === null && stats.satRangeLow === null && stats.actRangeLow === null && stats.graduationRate === null;
}

export interface DeadlineRowForSoonest {
  deadline_type: string;
  deadline_date: string | null;
  recurrence: string;
  verification_state: string;
  recurrence_month: number | null;
  recurrence_day: number | null;
}

/**
 * The single soonest real application/early deadline for one university, across both dated
 * and recurring-undated rows — built for the universities compare table (C7 follow-up,
 * 2026-09-04), which needs one representative date per university rather than the detail
 * page's full per-deadline listing.
 *
 * Both branches matter, not just the dated one: of the 12 real `target_universities` rows,
 * Yale has ONLY `recurring_annual_undated` rows for both `application` and `early` — no dated
 * row at all. `lacksApplicationDeadline` correctly says Yale has real data (it does — a real
 * recurring November 1st early deadline), but a dated-only search would then render nothing
 * for a university this function's own sibling just said was covered.
 *
 * `today` is an explicit parameter rather than `new Date()` computed internally, for the same
 * reason `isDatedDeadlineUpcoming` (lib/deadlines/lifecycle.ts) takes one: a test needs to pin
 * behavior to a fixed date, not silently start failing months from now once a fixture's
 * pinned "upcoming" date is no longer in the future.
 */
export function soonestApplicationDeadline(rows: readonly DeadlineRowForSoonest[], today: Date): { date: Date; deadlineType: string } | null {
  const todayStr = today.toISOString().slice(0, 10);
  const candidates: { date: Date; deadlineType: string }[] = [];
  for (const d of rows) {
    if (d.deadline_type !== "application" && d.deadline_type !== "early") continue;
    if (NON_ACTIONABLE_VERIFICATION_STATES.has(d.verification_state)) continue;
    if (isDatedDeadlineUpcoming(d, todayStr)) {
      candidates.push({ date: new Date(`${d.deadline_date}T00:00:00Z`), deadlineType: d.deadline_type });
    } else if (d.recurrence === "recurring_annual_undated" && d.recurrence_month != null && d.recurrence_day != null) {
      const thisYear = new Date(Date.UTC(today.getUTCFullYear(), d.recurrence_month - 1, d.recurrence_day));
      const next = thisYear.getTime() >= today.getTime() ? thisYear : new Date(Date.UTC(today.getUTCFullYear() + 1, d.recurrence_month - 1, d.recurrence_day));
      candidates.push({ date: next, deadlineType: d.deadline_type });
    }
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.date.getTime() - b.date.getTime());
  return candidates[0];
}
