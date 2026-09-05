import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireUser, requireProfile } from "@/lib/security/dal";
import { resolvePlanTier } from "@/lib/tier/plan-tier";
import { createClient } from "@/lib/supabase/server";
import { computeReadiness } from "@/lib/applications/readiness";
import { ApplicationsView } from "@/features/applications/applications-view";
import type { RequirementStatus } from "@/types/database";
import { buildDigestContent } from "@/lib/digest/build";
import { assembleScoringFacts } from "@/lib/scoring/assemble-facts";
import { computeApplicationsPageGuidance, type ApplicationsPageGuidance } from "@/lib/applications/grade-relevance";
import { getTargetUniversitiesWithDetails } from "@/lib/universities/queries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("applications") };
}

export default async function ApplicationsPage() {
  const session = await requireUser();
  const userId = session.userId!;
  const supabase = await createClient();

  // C3's remaining open item (2026-09-05): getTargetUniversitiesWithDetails is the exact same
  // call the dashboard already makes — its own refreshStaleOutlooks runs here too now, scoped
  // to however many targets this page actually shows (measured live: 8 real/QA accounts today,
  // max 4 targets each — nowhere near a cost concern, so no limit is passed here, same as the
  // Saved page's own unlimited call). Before this, applications.page.tsx re-derived university
  // names by hand (its own supersession/join logic) instead of reusing this shared function —
  // that duplicate logic is gone now, not just the outlook gap.
  const [applicationsRes, targets] = await Promise.all([
    supabase.from("applications").select("*").eq("user_id", userId).order("deadline", { ascending: true, nullsFirst: false }),
    getTargetUniversitiesWithDetails(supabase, userId),
  ]);

  const applications = applicationsRes.data ?? [];
  const universityNameByTargetId = new Map(targets.map((t) => [t.id, t.university?.name ?? "Unknown"]));

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

  // Widened with `outlook` (2026-09-05, C3) for the new Target Universities section below —
  // same not-yet-applied filter NewApplicationDialog already used; a target already promoted
  // into an application shows its outlook nowhere else redundant, since the applications list
  // above it already represents that target via its own row.
  const appliedTargetIds = new Set(applications.map((a) => a.target_university_id));
  const availableTargets = targets
    .filter((t) => !appliedTargetIds.has(t.id))
    .map((t) => ({ id: t.id, name: universityNameByTargetId.get(t.id) ?? "Unknown", universityId: t.university?.id ?? null, outlook: t.outlook }));

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
