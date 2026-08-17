import { notFound } from "next/navigation";
import { MapPin, Users, DollarSign, GraduationCap, ExternalLink } from "lucide-react";
import { SUBJECT_LABELS } from "@/lib/programs/subject-labels";
import { requireUser, getCurrentProfile } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { refreshAdmissionOutlook } from "@/lib/admissions/persist";
import { explainOutlook } from "@/lib/admissions/explain";
import { refreshRequirementEvaluations } from "@/lib/requirements/persist";
import { REQUIREMENT_CATEGORY_LABELS } from "@/lib/requirements/types";
import { OutlookBadge } from "@/features/universities/outlook-badge";
import { SourceBadge } from "@/components/oryn/source-badge";
import { PageHeader } from "@/components/oryn/page-header";
import { SectionHeader } from "@/components/oryn/section-header";
import { SaveUniversityButton } from "@/features/universities/save-university-button";
import { RequirementEvaluationBadge } from "@/features/universities/requirement-evaluation-badge";
import { AdminRequirementForm } from "@/features/universities/admin-requirement-form";
import type { ProfileDimension, RequirementEvaluationStatus, UniversityRequirement, UniversityProgram } from "@/types/database";

export default async function UniversityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireUser();
  const supabase = await createClient();

  const { data: university } = await supabase.from("universities").select("*").eq("id", id).single();
  if (!university) notFound();

  const [programsRes, requirementsRes, statsRes, sourcesRes, targetRes, scoresRes] = await Promise.all([
    supabase.from("university_programs").select("*").eq("university_id", id),
    supabase.from("university_requirements").select("*").eq("university_id", id),
    supabase.from("university_statistics").select("*").eq("university_id", id).order("stat_year", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("university_sources").select("*").eq("university_id", id).order("retrieved_at", { ascending: false }),
    supabase.from("target_universities").select("*").eq("university_id", id).eq("user_id", session.userId!).maybeSingle(),
    supabase.from("profile_scores").select("dimension, score").eq("user_id", session.userId!),
  ]);

  if (targetRes.data) {
    await refreshAdmissionOutlook(targetRes.data.id, session.userId!);
  }

  const requirements = requirementsRes.data ?? [];
  if (requirements.length > 0) {
    await refreshRequirementEvaluations(university.id, session.userId!, targetRes.data?.program_id ?? null);
  }
  const [profile, evaluationsRes] = await Promise.all([
    getCurrentProfile(),
    requirements.length > 0
      ? supabase
          .from("student_requirement_evaluations")
          .select("requirement_id, status, reasoning")
          .eq("user_id", session.userId!)
          .in(
            "requirement_id",
            requirements.map((r) => r.id)
          )
      : Promise.resolve({ data: [] as { requirement_id: string; status: RequirementEvaluationStatus; reasoning: string }[] }),
  ]);
  const evaluationByRequirement = new Map(evaluationsRes.data?.map((e) => [e.requirement_id, e]) ?? []);

  const programNameById = new Map((programsRes.data ?? []).map((p) => [p.id, p.name]));
  const universityWideRequirements = requirements.filter((r) => r.program_id === null);
  const requirementsByProgram = new Map<string, UniversityRequirement[]>();
  for (const r of requirements) {
    if (!r.program_id) continue;
    requirementsByProgram.set(r.program_id, [...(requirementsByProgram.get(r.program_id) ?? []), r]);
  }

  const scoreMap = Object.fromEntries((scoresRes.data ?? []).map((s) => [s.dimension, s.score])) as Partial<Record<ProfileDimension, number>>;
  const explanation = explainOutlook(scoreMap);
  const stats = statsRes.data;

  return (
    <div className="space-y-8">
      <PageHeader
        title={university.name}
        description={
          <span className="flex items-center gap-1.5">
            <MapPin className="size-4" />
            {[university.city, university.country].filter(Boolean).join(", ")}
          </span>
        }
        action={<SaveUniversityButton universityId={university.id} targetId={targetRes.data?.id ?? null} status={targetRes.data?.status ?? null} />}
      />

      {university.description ? <p className="max-w-3xl text-muted-foreground">{university.description}</p> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Users} label="Student size" value={university.student_size ? university.student_size.toLocaleString() : "Unavailable"} />
        <StatCard icon={GraduationCap} label="Admission rate" value={stats?.admission_rate != null ? `${Math.round(stats.admission_rate * 100)}%` : "Unavailable"} />
        <StatCard icon={DollarSign} label="Cost of attendance" value={stats?.cost_of_attendance ? `$${stats.cost_of_attendance.toLocaleString()}` : "Unavailable"} />
      </div>

      {targetRes.data ? (
        <section className="space-y-4 rounded-2xl border border-brand-primary-border bg-brand-primary-subtle p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-medium">Your outlook</h2>
            <OutlookBadge outlook={targetRes.data.outlook} />
          </div>
          {targetRes.data.estimate_range_low != null && targetRes.data.estimate_range_high != null ? (
            <p className="text-sm text-muted-foreground">
              Oryn estimate:{" "}
              <span className="font-medium text-foreground">
                {Math.round(targetRes.data.estimate_range_low * 100)}–{Math.round(targetRes.data.estimate_range_high * 100)}%
              </span>{" "}
              ({targetRes.data.outlook_confidence} confidence). This is not a guarantee or an official university
              probability.
            </p>
          ) : null}
          <div className="grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <p className="font-medium text-success">Strengths</p>
              <ul className="mt-1 space-y-0.5 text-muted-foreground">
                {explanation.strengths.length > 0 ? explanation.strengths.map((s) => <li key={s}>+ {s}</li>) : <li>Add more profile data to see this.</li>}
              </ul>
            </div>
            <div>
              <p className="font-medium text-warning">Gaps</p>
              <ul className="mt-1 space-y-0.5 text-muted-foreground">
                {explanation.gaps.length > 0 ? explanation.gaps.map((g) => <li key={g}>− {g}</li>) : <li>None obvious yet.</li>}
              </ul>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Unknowns</p>
              <ul className="mt-1 space-y-0.5 text-muted-foreground">
                {explanation.unknowns.map((u) => (
                  <li key={u}>? {u}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      {programsRes.data && programsRes.data.length > 0 ? (
        <section className="space-y-5">
          <SectionHeader title="Programs" description="Degree programs Oryn has verified against this university's own official pages." />
          {groupProgramsBySubject(programsRes.data).map(([subjectLabel, programs]) => (
            <div key={subjectLabel} className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">{subjectLabel}</h3>
              <ul className="grid gap-2 sm:grid-cols-2">
                {programs.map((program) => (
                  <li key={program.id} className="space-y-1 rounded-lg border p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{program.name}</p>
                      {program.official_program_url ? (
                        <a
                          href={program.official_program_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-muted-foreground hover:text-brand-primary"
                          aria-label={`Official page for ${program.name}`}
                        >
                          <ExternalLink className="size-3.5" />
                        </a>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground">{[program.degree_type ?? program.degree_level, program.faculty_or_school].filter(Boolean).join(" · ")}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ) : null}

      {requirements.length > 0 ? (
        <section className="space-y-4">
          <SectionHeader
            title="Requirement check"
            description="Oryn's read of your profile against each stated requirement — not an official admissions decision. See each source before relying on it."
          />
          {universityWideRequirements.length > 0 ? (
            <RequirementGroup title="University-wide" items={universityWideRequirements} evaluationByRequirement={evaluationByRequirement} />
          ) : null}
          {[...requirementsByProgram.entries()].map(([programId, items]) => (
            <RequirementGroup key={programId} title={programNameById.get(programId) ?? "Program"} items={items} evaluationByRequirement={evaluationByRequirement} />
          ))}
        </section>
      ) : null}

      {profile?.is_admin ? <AdminRequirementForm universityId={university.id} programs={programsRes.data ?? []} /> : null}

      {university.website_url ? (
        <a
          href={university.website_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-brand-primary hover:underline"
        >
          Visit official website <ExternalLink className="size-3.5" />
        </a>
      ) : null}

      {sourcesRes.data && sourcesRes.data.length > 0 ? (
        <section className="space-y-2">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Sources</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {sourcesRes.data.map((source) => (
              <SourceBadge
                key={source.id}
                sourceName={source.source_domain ?? source.source_url ?? "Unknown source"}
                checkedAt={source.retrieved_at}
                url={source.source_url}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

/** Groups verified programs by subject for the detail page, ordered by group size
 * (largest first) so a student sees the university's clearest strengths first.
 * "Other programs" (unclassified names) always sorts last regardless of size. */
function groupProgramsBySubject(programs: UniversityProgram[]): [string, UniversityProgram[]][] {
  const bySubject = new Map<string, UniversityProgram[]>();
  for (const program of programs) {
    const label = SUBJECT_LABELS[program.subject_taxonomy ?? "other"];
    bySubject.set(label, [...(bySubject.get(label) ?? []), program]);
  }
  const otherLabel = SUBJECT_LABELS.other;
  return [...bySubject.entries()].sort(([labelA, itemsA], [labelB, itemsB]) => {
    if (labelA === otherLabel) return 1;
    if (labelB === otherLabel) return -1;
    return itemsB.length - itemsA.length;
  });
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border p-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-primary-soft text-brand-primary-strong">
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-heading text-lg font-medium">{value}</p>
      </div>
    </div>
  );
}

function RequirementGroup({
  title,
  items,
  evaluationByRequirement,
}: {
  title: string;
  items: UniversityRequirement[];
  evaluationByRequirement: Map<string, { status: RequirementEvaluationStatus; reasoning: string }>;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <ul className="divide-y rounded-lg border">
        {items.map((req) => {
          const evaluation = evaluationByRequirement.get(req.id);
          const isInformational = req.requirement_type === "application_deadline";
          return (
            <li key={req.id} className="space-y-1 px-4 py-2.5 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-medium">{req.title ?? REQUIREMENT_CATEGORY_LABELS[req.requirement_type]}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {REQUIREMENT_CATEGORY_LABELS[req.requirement_type]}
                    {!req.is_required ? " · Optional" : ""}
                  </span>
                </div>
                {evaluation && !isInformational ? <RequirementEvaluationBadge status={evaluation.status} /> : null}
              </div>
              {req.requirement_detail ? <p className="text-muted-foreground">{req.requirement_detail}</p> : null}
              {evaluation?.reasoning && !isInformational ? <p className="text-xs text-muted-foreground">{evaluation.reasoning}</p> : null}
              {req.source_url ? (
                <a href={req.source_url} target="_blank" rel="noopener noreferrer" className="inline-block text-xs text-primary hover:underline">
                  Source ↗
                </a>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
