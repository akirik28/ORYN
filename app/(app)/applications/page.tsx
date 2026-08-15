import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { computeReadiness } from "@/lib/applications/readiness";
import { NewApplicationDialog } from "@/features/applications/new-application-dialog";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/oryn/page-header";
import { EmptyState } from "@/components/oryn/empty-state";
import { StatusBadge, type StatusTone } from "@/components/oryn/status-badge";
import { DeadlineBadge } from "@/components/oryn/deadline-badge";
import type { ApplicationStatus, RequirementStatus } from "@/types/database";

const APPLICATION_STATUS_TONE: Record<ApplicationStatus, StatusTone> = {
  not_started: "neutral",
  in_progress: "brand",
  submitted: "info",
  under_review: "warning",
  accepted: "success",
  waitlisted: "warning",
  rejected: "error",
  withdrawn: "neutral",
};

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

  const universityIds = [...new Set(targets.map((t) => t.university_id))];
  const { data: universities } = universityIds.length
    ? await supabase.from("universities").select("id, name").in("id", universityIds)
    : { data: [] };
  const universityNameByTargetUniversityId = new Map((universities ?? []).map((u) => [u.id, u.name]));
  const universityNameByTargetId = new Map(targets.map((t) => [t.id, universityNameByTargetUniversityId.get(t.university_id) ?? "Unknown"]));

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Applications"
        description="Track requirements and deadlines for each application."
        action={<NewApplicationDialog availableTargets={availableTargets} />}
      />

      {applications.length > 0 ? (
        <ul className="space-y-3">
          {applications.map((application) => {
            const readiness = computeReadiness(requirementsByApplication.get(application.id) ?? []);

            return (
              <li key={application.id}>
                <Link
                  href={`/applications/${application.id}`}
                  className="block space-y-3 rounded-xl border p-5 transition-colors duration-(--duration-fast) hover:border-brand-primary-border"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{universityNameByTargetId.get(application.target_university_id) ?? "Unknown"}</p>
                      <p className="text-sm text-muted-foreground capitalize">{application.application_type.replace(/_/g, " ")}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {application.deadline ? <DeadlineBadge date={application.deadline} /> : null}
                      <StatusBadge
                        label={application.status.replace(/_/g, " ")}
                        tone={APPLICATION_STATUS_TONE[application.status]}
                        className="capitalize"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Readiness</span>
                      <span>{readiness}%</span>
                    </div>
                    <Progress value={readiness} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          icon={ClipboardCheck}
          title={targets.length === 0 ? "No applications yet" : "No applications started yet"}
          description={
            targets.length === 0
              ? "Save a university you're targeting to start an application."
              : "Start one from a target university to begin tracking requirements and deadlines."
          }
        />
      )}
    </div>
  );
}
