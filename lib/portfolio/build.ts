import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { PortfolioItem, PortfolioSkill } from "./types";
import { readOr } from "@/lib/supabase/safe-read";

/** Read-only aggregation across every achievement table into one common shape (Phase 20).
 * "Leadership" is presented as its own section here even though it's stored as
 * `activities.is_leadership_role = true` — a portfolio-display distinction only, not a
 * schema one (see DATABASE.md for why they share one table).
 *
 * 2026-09-03 (tier 2, docs/okuma-hatasi-vs-bos-sonuc-karari-2026-09-03.md): every read below
 * was `x.data ?? []` with no visibility -- a failed read for one category (say, every award
 * this student ever entered) rendered identically to "no awards," on the one page whose
 * whole job is showing a student everything they've built. Contained fix: log which
 * category failed, by name; the return type and every existing caller
 * (app/(app)/profile/portfolio/page.tsx, app/(app)/profile/cv/page.tsx) are unchanged.
 * Surfacing "this section may be incomplete" in the UI itself would mean widening this
 * function's return shape and touching both call sites plus their view components --
 * a real option, flagged rather than built here, since this package stays contained to one
 * file per this session's own tier-2 convention. */
export async function buildPortfolio(supabase: SupabaseClient<Database>, userId: string): Promise<PortfolioItem[]> {
  const [educationRes, activitiesRes, sportsRes, researchRes, projectsRes, awardsRes, certificationsRes, volunteeringRes, workRes] = await Promise.all([
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

  const education = readOr("buildPortfolio.education", educationRes, [], { userId });
  const activities = readOr("buildPortfolio.activities", activitiesRes, [], { userId });
  const sports = readOr("buildPortfolio.sports", sportsRes, [], { userId });
  const research = readOr("buildPortfolio.research", researchRes, [], { userId });
  const projects = readOr("buildPortfolio.projects", projectsRes, [], { userId });
  const awards = readOr("buildPortfolio.awards", awardsRes, [], { userId });
  const certifications = readOr("buildPortfolio.certifications", certificationsRes, [], { userId });
  const volunteering = readOr("buildPortfolio.volunteering", volunteeringRes, [], { userId });
  const work = readOr("buildPortfolio.work", workRes, [], { userId });

  const items: PortfolioItem[] = [];

  for (const record of education) {
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

  for (const record of activities) {
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

  for (const record of sports) {
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

  for (const record of research) {
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

  for (const record of projects) {
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

  for (const record of awards) {
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

  for (const record of certifications) {
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

  for (const record of volunteering) {
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

  for (const record of work) {
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
  const result = await supabase.from("skills").select("id, name, category").eq("user_id", userId);
  return readOr("getPortfolioSkills", result, [], { userId })
    .slice()
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}
