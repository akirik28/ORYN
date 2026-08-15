import { notFound } from "next/navigation";
import { MapPin, Users, DollarSign, GraduationCap } from "lucide-react";
import { requireUser, getCurrentProfile } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { refreshAdmissionOutlook } from "@/lib/admissions/persist";
import { explainOutlook } from "@/lib/admissions/explain";
import { refreshRequirementEvaluations } from "@/lib/requirements/persist";
import { REQUIREMENT_CATEGORY_LABELS } from "@/lib/requirements/types";
import { OutlookBadge } from "@/features/universities/outlook-badge";
import { SourceBadge } from "@/features/system/source-badge";
import { SaveUniversityButton } from "@/features/universities/save-university-button";
import { RequirementEvaluationBadge } from "@/features/universities/requirement-evaluation-badge";
import { AdminRequirementForm } from "@/features/universities/admin-requirement-form";
import type { ProfileDimension, RequirementEvaluationStatus, UniversityRequirement } from "@/types/database";

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

  const scoreMap = Object.fromEntries((scoresRes.data ?? []).map((s) => [s.dimension, s.score])) as Partial<Record<ProfileDimension, number>>;
  const explanation = explainOutlook(scoreMap);
  const stats = statsRes.data;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{university.name}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="size-4" />
            {[university.city, university.country].filter(Boolean).join(", ")}
          </p>
        </div>
        <SaveUniversityButton universityId={university.id} targetId={targetRes.data?.id ?? null} status={targetRes.data?.status ?? null} />
      </div>

      {university.description ? <p className="max-w-3xl text-muted-foreground">{university.description}</p> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Users} label="Student size" value={university.student_size ? university.student_size.toLocaleString() : "Unavailable"} />
        <StatCard icon={GraduationCap} label="Admission rate" value={stats?.admission_rate != null ? `${Math.round(stats.admission_rate * 100)}%` : "Unavailable"} />
        <StatCard icon={DollarSign} label="Cost of attendance" value={stats?.cost_of_attendance ? `$${stats.cost_of_attendance.toLocaleString()}` : "Unavailable"} />
      </div>

      {targetRes.data ? (
        <section className="space-y-4 rounded-2xl border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Your outlook</h2>
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
          <div className="grid gap-4 sm:grid-cols-3 text-sm">
            <div>
              <p className="font-medium text-emerald-700 dark:text-emerald-400">Strengths</p>
              <ul className="mt-1 space-y-0.5 text-muted-foreground">
                {explanation.strengths.length > 0 ? explanation.strengths.map((s) => <li key={s}>+ {s}</li>) : <li>Add more profile data to see this.</li>}
              </ul>
            </div>
            <div>
              <p className="font-medium text-amber-700 dark:text-amber-400">Gaps</p>
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
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Programs</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {programsRes.data.map((program) => (
              <li key={program.id} className="rounded-lg border p-3 text-sm">
                <p className="font-medium">{program.name}</p>
                <p className="text-muted-foreground">{[program.degree_level, program.field].filter(Boolean).join(" · ")}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {requirementsRes.data && requirementsRes.data.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Requirement check</h2>
          <ul className="divide-y rounded-lg border">
            {requirementsRes.data.map((req) => (
              <li key={req.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="capitalize">{req.requirement_type.replace(/_/g, " ")}</span>
                <span className="text-muted-foreground">{req.requirement_detail ?? (req.is_required ? "Required" : "Optional")}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {university.website_url ? (
        <a href={university.website_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
          Visit official website →
        </a>
      ) : null}

      {sourcesRes.data && sourcesRes.data.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Sources</h2>
          <div className="flex flex-wrap gap-2">
            {sourcesRes.data.map((source) => (
              <SourceBadge key={source.id} source={source.source_domain ?? source.source_url} retrievedAt={source.retrieved_at} url={source.source_url} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        <span className="text-sm">{label}</span>
      </div>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
