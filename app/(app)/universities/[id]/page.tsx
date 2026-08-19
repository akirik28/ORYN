import { notFound, redirect } from "next/navigation";
import { MapPin, Users, DollarSign, GraduationCap, ExternalLink, Trophy } from "lucide-react";
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
import { DetailHeroImage } from "@/features/universities/detail-hero-image";
import { RequirementEvaluationBadge } from "@/features/universities/requirement-evaluation-badge";
import { AdminRequirementForm } from "@/features/universities/admin-requirement-form";
import { canonicalUniversityId, isSupersededUniversityId } from "@/lib/universities/canonical";
import { formatTuition, tuitionQualifier } from "@/lib/universities/tuition-format";
import type { ProfileDimension, RequirementEvaluationStatus, UniversityRequirement, UniversityProgram } from "@/types/database";

/** QS's own official Size classification (S/M/L/XL) — a coarse FTE-based band, not an exact
 * headcount; QS doesn't publish the numeric thresholds between them. Used only as a fallback
 * when no exact `student_size` exists yet — see scripts/acquire-qs-institution-profile.ts. */
const QS_SIZE_LABELS: Record<string, string> = {
  XS: "Extra small",
  S: "Small",
  M: "Medium",
  L: "Large",
  XL: "Extra large",
};


export default async function UniversityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireUser();
  const supabase = await createClient();

  // A loser row still has a real, working detail page (it must — programs/requirements/FKs on
  // one side of a pair are exactly why the row can't just be deleted), but no surface should
  // let a student land on it as if it were the canonical result: redirect to the winner instead
  // of rendering. Catches every path here, not just the now-fixed browse/search — an old
  // bookmark, a program search result, a saved deep link. See lib/universities/canonical.ts.
  if (isSupersededUniversityId(id)) {
    redirect(`/universities/${canonicalUniversityId(id)}`);
  }

  const { data: university } = await supabase.from("universities").select("*").eq("id", id).single();
  if (!university) notFound();

  const [programsRes, requirementsRes, statsRes, sourcesRes, targetRes, scoresRes, rankingsRes, metricsRes] = await Promise.all([
    supabase.from("university_programs").select("*").eq("university_id", id),
    supabase.from("university_requirements").select("*").eq("university_id", id),
    supabase.from("university_statistics").select("*").eq("university_id", id).order("stat_year", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("university_sources").select("*").eq("university_id", id).order("retrieved_at", { ascending: false }),
    supabase.from("target_universities").select("*").eq("university_id", id).eq("user_id", session.userId!).maybeSingle(),
    supabase.from("profile_scores").select("dimension, score").eq("user_id", session.userId!),
    supabase.from("university_rankings").select("ranking_provider, ranking_edition, rank_display, source_url").eq("university_id", id).order("ranking_provider"),
    supabase
      .from("university_profile_metrics")
      .select("metric_code, value_numeric, value_text, unit, source_url, source_type, verified_at, precision_state")
      .eq("university_id", id)
      .in("metric_code", [
        "research_topics_top5",
        "undergraduate_students",
        "postgraduate_students",
        "qs_size_category",
        "tuition_international_annual",
        "tuition_domestic_annual",
        "primary_image_url",
        "primary_image_license",
        "primary_image_attribution",
      ]),
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

  const metricByCode = new Map((metricsRes.data ?? []).map((m) => [m.metric_code, m]));
  const researchTopicsMetric = metricByCode.get("research_topics_top5");
  const researchTopics = researchTopicsMetric?.value_text ? researchTopicsMetric.value_text.split(" | ").filter(Boolean) : [];
  const undergradCount = metricByCode.get("undergraduate_students")?.value_numeric ?? null;
  const postgradCount = metricByCode.get("postgraduate_students")?.value_numeric ?? null;
  const qsSizeCode = metricByCode.get("qs_size_category")?.value_text ?? null;
  const internationalTuitionMetric = metricByCode.get("tuition_international_annual");
  const domesticTuitionMetric = metricByCode.get("tuition_domestic_annual");
  const internationalTuition = internationalTuitionMetric?.value_numeric ?? null;
  const domesticTuition = domesticTuitionMetric?.value_numeric ?? null;
  const qsSizeLabel = qsSizeCode ? (QS_SIZE_LABELS[qsSizeCode] ?? qsSizeCode) : null;

  const imageMetric = metricByCode.get("primary_image_url");
  const imageLicenseMetric = metricByCode.get("primary_image_license");
  const imageAttributionMetric = metricByCode.get("primary_image_attribution");
  const imageCaptionParts = [imageAttributionMetric?.value_text, imageLicenseMetric?.value_text].filter((v): v is string => Boolean(v));

  return (
    <div className="space-y-8">
      {imageMetric?.value_text ? (
        <DetailHeroImage
          src={imageMetric.value_text}
          alt={`Main campus of ${university.name}`}
          caption={
            imageCaptionParts.length > 0 || imageMetric.source_url ? (
              <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                {imageCaptionParts.length > 0 ? <span>{imageCaptionParts.join(" · ")}</span> : null}
                {imageMetric.source_url ? (
                  <a href={imageMetric.source_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {imageCaptionParts.length > 0 ? "· Source ↗" : "Source ↗"}
                  </a>
                ) : null}
              </p>
            ) : undefined
          }
        />
      ) : null}
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

      {university.institution_type ? (
        <span className="w-fit rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{university.institution_type}</span>
      ) : null}

      {university.description ? <p className="max-w-3xl text-muted-foreground">{university.description}</p> : null}

      {rankingsRes.data && rankingsRes.data.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {rankingsRes.data.map((r) => (
            <a
              key={`${r.ranking_provider}-${r.ranking_edition}`}
              href={r.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-foreground hover:underline"
            >
              <Trophy className="size-4 shrink-0" />
              {r.ranking_provider} {r.ranking_edition} — #{r.rank_display}
            </a>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Users}
          label="Student size"
          value={university.student_size ? university.student_size.toLocaleString("en-US") : (qsSizeLabel ?? "Unavailable")}
          caption={
            university.student_size && undergradCount != null && postgradCount != null
              ? `${undergradCount.toLocaleString("en-US")} undergrad · ${postgradCount.toLocaleString("en-US")} postgrad`
              : !university.student_size && qsSizeLabel
                ? "QS size band, not an exact count"
                : undefined
          }
        />
        <StatCard icon={GraduationCap} label="Admission rate" value={stats?.admission_rate != null ? `${Math.round(stats.admission_rate * 100)}%` : "Unavailable"} />
        {/* These read two genuinely different concepts — US `cost_of_attendance` (an IPEDS
            all-in sticker-price estimate) vs a UK-and-onward `tuition_international_annual`
            (tuition only, official-university-page-sourced, often a range) — and are never
            shown under the same label, per the founder's explicit "never collapse different
            cost concepts" rule. Only one of the two is ever populated for a given university
            today (US vs non-US acquisition pipelines don't overlap), so at most one StatCard
            renders real data; if that ever changes, this still can't silently blend them. */}
        {stats?.cost_of_attendance ? (
          <StatCard icon={DollarSign} label="Cost of attendance" value={`$${stats.cost_of_attendance.toLocaleString("en-US")}`} />
        ) : internationalTuition != null ? (
          (() => {
            // Each figure's own precision_state governs its own prefix — international being
            // a range (or income-based) does not mean domestic is too, and vice versa. A prior
            // version of this block reused international's qualifier for both figures, which
            // silently mislabelled a UK domestic exact figure ("£9,790/yr") as "From £9,790/yr"
            // whenever the international side happened to be a range — caught live 2026-08-18
            // re-verifying Edinburgh right after adding the Italy upper_bound case.
            const q = tuitionQualifier(internationalTuitionMetric!.precision_state);
            const domesticQ = domesticTuitionMetric ? tuitionQualifier(domesticTuitionMetric.precision_state) : null;
            return (
              <StatCard
                icon={DollarSign}
                label="International tuition"
                value={`${q.valuePrefix}${formatTuition(internationalTuition, internationalTuitionMetric!.unit)}`}
                caption={
                  domesticTuition != null
                    ? `${q.note}Domestic rate: ${domesticQ!.valuePrefix}${formatTuition(domesticTuition, domesticTuitionMetric!.unit)}`
                    : q.note
                      ? `${q.note}— see university for your exact fee`
                      : undefined
                }
              />
            );
          })()
        ) : domesticTuition != null ? (
          // International tuition genuinely isn't published as a single figure at this
          // university (see acquire-university-statistics-uk.ts's header) — the domestic
          // rate is real, verified data too, just clearly labeled as NOT what most of this
          // product's international-applicant audience would actually pay.
          (() => {
            const q = tuitionQualifier(domesticTuitionMetric!.precision_state);
            return (
              <StatCard
                icon={DollarSign}
                label="Domestic tuition"
                value={`${q.valuePrefix}${formatTuition(domesticTuition, domesticTuitionMetric!.unit)}`}
                caption={q.note ? `${q.note}International fee not separately published` : "International fee not published as a single figure — varies by course"}
              />
            );
          })()
        ) : (
          <StatCard icon={DollarSign} label="Cost of attendance" value="Unavailable" />
        )}
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

      {researchTopics.length > 0 ? (
        <section className="space-y-3">
          <SectionHeader title="Research strengths" description="Topics this university publishes in most, from OpenAlex's open research index." />
          <div className="flex flex-wrap gap-2">
            {researchTopics.map((topic) => (
              <span key={topic} className="rounded-full border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
                {topic}
              </span>
            ))}
          </div>
          {researchTopicsMetric?.source_url ? (
            <SourceBadge sourceName="OpenAlex" checkedAt={researchTopicsMetric.verified_at} url={researchTopicsMetric.source_url} />
          ) : null}
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

      {university.website_url || university.admissions_url ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {university.website_url ? (
            <a href={university.website_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-primary hover:underline">
              Visit official website <ExternalLink className="size-3.5" />
            </a>
          ) : null}
          {university.admissions_url ? (
            <a href={university.admissions_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-primary hover:underline">
              Admissions{university.application_system ? ` (${university.application_system})` : ""} <ExternalLink className="size-3.5" />
            </a>
          ) : null}
        </div>
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

function StatCard({ icon: Icon, label, value, caption }: { icon: typeof Users; label: string; value: string; caption?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border p-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-primary-soft text-brand-primary-strong">
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-heading text-lg font-medium">{value}</p>
        {caption ? <p className="text-xs text-muted-foreground">{caption}</p> : null}
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
