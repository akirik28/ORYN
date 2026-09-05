import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, UniversityNotificationLogInsert, UniversityNotificationSource } from "@/types/database";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create";
import { canonicalUniversityId, loadSupersessionMap, type SupersessionMap } from "@/lib/universities/canonical";
import { getTranslations } from "next-intl/server";
import { DEFAULT_LOCALE, toLocale, type Locale } from "@/lib/i18n/config";

/**
 * Phase 24 notification: university_data_changed — the last notification category with a
 * real student behind it that had never fired once (`notifications` table, zero rows this
 * category, confirmed live 2026-09-02). A student tracks a university (Phase 15's My
 * Universities) and something about it changes later; before this file, they found out by
 * chance or not at all.
 *
 * FOUR SOURCES, aggregated into one notification per student per run (same "avoid spam"
 * shape lib/deadlines/scan.ts's DeadlineHit union already established for a different
 * category). It matters which claim each source is making, and — 2026-09-05, the
 * university-notification first-fill fix — it turned out to matter at a finer grain than
 * "which source" alone:
 *
 *   VALUE CHANGED (further split into "added"/"changed" — see UniversityChangeKind) — a row
 *   that already existed now holds a different value, proven by a last_changed_at that only
 *   ever advances on a genuine difference (see each writer's own classifier):
 *     'university'  — a core institutional fact (name/city/type/website/size/external_ids).
 *                      universities.last_changed_at (migration 0006), via
 *                      classifyUniversityDataChange.
 *     'statistics'  — an admission number (admission_rate, SAT/ACT range, graduation_rate,
 *                      cost_of_attendance). university_statistics.last_changed_at
 *                      (migration 0080), via classifyStatisticsDataChange. Both classifiers
 *                      live in lib/universities/sync-us-universities.ts.
 *
 *   Found live 2026-09-05, CEO's own dispatch ("Oxford hiçbir şey yapmadı, biz ilk kez
 *   baktık"): "VALUE CHANGED" as a single claim was itself dishonest whenever the row's PRIOR
 *   value was null — a stub's core facts or a university's first-ever statistics being
 *   researched and written for the first time is not the university changing anything, and
 *   read identically to a genuine later correction under a plain existing!==incoming check.
 *   Migration 0143's last_change_kind ('added'/'changed'/null, alongside last_changed_at)
 *   is what lets 'university'/'statistics' make the correct one of two honest claims instead
 *   of one dishonest collapsed one — see UniversityChangeKind's own header for the `null`
 *   case (pre-migration history with no recorded classification), which is a real, deliberate
 *   third answer, not a bug.
 *
 *   NEW ROW APPEARED (`changeKind: "new_row"`) — nothing existed before; now something does.
 *   This is a weaker claim on purpose: it says something is new, never that something
 *   changed, because for these two tables "changed" cannot currently be told apart from
 *   "touched again":
 *     'requirement' — a new university_requirements row, via its own created_at.
 *     'deadline'    — a new university_deadlines row, via its own created_at.
 *
 * All four compare their timestamp against target_universities.created_at (when the
 * student started tracking) via the shared hasChangedSinceTracked below — same question
 * every time ("did this happen while the student was watching"), four different sources
 * answering it.
 *
 * WHY 'deadline' IS "NEW ROW", NOT "VALUE CHANGED", AND WHY THAT IS NOT A SMALL GAP
 *
 * The natural expectation — mirroring 'university'/'statistics' — would be a
 * university_deadlines.last_changed_at that advances when a deadline's own date moves.
 * That is not buildable today, for a reason deeper than a missing column: **every write to
 * university_deadlines in this codebase is a plain insert; nothing ever updates a row in
 * place** (checked directly: every call site — scripts/apply-*.ts, insert-uk-october-
 * deadlines.ts, ingest-requirements-deadlines.ts — inserts; lib/deadlines/scan.ts and
 * upcoming.ts only read). There is no row whose last_changed_at could ever advance the way
 * universities' or university_statistics' can, because there is no update event to attach
 * one to.
 *
 * The obvious fallback — "a newer row for the same (university, deadline_type) than an
 * older one means the older one was corrected" — does not hold either, checked against live
 * data rather than assumed: every (university_id, deadline_type, application_cycle,
 * cycle_year) group with more than one row and more than one distinct date has
 * program_id = null on every row. These are not one fact re-researched twice; they are
 * several genuinely different programs' deadlines that share a coarse, program-unresolved
 * type label and cycle (real example: one university, "application"/2026, seven DIFFERENT
 * real dates from 2025-12-15 to 2026-07-15, all inserted within an 8-second research batch
 * on 2026-08-21 — not a sequence of corrections to one fact). There is currently zero live
 * evidence of an actual same-fact correction ever happening in this table, which means
 * there is nothing to validate a "newer row supersedes an older one" heuristic against
 * either — building one now would be guessing at a shape nobody has observed.
 *
 * Closing this properly needs an actual redesign of how a re-researched deadline lands —
 * some real notion of "this new row supersedes that old one" (a foreign key, a status
 * column, an update-in-place path with a stronger dedup key than
 * (university, type, date)) — which is a product/architecture decision, not a column-and-
 * comparator pair. Not attempted here. What IS built for 'deadline' — a brand-new row
 * appearing — is real, honest, and independent of that larger question: it says "a deadline
 * was published for this university that didn't exist when you started tracking it," never
 * "a deadline moved," and that distinction is the whole reason it is grouped with
 * 'requirement' above rather than with 'university'/'statistics'.
 *
 * Also why 'deadline' does not duplicate the existing deadline-approaching notification
 * (lib/deadlines/scan.ts, category "deadline"): that one fires when an already-stored date
 * crosses a days-until threshold; this fires once, when the row itself first appears,
 * regardless of how far out its date is.
 *
 * WHY AN EXISTING REQUIREMENT'S (OR DEADLINE'S) OWN WORDING/DATE CHANGING IS NOT A SIGNAL
 * ON ITS OWN: unlike a new row appearing (unambiguous — it either exists or it doesn't),
 * neither table has a reliable way to tell "the actual fact changed" apart from "the same
 * fact was re-extracted and reads slightly differently" — the exact distinction CEO's brief
 * named as the one that matters for requirements ("a requirement's phrasing being
 * re-extracted from the same source probably isn't [worth telling a student]"), and the
 * live-data finding above shows the identical shape holds for deadlines too. Notifying on
 * every row touch would notify on noise; not notifying on any of it is the honest choice
 * until a real changed-vs-reworded signal exists for either table.
 */

/** Same active-status set lib/deadlines/scan.ts's scanTargetUniversityDeadlines uses —
 * redefined locally rather than imported, since that file doesn't export it and every
 * notification surface in this codebase already keeps its own constants self-contained
 * (see e.g. lib/scoring/profile-update-notification.ts's NOTIFIABLE_DIMENSION_DELTA). A
 * university a student has stopped actively pursuing (applied/accepted/rejected/withdrawn)
 * has nothing left to act on if its data changes. */
const ACTIVE_TARGET_STATUSES = ["exploring", "target", "applying"] as const;

/**
 * 2026-09-05, the university-notification first-fill fix: the fourth word this file's own
 * claim can make, alongside the two "VALUE CHANGED" sources' "added"/"changed" and the two
 * "NEW ROW APPEARED" sources' implicit third claim (now named `"new_row"` explicitly rather
 * than left as an untyped source-implies-wording assumption in buildUniversityChangeNotification).
 *
 * `null` is its OWN, deliberately weak fourth state, not a default for either of the other
 * two — CEO's own finding: every row whose `last_changed_at` was stamped before migration
 * 0143 existed has no recorded classification at all, and reading that absence as "changed"
 * would reproduce this exact bug for all pre-migration history, while reading it as "added"
 * would misdescribe a real, older correction as if it were new information. Saying "we don't
 * know which this was" is the honest answer for that population — the same "unknown beats
 * confidently wrong" lesson this product relearned repeatedly the same night this file's own
 * `requirement`/`deadline` sources were first built.
 */
export type UniversityChangeKind = "added" | "changed" | "new_row" | null;

/**
 * One change worth telling a student about. Collected by the four scan* functions below and
 * aggregated afterward, same shape lib/deadlines/scan.ts's DeadlineHit established.
 *
 * `source` + `lastChangedAt` together are the dedupe key persisted to
 * university_notification_log (migrations 0078/0080) — see those migrations' own comments
 * for why `source` is part of the key (independently real events about the same university,
 * from different sources, must not collide into one dedupe slot) and why a later
 * `lastChangedAt` for the same source is a new, re-notifiable fact. `changeKind` is not part
 * of that key on purpose — the same (user, university, source, timestamp) event is the same
 * fact regardless of which sentence it earns, so it must not create a second, redundant
 * dedupe slot.
 */
export interface UniversityChangeHit {
  userId: string;
  locale: Locale;
  universityId: string;
  universityName: string;
  source: UniversityNotificationSource;
  lastChangedAt: string;
  changeKind: UniversityChangeKind;
}

type NotificationKey =
  | "universityDataAddedTitle"
  | "universityDataChangedTitle"
  | "universityNewInformationTitle"
  | "universityDataChangedDigestTitle"
  | "universityNewInformationDigestTitle";
type NotificationTranslator = (key: NotificationKey, values?: Record<string, string | number>) => string;

async function loadTranslators(): Promise<Record<Locale, NotificationTranslator>> {
  const [en, tr] = await Promise.all([getTranslations({ locale: "en", namespace: "notifications" }), getTranslations({ locale: "tr", namespace: "notifications" })]);
  return { en, tr };
}

async function loadLocalesByUser(supabase: SupabaseClient<Database>, userIds: string[]): Promise<Map<string, Locale>> {
  if (userIds.length === 0) return new Map();
  const { data } = await supabase.from("profiles").select("id, preferred_language").in("id", userIds);
  return new Map((data ?? []).map((p) => [p.id, toLocale(p.preferred_language)]));
}

/**
 * Whether a source timestamp represents something that happened since a student started
 * tracking this university — pure, no I/O, so the decision is directly testable without a
 * database. Shared by all four sources below: each compares a different timestamp, but asks
 * the identical question ("did this happen while the student was watching").
 *
 * Null `sourceTimestamp` means no recorded event at all — that is not itself something to
 * report, unlike a genuinely absent value elsewhere in this codebase that gets treated as
 * "unknown" rather than "no". Strictly-after `trackedSince`, not on-or-after: an event at
 * the exact same instant the student started tracking (bulk-seeded fixture data, a
 * canonicalization backfill) did not happen *while they were watching*, which is the actual
 * claim this notification makes.
 */
export function hasChangedSinceTracked(sourceTimestamp: string | null, trackedSince: string): boolean {
  if (!sourceTimestamp) return false;
  return Date.parse(sourceTimestamp) > Date.parse(trackedSince);
}

/**
 * The newest row per university from a flat list of (university_id, timestamp, ...) rows —
 * shared by every "new row appeared" / "newest sibling row" source below (a university with
 * several new requirements, deadlines, or stat-year rows since a student started tracking it
 * is one piece of news, not several, and the newest timestamp is also the correct dedupe key
 * going forward: a still-newer one later is still a new fact and re-fires). Returns the whole
 * row, not just its timestamp, so a caller that attached extra fields (statistics' own
 * `changeKind`, 2026-09-05) can read the winning row's own value for them rather than only
 * its timestamp.
 */
function newestRowByUniversity<T extends { university_id: string; timestamp: string | null }>(rows: readonly T[]): Map<string, T> {
  const newest = new Map<string, T>();
  for (const row of rows) {
    if (!row.timestamp) continue;
    const current = newest.get(row.university_id);
    if (!current || row.timestamp > current.timestamp!) newest.set(row.university_id, row);
  }
  return newest;
}

async function loadActiveTargets(supabase: SupabaseClient<Database>): Promise<{ user_id: string; university_id: string; created_at: string }[]> {
  const { data } = await supabase.from("target_universities").select("user_id, university_id, created_at").in("status", ACTIVE_TARGET_STATUSES);
  return data ?? [];
}

/**
 * Source 'university': a tracked university's own core facts changed. Exported (only) so a
 * future test can pin this source directly, matching every scan*Deadlines function's own
 * reasoning in lib/deadlines/scan.ts for why each source is independently testable.
 */
export async function scanTargetUniversityChanges(supabase: SupabaseClient<Database>, supersessionMap: SupersessionMap): Promise<{ hits: UniversityChangeHit[]; checked: number }> {
  const targets = await loadActiveTargets(supabase);
  if (targets.length === 0) return { hits: [], checked: 0 };

  const universityIds = [...new Set(targets.map((t) => canonicalUniversityId(supersessionMap, t.university_id)))];
  const { data: universities } = universityIds.length
    ? await supabase.from("universities").select("id, name, last_changed_at, last_change_kind").in("id", universityIds)
    : { data: [] };
  const universityById = new Map((universities ?? []).map((u) => [u.id, u]));

  const localeByUser = await loadLocalesByUser(supabase, [...new Set(targets.map((t) => t.user_id))]);

  const hits: UniversityChangeHit[] = [];
  for (const target of targets) {
    const canonicalId = canonicalUniversityId(supersessionMap, target.university_id);
    const university = universityById.get(canonicalId);
    if (!university) continue;
    if (!hasChangedSinceTracked(university.last_changed_at, target.created_at)) continue;

    hits.push({
      userId: target.user_id,
      locale: localeByUser.get(target.user_id) ?? DEFAULT_LOCALE,
      universityId: canonicalId,
      universityName: university.name,
      source: "university",
      lastChangedAt: university.last_changed_at!,
      // `?? null` reads a genuinely-null value and a not-yet-migrated missing column
      // identically -- both mean "we don't know which kind of change this was", the same
      // honest answer either way (see UniversityChangeKind's own header).
      changeKind: university.last_change_kind ?? null,
    });
  }
  return { hits, checked: targets.length };
}

/** Shared body for the two "new row appeared" sources ('requirement', 'deadline') — same
 * shape, different table and column set, so the loop itself is factored once and each
 * caller only supplies how to read its own table. */
async function scanNewRowsAppeared(
  supabase: SupabaseClient<Database>,
  supersessionMap: SupersessionMap,
  source: "requirement" | "deadline",
  loadRows: (universityIds: string[]) => Promise<{ university_id: string; timestamp: string | null }[]>
): Promise<{ hits: UniversityChangeHit[]; checked: number }> {
  const targets = await loadActiveTargets(supabase);
  if (targets.length === 0) return { hits: [], checked: 0 };

  const universityIds = [...new Set(targets.map((t) => canonicalUniversityId(supersessionMap, t.university_id)))];
  const [rows, { data: universities }] = universityIds.length
    ? await Promise.all([loadRows(universityIds), supabase.from("universities").select("id, name").in("id", universityIds)])
    : [[], { data: [] }];
  const universityNameById = new Map((universities ?? []).map((u) => [u.id, u.name]));
  const newestByUniversity = newestRowByUniversity(rows);

  const localeByUser = await loadLocalesByUser(supabase, [...new Set(targets.map((t) => t.user_id))]);

  const hits: UniversityChangeHit[] = [];
  let checked = 0;
  for (const target of targets) {
    const canonicalId = canonicalUniversityId(supersessionMap, target.university_id);
    const newest = newestByUniversity.get(canonicalId);
    if (newest === undefined) continue;
    checked += 1;
    if (!hasChangedSinceTracked(newest.timestamp, target.created_at)) continue;

    hits.push({
      userId: target.user_id,
      locale: localeByUser.get(target.user_id) ?? DEFAULT_LOCALE,
      universityId: canonicalId,
      universityName: universityNameById.get(canonicalId) ?? canonicalId,
      source,
      lastChangedAt: newest.timestamp!,
      // Always "new_row" for these two sources -- this file's own top comment has always
      // scoped 'requirement'/'deadline' to "something is new", never "something changed";
      // this just gives that existing, deliberate claim an explicit name instead of leaving
      // it as an implicit assumption baked into the notification copy.
      changeKind: "new_row",
    });
  }
  return { hits, checked };
}

/**
 * Source 'requirement': a brand-new requirement appeared for a tracked university.
 * University-wide requirements only (program_id filtering is deliberately not applied
 * here) — a new program-specific requirement is still real news for a student tracking the
 * university generally; narrowing to their specific program, if they've picked one, is a
 * refinement this first version doesn't attempt.
 */
export async function scanNewUniversityRequirements(supabase: SupabaseClient<Database>, supersessionMap: SupersessionMap): Promise<{ hits: UniversityChangeHit[]; checked: number }> {
  return scanNewRowsAppeared(supabase, supersessionMap, "requirement", async (universityIds) => {
    const { data } = await supabase.from("university_requirements").select("university_id, created_at").in("university_id", universityIds);
    return (data ?? []).map((r) => ({ university_id: r.university_id, timestamp: r.created_at }));
  });
}

/**
 * Source 'deadline': a brand-new deadline row appeared for a tracked university — NOT an
 * existing deadline's date changing. See this file's own top comment for why that half is
 * deliberately unbuilt (an insert-only table with no live evidence of what a genuine
 * same-fact correction even looks like). Same university-wide, program-agnostic scope as
 * scanNewUniversityRequirements, same reasoning.
 */
export async function scanNewUniversityDeadlines(supabase: SupabaseClient<Database>, supersessionMap: SupersessionMap): Promise<{ hits: UniversityChangeHit[]; checked: number }> {
  return scanNewRowsAppeared(supabase, supersessionMap, "deadline", async (universityIds) => {
    const { data } = await supabase.from("university_deadlines").select("university_id, created_at").in("university_id", universityIds);
    return (data ?? []).map((r) => ({ university_id: r.university_id, timestamp: r.created_at }));
  });
}

/**
 * Source 'statistics': an admission number for a tracked university was added or genuinely
 * changed. university_statistics is keyed by (university_id, stat_year), so a university can
 * carry several years' worth of rows — the newest last_changed_at across all of them is the
 * signal, same "one piece of news, not several" reasoning newestRowByUniversity documents,
 * applied here via the same shared helper rather than the new-row scanner (this source reads
 * last_changed_at, not created_at — an existing stat_year row updated in place, per
 * classifyStatisticsDataChange, not a new row appearing).
 */
export async function scanUniversityStatisticsChanges(supabase: SupabaseClient<Database>, supersessionMap: SupersessionMap): Promise<{ hits: UniversityChangeHit[]; checked: number }> {
  const targets = await loadActiveTargets(supabase);
  if (targets.length === 0) return { hits: [], checked: 0 };

  const universityIds = [...new Set(targets.map((t) => canonicalUniversityId(supersessionMap, t.university_id)))];
  const [{ data: stats }, { data: universities }] = universityIds.length
    ? await Promise.all([
        supabase.from("university_statistics").select("university_id, last_changed_at, last_change_kind").in("university_id", universityIds),
        supabase.from("universities").select("id, name").in("id", universityIds),
      ])
    : [{ data: [] }, { data: [] }];
  const universityNameById = new Map((universities ?? []).map((u) => [u.id, u.name]));
  const newestByUniversity = newestRowByUniversity(
    (stats ?? []).map((s) => ({ university_id: s.university_id, timestamp: s.last_changed_at, changeKind: s.last_change_kind ?? null }))
  );

  const localeByUser = await loadLocalesByUser(supabase, [...new Set(targets.map((t) => t.user_id))]);

  const hits: UniversityChangeHit[] = [];
  let checked = 0;
  for (const target of targets) {
    const canonicalId = canonicalUniversityId(supersessionMap, target.university_id);
    const newest = newestByUniversity.get(canonicalId);
    // Unlike the two "new row" sources, absence here is not itself "checked" in the same
    // sense — a university with zero statistics rows at all was never going to produce a
    // hit, but one WITH rows whose last_changed_at is still null (never observed to
    // change) genuinely was checked and found nothing. Both count toward `checked` once
    // any stat row exists for the university, matching the requirement/deadline sources'
    // own "checked means a candidate row existed to evaluate" convention.
    const hasAnyStatsRow = (stats ?? []).some((s) => s.university_id === canonicalId);
    if (!hasAnyStatsRow) continue;
    checked += 1;
    if (newest === undefined || !hasChangedSinceTracked(newest.timestamp, target.created_at)) continue;

    hits.push({
      userId: target.user_id,
      locale: localeByUser.get(target.user_id) ?? DEFAULT_LOCALE,
      universityId: canonicalId,
      universityName: universityNameById.get(canonicalId) ?? canonicalId,
      source: "statistics",
      lastChangedAt: newest.timestamp!,
      // `?? null` reads a genuinely-null value and a not-yet-migrated missing column
      // identically, same as the 'university' source above.
      changeKind: newest.changeKind,
    });
  }
  return { hits, checked };
}

/**
 * Which of `hits` have NOT already been notified about — same shape as
 * lib/deadlines/scan.ts's filterAlreadyNotified, one query per run rather than one per hit.
 */
async function filterAlreadyNotified(supabase: SupabaseClient<Database>, hits: UniversityChangeHit[]): Promise<UniversityChangeHit[]> {
  if (hits.length === 0) return [];
  const userIds = [...new Set(hits.map((hit) => hit.userId))];
  const { data: logged } = await supabase.from("university_notification_log").select("user_id, university_id, source, last_changed_at").in("user_id", userIds);
  const loggedKeys = new Set((logged ?? []).map((row) => `${row.user_id}|${row.university_id}|${row.source}|${row.last_changed_at}`));
  return hits.filter((hit) => !loggedKeys.has(`${hit.userId}|${hit.universityId}|${hit.source}|${hit.lastChangedAt}`));
}

/**
 * Which single-hit title key matches a hit's own claim. `null` and `"new_row"` share one key
 * on purpose: both are this file's deliberately weak claim ("there's new information", never
 * asserting which of the other two is true) — `null` because a pre-migration-0143 row's
 * history genuinely isn't known, `"new_row"` because 'requirement'/'deadline' have never
 * claimed anything stronger (see this file's own top comment). `"changed"` and `"added"` each
 * get their own specific, honest sentence.
 */
function titleKeyForKind(kind: UniversityChangeKind): "universityDataAddedTitle" | "universityDataChangedTitle" | "universityNewInformationTitle" {
  if (kind === "added") return "universityDataAddedTitle";
  if (kind === "changed") return "universityDataChangedTitle";
  return "universityNewInformationTitle";
}

/**
 * The digest counterpart of titleKeyForKind, applied to a GROUP of hits rather than one. Two
 * tiers, not three: `"changed"` outranks everything else — the same "a real exclusion
 * outranks the caveat" precedence OpportunityStandingBadge already uses, since one genuine
 * correction in the group is a stronger, more specific fact than "some of these have new
 * information." `"added"`/`"new_row"`/`null` share the same softer digest tier deliberately —
 * a digest already collapses several different universities into one line with no
 * per-university detail (this file's own long-standing design: a joined name list in the
 * body, not a claim per name), so a THIRD digest-only tier just for "added" would buy very
 * little precision for real awkwardness in the copy ("N universities' info added for the
 * first time" reads worse than it informs); the single-hit case already carries that exact
 * distinction where it matters most.
 */
function digestTitleKeyForKinds(kinds: readonly UniversityChangeKind[]): "universityDataChangedDigestTitle" | "universityNewInformationDigestTitle" {
  return kinds.includes("changed") ? "universityDataChangedDigestTitle" : "universityNewInformationDigestTitle";
}

/**
 * Builds one notification's title/body/link from one student's changed universities this
 * run — pure, no I/O. 2026-09-05: used to be one generic title for every source ("information
 * updated"), which was wrong twice over — a first-time fill read exactly like a real
 * correction, and 'requirement'/'deadline''s own deliberately weaker "something is new" claim
 * (this file's own top comment) never reached the student either. Three sentences now, picked
 * by `changeKind` via titleKeyForKind/digestTitleKeyForKinds above — still no field-level
 * specifics (this codebase has no change log for any of the four tables involved), but the
 * one distinction that IS known (added vs. changed vs. "something's new, not sure which")
 * is no longer thrown away between the scan and the screen.
 *
 * A single hit names the university directly in the title, body null (nothing more to
 * honestly add — same "one line already says everything" shape
 * buildProfileUpdateNotification's completeness-only path uses) and links straight to that
 * university's own page. Multiple hits use a count-based title and a joined list of names
 * (deduplicated — the same university can appear from more than one source in one run, and
 * a student does not need to see its name twice), linking to /dashboard rather than any one
 * university's page, same "no single correct destination" reasoning
 * lib/deadlines/scan.ts's buildDigestNotification gives for its own multi-source digest
 * link.
 */
export function buildUniversityChangeNotification(hits: readonly UniversityChangeHit[], translate: NotificationTranslator): { title: string; body: string | null; link: string } {
  if (hits.length === 1) {
    const hit = hits[0];
    return { title: translate(titleKeyForKind(hit.changeKind), { name: hit.universityName }), body: null, link: `/universities/${hit.universityId}` };
  }

  const uniqueNames = [...new Set(hits.map((hit) => hit.universityName))].sort((a, b) => a.localeCompare(b));
  return {
    title: translate(digestTitleKeyForKinds(hits.map((hit) => hit.changeKind)), { count: uniqueNames.length }),
    body: uniqueNames.join("; "),
    link: "/dashboard",
  };
}

/**
 * Writes exactly one notification per student for this run and logs every included hit to
 * university_notification_log — same "aggregate, log only after a confirmed write" shape
 * as lib/deadlines/scan.ts's writeDeadlineNotifications, including the reasoning for why
 * logging must happen strictly after createNotification reports a real insert (a failed
 * write must never be logged as delivered, or the student silently never gets a real
 * chance to hear about this change again — the dedupe key would already exist).
 *
 * `failed` counts only genuine write errors (`createNotification` returning `"failed"`) —
 * a `"muted"` outcome is a student's own legitimate preference, not a fact this job's error
 * count should ever reflect, same as scanStaleOutlooks's own `refused` counter is deliberately
 * kept separate from its `failed` one.
 */
async function writeUniversityChangeNotifications(
  supabase: SupabaseClient<Database>,
  hits: UniversityChangeHit[],
  translators: Record<Locale, NotificationTranslator>
): Promise<{ notified: number; failed: number }> {
  const hitsByUser = new Map<string, UniversityChangeHit[]>();
  for (const hit of hits) {
    hitsByUser.set(hit.userId, [...(hitsByUser.get(hit.userId) ?? []), hit]);
  }

  let notified = 0;
  let failed = 0;
  for (const [userId, userHits] of hitsByUser) {
    const translate = translators[userHits[0].locale];
    const { title, body, link } = buildUniversityChangeNotification(userHits, translate);

    const outcome = await createNotification({ userId, category: "university_data_changed", title, body, link });
    if (outcome === "failed") failed++;
    if (outcome !== "sent") continue;

    const logRows: UniversityNotificationLogInsert[] = userHits.map((hit) => ({
      user_id: hit.userId,
      university_id: hit.universityId,
      source: hit.source,
      last_changed_at: hit.lastChangedAt,
    }));
    const { error: logError } = await supabase
      .from("university_notification_log")
      .upsert(logRows, { onConflict: "user_id,university_id,source,last_changed_at", ignoreDuplicates: true });
    if (logError) {
      console.warn("[universities] failed to log notified university changes", { userId, error: logError });
    }
    notified += userHits.length;
  }
  return { notified, failed };
}

/**
 * Scheduled job (Phase 24 notification). Scans all four sources described in this file's
 * own top comment across every active target_universities row, and aggregates every change
 * per student into one notification per run.
 */
export async function scanUniversityDataChanges(): Promise<{ notified: number; checked: number; failed: number }> {
  const supabase = createAdminClient();
  const supersessionMap = await loadSupersessionMap(supabase);
  const translators = await loadTranslators();

  const [universityChanges, newRequirements, newDeadlines, statisticsChanges] = await Promise.all([
    scanTargetUniversityChanges(supabase, supersessionMap),
    scanNewUniversityRequirements(supabase, supersessionMap),
    scanNewUniversityDeadlines(supabase, supersessionMap),
    scanUniversityStatisticsChanges(supabase, supersessionMap),
  ]);

  const allHits = [...universityChanges.hits, ...newRequirements.hits, ...newDeadlines.hits, ...statisticsChanges.hits];
  const freshHits = await filterAlreadyNotified(supabase, allHits);
  const { notified, failed } = await writeUniversityChangeNotifications(supabase, freshHits, translators);

  return { notified, failed, checked: universityChanges.checked + newRequirements.checked + newDeadlines.checked + statisticsChanges.checked };
}
