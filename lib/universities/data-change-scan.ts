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
 * TWO SOURCES TODAY, aggregated into one notification per student per run (same "avoid
 * spam" shape lib/deadlines/scan.ts's DeadlineHit union already established for a
 * different category):
 *
 *   'university'  — a core institutional fact changed: name, city, institution_type,
 *                    website_url, student_size, or external_ids. Signalled by
 *                    universities.last_changed_at (migration 0006), compared against
 *                    when the student started tracking (target_universities.created_at).
 *   'requirement' — a brand-new admissions requirement appeared for a tracked university.
 *                    Signalled by university_requirements.created_at existing after the
 *                    student started tracking — a new row, not a changed one (see below
 *                    for why an existing row changing is out of scope).
 *
 * TWO MORE THINGS A STUDENT MIGHT REASONABLY EXPECT THIS TO COVER, DELIBERATELY NOT BUILT,
 * NAMED HERE SO THE GAP IS A DECISION AND NOT AN OVERSIGHT:
 *
 *   Deadline changes. university_deadlines already gets last_checked_at/data_status
 *   (migration 0074, "same enum, same meanings" as university_requirements) — but that
 *   migration is written and NOT applied to the live project (confirmed via
 *   `list_migrations` against the real project, 2026-09-02: the applied list still ends
 *   before 0074). Querying a column that does not exist live would fail outright, not
 *   degrade gracefully, so this source is not wired in. The moment 0074 lands, the same
 *   shape as the 'university' source above — compare last_changed_at against
 *   target_universities.created_at — covers it with a small, mechanical addition. This is
 *   also why it is not a duplicate of the existing deadline-approaching notification
 *   (lib/deadlines/scan.ts, category "deadline"): that one fires when a stored date crosses
 *   a days-until threshold; this one would fire on the date *changing at all*, which can
 *   happen far outside any threshold window and currently produces no signal to the
 *   student until the new date happens to enter one.
 *
 *   Admission-statistics changes (admission rate, SAT/ACT range, cost, graduation rate —
 *   university_statistics). That table has no last_changed_at-equivalent column at all,
 *   only retrieved_at — and retrieved_at has exactly the problem universities.last_changed_at
 *   had before this same package fixed it (lib/universities/sync-us-universities.ts,
 *   hasUniversityDataChanged): it is stamped on every sync regardless of whether any number
 *   actually differs, so it cannot support "changed" versus "merely re-verified." Covering
 *   this needs the same migration-plus-comparator treatment applied to university_statistics
 *   specifically — a real, separate, not-yet-scoped piece of work.
 *
 * WHY AN EXISTING REQUIREMENT'S OWN WORDING CHANGING IS NOT A THIRD SIGNAL: unlike a new
 * row appearing (unambiguous — it either exists or it doesn't), university_requirements has
 * no reliable way to tell "the actual constraint changed" apart from "the same fact was
 * re-extracted from the same source and happens to read slightly differently" — the exact
 * distinction CEO's brief named as the one that matters ("a requirement's phrasing being
 * re-extracted from the same source probably isn't [worth telling a student]"). Notifying
 * on every requirement row touch would notify on noise; not notifying on any of it is the
 * honest choice until a real changed-vs-reworded signal exists.
 */

/** Same active-status set lib/deadlines/scan.ts's scanTargetUniversityDeadlines uses —
 * redefined locally rather than imported, since that file doesn't export it and every
 * notification surface in this codebase already keeps its own constants self-contained
 * (see e.g. lib/scoring/profile-update-notification.ts's NOTIFIABLE_DIMENSION_DELTA). A
 * university a student has stopped actively pursuing (applied/accepted/rejected/withdrawn)
 * has nothing left to act on if its data changes. */
const ACTIVE_TARGET_STATUSES = ["exploring", "target", "applying"] as const;

/**
 * One change worth telling a student about. Collected by the two scan* functions below and
 * aggregated afterward, same shape lib/deadlines/scan.ts's DeadlineHit established.
 *
 * `source` + `lastChangedAt` together are the dedupe key persisted to
 * university_notification_log (migration 0078) — see that migration's own comment for why
 * `source` is part of the key (two independently real events about the same university
 * must not collide into one dedupe slot) and why a later `lastChangedAt` for the same
 * source is a new, re-notifiable fact.
 */
export interface UniversityChangeHit {
  userId: string;
  locale: Locale;
  universityId: string;
  universityName: string;
  source: UniversityNotificationSource;
  lastChangedAt: string;
}

type NotificationKey = "universityDataChangedTitle" | "universityDataChangedDigestTitle";
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
 * database. Shared by both sources below: for 'university' it compares
 * universities.last_changed_at, for 'requirement' it compares the new row's own
 * created_at — same question either way ("did this happen while the student was watching"),
 * just a different timestamp answering it.
 *
 * Null `sourceTimestamp` means no recorded event at all (most non-US universities'
 * last_changed_at today — see this file's own top comment) — that is not itself something
 * to report, unlike a genuinely absent value elsewhere in this codebase that gets treated
 * as "unknown" rather than "no". Strictly-after `trackedSince`, not on-or-after: an event
 * at the exact same instant the student started tracking (bulk-seeded fixture data, a
 * canonicalization backfill) did not happen *while they were watching*, which is the actual
 * claim this notification makes.
 */
export function hasChangedSinceTracked(sourceTimestamp: string | null, trackedSince: string): boolean {
  if (!sourceTimestamp) return false;
  return Date.parse(sourceTimestamp) > Date.parse(trackedSince);
}

/**
 * Source 1: a tracked university's own core facts changed. Exported (only) so a future
 * test can pin this source directly, matching every scan*Deadlines function's own reasoning
 * in lib/deadlines/scan.ts for why each source is independently testable.
 */
export async function scanTargetUniversityChanges(supabase: SupabaseClient<Database>, supersessionMap: SupersessionMap): Promise<{ hits: UniversityChangeHit[]; checked: number }> {
  const { data: targets } = await supabase.from("target_universities").select("user_id, university_id, created_at").in("status", ACTIVE_TARGET_STATUSES);
  if (!targets || targets.length === 0) return { hits: [], checked: 0 };

  const universityIds = [...new Set(targets.map((t) => canonicalUniversityId(supersessionMap, t.university_id)))];
  const { data: universities } = universityIds.length ? await supabase.from("universities").select("id, name, last_changed_at").in("id", universityIds) : { data: [] };
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
    });
  }
  return { hits, checked: targets.length };
}

/**
 * Source 2: a brand-new requirement appeared for a tracked university. Exported (only) for
 * the same direct-testability reason as scanTargetUniversityChanges above. University-wide
 * requirements only (program_id filtering is deliberately not applied here) — a new
 * program-specific requirement is still real news for a student tracking the university
 * generally; narrowing to their specific program, if they've picked one, is a refinement
 * this first version doesn't attempt.
 */
export async function scanNewUniversityRequirements(supabase: SupabaseClient<Database>, supersessionMap: SupersessionMap): Promise<{ hits: UniversityChangeHit[]; checked: number }> {
  const { data: targets } = await supabase.from("target_universities").select("user_id, university_id, created_at").in("status", ACTIVE_TARGET_STATUSES);
  if (!targets || targets.length === 0) return { hits: [], checked: 0 };

  const universityIds = [...new Set(targets.map((t) => canonicalUniversityId(supersessionMap, t.university_id)))];
  const [{ data: requirements }, { data: universities }] = universityIds.length
    ? await Promise.all([
        supabase.from("university_requirements").select("university_id, created_at").in("university_id", universityIds),
        supabase.from("universities").select("id, name").in("id", universityIds),
      ])
    : [{ data: [] }, { data: [] }];
  const universityNameById = new Map((universities ?? []).map((u) => [u.id, u.name]));

  // Only the newest requirement per university matters for this signal: one hit per
  // university naming the latest addition, not one hit per requirement row — a university
  // that gained 3 new requirements since a student started tracking it is one piece of news
  // ("requirements were added"), not three, and the newest created_at is also the correct
  // dedupe key going forward (an even-newer addition later is still a new fact and re-fires).
  const newestByUniversity = new Map<string, string>();
  for (const requirement of requirements ?? []) {
    const current = newestByUniversity.get(requirement.university_id);
    if (!current || requirement.created_at > current) newestByUniversity.set(requirement.university_id, requirement.created_at);
  }

  const localeByUser = await loadLocalesByUser(supabase, [...new Set(targets.map((t) => t.user_id))]);

  const hits: UniversityChangeHit[] = [];
  let checked = 0;
  for (const target of targets) {
    const canonicalId = canonicalUniversityId(supersessionMap, target.university_id);
    const newestRequirementAt = newestByUniversity.get(canonicalId);
    if (newestRequirementAt === undefined) continue;
    checked += 1;
    if (!hasChangedSinceTracked(newestRequirementAt, target.created_at)) continue;

    hits.push({
      userId: target.user_id,
      locale: localeByUser.get(target.user_id) ?? DEFAULT_LOCALE,
      universityId: canonicalId,
      universityName: universityNameById.get(canonicalId) ?? canonicalId,
      source: "requirement",
      lastChangedAt: newestRequirementAt,
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
 * Builds one notification's title/body/link from one student's changed universities this
 * run — pure, no I/O. Deliberately generic copy for the 'university' source: this codebase
 * has no field-level change log (universities.last_changed_at proves a row changed, never
 * what — the same limitation this project's own audits have already named for other
 * tables), so the notification can only ever say THAT something changed, never what. The
 * 'requirement' source is the one exception with something specific to say (a new
 * requirement exists), but even it doesn't quote the requirement's own text — that's a
 * second lookup this first version doesn't add, and the generic phrasing stays accurate
 * either way.
 *
 * A single hit names the university directly in the title, body null (nothing more to
 * honestly add — same "one line already says everything" shape
 * buildProfileUpdateNotification's completeness-only path uses) and links straight to that
 * university's own page. Multiple hits use a count-based title and a joined list of names
 * (deduplicated — the same university can appear from both sources in one run, and a
 * student does not need to see its name twice), linking to /dashboard rather than any one
 * university's page, same "no single correct destination" reasoning
 * lib/deadlines/scan.ts's buildDigestNotification gives for its own multi-source digest
 * link.
 */
export function buildUniversityChangeNotification(hits: readonly UniversityChangeHit[], translate: NotificationTranslator): { title: string; body: string | null; link: string } {
  if (hits.length === 1) {
    const hit = hits[0];
    return { title: translate("universityDataChangedTitle", { name: hit.universityName }), body: null, link: `/universities/${hit.universityId}` };
  }

  const uniqueNames = [...new Set(hits.map((hit) => hit.universityName))].sort((a, b) => a.localeCompare(b));
  return {
    title: translate("universityDataChangedDigestTitle", { count: uniqueNames.length }),
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
 */
async function writeUniversityChangeNotifications(supabase: SupabaseClient<Database>, hits: UniversityChangeHit[], translators: Record<Locale, NotificationTranslator>): Promise<number> {
  const hitsByUser = new Map<string, UniversityChangeHit[]>();
  for (const hit of hits) {
    hitsByUser.set(hit.userId, [...(hitsByUser.get(hit.userId) ?? []), hit]);
  }

  let notified = 0;
  for (const [userId, userHits] of hitsByUser) {
    const translate = translators[userHits[0].locale];
    const { title, body, link } = buildUniversityChangeNotification(userHits, translate);

    const sent = await createNotification({ userId, category: "university_data_changed", title, body, link });
    if (!sent) continue;

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
  return notified;
}

/**
 * Scheduled job (Phase 24 notification). Scans both sources described in this file's own
 * top comment across every active target_universities row, and aggregates every change per
 * student into one notification per run.
 */
export async function scanUniversityDataChanges(): Promise<{ notified: number; checked: number }> {
  const supabase = createAdminClient();
  const supersessionMap = await loadSupersessionMap(supabase);
  const translators = await loadTranslators();

  const [universityChanges, newRequirements] = await Promise.all([
    scanTargetUniversityChanges(supabase, supersessionMap),
    scanNewUniversityRequirements(supabase, supersessionMap),
  ]);

  const allHits = [...universityChanges.hits, ...newRequirements.hits];
  const freshHits = await filterAlreadyNotified(supabase, allHits);
  const notified = await writeUniversityChangeNotifications(supabase, freshHits, translators);

  return { notified, checked: universityChanges.checked + newRequirements.checked };
}
