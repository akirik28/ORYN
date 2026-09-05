import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireUser, requireProfile } from "@/lib/security/dal";
import { resolvePlanTier } from "@/lib/tier/plan-tier";
import { createClient } from "@/lib/supabase/server";
import { computeReadiness } from "@/lib/applications/readiness";
import { canonicalUniversityId, loadSupersessionMap } from "@/lib/universities/canonical";
import { ApplicationsView } from "@/features/applications/applications-view";
import type { RequirementStatus } from "@/types/database";
import { buildDigestContent } from "@/lib/digest/build";
import { assembleScoringFacts } from "@/lib/scoring/assemble-facts";
import { computeApplicationsPageGuidance, type ApplicationsPageGuidance } from "@/lib/applications/grade-relevance";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("applications") };
}

export default async function ApplicationsPage() {
  const session = await requireUser();
  const userId = session.userId!;
  const supabase = await createClient();

  const [applicationsRes, targetsRes] = await Promise.all([
    supabase.from("applications").select("*").eq("user_id", userId).order("deadline", { ascending: true, nullsFirst: false }),
    supabase.from("target_universities").select("id, university_id").eq("user_id", userId),
  ]);

  const applications = applicationsRes.data ?? [];
  const targets = targetsRes.data ?? [];

  // Canonicalized so a target referencing a known-duplicate loser row self-heals to the
  // winner's name at read time. See lib/universities/canonical.ts.
  const supersessionMap = await loadSupersessionMap(supabase);
  const universityIds = [...new Set(targets.map((t) => canonicalUniversityId(supersessionMap, t.university_id)))];
  const { data: universities } = universityIds.length
    ? await supabase.from("universities").select("id, name").in("id", universityIds)
    : { data: [] };
  const universityNameByTargetUniversityId = new Map((universities ?? []).map((u) => [u.id, u.name]));
  const universityNameByTargetId = new Map(targets.map((t) => [t.id, universityNameByTargetUniversityId.get(canonicalUniversityId(supersessionMap, t.university_id)) ?? "Unknown"]));

  const applicationIds = applications.map((a) => a.id);
  const { data: requirements } = applicationIds.length
    ? await supabase
        .from("application_requirements")
        .select("id, application_id, requirement_type, status")
        .order("requirement_type")
        .in("application_id", applicationIds)
    : { data: [] };
  const requirementsByApplication = new Map<string, { id: string; requirement_type: string; status: RequirementStatus }[]>();
  for (const req of requirements ?? []) {
    requirementsByApplication.set(req.application_id, [...(requirementsByApplication.get(req.application_id) ?? []), req]);
  }

  const appliedTargetIds = new Set(applications.map((a) => a.target_university_id));
  const availableTargets = targets
    .filter((t) => !appliedTargetIds.has(t.id))
    .map((t) => ({ id: t.id, name: universityNameByTargetId.get(t.id) ?? "Unknown" }));

  const rows = applications.map((application) => ({
    id: application.id,
    universityName: universityNameByTargetId.get(application.target_university_id) ?? "Unknown",
    applicationType: application.application_type,
    deadline: application.deadline,
    status: application.status,
    readiness: computeReadiness(application.status, requirementsByApplication.get(application.id) ?? []),
    requirements: requirementsByApplication.get(application.id) ?? [],
  }));

  const profile = await requireProfile();
  const planTier = resolvePlanTier(profile);
  const guidance = await loadApplicationsPageGuidance(supabase, userId, profile);

  return <ApplicationsView applications={rows} hasTargets={targets.length > 0} availableTargets={availableTargets} tier={planTier} guidance={guidance} />;
}

/**
 * E1 (2026-09-05) — a pre-senior applications page reuses buildDigestContent (already
 * `isOpportunityRecommendable` + competesInCoreRecommendations gated, the same primitive the
 * student digest and parent-commentary features already call for the identical "what's
 * actionable right now" question) with `since: null`, its own established meaning for "no
 * prior cursor, everything currently eligible" — exactly right for a persistent page banner,
 * which has no "since I last checked" concept the way a periodic email does.
 */
async function loadApplicationsPageGuidance(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  profile: Awaited<ReturnType<typeof requireProfile>>
): Promise<ApplicationsPageGuidance | null> {
  const [digestContent, scoringFacts] = await Promise.all([buildDigestContent(supabase, userId, null), assembleScoringFacts(supabase, userId)]);

  return computeApplicationsPageGuidance({
    graduationYear: profile.graduation_year,
    deadlines: digestContent?.deadlines ?? [],
    newMatches: digestContent?.newMatches ?? [],
    completenessFacts: {
      profile: { country: profile.country, school_name: profile.school_name, graduation_year: profile.graduation_year, curriculum: profile.curriculum },
      ...scoringFacts,
    },
  });
}
