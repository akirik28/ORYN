import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { computeReadiness } from "@/lib/applications/readiness";
import { canonicalUniversityId, loadSupersessionMap } from "@/lib/universities/canonical";
import { RequirementChecklist } from "@/features/applications/requirement-checklist";
import { ApplicationStatusControl } from "@/features/applications/status-control";
import { PageHeader } from "@/components/oryn/page-header";
import { Progress } from "@/components/ui/progress";

// Every application detail page shared the layout's generic default title before this —
// no way to tell one open tab/history entry from another. Entirely owner-scoped data
// (application row is fetched .eq("user_id", session.userId!) both here and on the page
// itself), so no privacy gating to replicate, unlike the public profile page.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const session = await requireUser();
  const supabase = await createClient();
  const { data: application } = await supabase
    .from("applications")
    .select("target_university_id")
    .eq("id", id)
    .eq("user_id", session.userId!)
    .single();
  if (!application) return {};
  const { data: target } = await supabase
    .from("target_universities")
    .select("university_id")
    .eq("id", application.target_university_id)
    .single();
  if (!target) return { title: "Application" };
  const supersessionMap = await loadSupersessionMap(supabase);
  const { data: university } = await supabase
    .from("universities")
    .select("name")
    .eq("id", canonicalUniversityId(supersessionMap, target.university_id))
    .single();
  return { title: university?.name ?? "Application" };
}

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireUser();
  const supabase = await createClient();

  const { data: application } = await supabase.from("applications").select("*").eq("id", id).eq("user_id", session.userId!).single();
  if (!application) notFound();

  const [targetRes, requirementsRes] = await Promise.all([
    supabase.from("target_universities").select("university_id").eq("id", application.target_university_id).single(),
    supabase.from("application_requirements").select("*").eq("application_id", id).order("requirement_type"),
  ]);

  const supersessionMap = await loadSupersessionMap(supabase);
  const { data: university } = targetRes.data
    ? await supabase.from("universities").select("name").eq("id", canonicalUniversityId(supersessionMap, targetRes.data.university_id)).single()
    : { data: null };

  const requirements = requirementsRes.data ?? [];
  const readiness = computeReadiness(requirements);
  const universityName = university?.name ?? "Application";
  const applicationTypeLabel = application.application_type.replace(/_/g, " ");
  const applicationTypeCapitalized = applicationTypeLabel.charAt(0).toUpperCase() + applicationTypeLabel.slice(1);

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title={universityName}
        description={`${applicationTypeCapitalized}${application.deadline ? ` · Due ${application.deadline}` : ""}`}
      />

      <ApplicationStatusControl applicationId={application.id} initialStatus={application.status} universityName={universityName} />

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Application readiness</span>
          <span className="text-muted-foreground">{readiness}%</span>
        </div>
        <Progress value={readiness} />
        <p className="text-xs text-muted-foreground">
          Measures how much of your known checklist is complete — not your chance of admission.
        </p>
      </div>

      <RequirementChecklist requirements={requirements} />
    </div>
  );
}
