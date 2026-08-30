import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { computeReadiness } from "@/lib/applications/readiness";
import { canonicalUniversityId, loadSupersessionMap } from "@/lib/universities/canonical";
import { ApplicationsView } from "@/features/applications/applications-view";
import type { RequirementStatus } from "@/types/database";

export const metadata = { title: "Applications" };

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
    ? await supabase.from("application_requirements").select("application_id, status").in("application_id", applicationIds)
    : { data: [] };
  const requirementsByApplication = new Map<string, { status: RequirementStatus }[]>();
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
    readiness: computeReadiness(requirementsByApplication.get(application.id) ?? []),
  }));

  return <ApplicationsView applications={rows} hasTargets={targets.length > 0} availableTargets={availableTargets} />;
}
