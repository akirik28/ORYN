import Link from "next/link";
import { differenceInCalendarDays } from "date-fns";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { computeReadiness } from "@/lib/applications/readiness";
import { NewApplicationDialog } from "@/features/applications/new-application-dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Applications</h1>
          <p className="mt-1 text-muted-foreground">Track requirements and deadlines for each application.</p>
        </div>
        <NewApplicationDialog availableTargets={availableTargets} />
      </div>

      {applications.length > 0 ? (
        <ul className="space-y-3">
          {applications.map((application) => {
            const readiness = computeReadiness(requirementsByApplication.get(application.id) ?? []);
            const daysUntil = application.deadline ? differenceInCalendarDays(new Date(application.deadline), new Date()) : null;

            return (
              <li key={application.id}>
                <Link
                  href={`/applications/${application.id}`}
                  className="block space-y-3 rounded-xl border p-5 transition-colors hover:border-primary/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{universityNameByTargetId.get(application.target_university_id) ?? "Unknown"}</p>
                      <p className="text-sm text-muted-foreground capitalize">{application.application_type.replace(/_/g, " ")}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {daysUntil !== null ? (
                        <Badge variant="outline" className={daysUntil <= 14 && daysUntil >= 0 ? "border-amber-500/40 text-amber-700 dark:text-amber-400" : ""}>
                          {daysUntil < 0 ? "Past deadline" : daysUntil === 0 ? "Due today" : `${daysUntil} days left`}
                        </Badge>
                      ) : null}
                      <Badge variant="outline" className="capitalize">
                        {application.status.replace(/_/g, " ")}
                      </Badge>
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
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          {targets.length === 0
            ? "Save a university you're targeting to start an application."
            : "No applications started yet."}
        </div>
      )}
    </div>
  );
}
