import "server-only";

import { differenceInCalendarDays } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create";
import { canonicalUniversityId, loadSupersessionMap, type SupersessionMap } from "@/lib/universities/canonical";
import { NON_ACTIONABLE_VERIFICATION_STATES } from "@/lib/deadlines/ingest";
import { isOpportunityActionable } from "@/lib/opportunities/lifecycle";
import { deadlineDetailLabel } from "@/lib/deadlines/upcoming";
import { getTranslations } from "next-intl/server";
import { DEFAULT_LOCALE, toLocale, type Locale } from "@/lib/i18n/config";

/** Days-until-deadline thresholds that trigger a reminder (Phase 23/24). A student gets
 * at most one reminder per deadline per threshold — see the dedup check below. */
const REMINDER_THRESHOLDS = [14, 7, 3, 1];

const ACTIVE_APPLICATION_STATUSES = ["not_started", "in_progress", "submitted", "under_review"] as const;
const ACTIVE_TARGET_STATUSES = ["exploring", "target", "applying"] as const;

interface DeadlineCandidate {
  userId: string;
  deadlineDate: string;
  link: string;
  body: string;
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
  | "unnamedTargetUniversity";
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

/** Shared threshold-check + dedup + notify for one deadline candidate, reused across all
 * three sources below. Dedup is a cheap "was a notification linking to this already sent
 * in roughly the last day" check — good enough for a once-daily cron; a job running more
 * than once a day could double up right at a threshold boundary.
 *
 * Exported (only) so __tests__/deadlines/notify-if-threshold-crossed.test.ts can pin this
 * shared core directly — the actual threshold/dedup decision every one of the three scan
 * sources delegates to — rather than only exercising it indirectly through one source's
 * own table set. No behavior change. */
export async function notifyIfThresholdCrossed(supabase: SupabaseClient<Database>, today: Date, candidate: DeadlineCandidate, translate: NotificationTranslator): Promise<boolean> {
  const daysUntil = differenceInCalendarDays(new Date(candidate.deadlineDate), today);
  if (!REMINDER_THRESHOLDS.includes(daysUntil)) return false;

  const { data: recent } = await supabase
    .from("notifications")
    .select("id")
    .eq("user_id", candidate.userId)
    .eq("category", "deadline")
    .eq("link", candidate.link)
    .gte("created_at", new Date(today.getTime() - 20 * 60 * 60 * 1000).toISOString())
    .maybeSingle();
  if (recent) return false;

  await createNotification({
    userId: candidate.userId,
    category: "deadline",
    title: daysUntil === 1 ? translate("deadlineTomorrow") : translate("daysUntilDeadline", { days: daysUntil }),
    body: candidate.body,
    link: candidate.link,
  });
  return true;
}

/** Exported (only) so __tests__/deadlines/scan-applications.test.ts can pin its behavior
 * directly, without also mocking the opportunity/university scan sources. No behavior
 * change. */
export async function scanApplications(
  supabase: SupabaseClient<Database>,
  today: Date,
  supersessionMap: SupersessionMap,
  translators: Record<Locale, NotificationTranslator>
): Promise<{ notified: number; checked: number }> {
  const { data: applications } = await supabase
    .from("applications")
    .select("id, user_id, deadline, target_university_id")
    .not("deadline", "is", null)
    .in("status", ACTIVE_APPLICATION_STATUSES);

  if (!applications || applications.length === 0) return { notified: 0, checked: 0 };

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

  let notified = 0;
  for (const application of applications) {
    const universityId = universityIdByTarget.get(application.target_university_id);
    const universityName = universityId ? universityNameById.get(universityId) : null;
    const translate = translators[localeByUser.get(application.user_id) ?? DEFAULT_LOCALE];
    const wasNotified = await notifyIfThresholdCrossed(
      supabase,
      today,
      {
        userId: application.user_id,
        deadlineDate: application.deadline!,
        link: `/applications/${application.id}`,
        body: universityName ? translate("applicationDeadlineApproaching", { name: universityName }) : translate("applicationDeadlineApproachingGeneric"),
      },
      translate
    );
    if (wasNotified) notified += 1;
  }
  return { notified, checked: applications.length };
}

/** Exported (only) so __tests__/deadlines/scan.test.ts can pin and verify its
 * cycle_status filtering directly, without also mocking the application/university
 * scan sources. No behavior change. */
export async function scanSavedOpportunityDeadlines(
  supabase: SupabaseClient<Database>,
  today: Date,
  translators: Record<Locale, NotificationTranslator>
): Promise<{ notified: number; checked: number }> {
  const { data: saved } = await supabase.from("saved_opportunities").select("user_id, opportunity_id").eq("status", "saved");
  if (!saved || saved.length === 0) return { notified: 0, checked: 0 };

  const opportunityIds = [...new Set(saved.map((s) => s.opportunity_id))];
  const { data: opportunities } = await supabase
    .from("opportunities")
    .select("id, title, status, deadline, cycle_status")
    .in("id", opportunityIds)
    .not("deadline", "is", null);
  const opportunityById = new Map((opportunities ?? []).map((o) => [o.id, o]));

  const localeByUser = await loadLocalesByUser(supabase, [...new Set(saved.map((s) => s.user_id))]);

  let notified = 0;
  let checked = 0;
  for (const save of saved) {
    const opportunity = opportunityById.get(save.opportunity_id);
    if (!opportunity?.deadline) continue;
    // Same guard as lib/deadlines/upcoming.ts's read-side sibling: a closed/historical/
    // discontinued cycle must never trigger a "deadline approaching" notification, even
    // with a future-dated deadline still on file. 'unverified' stays reachable.
    if (!isOpportunityActionable(opportunity, today)) continue;
    checked += 1;
    const translate = translators[localeByUser.get(save.user_id) ?? DEFAULT_LOCALE];
    const wasNotified = await notifyIfThresholdCrossed(
      supabase,
      today,
      {
        userId: save.user_id,
        deadlineDate: opportunity.deadline,
        link: "/opportunities",
        body: translate("applicationDeadlineApproaching", { name: opportunity.title }),
      },
      translate
    );
    if (wasNotified) notified += 1;
  }
  return { notified, checked };
}

/** Exported (only) so __tests__/deadlines/scan-target-universities.test.ts can pin its
 * behavior directly, without also mocking the application/opportunity scan sources. No
 * behavior change. */
export async function scanTargetUniversityDeadlines(
  supabase: SupabaseClient<Database>,
  today: Date,
  supersessionMap: SupersessionMap,
  translators: Record<Locale, NotificationTranslator>
): Promise<{ notified: number; checked: number }> {
  const { data: targets } = await supabase
    .from("target_universities")
    .select("id, user_id, university_id, program_id")
    .in("status", ACTIVE_TARGET_STATUSES);
  if (!targets || targets.length === 0) return { notified: 0, checked: 0 };

  // Canonicalized: both so university_deadlines is queried for the winner row (where real
  // deadline data actually lives, per how pickCanonicalWinner scores FK richness) and so a
  // pre-existing loser-referencing target self-heals. See lib/universities/canonical.ts.
  const universityIds = [...new Set(targets.map((t) => canonicalUniversityId(supersessionMap, t.university_id)))];
  const [{ data: deadlines }, { data: universities }] = await Promise.all([
    supabase
      .from("university_deadlines")
      .select("university_id, program_id, deadline_type, deadline_date, verification_state, cycle_label, deadline_text_verbatim")
      .in("university_id", universityIds)
      .not("deadline_date", "is", null),
    supabase.from("universities").select("id, name").in("id", universityIds),
  ]);
  const universityNameById = new Map((universities ?? []).map((u) => [u.id, u.name]));

  const localeByUser = await loadLocalesByUser(supabase, [...new Set(targets.map((target) => target.user_id))]);

  let notified = 0;
  let checked = 0;
  for (const target of targets) {
    const canonicalId = canonicalUniversityId(supersessionMap, target.university_id);
    const translate = translators[localeByUser.get(target.user_id) ?? DEFAULT_LOCALE];
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
      const wasNotified = await notifyIfThresholdCrossed(
        supabase,
        today,
        {
          userId: target.user_id,
          deadlineDate: deadline.deadline_date!,
          link: `/universities/${canonicalId}`,
          // deadlineDetailLabel is verbatim source text or an internal enum value, never
          // translated — same "a quoted claim must stay checkable against its source"
          // principle lib/ai/output-language.ts documents for AI prose.
          body: translate("universityDeadlineApproaching", { name: universityName, detail: deadlineDetailLabel(deadline) }),
        },
        translate
      );
      if (wasNotified) notified += 1;
    }
  }
  return { notified, checked };
}

/**
 * Scheduled job (Phase 24 notification; NOT Phase 30 Job B — this sends notifications
 * about deadlines already stored, it never re-reads a source to validate them. Real Job B
 * is docs/opportunity-reverification-job-design-2026-08-23.md's `opportunity_reverification`
 * design, unbuilt as of this writing. See that doc's §1.3 for why the name moved).
 * Cross-source Deadline Engine: scans applications, saved opportunities, and target
 * universities' program deadlines, notifying the owner once per threshold crossed per
 * deadline. See lib/deadlines/upcoming.ts for the read-side ("Due soon" widget) that
 * mirrors this same three-source union.
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

  return {
    notified: applications.notified + opportunities.notified + universities.notified,
    checked: applications.checked + opportunities.checked + universities.checked,
  };
}
