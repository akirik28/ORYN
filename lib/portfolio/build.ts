import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { PortfolioItem, PortfolioSkill } from "./types";

/** Read-only aggregation across every achievement table into one common shape (Phase 20).
 * "Leadership" is presented as its own section here even though it's stored as
 * `activities.is_leadership_role = true` — a portfolio-display distinction only, not a
 * schema one (see DATABASE.md for why they share one table). */
export async function buildPortfolio(supabase: SupabaseClient<Database>, userId: string): Promise<PortfolioItem[]> {
  const [education, activities, sports, research, projects, awards, certifications, volunteering, work] = await Promise.all([
    supabase.from("education_records").select("*").eq("user_id", userId),
    supabase.from("activities").select("*").eq("user_id", userId),
    supabase.from("sports_experiences").select("*").eq("user_id", userId),
    supabase.from("research_experiences").select("*").eq("user_id", userId),
    supabase.from("projects").select("*").eq("user_id", userId),
    supabase.from("awards").select("*").eq("user_id", userId),
    supabase.from("certifications").select("*").eq("user_id", userId),
    supabase.from("volunteering_experiences").select("*").eq("user_id", userId),
    supabase.from("work_experiences").select("*").eq("user_id", userId),
  ]);

  const items: PortfolioItem[] = [];

  for (const record of education.data ?? []) {
    items.push({
      id: record.id,
      category: "education",
      title: record.school_name,
      organization: record.country,
      description: record.notes,
      startDate: record.start_date,
      endDate: record.end_date,
      ongoing: record.is_current,
      meta: record.overall_gpa && record.gpa_scale ? `GPA ${record.overall_gpa}/${record.gpa_scale}` : null,
      createdAt: record.created_at,
      // education_records has no evidence_status column — see PortfolioItem's own comment.
      evidenceStatus: null,
    });
  }

  for (const record of activities.data ?? []) {
    items.push({
      id: record.id,
      category: record.is_leadership_role ? "leadership" : "activities",
      title: record.title,
      organization: record.organization,
      description: record.description,
      startDate: record.start_date,
      endDate: record.end_date,
      ongoing: record.ongoing,
      meta: record.people_led ? `Led ${record.people_led} people` : null,
      createdAt: record.created_at,
      evidenceStatus: record.evidence_status,
    });
  }

  for (const record of sports.data ?? []) {
    items.push({
      id: record.id,
      category: "sports",
      title: record.sport,
      organization: record.team_name,
      description: record.description ?? record.achievements,
      startDate: record.start_date,
      endDate: record.end_date,
      ongoing: record.ongoing,
      meta: [record.level ? record.level.charAt(0).toUpperCase() + record.level.slice(1) : null, record.is_captain ? "Captain" : null]
        .filter(Boolean)
        .join(" · ") || null,
      createdAt: record.created_at,
      evidenceStatus: record.evidence_status,
    });
  }

  for (const record of research.data ?? []) {
    items.push({
      id: record.id,
      category: "research",
      title: record.title,
      organization: record.organization,
      description: record.description,
      startDate: record.start_date,
      endDate: record.end_date,
      ongoing: record.ongoing,
      meta: record.field,
      createdAt: record.created_at,
      evidenceStatus: record.evidence_status,
    });
  }

  for (const record of projects.data ?? []) {
    items.push({
      id: record.id,
      category: "projects",
      title: record.title,
      organization: record.organization,
      description: record.outcome_summary ?? record.description,
      startDate: record.start_date,
      endDate: record.end_date,
      ongoing: record.ongoing,
      meta: record.role,
      createdAt: record.created_at,
      evidenceStatus: record.evidence_status,
    });
  }

  for (const record of awards.data ?? []) {
    items.push({
      id: record.id,
      category: "awards",
      title: record.title,
      organization: record.organization,
      description: record.description,
      startDate: record.award_date,
      endDate: record.award_date,
      ongoing: false,
      meta: record.level,
      createdAt: record.created_at,
      evidenceStatus: record.evidence_status,
    });
  }

  for (const record of certifications.data ?? []) {
    items.push({
      id: record.id,
      category: "certifications",
      title: record.title,
      organization: record.organization,
      description: record.description,
      startDate: record.issue_date,
      endDate: record.expiry_date,
      ongoing: false,
      meta: null,
      createdAt: record.created_at,
      evidenceStatus: record.evidence_status,
    });
  }

  for (const record of volunteering.data ?? []) {
    items.push({
      id: record.id,
      category: "volunteering",
      title: record.title,
      organization: record.organization,
      description: record.description,
      startDate: record.start_date,
      endDate: record.end_date,
      ongoing: record.ongoing,
      meta: record.cause_area,
      createdAt: record.created_at,
      evidenceStatus: record.evidence_status,
    });
  }

  for (const record of work.data ?? []) {
    items.push({
      id: record.id,
      category: "work",
      title: record.title,
      organization: record.organization,
      description: record.description,
      startDate: record.start_date,
      endDate: record.end_date,
      ongoing: record.ongoing,
      meta: record.employment_type.replace(/_/g, " "),
      createdAt: record.created_at,
      evidenceStatus: record.evidence_status,
    });
  }

  return items.sort((a, b) => (b.startDate ?? "0").localeCompare(a.startDate ?? "0"));
}

/** Skills have no start/end date (see the `skills` table) — deliberately not forced into
 * PortfolioItem's date-sorted shape, which would either invent a fake date or cluster every
 * skill at the bottom of the timeline via the null-date fallback. Rendered as its own
 * section instead (Phase 20 names Skills as a portfolio category; nothing was reading this
 * table on this page before). Sorted by category then name for a stable, scannable order —
 * matches how the live data actually groups (technical/analytical/communication/leadership). */
export async function getPortfolioSkills(supabase: SupabaseClient<Database>, userId: string): Promise<PortfolioSkill[]> {
  const { data } = await supabase.from("skills").select("id, name, category").eq("user_id", userId);
  return (data ?? []).slice().sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}
