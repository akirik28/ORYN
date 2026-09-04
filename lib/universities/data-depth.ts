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
 * `cost_of_attendance` are all null within it (only `stat_year`/`source`/`data_confidence`-
 * shaped bookkeeping columns are populated). A row-presence check (`hasStatistics: true`,
 * `lacksResearchDepth`'s own signal) marks Oxford as covered; the stat grid a student
 * actually reads renders four figures reading "Unavailable" — the identical rendered
 * outcome as having no row at all, which `hasStatistics` cannot distinguish.
 *
 * All four fields null is the bar, not "missing any one" — a university with a real
 * admission rate but no published test-score range (score-optional policies are common
 * and not a data gap) should not trip this; only a row that answers none of the headline
 * questions does.
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
