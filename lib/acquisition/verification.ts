/**
 * Verification state and freshness, as one shared vocabulary.
 *
 * These are the release states documented in docs/cialfo-public-intelligence-audit.md and
 * in the founder-facing Drive audit. The point of putting them in code rather than only in
 * prose is that a fact's state becomes a computed consequence of its provenance — source
 * authority, the year the source states, and when we retrieved it — instead of a label a
 * pipeline author picks by hand and can quietly get wrong.
 *
 * `verified_current` is never something a caller asserts; it is something
 * `resolveVerificationState` concludes. Nothing here can promote a fact whose source was
 * not accepted for its fact class (see source-authority.ts) — such a fact has no
 * verification state at all and must not be published.
 */

/** Matches the `verification_state` CHECK constraint on `opportunities` (migration 0041)
 * and on `university_requirements` (migration 0042), plus the two states that exist only
 * as pipeline outcomes and are never written as a row's own state. */
export type VerificationState =
  | "verified_current"
  | "verified_historical"
  | "verified_derived"
  | "unverified"
  | "conflicting";

/** Pipeline outcomes that are recorded about an attempt rather than stored on a fact. */
export type AcquisitionOutcome = VerificationState | "stale" | "unresolved";

export type Freshness = "CURRENT" | "ACCEPTABLE_BUT_AGING" | "STALE" | "DATE_UNKNOWN";

/**
 * Freshness from a `stats_as_of` string, which is deliberately free text: sources state
 * "2024", "2023/24", "Fall 2025", or nothing usable at all. Takes the newest 4-digit year
 * present, because an academic-year string like "2024/25" should classify on its later end.
 *
 * `nowYear` is injected so tests are not time-dependent and so a report can classify a
 * historical snapshot against the year it was taken.
 */
export function classifyFreshness(statsAsOf: string | null | undefined, nowYear: number): Freshness {
  if (!statsAsOf) return "DATE_UNKNOWN";
  const years = [...statsAsOf.matchAll(/20[0-9]\d/g)].map((m) => Number(m[0])).filter((y) => y <= nowYear + 1);
  if (years.length === 0) return "DATE_UNKNOWN";
  const best = Math.max(...years);
  if (best >= nowYear - 2) return "CURRENT";
  if (best >= nowYear - 4) return "ACCEPTABLE_BUT_AGING";
  return "STALE";
}

/** Refresh cadence per fact class, in days. Deadlines and fees move every cycle; a
 * university's canonical identity does not. Values mirror the audit's pipeline plan. */
export const CADENCE_DAYS: Record<string, number> = {
  deadline: 7,
  cost: 90,
  policy: 90,
  programs: 180,
  population: 365,
  identity: 365,
  research_strength: 365,
};

export interface VerificationInput {
  /** Null means the source was not acceptable for this fact class — see sourceAuthority(). */
  authority: { tier: "HIGH" | "MEDIUM" } | null;
  /** The year the *source* states its figure is for, if any. Not the retrieval year. */
  sourceYear: number | null;
  /** When we actually read the source. ISO string. */
  retrievedAt: string;
  /** Days after which this fact class should be re-checked. */
  cadenceDays: number;
  /** True when another same-tier source disagrees on the value. */
  conflicting?: boolean;
  /** True when the value was computed from other verified facts rather than read directly. */
  derived?: boolean;
  now?: Date;
}

/**
 * The verification state a fact earns from its provenance.
 *
 * Order of precedence matters and is deliberate:
 *   1. an unacceptable source can never be verified, whatever else is true;
 *   2. a genuine same-tier disagreement is `conflicting` — we do not pick a winner;
 *   3. a derived value is `verified_derived` regardless of its age, because its inputs
 *      carry the dates that matter;
 *   4. a source stating an old year is `verified_historical` — real, dated, not current;
 *   5. past its cadence window it is stale (returned as the `stale` outcome, which callers
 *      surface with the fact's age rather than hiding the fact);
 *   6. otherwise `verified_current`.
 */
export function resolveVerificationState(input: VerificationInput): AcquisitionOutcome {
  if (!input.authority) return "unverified";
  if (input.conflicting) return "conflicting";
  if (input.derived) return "verified_derived";

  const now = input.now ?? new Date();
  const nowYear = now.getUTCFullYear();

  if (input.sourceYear !== null) {
    // A figure the source itself labels as more than two years old is historical, not
    // current, no matter how recently we fetched the page carrying it.
    if (input.sourceYear < nowYear - 2) return "verified_historical";
  }

  const retrieved = Date.parse(input.retrievedAt);
  if (Number.isNaN(retrieved)) return "unverified";
  const ageDays = (now.getTime() - retrieved) / 86_400_000;
  if (ageDays > input.cadenceDays) return "stale";

  return "verified_current";
}

/** Only these states may be shown to a student as an asserted fact. Everything else is
 * either displayed with an explicit caveat (`stale`, `verified_historical`) or not
 * displayed as fact at all (`unverified`, `conflicting`, `unresolved`). */
export function isPublishableAsFact(outcome: AcquisitionOutcome): boolean {
  return outcome === "verified_current" || outcome === "verified_derived";
}

/** True when the outcome must never be rendered without its date or a caveat beside it. */
export function requiresCaveat(outcome: AcquisitionOutcome): boolean {
  return outcome === "verified_historical" || outcome === "stale" || outcome === "conflicting";
}

/**
 * A fact whose freshness is governed by a known external annual publication event, not a
 * rolling day-count — CADENCE_DAYS above answers "how many days since we last looked is
 * too many", which is a good proxy for a slowly-changing fact (a university's identity,
 * its general programme catalogue) but the wrong question for a fact that changes
 * exactly once a year, on a roughly known date, regardless of when it was last checked.
 *
 * Concretely: a CAO points cutoff checked in March (getting last August's figure,
 * since this year's isn't out yet) and re-checked 365 days later lands back in March —
 * roughly seven months after this year's real publication in August, and roughly five
 * months before it's actually needed again. The interval fires at the wrong time because
 * it's anchored to an arbitrary first-check date instead of the calendar event itself.
 * `nextAnnualWindowStart` / `isDueForAnnualRecheck` below anchor to the event instead —
 * see CAO_POINTS_IE for the first concrete instance and the evidence behind it.
 *
 * `month`/`day` name the EARLIEST date in the calendar year fresh data could exist, not
 * a guaranteed-exact publication date — real external calendars move by a few days year
 * to year. Deliberately just one anchor date rather than a start+duration window: a
 * window implies a precision about the publication's own spread that isn't actually
 * known here, and one slightly-early anchor date is enough to answer "is a re-check
 * worth attempting yet" without claiming more certainty than the sourcing supports.
 */
export interface AnnualCalendarWindow {
  /** Human-readable, e.g. "CAO points (Ireland) — Round 1 offers". */
  label: string;
  /** 1-12. */
  month: number;
  /** Earliest day of `month` this window's publication could land. */
  day: number;
}

/**
 * The next date on or after `after` at which `window`'s annual publication is expected —
 * the anchor a calendar-bound fact's next check should use instead of a rolling
 * day-count. Pure, deterministic, no I/O.
 *
 * Compares by UTC calendar date only (both `after` and the returned date are UTC
 * midnight), matching `resolveVerificationState`'s own use of `Date`/`getUTCFullYear`
 * elsewhere in this file — a fact's freshness is a calendar-day question, not a
 * timezone-of-day one.
 */
export function nextAnnualWindowStart(window: AnnualCalendarWindow, after: Date): Date {
  const year = after.getUTCFullYear();
  const candidate = new Date(Date.UTC(year, window.month - 1, window.day));
  if (candidate.getTime() > after.getTime()) return candidate;
  return new Date(Date.UTC(year + 1, window.month - 1, window.day));
}

/**
 * Whether a calendar-bound fact last retrieved at `retrievedAt` is due for a re-check as
 * of `now` — true once `now` has reached or passed the first annual-window start date
 * that falls after `retrievedAt`. This is what fixes the drift `AnnualCalendarWindow`'s
 * own comment describes: a fact retrieved in March is due the moment THIS year's window
 * opens (August), not 365 days after March; a fact retrieved just after last year's
 * window already closed correctly isn't due again until next year's, regardless of which
 * day inside the window it happened to be retrieved on.
 *
 * An unparseable `retrievedAt` is treated as due — a fact ORYN can't establish the age
 * of should never read as confidently fresh.
 */
export function isDueForAnnualRecheck(window: AnnualCalendarWindow, retrievedAt: string, now: Date = new Date()): boolean {
  const retrieved = Date.parse(retrievedAt);
  if (Number.isNaN(retrieved)) return true;
  const nextWindowAfterRetrieval = nextAnnualWindowStart(window, new Date(retrieved));
  return now.getTime() >= nextWindowAfterRetrieval.getTime();
}

/**
 * Ireland's CAO points cutoffs — the first calendar-bound fact class, and the reason
 * `AnnualCalendarWindow` exists. Evidence for the anchor date (2026-08-31 requirement-
 * verification-state investigation, `data/research/university-requirements/
 * ie_requirements_*.jsonl` and `docs/handoffs/ireland-requirement-staleness-2026-08-31.md`),
 * three independent sourcings agreeing within a two-day span:
 *   - CAO's own official 2026 guidelines: "places are allocated (mid-late August each
 *     year)" (`Guidelines-EU-EFTA-UK-2026.pdf`, quoted verbatim in the corpus's
 *     `REQ-2026-08-21-IE-CAO-008`).
 *   - Four separate research records (Galway, Limerick, Maynooth), all retrieved
 *     2026-08-21, independently state 2026 Round 1 offers were "not expected until
 *     on/around 26 August".
 *   - The prior cycle's actual precedent: a UCD article on 2025 Round 1's "exceptional
 *     demand" was published 27 August 2025.
 * 25 August is used — a day EARLY relative to all three sourcings rather than a day
 * late, since a re-check attempted a few days before results are actually out is a
 * cheap false negative (nothing new found yet, try again later); a fact still reading as
 * fresh for days after it actually went stale is the expensive direction of error.
 */
export const CAO_POINTS_IE: AnnualCalendarWindow = {
  label: "CAO points (Ireland) — Round 1 offers",
  month: 8,
  day: 25,
};
