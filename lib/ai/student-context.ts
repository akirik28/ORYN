import "server-only";

import { createClient } from "@/lib/supabase/server";
import { assembleScoringFacts } from "@/lib/scoring/assemble-facts";
import { computeCareerProfile } from "@/lib/scoring";
import { OUTLOOK_LABELS } from "@/lib/admissions/outlook";
import { buildProfileSignal, isAssessed, EVIDENCE_STATE_LABELS, type EvidenceState } from "@/lib/scoring/signal";
import { getUpcomingDeadlines } from "@/lib/deadlines/upcoming";
import { canonicalUniversityId, loadSupersessionMap, type SupersessionMap } from "@/lib/universities/canonical";
import type { SupabaseClient } from "@supabase/supabase-js";
import { dimensionLabel } from "@/lib/scoring/labels";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import type { Database, EvidenceStatus, OutlookLabel, ProfileDimension } from "@/types/database";

export interface StudentAdvisorContext {
  student: {
    displayName: string;
    /** Drives the language every AI surface answers in — see lib/ai/output-language.ts. */
    preferredLanguage: Locale;
    country: string | null;
    schoolName: string | null;
    graduationYear: number | null;
    curriculum: string | null;
    weeklyTimeBudget: string | null;
    busyMode: boolean;
    busyModeUntil: string | null;
    /** Counselor Core eligibility (age gates on opportunities) — not used in prompt text today. */
    birthYear: number | null;
    /** Counselor Core eligibility (citizenship gates on opportunities, migration 0047) — never
     * inferred from `country` (residence/school location, a separate fact). Not used in
     * prompt text today, same as birthYear. */
    citizenshipCountries: string[];
  };
  /**
   * `state` is what the student's own surfaces render (lib/scoring/signal.ts). It is here
   * because the model reads this block and writes the prose they see: given a bare number
   * it will quote the number, and a dimension nobody has entered anything for scores 0.
   */
  profileScores: { dimension: ProfileDimension; score: number; confidence: string; state: EvidenceState }[];
  overallScore: number;
  completenessPercent: number;
  /**
   * The real four-value `EvidenceStatus`, not a collapsed boolean (Package 4,
   * docs/handoffs/feat1-territory-audit-2026-08-22.md Finding 1). Before this, only
   * `self_reported` was distinguishable from everything else — `evidence_added` (uploaded,
   * unreviewed) and `verification_rejected` (reviewed and NOT confirmed) both rendered
   * identically to `verified` in the prompt, so a claim someone actively disbelieved
   * reached the live advisor chat and weekly-plan generator with full certainty.
   * `formatContextForPrompt` below renders all four distinctly.
   */
  activities: { title: string; category: string; isLeadership: boolean; ongoing: boolean; evidenceStatus: EvidenceStatus }[];
  projects: { title: string; outcomeSummary: string | null; ongoing: boolean; evidenceStatus: EvidenceStatus }[];
  research: { title: string; field: string | null; outputType: string; ongoing: boolean; evidenceStatus: EvidenceStatus }[];
  awards: { title: string; level: string | null; evidenceStatus: EvidenceStatus }[];
  /** Chat 4 founder scope update — deliberately NOT part of `assembleScoringFacts`/the
   * scoring engine this pass (see docs/product-decisions.md): sports feeds the advisor's
   * time-budget reasoning ("10 committed hours/week isn't free capacity") and opportunity-
   * cost judgment (a long-term competitive commitment isn't something to casually drop
   * for a superficial new activity), not a profile-strength score. */
  sports: { sport: string; level: string | null; isCaptain: boolean; hoursPerWeek: number | null; ongoing: boolean; achievements: string | null }[];
  goals: { title: string; category: string | null }[];
  /** Counselor Core field/relevance matching (mirrors lib/opportunities/persist-matches.ts's
   * existing use of this table) — not included in formatContextForPrompt today. */
  interests: string[];
  /** `outlook` is the persisted enum, not a free string — typing it loosely is what let the
   *  raw `extreme_reach` reach the prompt and then a student. */
  targetUniversities: { id: string; universityId: string; programId: string | null; name: string; status: string; outlook: OutlookLabel | null }[];
  upcomingDeadlines: { title: string; date: string; source: string }[];
  recentRecommendationTitles: string[];
  /** Phase 10/62/63 — what actually happened after past advice, so the advisor learns from
   * outcomes instead of only avoiding repeated titles. Sourced from weekly_actions (status +
   * the reflection captured when a student marks one done), not ai_recommendations — that
   * table only ever logs "avoid_for_now" suggestions (see recentRecommendationTitles), never
   * the do/consider actions that make up the bulk of what's actually recommended. */
  recentActionOutcomes: { title: string; status: string; reflectionOutcome: string | null; reflectionNote: string | null }[];
  /** Phase 22/62 — unfinished application checklist items (essay, recommendation, ...),
   * so the advisor can point at a concrete near-term task instead of only reasoning at the
   * profile-dimension level. */
  pendingApplicationRequirements: { applicationTitle: string; requirementTitle: string }[];
}

/**
 * Unfinished application_requirements rows, resolved to a readable university name via the
 * same batch-fetch-and-zip pattern used elsewhere (e.g. lib/deadlines/upcoming.ts) rather
 * than a nested PostgREST embed (see the Identity<T> note in types/database.ts for why).
 * Capped tightly — this is context for a prompt, not a full application-tracker view.
 */
async function getPendingApplicationRequirements(
  supabase: SupabaseClient<Database>,
  userId: string,
  supersessionMap: SupersessionMap
): Promise<{ applicationTitle: string; requirementTitle: string }[]> {
  const { data: pending } = await supabase
    .from("application_requirements")
    .select("title, requirement_type, application_id")
    .eq("user_id", userId)
    .in("status", ["not_started", "in_progress"])
    .limit(15);
  if (!pending || pending.length === 0) return [];

  const applicationIds = [...new Set(pending.map((p) => p.application_id))];
  const { data: applications } = await supabase.from("applications").select("id, target_university_id").in("id", applicationIds);
  const targetIdByApplication = new Map((applications ?? []).map((a) => [a.id, a.target_university_id]));

  const targetIds = [...new Set([...targetIdByApplication.values()])];
  const { data: targets } = targetIds.length > 0 ? await supabase.from("target_universities").select("id, university_id").in("id", targetIds) : { data: [] };
  // Canonicalized — see lib/universities/canonical.ts.
  const universityIdByTarget = new Map((targets ?? []).map((t) => [t.id, canonicalUniversityId(supersessionMap, t.university_id)]));

  const universityIds = [...new Set([...universityIdByTarget.values()])];
  const { data: universities } =
    universityIds.length > 0 ? await supabase.from("universities").select("id, name").in("id", universityIds) : { data: [] };
  const universityNameById = new Map((universities ?? []).map((u) => [u.id, u.name]));

  return pending.map((p) => {
    const targetId = targetIdByApplication.get(p.application_id);
    const universityId = targetId ? universityIdByTarget.get(targetId) : undefined;
    const universityName = universityId ? universityNameById.get(universityId) : undefined;
    return { applicationTitle: universityName ?? "Application", requirementTitle: p.title ?? p.requirement_type };
  });
}

/**
 * Target universities for the advisor prompt — batch-fetch-and-zip (same convention as
 * getPendingApplicationRequirements above), not the nested `universities(name)` embed this
 * used before: an embed returns whatever row Postgres's FK actually points at, with no way to
 * post-process it through canonicalUniversityId() — a target referencing a known-duplicate
 * loser row would silently hand the advisor the loser's name. See lib/universities/canonical.ts.
 */
async function getTargetUniversitiesForContext(
  supabase: SupabaseClient<Database>,
  userId: string,
  supersessionMap: SupersessionMap
): Promise<{ id: string; universityId: string; programId: string | null; name: string; status: string; outlook: OutlookLabel | null }[]> {
  const { data: targets } = await supabase.from("target_universities").select("id, status, outlook, university_id, program_id").eq("user_id", userId);
  if (!targets || targets.length === 0) return [];

  const universityIds = [...new Set(targets.map((t) => canonicalUniversityId(supersessionMap, t.university_id)))];
  const { data: universities } = await supabase.from("universities").select("id, name").in("id", universityIds);
  const universityNameById = new Map((universities ?? []).map((u) => [u.id, u.name]));

  return targets.map((t) => {
    const canonicalId = canonicalUniversityId(supersessionMap, t.university_id);
    return {
      id: t.id,
      universityId: canonicalId,
      programId: t.program_id,
      name: universityNameById.get(canonicalId) ?? "Unknown",
      status: t.status,
      outlook: t.outlook,
    };
  });
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
  // Loaded once and threaded into the two helpers below that need it, rather than each loading
  // its own copy — both run inside the same Promise.all, so a single upfront load also avoids
  // two redundant round trips to the same 9-row table. See lib/universities/canonical.ts.
  const supersessionMap = await loadSupersessionMap(supabase);

  const [profileRes, targetUniversities, upcomingDeadlines, recentRecsRes, recentActionsRes, pendingApplicationRequirements, sportsRes, interestsRes] = await Promise.all([
    // select("*"), not an explicit column list: an explicit list naming a column that
    // doesn't exist yet on a given environment (citizenship_countries, migration 0047 — same
    // no-DDL-access constraint as 0043/0046) makes PostgREST reject the WHOLE query
    // (42703 "column does not exist"), silently degrading every other field here to its
    // fallback too, not just the missing one. Confirmed live this session. select("*") only
    // returns whatever columns actually exist, self-healing once the migration lands.
    supabase.from("profiles").select("*").eq("id", userId).single(),
    getTargetUniversitiesForContext(supabase, userId, supersessionMap),
    // Reuses the same cross-source Deadline Engine the dashboard's "Due soon" widget and
    // the deadline-reminder job use (lib/deadlines/upcoming.ts) — this used to be a bespoke
    // applications-only query here, so the advisor's view of "what's due" was narrower than
    // what the student can already see on their own dashboard (saved-opportunity and
    // target-university-program deadlines were invisible to it). Real gap, found in this
    // session's audit; fixed by reusing the existing unified source instead of a second,
    // inferior implementation.
    getUpcomingDeadlines(supabase, userId, 5),
    // Explicitly scoped to avoid_for_now: today lib/plan/persist.ts only ever writes that
    // one class to this table (do/consider are never persisted here — see
    // known-issues.md), so this filter is currently a no-op in practice. It's here so the
    // prompt's "previously suggested avoid-for-now items" label (below) stays true if a
    // future change ever starts persisting other classes too — without it, a "do" or
    // "consider" row would silently get relabeled as something to avoid repeating.
    supabase
      .from("ai_recommendations")
      .select("title")
      .eq("user_id", userId)
      .eq("recommendation_class", "avoid_for_now")
      .order("shown_at", { ascending: false })
      .limit(15),
    supabase
      .from("weekly_actions")
      .select("title, status, reflection_outcome, reflection_note")
      .eq("user_id", userId)
      .in("status", ["completed", "skipped", "expired"])
      .order("created_at", { ascending: false })
      .limit(10),
    getPendingApplicationRequirements(supabase, userId, supersessionMap),
    supabase.from("sports_experiences").select("sport, level, is_captain, hours_per_week, ongoing, achievements").eq("user_id", userId),
    supabase.from("student_interests").select("label").eq("user_id", userId),
  ]);

  const profile = profileRes.data;

  return {
    student: {
      displayName: profile?.display_name ?? "Student",
      /**
       * The student's own stored preference, not the request cookie. Weekly plans are also
       * generated from cron, where there is no request to read a cookie from, and a plan
       * written in a different language from the one the student reads would be worse than
       * no plan. `isLocale` guards it because the column has no CHECK constraint.
       */
      preferredLanguage: isLocale(profile?.preferred_language) ? profile.preferred_language : DEFAULT_LOCALE,
      country: profile?.country ?? null,
      schoolName: profile?.school_name ?? null,
      graduationYear: profile?.graduation_year ?? null,
      curriculum: profile?.curriculum ?? null,
      weeklyTimeBudget: profile?.weekly_time_budget ?? null,
      busyMode: profile?.busy_mode ?? false,
      busyModeUntil: profile?.busy_mode_until ?? null,
      birthYear: profile?.birth_year ?? null,
      citizenshipCountries: profile?.citizenship_countries ?? [],
    },
    profileScores: buildProfileSignal(dimensions).map((d) => ({
      dimension: d.dimension,
      score: d.score,
      confidence: d.confidence,
      state: d.state,
    })),
    overallScore,
    completenessPercent: profile?.completeness_percent ?? 0,
    activities: facts.activities.map((a) => ({
      title: a.title,
      category: a.category,
      isLeadership: a.is_leadership_role,
      ongoing: a.ongoing,
      evidenceStatus: a.evidence_status,
    })),
    projects: facts.projects.map((p) => ({
      title: p.title,
      outcomeSummary: p.outcome_summary,
      ongoing: p.ongoing,
      evidenceStatus: p.evidence_status,
    })),
    research: facts.researchExperiences.map((r) => ({
      title: r.title,
      field: r.field,
      outputType: r.output_type,
      ongoing: r.ongoing,
      evidenceStatus: r.evidence_status,
    })),
    awards: facts.awards.map((a) => ({ title: a.title, level: a.level, evidenceStatus: a.evidence_status })),
    goals: facts.goals.map((g) => ({ title: g.title, category: g.category })),
    interests: (interestsRes.data ?? []).map((i) => i.label),
    sports: (sportsRes.data ?? []).map((s) => ({
      sport: s.sport,
      level: s.level,
      isCaptain: s.is_captain,
      hoursPerWeek: s.hours_per_week,
      ongoing: s.ongoing,
      achievements: s.achievements,
    })),
    targetUniversities,
    upcomingDeadlines: upcomingDeadlines.map((d) => ({ title: d.title, date: d.date, source: d.source })),
    recentRecommendationTitles: (recentRecsRes.data ?? []).map((r) => r.title),
    recentActionOutcomes: (recentActionsRes.data ?? []).map((a) => ({
      title: a.title,
      status: a.status,
      reflectionOutcome: a.reflection_outcome,
      reflectionNote: a.reflection_note,
    })),
    pendingApplicationRequirements,
  };
}

/**
 * `locale` is additive and defaults to English, matching lib/scoring/labels.ts's own opt-in
 * pattern. Both real callers pass it now — weekly-plan.ts and advisor-chat.ts, from
 * `context.student.preferredLanguage` — so the dimension names in the prompt are already in
 * the student's language. The default remains for any caller that has no locale to hand.
 */
export function formatContextForPrompt(context: StudentAdvisorContext, locale: Locale = "en"): string {
  const lines: string[] = [];
  lines.push(`Student: ${context.student.displayName}, graduating ${context.student.graduationYear ?? "unknown"}, ${context.student.curriculum ?? "unknown curriculum"}, ${context.student.country ?? "unknown country"}.`);
  const busyNote = context.student.busyMode
    ? ` Currently in a busy period (e.g. exams)${context.student.busyModeUntil ? `, until ${context.student.busyModeUntil}` : ""} — reduce recommendations.`
    : "";
  lines.push(`Weekly time budget: ${context.student.weeklyTimeBudget ?? "not set"}.${busyNote}`);
  lines.push(`Career Profile: ${context.overallScore}/100 overall. Profile completeness: ${context.completenessPercent}%.`);
  /**
   * Display labels, not the raw column values. The model reads this block and then writes
   * prose the student sees, so a bare `career_exploration` in the prompt comes back out as
   * `career_exploration` in the counsel — observed live on the dashboard's "One thing not to
   * do" card, 2026-09-01: "your career_exploration gap is better addressed by...". Nothing
   * in the pipeline was going to catch that; it is a schema identifier that reached a
   * sixteen-year-old through the one component that reformats its input freely.
   *
   * The same argument applies to the numbers. Every student-facing surface deliberately
   * shows an evidence state rather than a strength percentage (UI-V3, founder direction) —
   * and no component renders `overallScore` at all. The model was reintroducing exactly what
   * that decision removed: 18 of 22 stored weekly actions quoted an "X/100" back at the
   * student, including "Academics is 0/100" and "Research is at 0/100" for dimensions whose
   * real state is *nothing recorded yet*. A 0 there is an absence, not a measurement, and
   * saying it as a score tells a student they were assessed and failed.
   *
   * So an unassessed dimension is described, never numbered. Assessed ones keep the score,
   * where it is a real reading and the model needs it to rank.
   */
  lines.push("Dimension states (describe these as states; never quote a score for a dimension Oryn has not assessed):");
  for (const d of context.profileScores) {
    const label = dimensionLabel(d.dimension, locale);
    lines.push(
      isAssessed(d.state)
        ? `  - ${label}: ${EVIDENCE_STATE_LABELS[d.state]} (${d.score}/100, confidence: ${d.confidence})`
        : `  - ${label}: ${EVIDENCE_STATE_LABELS[d.state]} — no score to quote, Oryn has not assessed this`,
    );
  }
  /**
   * `verified` renders silently (no tag) — the "no news is good news" default, unchanged
   * from before. The other three states each get their own explicit tag; before this fix
   * `evidence_added` and `verification_rejected` both fell through to that same silence,
   * indistinguishable from `verified` (Finding 1,
   * docs/handoffs/feat1-territory-audit-2026-08-22.md). `ADVISOR_SYSTEM_PROMPT` below
   * spells out what each tag means so the model doesn't have to guess.
   */
  const evidenceTag = (status: EvidenceStatus): string => {
    if (status === "self_reported") return " [self-reported]";
    if (status === "evidence_added") return " [evidence added, not independently verified]";
    if (status === "verification_rejected") return " [verification rejected]";
    return "";
  };
  const tag = (ongoing: boolean, evidenceStatus: EvidenceStatus) => `${ongoing ? " [ongoing]" : ""}${evidenceTag(evidenceStatus)}`;
  lines.push(
    `Activities (${context.activities.length}): ${context.activities.map((a) => `${a.title}${a.isLeadership ? " [leadership]" : ""}${tag(a.ongoing, a.evidenceStatus)}`).join("; ") || "none"}`
  );
  lines.push(`Projects (${context.projects.length}): ${context.projects.map((p) => `${p.title}${tag(p.ongoing, p.evidenceStatus)}`).join("; ") || "none"}`);
  lines.push(`Research (${context.research.length}): ${context.research.map((r) => `${r.title}${tag(r.ongoing, r.evidenceStatus)}`).join("; ") || "none"}`);
  lines.push(`Awards (${context.awards.length}): ${context.awards.map((a) => `${a.title}${evidenceTag(a.evidenceStatus)}`).join("; ") || "none"}`);
  if (context.sports.length > 0) {
    const committedHours = context.sports.filter((s) => s.ongoing).reduce((sum, s) => sum + (s.hoursPerWeek ?? 0), 0);
    lines.push(
      `Sports (${context.sports.length}, ~${committedHours} committed hrs/week from ongoing ones — subtract this from the weekly time budget above, it is not free capacity): ` +
        context.sports
          .map((s) => `${s.sport}${s.level ? ` (${s.level})` : ""}${s.isCaptain ? " [captain]" : ""}${s.ongoing ? " [ongoing]" : ""}${s.achievements ? ` — ${s.achievements}` : ""}`)
          .join("; ")
    );
  }
  lines.push(`Goals: ${context.goals.map((g) => g.title).join("; ") || "none set"}`);
  /**
   * `outlook` is a persisted enum (`extreme_reach`, `not_applicable`, …) and the badge that
   * renders it says "Extreme Reach". Handed the raw value, the model writes the raw value:
   * four live advisor replies say `extreme_reach` to a student. Same fix as the dimension
   * names above, and the labels now live in lib/admissions/outlook.ts so the badge and this
   * prompt cannot drift apart.
   *
   * `status` is left as-is deliberately — its values are ordinary words a student would
   * recognise ("applying", "accepted", "waitlisted"), not identifiers.
   */
  lines.push(
    `Target universities: ${
      context.targetUniversities
        .map((t) => `${t.name} (${t.status}${t.outlook ? `, ${OUTLOOK_LABELS[t.outlook]}` : ""})`)
        .join("; ") || "none yet"
    }`,
  );
  lines.push(`Upcoming deadlines: ${context.upcomingDeadlines.map((d) => `${d.title} on ${d.date} (${d.source})`).join("; ") || "none"}`);
  if (context.pendingApplicationRequirements.length > 0) {
    lines.push(`Unfinished application checklist items: ${context.pendingApplicationRequirements.map((r) => `${r.requirementTitle} (${r.applicationTitle})`).join("; ")}`);
  }
  if (context.recentActionOutcomes.length > 0) {
    const describe = (a: StudentAdvisorContext["recentActionOutcomes"][number]) => {
      if (a.status === "completed") return `COMPLETED "${a.title}"${a.reflectionOutcome ? ` (outcome: ${a.reflectionOutcome})` : ""}${a.reflectionNote ? ` — "${a.reflectionNote}"` : ""}`;
      if (a.status === "skipped") return `SKIPPED "${a.title}"`;
      return `EXPIRED UNDONE "${a.title}"`;
    };
    lines.push(`Recent weekly-action outcomes (learn from these — don't just repeat what was skipped or didn't work):\n  - ${context.recentActionOutcomes.map(describe).join("\n  - ")}`);
  }
  if (context.recentRecommendationTitles.length > 0) {
    lines.push(`Previously suggested "avoid for now" items (don't repeat unless the situation has genuinely changed): ${context.recentRecommendationTitles.join("; ")}`);
  }
  return lines.join("\n");
}
