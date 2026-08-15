import { notFound } from "next/navigation";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { computeReadiness } from "@/lib/applications/readiness";
import { RequirementChecklist } from "@/features/applications/requirement-checklist";
import { Progress } from "@/components/ui/progress";

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

  const { data: university } = targetRes.data
    ? await supabase.from("universities").select("name").eq("id", targetRes.data.university_id).single()
    : { data: null };

  const requirements = requirementsRes.data ?? [];
  const readiness = computeReadiness(requirements);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{university?.name ?? "Application"}</h1>
        <p className="mt-1 text-muted-foreground capitalize">
          {application.application_type.replace(/_/g, " ")}
          {application.deadline ? ` · Due ${application.deadline}` : ""}
        </p>
      </div>

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
