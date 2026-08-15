import "server-only";

import { createClient } from "@/lib/supabase/server";
import { assembleScoringFacts } from "@/lib/scoring/assemble-facts";
import { computeCareerProfile } from "@/lib/scoring";

export interface StudentAdvisorContext {
  student: {
    displayName: string;
    country: string | null;
    schoolName: string | null;
    graduationYear: number | null;
    curriculum: string | null;
    weeklyTimeBudget: string | null;
    busyMode: boolean;
  };
  profileScores: { dimension: string; score: number; confidence: string }[];
  overallScore: number;
  completenessPercent: number;
  activities: { title: string; category: string; isLeadership: boolean }[];
  projects: { title: string; outcomeSummary: string | null }[];
  research: { title: string; field: string | null; outputType: string }[];
  awards: { title: string; level: string | null }[];
  goals: { title: string; category: string | null }[];
  targetUniversities: { name: string; status: string; outlook: string | null }[];
  upcomingDeadlines: { title: string; date: string }[];
  recentRecommendationTitles: string[];
}

/**
 * Compact, structured context for the AI Advisor and weekly-plan generator (spec 8.1) —
 * deliberately NOT the whole database. Reuses assembleScoringFacts so this and the
 * scoring engine never drift out of sync on what "the student's data" means.
 */
export async function buildStudentAdvisorContext(userId: string): Promise<StudentAdvisorContext> {
  const supabase = await createClient();
  const facts = await assembleScoringFacts(supabase, userId);
  const { dimensions, overallScore } = computeCareerProfile(facts);

  const [profileRes, targetUnisRes, applicationsRes, recentRecsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, country, school_name, graduation_year, curriculum, weekly_time_budget, busy_mode, completeness_percent")
      .eq("id", userId)
      .single(),
    supabase
      .from("target_universities")
      .select("status, outlook, universities(name)")
      .eq("user_id", userId),
    supabase
      .from("applications")
      .select("deadline, target_universities(universities(name))")
      .eq("user_id", userId)
      .not("deadline", "is", null)
      .order("deadline", { ascending: true })
      .limit(5),
    supabase
      .from("ai_recommendations")
      .select("title")
      .eq("user_id", userId)
      .order("shown_at", { ascending: false })
      .limit(15),
  ]);

  const profile = profileRes.data;

  return {
    student: {
      displayName: profile?.display_name ?? "Student",
      country: profile?.country ?? null,
      schoolName: profile?.school_name ?? null,
      graduationYear: profile?.graduation_year ?? null,
      curriculum: profile?.curriculum ?? null,
      weeklyTimeBudget: profile?.weekly_time_budget ?? null,
      busyMode: profile?.busy_mode ?? false,
    },
    profileScores: dimensions.map((d) => ({ dimension: d.dimension, score: d.score, confidence: d.confidence })),
    overallScore,
    completenessPercent: profile?.completeness_percent ?? 0,
    activities: facts.activities.map((a) => ({ title: a.title, category: a.category, isLeadership: a.is_leadership_role })),
    projects: facts.projects.map((p) => ({ title: p.title, outcomeSummary: p.outcome_summary })),
    research: facts.researchExperiences.map((r) => ({ title: r.title, field: r.field, outputType: r.output_type })),
    awards: facts.awards.map((a) => ({ title: a.title, level: a.level })),
    goals: facts.goals.map((g) => ({ title: g.title, category: g.category })),
    // Supabase's typed client can't express nested-relation shapes from our hand-authored
    // Database type (no Relationships metadata) — these two are read-only display strings.
    targetUniversities: ((targetUnisRes.data ?? []) as unknown as Array<{ status: string; outlook: string | null; universities: { name: string } | null }>).map((t) => ({
      name: t.universities?.name ?? "Unknown",
      status: t.status,
      outlook: t.outlook,
    })),
    upcomingDeadlines: ((applicationsRes.data ?? []) as unknown as Array<{ deadline: string; target_universities: { universities: { name: string } | null } | null }>).map((a) => ({
      title: a.target_universities?.universities?.name ?? "Application",
      date: a.deadline,
    })),
    recentRecommendationTitles: (recentRecsRes.data ?? []).map((r) => r.title),
  };
}

export function formatContextForPrompt(context: StudentAdvisorContext): string {
  const lines: string[] = [];
  lines.push(`Student: ${context.student.displayName}, graduating ${context.student.graduationYear ?? "unknown"}, ${context.student.curriculum ?? "unknown curriculum"}, ${context.student.country ?? "unknown country"}.`);
  lines.push(`Weekly time budget: ${context.student.weeklyTimeBudget ?? "not set"}.${context.student.busyMode ? " Currently in a busy period (e.g. exams) — reduce recommendations." : ""}`);
  lines.push(`Career Profile: ${context.overallScore}/100 overall. Profile completeness: ${context.completenessPercent}%.`);
  lines.push("Dimension scores:");
  for (const d of context.profileScores) {
    lines.push(`  - ${d.dimension}: ${d.score}/100 (confidence: ${d.confidence})`);
  }
  lines.push(`Activities (${context.activities.length}): ${context.activities.map((a) => `${a.title}${a.isLeadership ? " [leadership]" : ""}`).join("; ") || "none"}`);
  lines.push(`Projects (${context.projects.length}): ${context.projects.map((p) => p.title).join("; ") || "none"}`);
  lines.push(`Research (${context.research.length}): ${context.research.map((r) => r.title).join("; ") || "none"}`);
  lines.push(`Awards (${context.awards.length}): ${context.awards.map((a) => a.title).join("; ") || "none"}`);
  lines.push(`Goals: ${context.goals.map((g) => g.title).join("; ") || "none set"}`);
  lines.push(`Target universities: ${context.targetUniversities.map((t) => `${t.name} (${t.status}${t.outlook ? `, ${t.outlook}` : ""})`).join("; ") || "none yet"}`);
  lines.push(`Upcoming deadlines: ${context.upcomingDeadlines.map((d) => `${d.title} on ${d.date}`).join("; ") || "none"}`);
  if (context.recentRecommendationTitles.length > 0) {
    lines.push(`Recently shown recommendations (don't repeat these): ${context.recentRecommendationTitles.join("; ")}`);
  }
  return lines.join("\n");
}
