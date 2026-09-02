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
