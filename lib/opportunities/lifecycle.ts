import type { Opportunity } from "@/types/database";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";

/**
 * `cycle_status` already carries the truth about whether an opportunity's current cycle is
 * actually open — see its own column comment in types/database.ts: "deliberately separate
 * from `status` (an admin/moderation flag). A 'closed' opportunity here still exists and is
 * worth showing; it just isn't accepting applications right now." What was missing was
 * anything actually reading it that way: a live verification pass (2026-08-22,
 * docs/research/verification/opportunities-verification-2026-08-22.md) found 61 `active`
 * rows already correctly labeled `closed`/`historical` by research, surfacing in
 * `opportunity_matches` and every recommendation/dashboard surface as if they were open,
 * because nothing filtered on this field.
 *
 * Mirrors `NON_ACTIONABLE_VERIFICATION_STATES` (lib/deadlines/ingest.ts) deliberately: a
 * cycle_status in this set describes a real, correctly-sourced fact about a programme that
 * will very likely run again — not a bad record. `status` stays `active`, `disabled` still
 * means "we chose to hide this," `under_review` still means "not yet vetted." A closed-cycle
 * opportunity remains directly reachable by id (the detail page never filtered on status or
 * cycle_status) and in Browse (which already has a `cycleStatus` filter a student can pick) —
 * only matches, recommendations, and anything urgency-shaped must exclude it.
 */
export const NON_ACTIONABLE_OPPORTUNITY_CYCLE_STATUSES = new Set<Opportunity["cycle_status"]>([
  "closed",
  "historical",
  "discontinued",
]);

/**
 * Read-time gate, defense in depth: even if `cycle_status` hasn't been (re)computed yet for
 * a row — or a stale `opportunity_matches` row was upserted before this cycle closed and
 * never deleted — a deadline that has already passed with no newer one on file is on its own
 * enough to exclude an opportunity from matches/recommendations/urgency surfaces. This is
 * the "demotes active when its deadline has passed" rule, expressed as a read-time check
 * rather than a write that mutates `status`: it self-heals the moment ingestion refreshes
 * `deadline` to a genuine next-cycle date, with no separate "reactivate" step needed.
 *
 * What this function cannot do: an opportunity can be closed with a *null* deadline. The
 * canonical example was Stanford Anesthesia Summer Institute — `active`,
 * `cycle_status='upcoming'`, `deadline` null, while its own page said all three 2026 tracks were
 * "APPLICATIONS NOW CLOSED." As of 2026-08-23 that row is correctly `cycle_status='closed'`: a
 * researcher read the page and fixed it, which is exactly the manual labour that does not scale
 * to 272 active rows. No date-only rule can catch the shape — it requires either a researcher
 * reading the source page, or a scheduled re-verification job that re-fetches `source_url` and
 * checks for closure language (AGENTS.md Phase 30's "Job B: Upcoming deadline validation" /
 * "Job E: Stale data detection" describe exactly this; the job is designed in
 * docs/opportunity-reverification-job-design-2026-08-23.md but not built). There is currently no
 * *confirmed* instance of the shape live, which is a statement about our detection ability
 * rather than about the corpus — the shape is undetectable from stored data by construction. A
 * live pass on 2026-08-23 found 86 `active` rows with a null deadline and
 * `cycle_status='unverified'` — genuinely undetectable from stored data alone, not a gap this
 * function can close.
 */
export function isOpportunityActionable(
  opportunity: Pick<Opportunity, "status" | "cycle_status" | "deadline">,
  referenceDate: Date = new Date()
): boolean {
  // The moderation half of this file's own stated contract, which nothing was enforcing on
  // the recommendation path. `browse.ts` filters `status = 'active'` in SQL, so Browse was
  // clean, but "For you" reads `opportunity_matches` and then fetches the referenced rows by
  // id with no status filter — and this function, its only re-check, could not see `status`
  // at all. `refreshOpportunityMatches` never deletes, so every match row written before a
  // row was disabled survived and kept rendering.
  //
  // Measured live 2026-08-31: 67 match rows pointed at non-active opportunities, 59 of them
  // passed this check, across all 8 onboarded accounts. Among them a table-row fragment
  // ("Time: 4:30pm - 5:30pm (Hong Kong time)"), a course code, a 2023 cycle, and the
  // professional Stockholm Water Prize — each already disabled by a researcher days earlier,
  // each still presented as "Strong match. It addresses a current gap in your profile."
  // Disabling a record has to actually remove it, or moderation is decoration.
  //
  // `expired` and `under_review` are excluded on the same reasoning: not vetted, or known
  // stale. Only `active` is something to put in front of a student.
  if (opportunity.status !== "active") {
    return false;
  }
  if (NON_ACTIONABLE_OPPORTUNITY_CYCLE_STATUSES.has(opportunity.cycle_status)) {
    return false;
  }
  if (opportunity.deadline) {
    const deadlineEnd = new Date(`${opportunity.deadline}T23:59:59`);
    if (deadlineEnd.getTime() < referenceDate.getTime()) {
      return false;
    }
  }
  return true;
}

/**
 * Why the two ways `isOpportunityActionable` returns false need different wording, and why the
 * split is not cosmetic: a row whose `cycle_status` is still a legitimately-actionable value
 * ("open", "date_not_announced") but whose deadline has quietly passed must never be explained
 * by its cycle status, which would tell the student nothing about why they can't act. Live
 * example (2026-08-23), GENIUS Olympiad: `cycle_status='date_not_announced'` with a deadline
 * five months gone — "next dates not announced" is perfectly true and completely beside the
 * point.
 *
 * One shared implementation on purpose. lib/opportunities/browse.ts and lib/counselor/
 * eligibility.ts each carried a byte-identical private copy of this, and a duplicated
 * lifecycle rule drifting out of sync between those same two files is exactly what #140 had to
 * fix (eligibility.ts kept its own cycle-only `INACTIVE_CYCLE_STATUSES` and never learned the
 * deadline half of the rule).
 */
// Turkish labels for exactly the three values NON_ACTIONABLE_OPPORTUNITY_CYCLE_STATUSES
// holds — not all seven Opportunity["cycle_status"] values, since only those three ever
// reach the interpolation below. Falls back to the raw value (English underscore-stripped,
// same as the pre-existing English branch's own defensiveness) for anything else, rather
// than throwing, in case that set ever grows without this map growing with it.
const CYCLE_STATUS_LABEL_TR: Partial<Record<Opportunity["cycle_status"], string>> = {
  closed: "kapandı",
  historical: "artık düzenlenmiyor",
  discontinued: "iptal edildi",
};

/**
 * `locale` defaults to English so lib/opportunities/browse.ts and
 * app/(app)/opportunities/[id]/page.tsx — both outside this pass's scope (opportunity
 * browsing/detail, not counselor reasoning) — keep producing byte-identical output.
 */
export function nonActionableOpportunityReason(
  opportunity: Pick<Opportunity, "status" | "cycle_status" | "deadline">,
  locale: Locale = DEFAULT_LOCALE
): string {
  // Deliberately vague, and deliberately not blamed on the student or the programme: a
  // moderation state is Oryn's own bookkeeping ("we pulled this", "we haven't vetted it"),
  // and neither the real reason nor the record itself is something to explain to a student.
  // Surfaces should be filtering these out before any reason is ever rendered; this exists
  // so that a path which forgets to says something harmless rather than something wrong.
  if (opportunity.status !== "active") {
    return locale === "tr" ? "Oryn bu fırsatı şu anda göstermiyor." : "Oryn isn't showing this opportunity right now.";
  }
  if (NON_ACTIONABLE_OPPORTUNITY_CYCLE_STATUSES.has(opportunity.cycle_status)) {
    if (locale === "tr") {
      const label = CYCLE_STATUS_LABEL_TR[opportunity.cycle_status] ?? opportunity.cycle_status.replace(/_/g, " ");
      return `Bu fırsatın mevcut dönemi: ${label}.`;
    }
    return `This opportunity's current cycle is ${opportunity.cycle_status.replace(/_/g, " ")}.`;
  }
  return locale === "tr" ? "Bu fırsatın başvuru son tarihi geçti." : "This opportunity's application deadline has passed.";
}

export interface StoredEligibility {
  eligible: boolean;
  notes: string | null;
}

export interface ResolvedEligibility extends StoredEligibility {
  /**
   * True when `eligible` is false *only* because the opportunity isn't actionable right now.
   * That's a fact about the opportunity's cycle, not about this student, and surfaces need to
   * tell the two apart: rendering a closed cycle as "Not eligible" wrongly informs a student
   * they don't qualify for something nobody can currently apply to.
   */
  notActionable: boolean;
}

/**
 * Re-applies the lifecycle gate to an eligibility verdict that was computed earlier and read
 * back from `opportunity_matches`.
 *
 * A stored match row is a snapshot, and refreshOpportunityMatches deliberately never deletes
 * one when its opportunity later stops being actionable (lib/opportunities/persist-matches.ts
 * documents that choice) — it simply stops computing new ones. So `eligible: true` written
 * before a cycle closed survives indefinitely, and any surface that trusts the column verbatim
 * presents a closed or past-deadline opportunity as a live match. Verified live 2026-08-23: 74
 * distinct opportunities across 259 (student, opportunity) pairs carried exactly that stale
 * flag.
 *
 * Read-time by design, matching this module's whole approach: nothing is written or backfilled,
 * and the gate stops firing on its own the moment ingestion refreshes `deadline` to a genuine
 * next-cycle date. Note this only ever *removes* an eligibility claim — an actionable
 * opportunity's stored verdict, in either direction, is passed through untouched, so a real
 * per-student mismatch is never overwritten with a cheerier answer.
 */
export function resolveStoredEligibility(
  opportunity: Pick<Opportunity, "status" | "cycle_status" | "deadline">,
  stored: StoredEligibility,
  referenceDate: Date = new Date()
): ResolvedEligibility {
  if (isOpportunityActionable(opportunity, referenceDate)) {
    return { ...stored, notActionable: false };
  }
  return { eligible: false, notes: nonActionableOpportunityReason(opportunity), notActionable: true };
}

/**
 * Write-time derivation for a backfill/maintenance pass (scripts/derive-opportunity-cycle-
 * status.ts) — never called from a request path. Returns the `cycle_status` a row should have
 * once its deadline has passed with no newer one on file, or `null` when no change is
 * warranted (already correctly labeled non-actionable, or there's no deadline to reason from).
 * Never invents `historical`/`discontinued` — those are judgment calls for a human researcher
 * (how long closed, whether the programme still runs at all), not something a passed date
 * alone can support. A live measurement (2026-08-22) found zero rows today where this would
 * actually change anything — every already-past deadline already carries a correct
 * `closed`/`historical` cycle_status — so this exists for the gap this creates going forward
 * as today's deadlines pass, not to fix anything currently live.
 */
export function deriveCycleStatusForPassedDeadline(
  opportunity: Pick<Opportunity, "cycle_status" | "deadline">,
  referenceDate: Date = new Date()
): Opportunity["cycle_status"] | null {
  if (!opportunity.deadline) return null;
  if (NON_ACTIONABLE_OPPORTUNITY_CYCLE_STATUSES.has(opportunity.cycle_status)) return null;

  const deadlineEnd = new Date(`${opportunity.deadline}T23:59:59`);
  if (deadlineEnd.getTime() < referenceDate.getTime()) {
    return "closed";
  }
  return null;
}

/* ------------------------------------------------------------------------------------------
 * The third gate: evidence, not dates — and evidence, not lineage.
 *
 * isOpportunityActionable's own comment above names the case it structurally cannot catch — an
 * opportunity that closed quietly with no deadline ever recorded. No date-based rule can see
 * that, because there is no date. What CAN be seen is the absence of evidence.
 *
 * WHAT #143 GOT WRONG, AND WHY THIS READS BOTH COLUMNS
 *
 * This gate first shipped reading `last_verified_at IS NULL` as "Oryn has never verified this."
 * That premise was false. `opportunities` carries TWO verification timestamps:
 * `last_verified_at` (migration 0008, the original Phase 29 freshness column) and `verified_at`
 * (migration 0041, added alongside `verification_state`). Different generations of the ingest
 * pipeline wrote different ones.
 *
 * Measured live 2026-08-23 across all 392 rows:
 *   - rows with BOTH timestamps null ........................ 0
 *   - rows with `last_verified_at` null, `verified_at` set .. 85, all `verified_current`
 *   - rows excluded by the gate as first shipped ............ 51
 *
 * Every one of those 51 was `verification_state='verified_current'`, `source_confidence='high'`,
 * with a `verified_at` from the preceding week. They are almost exactly the
 * `source='official_primary'` set — the corpus's highest-provenance pipeline. Meanwhile 199 rows
 * that DO carry `last_verified_at` are not `verified_current` at all, and
 * lib/opportunities/discover.ts stamps `last_verified_at` at insert time straight from a Tavily
 * web search. So the original predicate was not merely mis-targeted: it was anti-correlated with
 * provenance quality, blocking hand-researched records while passing unattended search results.
 * `last_verified_at IS NULL` records WHICH PIPELINE WROTE THE ROW, not whether anyone verified it.
 *
 * WHAT THIS GATE DOES NOT CLAIM
 *
 * Reading both columns is deliberately NOT the same as trusting either as a freshness signal.
 * Neither means "we checked the official source recently enough to recommend this":
 *   - 138 of 201 `verified_at` values and 214 of 307 `last_verified_at` values are exactly
 *     midnight UTC — hand-entered dates, not machine fetches.
 *   - A row once carried a fresh `verified_at` while its own page said applications were closed.
 * So their presence is used here as a floor against the TOTAL absence of evidence, and for
 * nothing else. No age arithmetic is ever performed on either — see MAX_VERIFICATION_AGE_DAYS.
 * Copying one column into the other, or preferring one as "the" verification time, would convert
 * a bookkeeping artifact into a verification claim; docs/opportunity-reverification-job-design-
 * 2026-08-23.md §1.2/§12 argues that case at length and rules it out.
 *
 * The honest predicate therefore fires on zero rows today. That is a true statement about this
 * corpus, not a dead rule: both columns are nullable with NULL defaults, so the shape is
 * constructible, and Phase 30's re-verification job is what gives this seam a real signal.
 *
 * Three things this gate deliberately does NOT say, because each would replace one product lie
 * with a different one:
 *   1. It does not say the opportunity is CLOSED. Nothing has told us that. `cycle_status` is
 *      never set or implied here, and no closure is fabricated.
 *   2. It does not say the STUDENT is ineligible. This is a fact about Oryn's evidence, and a
 *      16-year-old must never be told they don't qualify because we didn't do our homework.
 *   3. It does not claim staleness. See MAX_VERIFICATION_AGE_DAYS.
 * ------------------------------------------------------------------------------------------ */

/**
 * The rolling seam.
 *
 * A `deadline` is one way a row can carry a dated commitment about intake. An explicit "there
 * is no single date, by design" declaration is the other, and rolling admission is the case
 * that matters: without it, a genuinely rolling programme would look identical to one nobody
 * ever researched, and the gate below would hold it down forever.
 *
 * `deadline_mode` is approved in principle and deliberately NOT implemented — there is no such
 * column on `opportunities` and this package adds no migration. It is read defensively as an
 * optional key, the same way lib/counselor/eligibility.ts already reads `eligible_citizenships`
 * and `country_eligibility_confirmed_open` ("a real row fetched from a live DB that predates
 * the migration genuinely has no key at all despite the type saying otherwise"). So this
 * predicate is correct today (no row has the key, so no row is rescued by it) and becomes
 * correct for real rows the moment the column lands — with no rewrite of this function or of
 * any call site, which is the whole point of putting the seam here rather than in a caller.
 *
 * Unrecognized values are not commitments: an unparsed string must never read as a positive
 * declaration.
 */
export const DEADLINE_MODES_WITHOUT_A_FIXED_DATE: ReadonlySet<string> = new Set([
  "rolling",
  "continuous",
  "always_open",
]);

/**
 * `verified_at` is REQUIRED here, not optional like `deadline_mode`, and the difference is
 * load-bearing. `deadline_mode` has no column at all, so a row genuinely cannot carry it.
 * `verified_at` has existed since migration 0041 — the only way a caller lacks it is by writing
 * a narrowed `.select()` that leaves it out, and a row missing it would read as "no evidence"
 * and be silently excluded. That is this very bug arriving through a different door (a select
 * list instead of a pipeline generation). Requiring it turns that mistake into a compile error:
 * app/(app)/dashboard/page.tsx is the one narrowed select on this path, and it must list both.
 */
export type OpportunityVerificationFacts = Pick<Opportunity, "deadline" | "last_verified_at" | "verified_at"> & {
  /** Not yet a column — see DEADLINE_MODES_WITHOUT_A_FIXED_DATE. Optional on purpose. */
  readonly deadline_mode?: string | null;
  /**
   * Phase 30's seam, and the ONLY field an age threshold may ever be measured against. Not a
   * column and deliberately not proposed as one — docs/opportunity-reverification-job-design-
   * 2026-08-23.md §8.4 keeps machine-check recency in the runs table and warns specifically
   * against a third overlapping timestamp on `opportunities`. Supplied by a join when that job
   * exists; absent today, so no row is age-gated.
   */
  readonly machine_checked_at?: string | null;
};

export function hasDeadlineCommitment(opportunity: OpportunityVerificationFacts): boolean {
  if (opportunity.deadline) return true;
  const mode = opportunity.deadline_mode;
  return typeof mode === "string" && DEADLINE_MODES_WITHOUT_A_FIXED_DATE.has(mode);
}

/**
 * Is there any record at all that something once verified this row?
 *
 * A pure existence check across both verification timestamps, with no preference between them
 * and no arithmetic on either — the two columns differ by pipeline generation, not by
 * trustworthiness, so ranking them would be inventing a distinction the data does not support.
 *
 * lib/opportunities/readiness.ts already draws the absence-of-evidence line in exactly this
 * place (`!verified_at && !last_verified_at`), and treats it as a quality signal rather than a
 * blocker. This is the runtime counterpart of that same judgment.
 *
 * Truthiness rather than a null check, deliberately: it treats an absent key, an explicit null
 * and an empty string alike. A row fetched from an environment whose migration hasn't run has no
 * key at all whatever the type says — the same defensive reading eligibility.ts applies to
 * `eligible_citizenships` — and an empty-string timestamp is not evidence of anything either.
 */
export function hasAnyVerificationRecord(opportunity: OpportunityVerificationFacts): boolean {
  return Boolean(opportunity.last_verified_at) || Boolean(opportunity.verified_at);
}

/**
 * Deliberately null: no maximum verification age is enforced.
 *
 * Measured 2026-08-23 across the whole corpus — the oldest `last_verified_at` is 2026-08-15 and
 * there are zero rows older than 30 days. Any age threshold worth writing down would exclude
 * exactly nothing, so shipping one would add a guard that reads as protective while proving
 * nothing, and would silently start excluding rows later at whatever arbitrary number was
 * picked today.
 *
 * Read this together with the constraint below it: when this IS eventually set, it is measured
 * against `machine_checked_at` and never against `last_verified_at` or `verified_at`. Those two
 * are majority hand-entered midnight dates; running date arithmetic over them would manufacture
 * precisely the certainty the corrected gate exists to avoid. Phase 30's design says the same
 * (§3.3): turn this on only after the re-verification job has made two full corpus passes, so a
 * stale timestamp means "the job tried and could not confirm" rather than "the job hasn't
 * reached this row yet."
 */
export const MAX_VERIFICATION_AGE_DAYS: number | null = null;

/**
 * The rule, in its smallest fail-closed form: an opportunity with no deadline commitment on
 * file AND no verification record of any kind is not confidently actionable.
 *
 * Both absences are required, and the second means "neither verification timestamp is set" —
 * not "the older of the two happens to be empty," which is what this checked before and which
 * measured only pipeline lineage. Either signal alone is enough to pass, which keeps the gate
 * narrow and self-healing: it stops firing the moment ingestion writes any of them, with no
 * reactivation step, exactly like the rest of this module.
 *
 * On today's corpus this excludes nothing (zero rows have both timestamps null). That is the
 * honest answer for this corpus rather than a reason to delete the rule — see the block above.
 */
export function isOpportunitySufficientlyVerified(
  opportunity: OpportunityVerificationFacts,
  referenceDate: Date = new Date()
): boolean {
  if (hasDeadlineCommitment(opportunity)) return true;
  if (!hasAnyVerificationRecord(opportunity)) return false;
  if (MAX_VERIFICATION_AGE_DAYS === null) return true;

  // Age is measured ONLY against a real machine check. A row the job has never reached has no
  // such timestamp and must not be excluded for it — otherwise enabling the threshold would
  // mass-exclude the catalogue for the sole reason that the job is young.
  const machineCheckedAt = opportunity.machine_checked_at;
  if (!machineCheckedAt) return true;

  const checkedAtMs = Date.parse(machineCheckedAt);
  if (Number.isNaN(checkedAtMs)) return true;
  return referenceDate.getTime() - checkedAtMs <= MAX_VERIFICATION_AGE_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * Student-facing wording. Kept as constants beside the rule for the same reason
 * `nonActionableOpportunityReason` is a shared export rather than a string in each surface: two
 * files phrasing one rule differently is how #140 and #141 started.
 *
 * Neither string may claim closure or ineligibility — see the three distinctions above.
 */
export const NEEDS_VERIFICATION_LABEL = "Needs verification";
export const INSUFFICIENT_VERIFICATION_REASON =
  "Oryn hasn't verified this opportunity's current status and has no application dates on file, so it isn't recommended as a confident next step. Check the official page before relying on it.";

const INSUFFICIENT_VERIFICATION_REASON_TR =
  "Oryn bu fırsatın güncel durumunu doğrulamadı ve kayıtlı bir başvuru tarihi yok; bu nedenle güvenilir bir sonraki adım olarak önerilmiyor. Güvenmeden önce resmi sayfayı kontrol edin.";

/**
 * Locale-aware wrapper around INSUFFICIENT_VERIFICATION_REASON, added rather than changing
 * that constant's own shape — lib/opportunities/browse.ts and
 * app/(app)/opportunities/[id]/page.tsx both reference the bare constant directly (and
 * __tests__/opportunities/lifecycle.test.ts asserts against it by identity), none of which
 * are in scope for this pass. English branch returns the exact same constant, not a
 * re-typed copy, so the two can never drift apart.
 */
export function insufficientVerificationReason(locale: Locale = DEFAULT_LOCALE): string {
  return locale === "tr" ? INSUFFICIENT_VERIFICATION_REASON_TR : INSUFFICIENT_VERIFICATION_REASON;
}

const NEEDS_VERIFICATION_LABEL_TR = "Doğrulama gerekiyor";

export function needsVerificationLabel(locale: Locale = DEFAULT_LOCALE): string {
  return locale === "tr" ? NEEDS_VERIFICATION_LABEL_TR : NEEDS_VERIFICATION_LABEL;
}

/**
 * Every real `cycle_status` value, one label each — unlike `CYCLE_STATUS_LABEL_TR` above
 * (deliberately a 3-value subset, for one sentence's interpolation), this is the general
 * accessor. Found three independent copies of this same 7-value map while translating the
 * opportunities UI (features/opportunities/opportunity-card.tsx's badge map missing "open"
 * on purpose, features/opportunities/opportunity-filter-bar.tsx's 4-value filter dropdown,
 * and app/(app)/opportunities/[id]/page.tsx's full 7-value copy) — identical English text
 * on every overlapping key, the exact "#140/#141" duplication this file's own comments
 * already warn about. One accessor now; a caller that doesn't want "open" shown (the card)
 * simply doesn't call it for that status, same effect as the value being absent.
 */
const CYCLE_STATUS_LABEL_FULL_TR: Record<Opportunity["cycle_status"], string> = {
  open: "Şu anda açık",
  upcoming: "Yakında açılıyor",
  closed: "Bu dönem için kapalı",
  date_not_announced: "Yeni tarihler açıklanmadı",
  historical: "Geçmişte kaldı — artık düzenlenmiyor",
  discontinued: "İptal edildi",
  unverified: "Doğrulama bekleniyor",
};

const CYCLE_STATUS_LABEL_FULL_EN: Record<Opportunity["cycle_status"], string> = {
  open: "Open now",
  upcoming: "Opens soon",
  closed: "Closed for this cycle",
  date_not_announced: "Next dates not announced",
  historical: "Historical — not currently running",
  discontinued: "Discontinued",
  unverified: "Verification pending",
};

export function cycleStatusLabel(status: Opportunity["cycle_status"], locale: Locale = DEFAULT_LOCALE): string {
  return locale === "tr" ? CYCLE_STATUS_LABEL_FULL_TR[status] : CYCLE_STATUS_LABEL_FULL_EN[status];
}

/**
 * cycle_status is about whether *this* cycle is taking applications right now — distinct from
 * whether the opportunity is worth knowing about at all. Only the states a student needs a
 * heads-up about become a plain-text descriptor; "open" is the unremarkable default and stays
 * quiet, achieved by simply not calling cycleStatusLabel for it.
 *
 * Moved here from features/opportunities/opportunity-card.tsx (2026-09-02) so
 * features/dashboard/dashboard-view.tsx can render the identical descriptor rather than
 * carrying a second copy of this set — the exact "#140/#141" duplication this module's other
 * comments already warn about. opportunity-card.tsx's own copy removed, now imports this one.
 */
export const CYCLE_STATUSES_WORTH_A_DESCRIPTOR = new Set<Opportunity["cycle_status"]>([
  "upcoming",
  "closed",
  "date_not_announced",
  "historical",
  "discontinued",
  "unverified",
]);

/**
 * Same duplication shape, two copies (opportunity-card.tsx and [id]/page.tsx, byte-identical
 * English on every key). "unknown" is deliberately absent from both maps — an absent key
 * means "say nothing" (see either caller's own `?? null` / falsy check), not a value to
 * translate; adding one here would turn a silent, correct omission into a rendered badge.
 */
const SELECTIVITY_LABEL_TR: Partial<Record<Opportunity["selectivity_tier"], string>> = {
  extremely_selective: "Son derece seçici",
  highly_selective: "Yüksek düzeyde seçici",
  selective: "Seçici",
  competitive_award: "Rekabetçi ödül",
  open_enrollment: "Açık kayıt",
};

const SELECTIVITY_LABEL_EN: Partial<Record<Opportunity["selectivity_tier"], string>> = {
  extremely_selective: "Extremely selective",
  highly_selective: "Highly selective",
  selective: "Selective",
  competitive_award: "Competitive award",
  open_enrollment: "Open enrollment",
};

export function selectivityLabel(tier: Opportunity["selectivity_tier"], locale: Locale = DEFAULT_LOCALE): string | undefined {
  return locale === "tr" ? SELECTIVITY_LABEL_TR[tier] : SELECTIVITY_LABEL_EN[tier];
}

/**
 * The composed gate every recommendation-critical path calls: actionable AND supported by
 * enough evidence to present with confidence. The two halves stay separate functions on
 * purpose — Browse and the detail page need the freshness half alone, because they label rather
 * than exclude, and they must be able to tell a student WHICH of the three things is true.
 */
export function isOpportunityRecommendable(
  opportunity: Pick<Opportunity, "status" | "cycle_status" | "deadline"> & OpportunityVerificationFacts,
  referenceDate: Date = new Date()
): boolean {
  return isOpportunityActionable(opportunity, referenceDate) && isOpportunitySufficientlyVerified(opportunity, referenceDate);
}

/**
 * Shared filter for every matching/recommendation/urgency read path — excludes on the
 * moderation flag, cycle_status and deadline alike, while leaving direct-by-id access
 * untouched (the detail page still resolves any opportunity by its id, as it always has).
 * Used by persist-matches.ts (stop computing fresh matches for a closed cycle) and,
 * defensively, by every surface that later joins opportunity_matches back against
 * opportunities — a match row upserted before its opportunity was closed OR disabled must not
 * keep reading as live just because nothing has re-run refreshOpportunityMatches since.
 */
export function filterActionableOpportunities<T extends Pick<Opportunity, "status" | "cycle_status" | "deadline">>(
  opportunities: T[],
  referenceDate: Date = new Date()
): T[] {
  return opportunities.filter((o) => isOpportunityActionable(o, referenceDate));
}
