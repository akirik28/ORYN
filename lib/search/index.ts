import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import { rankResults, toIlikePattern } from "./rank";
import type { SearchResult } from "./types";

type DB = SupabaseClient<Database>;

const MIN_QUERY_LENGTH = 2;
const PER_SOURCE_LIMIT = 5;

async function searchUniversities(supabase: DB, pattern: string): Promise<SearchResult[]> {
  const { data } = await supabase.from("universities").select("id, name, city, country").ilike("name", pattern).limit(8);
  return (data ?? []).map((u) => ({
    type: "university" as const,
    id: u.id,
    title: u.name,
    subtitle: [u.city, u.country].filter(Boolean).join(", ") || null,
    href: `/universities/${u.id}`,
  }));
}

async function searchPrograms(supabase: DB, pattern: string): Promise<SearchResult[]> {
  const { data } = await supabase.from("university_programs").select("id, university_id, name, field, degree_level").ilike("name", pattern).limit(8);
  return (data ?? []).map((p) => ({
    type: "program" as const,
    id: p.id,
    title: p.name,
    subtitle: [p.degree_level, p.field].filter(Boolean).join(" · ") || null,
    // Programs have no detail route of their own — link to the parent university, which
    // lists its programs (see app/(app)/universities/[id]/page.tsx).
    href: `/universities/${p.university_id}`,
  }));
}

async function searchOpportunities(supabase: DB, pattern: string): Promise<SearchResult[]> {
  const { data } = await supabase.from("opportunities").select("id, title, organization").eq("status", "active").ilike("title", pattern).limit(PER_SOURCE_LIMIT);
  return (data ?? []).map((o) => ({ type: "opportunity" as const, id: o.id, title: o.title, subtitle: o.organization, href: "/opportunities" }));
}

async function searchGoals(supabase: DB, userId: string, pattern: string): Promise<SearchResult[]> {
  const { data } = await supabase.from("career_goals").select("id, title, category").eq("user_id", userId).ilike("title", pattern).limit(PER_SOURCE_LIMIT);
  return (data ?? []).map((g) => ({ type: "goal" as const, id: g.id, title: g.title, subtitle: g.category, href: "/profile" }));
}

/**
 * Every achievement-shaped table shares the {title, organization} pair except
 * education_records (school_name/country) and test_scores (test_name/score) — nine
 * explicit queries rather than one dynamic table-driven loop, matching this codebase's
 * existing preference (see ARCHITECTURE.md's "why some things are duplicated-looking")
 * for named, statically-typed calls over generic dispatch.
 */
async function searchProfileItems(supabase: DB, userId: string, pattern: string): Promise<SearchResult[]> {
  const owned = <T extends { id: string }>(rows: T[] | null) => rows ?? [];

  const [activities, awards, certifications, projects, research, volunteering, work, education, testScores] = await Promise.all([
    supabase.from("activities").select("id, title, organization").eq("user_id", userId).ilike("title", pattern).limit(PER_SOURCE_LIMIT),
    supabase.from("awards").select("id, title, organization").eq("user_id", userId).ilike("title", pattern).limit(PER_SOURCE_LIMIT),
    supabase.from("certifications").select("id, title, organization").eq("user_id", userId).ilike("title", pattern).limit(PER_SOURCE_LIMIT),
    supabase.from("projects").select("id, title, organization").eq("user_id", userId).ilike("title", pattern).limit(PER_SOURCE_LIMIT),
    supabase.from("research_experiences").select("id, title, organization").eq("user_id", userId).ilike("title", pattern).limit(PER_SOURCE_LIMIT),
    supabase.from("volunteering_experiences").select("id, title, organization").eq("user_id", userId).ilike("title", pattern).limit(PER_SOURCE_LIMIT),
    supabase.from("work_experiences").select("id, title, organization").eq("user_id", userId).ilike("title", pattern).limit(PER_SOURCE_LIMIT),
    supabase.from("education_records").select("id, school_name, country").eq("user_id", userId).ilike("school_name", pattern).limit(PER_SOURCE_LIMIT),
    supabase.from("test_scores").select("id, test_name, score").eq("user_id", userId).ilike("test_name", pattern).limit(PER_SOURCE_LIMIT),
  ]);

  return [
    ...owned(activities.data).map((r) => ({ type: "activity" as const, id: r.id, title: r.title, subtitle: r.organization, href: "/profile" })),
    ...owned(awards.data).map((r) => ({ type: "award" as const, id: r.id, title: r.title, subtitle: r.organization, href: "/profile" })),
    ...owned(certifications.data).map((r) => ({ type: "certification" as const, id: r.id, title: r.title, subtitle: r.organization, href: "/profile" })),
    ...owned(projects.data).map((r) => ({ type: "project" as const, id: r.id, title: r.title, subtitle: r.organization, href: "/profile" })),
    ...owned(research.data).map((r) => ({ type: "research_experience" as const, id: r.id, title: r.title, subtitle: r.organization, href: "/profile" })),
    ...owned(volunteering.data).map((r) => ({ type: "volunteering_experience" as const, id: r.id, title: r.title, subtitle: r.organization, href: "/profile" })),
    ...owned(work.data).map((r) => ({ type: "work_experience" as const, id: r.id, title: r.title, subtitle: r.organization, href: "/profile" })),
    ...owned(education.data).map((r) => ({ type: "education_record" as const, id: r.id, title: r.school_name, subtitle: r.country, href: "/profile" })),
    ...owned(testScores.data).map((r) => ({ type: "test_score" as const, id: r.id, title: r.test_name, subtitle: r.score, href: "/profile" })),
  ];
}

/**
 * Applications have no title of their own (a target-university reference plus notes), so
 * this fetches the student's applications and their target university names (batch-fetch
 * + zip, same convention as lib/universities/queries.ts) and filters in application code —
 * fine at the scale one student's application list is ever going to reach, and avoids a
 * three-table SQL join this codebase's query layer doesn't otherwise use.
 */
async function searchApplications(supabase: DB, userId: string, term: string): Promise<SearchResult[]> {
  const { data: applications } = await supabase.from("applications").select("id, target_university_id, notes").eq("user_id", userId);
  if (!applications || applications.length === 0) return [];

  const targetIds = [...new Set(applications.map((a) => a.target_university_id))];
  const { data: targets } = await supabase.from("target_universities").select("id, university_id").in("id", targetIds);
  const universityIdByTarget = new Map((targets ?? []).map((t) => [t.id, t.university_id]));

  const universityIds = [...new Set([...universityIdByTarget.values()])];
  const { data: universities } =
    universityIds.length > 0 ? await supabase.from("universities").select("id, name").in("id", universityIds) : { data: [] };
  const universityNameById = new Map((universities ?? []).map((u) => [u.id, u.name]));

  const needle = term.toLowerCase();
  return applications
    .map((application) => ({
      application,
      universityName: universityNameById.get(universityIdByTarget.get(application.target_university_id) ?? "") ?? null,
    }))
    .filter(({ application, universityName }) => universityName?.toLowerCase().includes(needle) || application.notes?.toLowerCase().includes(needle))
    .slice(0, PER_SOURCE_LIMIT)
    .map(({ application, universityName }) => ({
      type: "application" as const,
      id: application.id,
      title: universityName ? `${universityName} application` : "Application",
      subtitle: null,
      href: `/applications/${application.id}`,
    }));
}

/**
 * Phase 25 — one query fanned out across universities, programs, opportunities, every
 * achievement-shaped profile table, goals, and applications; results ranked by
 * lib/search/rank.ts and returned as one flat, typed list for the caller to group however
 * it wants. Global tables rely on their "authenticated read" RLS policy; every
 * user-owned table is explicitly scoped to `userId` on top of RLS (defense in depth,
 * matching this codebase's existing convention elsewhere, e.g. assembleScoringFacts).
 */
export async function globalSearch(term: string, userId: string): Promise<SearchResult[]> {
  const trimmed = term.trim();
  if (trimmed.length < MIN_QUERY_LENGTH) return [];

  const supabase = await createClient();
  const pattern = toIlikePattern(trimmed);

  const [universities, programs, opportunities, profileItems, goals, applications] = await Promise.all([
    searchUniversities(supabase, pattern),
    searchPrograms(supabase, pattern),
    searchOpportunities(supabase, pattern),
    searchProfileItems(supabase, userId, pattern),
    searchGoals(supabase, userId, pattern),
    searchApplications(supabase, userId, trimmed),
  ]);

  return rankResults(trimmed, [...universities, ...programs, ...opportunities, ...profileItems, ...goals, ...applications]);
}
