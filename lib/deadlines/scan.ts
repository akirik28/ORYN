import "server-only";

import { differenceInCalendarDays } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create";

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

/** Shared threshold-check + dedup + notify for one deadline candidate, reused across all
 * three sources below. Dedup is a cheap "was a notification linking to this already sent
 * in roughly the last day" check — good enough for a once-daily cron; a job running more
 * than once a day could double up right at a threshold boundary. */
async function notifyIfThresholdCrossed(supabase: SupabaseClient<Database>, today: Date, candidate: DeadlineCandidate): Promise<boolean> {
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
    title: daysUntil === 1 ? "Deadline tomorrow" : `${daysUntil} days until deadline`,
    body: candidate.body,
    link: candidate.link,
  });
  return true;
}

async function scanApplications(supabase: SupabaseClient<Database>, today: Date): Promise<{ notified: number; checked: number }> {
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
  const universityIdByTarget = new Map((targets ?? []).map((t) => [t.id, t.university_id]));

  const universityIds = [...new Set((targets ?? []).map((t) => t.university_id))];
  const { data: universities } = universityIds.length
    ? await supabase.from("universities").select("id, name").in("id", universityIds)
    : { data: [] };
  const universityNameById = new Map((universities ?? []).map((u) => [u.id, u.name]));

  let notified = 0;
  for (const application of applications) {
    const universityId = universityIdByTarget.get(application.target_university_id);
    const universityName = universityId ? universityNameById.get(universityId) : null;
    const wasNotified = await notifyIfThresholdCrossed(supabase, today, {
      userId: application.user_id,
      deadlineDate: application.deadline!,
      link: `/applications/${application.id}`,
      body: universityName ? `${universityName} — application deadline approaching.` : "An application deadline is approaching.",
    });
    if (wasNotified) notified += 1;
  }
  return { notified, checked: applications.length };
}

async function scanSavedOpportunityDeadlines(supabase: SupabaseClient<Database>, today: Date): Promise<{ notified: number; checked: number }> {
  const { data: saved } = await supabase.from("saved_opportunities").select("user_id, opportunity_id").eq("status", "saved");
  if (!saved || saved.length === 0) return { notified: 0, checked: 0 };

  const opportunityIds = [...new Set(saved.map((s) => s.opportunity_id))];
  const { data: opportunities } = await supabase
    .from("opportunities")
    .select("id, title, deadline")
    .in("id", opportunityIds)
    .not("deadline", "is", null);
  const opportunityById = new Map((opportunities ?? []).map((o) => [o.id, o]));

  let notified = 0;
  let checked = 0;
  for (const save of saved) {
    const opportunity = opportunityById.get(save.opportunity_id);
    if (!opportunity?.deadline) continue;
    checked += 1;
    const wasNotified = await notifyIfThresholdCrossed(supabase, today, {
      userId: save.user_id,
      deadlineDate: opportunity.deadline,
      link: "/opportunities",
      body: `${opportunity.title} — application deadline approaching.`,
    });
    if (wasNotified) notified += 1;
  }
  return { notified, checked };
}

async function scanTargetUniversityDeadlines(supabase: SupabaseClient<Database>, today: Date): Promise<{ notified: number; checked: number }> {
  const { data: targets } = await supabase
    .from("target_universities")
    .select("id, user_id, university_id, program_id")
    .in("status", ACTIVE_TARGET_STATUSES);
  if (!targets || targets.length === 0) return { notified: 0, checked: 0 };

  const universityIds = [...new Set(targets.map((t) => t.university_id))];
  const [{ data: deadlines }, { data: universities }] = await Promise.all([
    supabase.from("university_deadlines").select("university_id, program_id, deadline_type, deadline_date").in("university_id", universityIds).not("deadline_date", "is", null),
    supabase.from("universities").select("id, name").in("id", universityIds),
  ]);
  const universityNameById = new Map((universities ?? []).map((u) => [u.id, u.name]));

  let notified = 0;
  let checked = 0;
  for (const target of targets) {
    // A university-level deadline (program_id null) always applies; a program-specific
    // one only applies once the student has actually picked that program — otherwise we
    // can't tell which of a university's many programs it belongs to.
    const relevant = (deadlines ?? []).filter(
      (d) => d.university_id === target.university_id && (d.program_id === null || d.program_id === target.program_id)
    );
    const universityName = universityNameById.get(target.university_id) ?? "A target university";
    for (const deadline of relevant) {
      checked += 1;
      const wasNotified = await notifyIfThresholdCrossed(supabase, today, {
        userId: target.user_id,
        deadlineDate: deadline.deadline_date!,
        link: `/universities/${target.university_id}`,
        body: `${universityName} — ${deadline.deadline_type} deadline approaching.`,
      });
      if (wasNotified) notified += 1;
    }
  }
  return { notified, checked };
}

/**
 * Scheduled job (Phase 30, Job B: upcoming deadline validation + Phase 24 notification).
 * Cross-source Deadline Engine: scans applications, saved opportunities, and target
 * universities' program deadlines, notifying the owner once per threshold crossed per
 * deadline. See lib/deadlines/upcoming.ts for the read-side ("Due soon" widget) that
 * mirrors this same three-source union.
 */
export async function scanDeadlines(): Promise<{ notified: number; checked: number }> {
  const supabase = createAdminClient();
  const today = new Date();

  const [applications, opportunities, universities] = await Promise.all([
    scanApplications(supabase, today),
    scanSavedOpportunityDeadlines(supabase, today),
    scanTargetUniversityDeadlines(supabase, today),
  ]);

  return {
    notified: applications.notified + opportunities.notified + universities.notified,
    checked: applications.checked + opportunities.checked + universities.checked,
  };
}
