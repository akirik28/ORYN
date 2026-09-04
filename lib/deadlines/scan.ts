import "server-only";

import { differenceInCalendarDays } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, DeadlineNotificationLogInsert, DeadlineNotificationSource } from "@/types/database";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create";
import { canonicalUniversityId, loadSupersessionMap, type SupersessionMap } from "@/lib/universities/canonical";
import { NON_ACTIONABLE_VERIFICATION_STATES } from "@/lib/deadlines/ingest";
import { isOpportunityActionable } from "@/lib/opportunities/lifecycle";
import { deadlineDetailLabel } from "@/lib/deadlines/upcoming";
import { getTranslations } from "next-intl/server";
import { DEFAULT_LOCALE, toLocale, type Locale } from "@/lib/i18n/config";

/**
 * Days-until-deadline thresholds that trigger a reminder (Phase 23/24). Phase 23 itself
 * names 3/7/14/30; `1` is this codebase's own addition on top of spec (a same-day-tomorrow
 * alert reads as strictly more useful, not a deviation worth removing) — `30` was, until
 * this package, simply missing from this array, so the spec's own outermost bucket had
 * never once been reachable. Ordered descending (most-distant bucket first) only because
 * that's the natural reading order; thresholdCrossed() below finds the nearest applicable
 * bucket via Math.min(), so it doesn't depend on array order either.
 *
 * A deadline crossing into a NEARER bucket re-notifies rather than firing once ever — see
 * writeDeadlineNotifications()'s and migration 0075's comments for why that's the
 * deliberate choice, not an oversight.
 */
const REMINDER_THRESHOLDS = [30, 14, 7, 3, 1];

const ACTIVE_APPLICATION_STATUSES = ["not_started", "in_progress", "submitted", "under_review"] as const;
const ACTIVE_TARGET_STATUSES = ["exploring", "target", "applying"] as const;

/**
 * One deadline that crossed a reminder threshold in this run, for one student. Collected
 * by the three scan*Deadlines functions below and aggregated afterward — nothing in this
 * file notifies a student directly from inside a per-source loop any more (Phase 24: "avoid
 * spam, aggregate where possible"; see writeDeadlineNotifications()).
 *
 * `source`/`sourceId`/`thresholdBucket` together are the dedupe key persisted to
 * deadline_notification_log (migration 0075) — deliberately not `deadlineDate`, so a
 * university pushing a deadline back doesn't need special-casing: a changed date just
 * means a (possibly) different bucket, which is already part of the key.
 *
 * `daysUntil` and `thresholdBucket` are deliberately separate fields (2026-09-04 fix — see
 * thresholdCrossed()'s own updated comment): `daysUntil` is the real, exact count and is
 * the only one ever shown to a student (notification copy, digest sort order);
 * `thresholdBucket` is purely an internal dedup key and is never rendered. Before this fix
 * the two were the same field, which is exactly why a deadline sitting between two buckets
 * (6 days out, between the 7- and 3-day buckets) could never match anything — there was no
 * "nearest bucket" concept, only exact equality.
 *
 * `singleBody`/`itemLabel` are both pre-translated at collection time (each scan*Deadlines
 * function already has the right per-student `translate` in scope from `localeByUser`) —
 * `singleBody` is the exact sentence used when this is the only hit for this student this
 * run (byte-for-byte what every student received before this package), `itemLabel` is the
 * bare name used to build one line of an aggregated digest when it isn't.
 */
export interface DeadlineHit {
  userId: string;
  locale: Locale;
  source: DeadlineNotificationSource;
  sourceId: string;
  daysUntil: number;
  thresholdBucket: number;
  link: string;
  itemLabel: string;
  singleBody: string;
}

/** Narrower than next-intl's real `getTranslations` return type — this is all any function
 * below needs, and it's what the test suite mocks against directly. The key union (rather
 * than plain `string`) is load-bearing, not decoration: next-intl infers real key types
 * from messages/en.json, and a real `Translator` is only assignable to a narrower-parameter
 * function type, never a `(key: string) => string` one. */
type NotificationKey =
  | "deadlineTomorrow"
  | "daysUntilDeadline"
  | "applicationDeadlineApproaching"
  | "applicationDeadlineApproachingGeneric"
  | "universityDeadlineApproaching"
  | "unnamedTargetUniversity"
  | "unnamedApplication"
  | "deadlineDigestTitle"
  | "deadlineDigestItem"
  | "deadlineDigestItemTomorrow";
type NotificationTranslator = (key: NotificationKey, values?: Record<string, string | number>) => string;

/** One translator per shipped locale, loaded once per `scanDeadlines()` run rather than
 * once per candidate — two catalog loads total, however many students/deadlines a run
 * touches. Explicit keys (matching lib/i18n/request.ts's own `CATALOGS` shape) rather than
 * building the record from `LOCALES` dynamically: `Object.fromEntries` widens to an index
 * signature, which doesn't statically prove both locales are present the way this literal
 * does. */
async function loadTranslators(): Promise<Record<Locale, NotificationTranslator>> {
  const [en, tr] = await Promise.all([getTranslations({ locale: "en", namespace: "notifications" }), getTranslations({ locale: "tr", namespace: "notifications" })]);
  return { en, tr };
}

/** Batch locale lookup, same shape as this file's existing name/target Maps — one query
 * per scan source instead of one per row. No request context exists here (this runs from
 * a cron with no cookie/session), so `preferred_language` is the only source of truth,
 * same as lib/ai/student-context.ts reads for AI output language. */
async function loadLocalesByUser(supabase: SupabaseClient<Database>, userIds: string[]): Promise<Map<string, Locale>> {
  if (userIds.length === 0) return new Map();
  const { data } = await supabase.from("profiles").select("id, preferred_language").in("id", userIds);
  return new Map((data ?? []).map((p) => [p.id, toLocale(p.preferred_language)]));
}

/**
 * Pure threshold match — returns the nearest reminder bucket (30/14/7/3/1) this deadline
 * currently falls within, or null if it's more than 30 days out or already past. Exported
 * so __tests__/deadlines/threshold-crossed.test.ts can pin date arithmetic directly, the
 * same role notifyIfThresholdCrossed's threshold half used to play before this package
 * split "does this cross a threshold" (pure, no I/O) from "has it already been notified
 * about" (needs deadline_notification_log, see filterAlreadyNotified below) and "what does
 * the notification say" (needs aggregation across possibly-several hits, see
 * buildDigestNotification below). The old function did all three inline per-candidate,
 * which is exactly what made per-candidate notifications the only option.
 *
 * CORRECTED 2026-09-04: this used to require EXACT equality
 * (`REMINDER_THRESHOLDS.includes(daysUntil)`), despite this very docstring already having
 * described "crossed" semantics before the fix matched them — a deadline sitting BETWEEN
 * two buckets (say, 6 days out, between the 7- and 3-day marks) matched nothing, ever, no
 * matter how reliably or how often scanDeadlines() ran, because there would never be a
 * day where daysUntil happened to equal exactly 30, 14, 7, 3, or 1. Confirmed against a
 * real, live application (Oxford, early_decision, 6 days out — see
 * docs/application-tracker-notification-audit-2026-09-04.md) that could never have
 * received a reminder under the old logic. Now returns the smallest threshold the deadline
 * has already reached or passed — a job that skips a day (or a deadline that's only just
 * been added already inside a bucket) still gets caught by the nearest remaining one,
 * instead of silently requiring a day it was never observed to land on exactly.
 * `deadline_notification_log` (migration 0075) already dedupes on this bucket value, not on
 * daysUntil — see writeDeadlineNotifications() below — so a student is still notified at
 * most once per bucket regardless of which exact day the job happens to catch it on.
 */
export function thresholdCrossed(deadlineDate: string, today: Date): number | null {
  const daysUntil = differenceInCalendarDays(new Date(deadlineDate), today);
  if (daysUntil < 0) return null;
  const applicable = REMINDER_THRESHOLDS.filter((threshold) => daysUntil <= threshold);
  return applicable.length > 0 ? Math.min(...applicable) : null;
}

/** Exported (only) so __tests__/deadlines/scan-applications.test.ts can pin its behavior
 * directly, without also mocking the opportunity/university scan sources. No behavior
 * change to the underlying eligibility/resolution logic — only the tail (notify directly
 * vs. return a hit for later aggregation) is new. */
export async function scanApplications(
  supabase: SupabaseClient<Database>,
  today: Date,
  supersessionMap: SupersessionMap,
  translators: Record<Locale, NotificationTranslator>
): Promise<{ hits: DeadlineHit[]; checked: number }> {
  const { data: applications } = await supabase
    .from("applications")
    .select("id, user_id, deadline, target_university_id")
    .not("deadline", "is", null)
    .in("status", ACTIVE_APPLICATION_STATUSES);

  if (!applications || applications.length === 0) return { hits: [], checked: 0 };

  const targetIds = [...new Set(applications.map((a) => a.target_university_id))];
  const { data: targets } = targetIds.length
    ? await supabase.from("target_universities").select("id, university_id").in("id", targetIds)
    : { data: [] };
  // Canonicalized so a target referencing a known-duplicate loser row still resolves to a
  // real name in the notification body. See lib/universities/canonical.ts.
  const universityIdByTarget = new Map((targets ?? []).map((t) => [t.id, canonicalUniversityId(supersessionMap, t.university_id)]));

  const universityIds = [...new Set(universityIdByTarget.values())];
  const { data: universities } = universityIds.length
    ? await supabase.from("universities").select("id, name").in("id", universityIds)
    : { data: [] };
  const universityNameById = new Map((universities ?? []).map((u) => [u.id, u.name]));

  const localeByUser = await loadLocalesByUser(supabase, [...new Set(applications.map((a) => a.user_id))]);

  const hits: DeadlineHit[] = [];
  for (const application of applications) {
    const thresholdBucket = thresholdCrossed(application.deadline!, today);
    if (thresholdBucket === null) continue;
    const daysUntil = differenceInCalendarDays(new Date(application.deadline!), today);

    const universityId = universityIdByTarget.get(application.target_university_id);
    const universityName = universityId ? universityNameById.get(universityId) : null;
    const locale = localeByUser.get(application.user_id) ?? DEFAULT_LOCALE;
    const translate = translators[locale];

    hits.push({
      userId: application.user_id,
      locale,
      source: "application",
      sourceId: application.id,
      daysUntil,
      thresholdBucket,
      link: `/applications/${application.id}`,
      itemLabel: universityName ?? translate("unnamedApplication"),
      singleBody: universityName ? translate("applicationDeadlineApproaching", { name: universityName }) : translate("applicationDeadlineApproachingGeneric"),
    });
  }
  return { hits, checked: applications.length };
}

/** Exported (only) so __tests__/deadlines/scan.test.ts can pin and verify its
 * cycle_status filtering directly, without also mocking the application/university
 * scan sources. No behavior change to the actionability guard — only the tail is new. */
export async function scanSavedOpportunityDeadlines(
  supabase: SupabaseClient<Database>,
  today: Date,
  translators: Record<Locale, NotificationTranslator>
): Promise<{ hits: DeadlineHit[]; checked: number }> {
  const { data: saved } = await supabase.from("saved_opportunities").select("user_id, opportunity_id").eq("status", "saved");
  if (!saved || saved.length === 0) return { hits: [], checked: 0 };

  const opportunityIds = [...new Set(saved.map((s) => s.opportunity_id))];
  const { data: opportunities } = await supabase
    .from("opportunities")
    .select("id, title, status, deadline, cycle_status")
    .in("id", opportunityIds)
    .not("deadline", "is", null);
  const opportunityById = new Map((opportunities ?? []).map((o) => [o.id, o]));

  const localeByUser = await loadLocalesByUser(supabase, [...new Set(saved.map((s) => s.user_id))]);

  const hits: DeadlineHit[] = [];
  let checked = 0;
  for (const save of saved) {
    const opportunity = opportunityById.get(save.opportunity_id);
    if (!opportunity?.deadline) continue;
    // Same guard as lib/deadlines/upcoming.ts's read-side sibling: a closed/historical/
    // discontinued cycle must never trigger a "deadline approaching" notification, even
    // with a future-dated deadline still on file. 'unverified' stays reachable.
    if (!isOpportunityActionable(opportunity, today)) continue;
    checked += 1;

    const thresholdBucket = thresholdCrossed(opportunity.deadline, today);
    if (thresholdBucket === null) continue;
    const daysUntil = differenceInCalendarDays(new Date(opportunity.deadline), today);

    const locale = localeByUser.get(save.user_id) ?? DEFAULT_LOCALE;
    const translate = translators[locale];
    hits.push({
      userId: save.user_id,
      locale,
      source: "opportunity",
      sourceId: opportunity.id,
      daysUntil,
      thresholdBucket,
      // Every saved-opportunity single-item notification has always pointed at the same
      // generic list page (there's no per-opportunity detail route) — unlike applications
      // and university deadlines, this was never actually a usable dedupe key on its own,
      // which is exactly why migration 0075 keys dedupe on (source, source_id,
      // threshold_days) and not on `link`.
      link: "/opportunities",
      itemLabel: opportunity.title,
      singleBody: translate("applicationDeadlineApproaching", { name: opportunity.title }),
    });
  }
  return { hits, checked };
}

/** Exported (only) so __tests__/deadlines/scan-target-universities.test.ts can pin its
 * behavior directly, without also mocking the application/opportunity scan sources. No
 * behavior change to the program/verification-state filtering — only the tail is new. */
export async function scanTargetUniversityDeadlines(
  supabase: SupabaseClient<Database>,
  today: Date,
  supersessionMap: SupersessionMap,
  translators: Record<Locale, NotificationTranslator>
): Promise<{ hits: DeadlineHit[]; checked: number }> {
  const { data: targets } = await supabase
    .from("target_universities")
    .select("id, user_id, university_id, program_id")
    .in("status", ACTIVE_TARGET_STATUSES);
  if (!targets || targets.length === 0) return { hits: [], checked: 0 };

  // Canonicalized: both so university_deadlines is queried for the winner row (where real
  // deadline data actually lives, per how pickCanonicalWinner scores FK richness) and so a
  // pre-existing loser-referencing target self-heals. See lib/universities/canonical.ts.
  const universityIds = [...new Set(targets.map((t) => canonicalUniversityId(supersessionMap, t.university_id)))];
  const [{ data: deadlines }, { data: universities }] = await Promise.all([
    supabase
      .from("university_deadlines")
      .select("id, university_id, program_id, deadline_type, deadline_date, verification_state, cycle_label, deadline_text_verbatim")
      .in("university_id", universityIds)
      .not("deadline_date", "is", null),
    supabase.from("universities").select("id, name").in("id", universityIds),
  ]);
  const universityNameById = new Map((universities ?? []).map((u) => [u.id, u.name]));

  const localeByUser = await loadLocalesByUser(supabase, [...new Set(targets.map((target) => target.user_id))]);

  const hits: DeadlineHit[] = [];
  let checked = 0;
  for (const target of targets) {
    const canonicalId = canonicalUniversityId(supersessionMap, target.university_id);
    const locale = localeByUser.get(target.user_id) ?? DEFAULT_LOCALE;
    const translate = translators[locale];
    // A university-level deadline (program_id null) always applies; a program-specific
    // one only applies once the student has actually picked that program — otherwise we
    // can't tell which of a university's many programs it belongs to. VERIFIED_HISTORICAL (and
    // the other non-actionable states) can land since migration 0056 and must never trigger a
    // "deadline approaching" notification for a cycle that has already closed.
    const relevant = (deadlines ?? []).filter(
      (d) => d.university_id === canonicalId && (d.program_id === null || d.program_id === target.program_id) && !NON_ACTIONABLE_VERIFICATION_STATES.has(d.verification_state)
    );
    const universityName = universityNameById.get(canonicalId) ?? translate("unnamedTargetUniversity");
    for (const deadline of relevant) {
      checked += 1;
      const thresholdBucket = thresholdCrossed(deadline.deadline_date!, today);
      if (thresholdBucket === null) continue;
      const daysUntil = differenceInCalendarDays(new Date(deadline.deadline_date!), today);

      hits.push({
        userId: target.user_id,
        locale,
        source: "university_deadline",
        sourceId: deadline.id,
        daysUntil,
        thresholdBucket,
        link: `/universities/${canonicalId}`,
        // deadlineDetailLabel is verbatim source text or an internal enum value, never
        // translated — same "a quoted claim must stay checkable against its source"
        // principle lib/ai/output-language.ts documents for AI prose.
        itemLabel: `${universityName} — ${deadlineDetailLabel(deadline)}`,
        singleBody: translate("universityDeadlineApproaching", { name: universityName, detail: deadlineDetailLabel(deadline) }),
      });
    }
  }
  return { hits, checked };
}

/**
 * Which of `hits` have NOT already been notified about — one query against
 * deadline_notification_log (migration 0075) for every user appearing in `hits`, rather
 * than one query per hit. Dedupe key is (user_id, source, source_id, threshold_days): see
 * the migration's own comment for why threshold_days is part of the key (a nearer bucket
 * is a new fact) rather than deadlineDate (a pushed-back date shouldn't need special
 * handling — it's just a different thresholdBucket, already covered).
 */
async function filterAlreadyNotified(supabase: SupabaseClient<Database>, hits: DeadlineHit[]): Promise<DeadlineHit[]> {
  if (hits.length === 0) return [];
  const userIds = [...new Set(hits.map((hit) => hit.userId))];
  const { data: logged } = await supabase.from("deadline_notification_log").select("user_id, source, source_id, threshold_days").in("user_id", userIds);
  const loggedKeys = new Set((logged ?? []).map((row) => `${row.user_id}|${row.source}|${row.source_id}|${row.threshold_days}`));
  return hits.filter((hit) => !loggedKeys.has(`${hit.userId}|${hit.source}|${hit.sourceId}|${hit.thresholdBucket}`));
}

/**
 * Builds one notification's title/body/link from one student's crossed-threshold hits this
 * run — pure, no I/O, so the aggregation shape itself is directly testable without mocking
 * Supabase. A single hit reuses the exact title/body/link every student received before
 * this package (deadlineTomorrow/daysUntilDeadline + that source's own sentence + that
 * item's own link); this is deliberate byte-for-byte compatibility, not an oversight that
 * happens to look unaggregated. Two or more hits use a new digest shape: one title naming
 * the count, one line per item (sorted soonest-first) joined with "; " rather than a
 * newline — notification-bell.tsx renders `body` in a plain `line-clamp-2` span with no
 * `white-space: pre-line`, so a literal newline would collapse to a single space and read
 * as a run-on sentence; that component isn't this package's territory to change, so the
 * copy is designed to already work with it. Link points at /dashboard (the "Due soon"
 * widget, lib/deadlines/upcoming.ts) rather than any one item's own page, since a digest
 * covering different sources has no single correct destination.
 */
export function buildDigestNotification(hits: readonly DeadlineHit[], translate: NotificationTranslator): { title: string; body: string; link: string } {
  if (hits.length === 1) {
    const hit = hits[0];
    return {
      title: hit.daysUntil === 1 ? translate("deadlineTomorrow") : translate("daysUntilDeadline", { days: hit.daysUntil }),
      body: hit.singleBody,
      link: hit.link,
    };
  }

  const sorted = [...hits].sort((a, b) => a.daysUntil - b.daysUntil);
  const body = sorted
    .map((hit) => (hit.daysUntil === 1 ? translate("deadlineDigestItemTomorrow", { name: hit.itemLabel }) : translate("deadlineDigestItem", { name: hit.itemLabel, days: hit.daysUntil })))
    .join("; ");
  return {
    title: translate("deadlineDigestTitle", { count: hits.length }),
    body,
    link: "/dashboard",
  };
}

/**
 * Writes exactly one notification per student for this run (Phase 24: "avoid spam,
 * aggregate where possible") and logs every included hit to deadline_notification_log so
 * the same (student, deadline, bucket) is never notified again. Logging only happens after
 * a successful write — createNotification now reports whether the insert actually landed
 * (see its own updated comment) specifically so a failed notification is never logged as
 * delivered, which would otherwise permanently and silently suppress a reminder the
 * student never received.
 *
 * `.upsert(..., { ignoreDuplicates: true })` rather than a plain insert: filterAlreadyNotified
 * already excludes anything logged before this function runs, so this is a defensive second
 * layer against a genuine race (two overlapping scanDeadlines() runs), not the primary
 * dedupe mechanism — the unique index (migration 0075) is what actually makes that race safe
 * either way.
 *
 * Returns the number of deadline hits actually surfaced to a student (post-dedup, pre-
 * grouping) — a more meaningful "items processed" figure for runWithTracking than the
 * number of notification rows, the same way every other Phase 30 job counts real facts
 * written rather than batches sent.
 */
async function writeDeadlineNotifications(supabase: SupabaseClient<Database>, hits: DeadlineHit[], translators: Record<Locale, NotificationTranslator>): Promise<number> {
  const hitsByUser = new Map<string, DeadlineHit[]>();
  for (const hit of hits) {
    hitsByUser.set(hit.userId, [...(hitsByUser.get(hit.userId) ?? []), hit]);
  }

  let notified = 0;
  for (const [userId, userHits] of hitsByUser) {
    const translate = translators[userHits[0].locale];
    const { title, body, link } = buildDigestNotification(userHits, translate);

    const sent = await createNotification({ userId, category: "deadline", title, body, link });
    if (!sent) continue;

    const logRows: DeadlineNotificationLogInsert[] = userHits.map((hit) => ({
      user_id: hit.userId,
      source: hit.source,
      source_id: hit.sourceId,
      threshold_days: hit.thresholdBucket,
    }));
    const { error: logError } = await supabase.from("deadline_notification_log").upsert(logRows, { onConflict: "user_id,source,source_id,threshold_days", ignoreDuplicates: true });
    if (logError) {
      console.warn("[deadlines] failed to log notified deadlines", { userId, error: logError });
    }
    notified += userHits.length;
  }
  return notified;
}

/**
 * Scheduled job (Phase 24 notification; NOT Phase 30 Job B — this sends notifications
 * about deadlines already stored, it never re-reads a source to validate them. Real Job B
 * is docs/opportunity-reverification-job-design-2026-08-23.md's `opportunity_reverification`
 * design, unbuilt as of this writing. See that doc's §1.3 for why the name moved).
 * Cross-source Deadline Engine: scans applications, saved opportunities, and target
 * universities' program deadlines, aggregating every threshold crossed per student into
 * one notification per run (see writeDeadlineNotifications). See lib/deadlines/upcoming.ts
 * for the read-side ("Due soon" widget) that mirrors this same three-source union.
 */
export async function scanDeadlines(): Promise<{ notified: number; checked: number }> {
  const supabase = createAdminClient();
  const today = new Date();
  // Loaded once and threaded into the two functions below that need it — both run inside the
  // same Promise.all, so a single upfront load also avoids a redundant round trip. See
  // lib/universities/canonical.ts.
  const supersessionMap = await loadSupersessionMap(supabase);
  // One catalog load per shipped locale (not per student/deadline) — see loadTranslators.
  const translators = await loadTranslators();

  const [applications, opportunities, universities] = await Promise.all([
    scanApplications(supabase, today, supersessionMap, translators),
    scanSavedOpportunityDeadlines(supabase, today, translators),
    scanTargetUniversityDeadlines(supabase, today, supersessionMap, translators),
  ]);

  const allHits = [...applications.hits, ...opportunities.hits, ...universities.hits];
  const freshHits = await filterAlreadyNotified(supabase, allHits);
  const notified = await writeDeadlineNotifications(supabase, freshHits, translators);

  return {
    notified,
    checked: applications.checked + opportunities.checked + universities.checked,
  };
}
