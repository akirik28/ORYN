import { notFound } from "next/navigation";
import { MapPin, Users, DollarSign, GraduationCap, ExternalLink, Trophy, Target, TrendingUp } from "lucide-react";
import { heroGradientStyle } from "@/components/oryn/hero-gradient";
import { explainOutlook, type DimensionScoreInput } from "@/lib/admissions/explain";
import { OutlookBadge } from "@/features/universities/outlook-badge";
import { SourceBadge } from "@/components/oryn/source-badge";
import { PageHeader } from "@/components/oryn/page-header";
import { SectionHeader } from "@/components/oryn/section-header";
import { RequirementGroup } from "@/features/universities/requirement-group";
import { DeadlineBadge } from "@/components/oryn/deadline-badge";
import { StatusBadge } from "@/components/oryn/status-badge";
import { formatTuition, tuitionQualifier } from "@/lib/universities/tuition-format";
import { formatNumber } from "@/lib/i18n/format";
import { formatAbsoluteDate } from "@/lib/i18n/date";
import {
  FIXTURE_UNIVERSITY,
  FIXTURE_UNIVERSITY_STATISTICS,
  FIXTURE_UNIVERSITY_PROGRAMS,
  FIXTURE_UNIVERSITY_REQUIREMENTS,
  FIXTURE_UNIVERSITY_REQUIREMENTS_EMPTY,
  FIXTURE_REQUIREMENT_EVALUATIONS,
  FIXTURE_UNIVERSITY_DEADLINES,
  FIXTURE_UNIVERSITY_RANKINGS,
  FIXTURE_UNIVERSITY_PROFILE_METRICS,
  FIXTURE_DIMENSION_SCORES,
  FIXTURE_PROFILE_SIGNAL,
} from "@/lib/dev/fixtures";
import { PreviewShell } from "../preview-shell";
import type { Locale } from "@/lib/i18n/config";
import type { UniversityRequirement } from "@/types/database";

/**
 * Design-preview mirror of app/(app)/universities/[id]/page.tsx (2026-09-03) — 843 lines in
 * the real page, so this covers the sections oryn-a7 actually named (stat cards including
 * the tuition/cost branch, the outlook panel, the Requirement Check section in both its
 * populated and empty-on-file states — 6e is about to change the latter — deadlines,
 * sources) rather than a line-for-line reproduction of every conditional. Deliberately
 * skipped: the admin-only requirement-entry form (nothing to review without an admin
 * session anyway), the hero image (needs a real allowlisted remote host, not worth it for
 * one section), and the CAO-points calendar-bound-fact block (a single-country edge case
 * with no bearing on tonight's changes).
 *
 * `?requirements=empty` swaps FIXTURE_UNIVERSITY_REQUIREMENTS for
 * FIXTURE_UNIVERSITY_REQUIREMENTS_EMPTY — one link apart rather than a second route, since
 * the two states need to stay trivially easy to compare side by side while 6e's own change
 * lands. Default (no param) shows the populated state, since that's the common case.
 */

const t = (key: string, values?: Record<string, string | number>): string => {
  const table: Record<string, string> = {
    studentSize: "Student size",
    admissionRate: "Admission rate",
    costOfAttendance: "Cost of attendance",
    internationalTuition: "International tuition",
    testScores: "Test scores",
    graduationRate: "Graduation rate",
    unavailable: "Unavailable",
    programsTitle: "Programs",
    requirementCheckTitle: "Requirement check",
    requirementCheckDescription: "What Oryn can tell about your fit against this university's own stated requirements.",
    importantDatesTitle: "Important dates",
    upcoming: "Upcoming",
    recurringTitle: "Recurring, no fixed date on file",
    recurringAnnually: `${values?.date ?? ""}, annually`,
    recurringBadge: "Recurring",
    sourcesHeading: "Sources",
    visitWebsite: "Visit website",
    admissions: "Admissions",
    domesticRateCaption: `Domestic: ${values?.rate ?? ""}`,
    optional: "optional",
    sourceLink: "Source",
    programSpecific: "Programme-specific",
  };
  return table[key] ?? key;
};

function StatCard({ icon: Icon, label, value, caption }: { icon: typeof Users; label: string; value: string; caption?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border p-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-primary-soft text-brand-primary-strong">
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-medium">{value}</p>
        {caption ? <p className="text-xs text-muted-foreground">{caption}</p> : null}
      </div>
    </div>
  );
}

function formatDeadlineDate(dateString: string, locale: Locale): string {
  return formatAbsoluteDate(new Date(`${dateString}T00:00:00`), locale);
}
function formatRecurringDate(month: number, day: number, locale: Locale): string {
  const date = formatAbsoluteDate(new Date(Date.UTC(2000, month - 1, day)), locale, { month: "long", day: "numeric", timeZone: "UTC" });
  return t("recurringAnnually", { date });
}
function humanizeDeadlineType(type: string): string {
  const spaced = type.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export default async function UniversityDetailPreviewPage({ searchParams }: { searchParams: Promise<{ tier?: string; requirements?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();

  const { tier: tierParam, requirements: requirementsParam } = await searchParams;
  const tier = tierParam === "ultra" ? "ultra" : "standard";
  const locale: Locale = "en";

  const university = FIXTURE_UNIVERSITY;
  const stats = FIXTURE_UNIVERSITY_STATISTICS;
  const programs = FIXTURE_UNIVERSITY_PROGRAMS;
  // The exact toggle 6e's change lands on — see this file's own header comment.
  const requirements: UniversityRequirement[] = requirementsParam === "empty" ? FIXTURE_UNIVERSITY_REQUIREMENTS_EMPTY : FIXTURE_UNIVERSITY_REQUIREMENTS;
  const universityWideRequirements = requirements.filter((r) => r.program_id === null);
  const requirementsByProgram = new Map<string, UniversityRequirement[]>();
  for (const r of requirements) {
    if (!r.program_id) continue;
    requirementsByProgram.set(r.program_id, [...(requirementsByProgram.get(r.program_id) ?? []), r]);
  }
  const programNameById = new Map(programs.map((p) => [p.id, p.name]));

  const dimensionScores: DimensionScoreInput[] = FIXTURE_DIMENSION_SCORES;
  // A real "Reach" outlook — LSE's own admission rate (9%) is known, so admissionRateKnown
  // is true, exercising the real strengths/gaps/unknowns branch. UK falls under
  // holistic_review (narrowly, per system-shape.ts's own comment), not the
  // academic_threshold shape Netherlands/Erasmus-style systems take.
  const explanation = explainOutlook(dimensionScores, "holistic_review", stats.admission_rate != null, locale);
  const outlookEstimate = { low: 15, high: 25, confidence: "medium" as const };

  const metricByCode = new Map(FIXTURE_UNIVERSITY_PROFILE_METRICS.map((m) => [m.metric_code, m]));
  const researchTopicsMetric = metricByCode.get("research_topics_top5");
  const researchTopics = researchTopicsMetric?.value_text ? researchTopicsMetric.value_text.split(" | ").filter(Boolean) : [];
  const undergradCount = metricByCode.get("undergraduate_students")?.value_numeric ?? null;
  const postgradCount = metricByCode.get("postgraduate_students")?.value_numeric ?? null;
  const internationalTuitionMetric = metricByCode.get("tuition_international_annual");
  const domesticTuitionMetric = metricByCode.get("tuition_domestic_annual");
  const internationalTuition = internationalTuitionMetric?.value_numeric ?? null;
  const domesticTuition = domesticTuitionMetric?.value_numeric ?? null;

  const datedDeadlines = FIXTURE_UNIVERSITY_DEADLINES.filter((d) => d.deadline_date !== null);
  const recurringDeadlines = FIXTURE_UNIVERSITY_DEADLINES.filter((d) => d.recurrence === "recurring_annual_undated");

  return (
    <PreviewShell signal={FIXTURE_PROFILE_SIGNAL} tier={tier}>
      <div className="dark space-y-8 rounded-[28px] p-4 text-foreground md:p-8" style={heroGradientStyle(tier)}>
        <PageHeader
          title={university.name}
          description={
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4" />
              {[university.city, university.country].filter(Boolean).join(", ")}
            </span>
          }
        />

        {university.institution_type ? <span className="w-fit rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{university.institution_type}</span> : null}
        {university.description ? <p className="max-w-3xl text-muted-foreground">{university.description}</p> : null}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {FIXTURE_UNIVERSITY_RANKINGS.map((r) => (
            <a key={r.ranking_provider} href={r.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-foreground hover:underline">
              <Trophy className="size-4 shrink-0" />
              {r.ranking_provider} {r.ranking_edition} — #{r.rank_display}
            </a>
          ))}
        </div>

        {/* The outlook panel — a real "Reach" verdict with real strengths/gaps/unknowns,
            not the not_applicable branch (that one's a single EmptyState-shaped block,
            already well covered elsewhere in this app's own tests). */}
        <section className="space-y-4 rounded-2xl border border-brand-primary-border bg-brand-primary-subtle p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-medium">Your outlook</h2>
            <OutlookBadge outlook="reach" locale={locale} />
          </div>
          <p className="text-sm text-muted-foreground">
            Oryn estimate: <span className="font-medium text-foreground">{outlookEstimate.low}–{outlookEstimate.high}%</span> ({outlookEstimate.confidence} confidence). This is not a
            guarantee or an official university probability.
          </p>
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

        {/* Stat grid — the branch oryn-a7 named directly: no US cost_of_attendance for LSE
            (null in the fixture, honestly), so this exercises the international-tuition
            path instead, qualifier prefix and domestic-rate caption both real. */}
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            icon={Users}
            label={t("studentSize")}
            value={formatNumber(university.student_size!)}
            caption={undergradCount != null && postgradCount != null ? `${formatNumber(undergradCount)} undergraduate, ${formatNumber(postgradCount)} postgraduate` : undefined}
          />
          <StatCard icon={GraduationCap} label={t("admissionRate")} value={stats.admission_rate != null ? `${Math.round(stats.admission_rate * 100)}%` : t("unavailable")} />
          {internationalTuition != null ? (
            (() => {
              const q = tuitionQualifier(internationalTuitionMetric!.precision_state!, locale);
              const domesticQ = domesticTuitionMetric ? tuitionQualifier(domesticTuitionMetric.precision_state!, locale) : null;
              return (
                <StatCard
                  icon={DollarSign}
                  label={t("internationalTuition")}
                  value={`${q.valuePrefix}${formatTuition(internationalTuition, internationalTuitionMetric!.unit!, locale)}`}
                  caption={domesticTuition != null ? t("domesticRateCaption", { rate: `${domesticQ!.valuePrefix}${formatTuition(domesticTuition, domesticTuitionMetric!.unit!, locale)}` }) : undefined}
                />
              );
            })()
          ) : (
            <StatCard icon={DollarSign} label={t("costOfAttendance")} value={t("unavailable")} />
          )}
          <StatCard icon={Target} label="Test scores" value="Unavailable" />
          <StatCard icon={TrendingUp} label={t("graduationRate")} value={stats.graduation_rate != null ? `${Math.round(stats.graduation_rate * 100)}%` : t("unavailable")} />
        </div>

        {stats.source ? (
          <SourceBadge
            sourceName={stats.source}
            checkedAt={stats.updated_at}
            confidence={stats.data_confidence}
            locale={locale}
            sourceLabel="Source"
            checkedLabel={(time) => `Checked ${time}`}
            viewSourceLabel="View source"
          />
        ) : null}

        <section className="space-y-5">
          <SectionHeader title={t("programsTitle")} description="Verified, current programmes." />
          <ul className="grid gap-2 sm:grid-cols-2">
            {programs.map((program) => (
              <li key={program.id} className="space-y-1 rounded-lg border p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{program.name}</p>
                  {program.official_program_url ? (
                    <a href={program.official_program_url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-muted-foreground hover:text-brand-primary" aria-label={`Official page for ${program.name}`}>
                      <ExternalLink className="size-3.5" />
                    </a>
                  ) : null}
                </div>
                <p className="text-muted-foreground">{[program.degree_type, program.faculty_or_school].filter(Boolean).join(" · ")}</p>
              </li>
            ))}
          </ul>
        </section>

        {researchTopics.length > 0 ? (
          <section className="space-y-3">
            <SectionHeader title="Research strengths" description="Recent publication activity, via OpenAlex." />
            <div className="flex flex-wrap gap-2">
              {researchTopics.map((topic) => (
                <span key={topic} className="rounded-full border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
                  {topic}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {/* Requirement Check — the section 6e is about to change the empty-on-file
            rendering for. ?requirements=empty shows that state directly rather than
            leaving it to be discovered live once the change lands. */}
        <section className="space-y-4">
          <SectionHeader title={t("requirementCheckTitle")} description={t("requirementCheckDescription")} />
          {requirements.length > 0 ? (
            <>
              {universityWideRequirements.length > 0 ? (
                <RequirementGroup
                  title="Program not recorded"
                  description="Sourced from the university's own pages — Oryn hasn't recorded which specific program each of these belongs to."
                  items={universityWideRequirements}
                  evaluationByRequirement={FIXTURE_REQUIREMENT_EVALUATIONS}
                  locale={locale}
                  t={t}
                />
              ) : null}
              {[...requirementsByProgram.entries()].map(([programId, items]) => (
                <RequirementGroup key={programId} title={programNameById.get(programId) ?? "Program"} items={items} evaluationByRequirement={FIXTURE_REQUIREMENT_EVALUATIONS} locale={locale} t={t} />
              ))}
            </>
          ) : (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Oryn hasn&rsquo;t researched this university&rsquo;s specific requirements yet. <a href="?requirements=populated" className="text-brand-primary hover:underline">See the populated state →</a>
            </p>
          )}
        </section>

        <section className="space-y-4">
          <SectionHeader title={t("importantDatesTitle")} description="Sourced directly from the university's own pages." />
          {datedDeadlines.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">{t("upcoming")}</h3>
              <ul className="divide-y rounded-lg border">
                {datedDeadlines.map((d) => (
                  <li key={d.id} className="space-y-1 px-4 py-2.5 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-medium">{humanizeDeadlineType(d.deadline_type)}</span>
                        {d.cycle_label ? <span className="ml-2 text-xs text-muted-foreground">· {d.cycle_label}</span> : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {d.binding_policy ? <StatusBadge label={d.binding_policy === "non_binding" ? "Non-binding" : "Binding"} tone="neutral" /> : null}
                        <DeadlineBadge date={d.deadline_date!} locale={locale} />
                      </div>
                    </div>
                    <p className="text-muted-foreground">{formatDeadlineDate(d.deadline_date!, locale)}</p>
                    {d.deadline_text_verbatim ? <p className="text-xs text-muted-foreground italic">&ldquo;{d.deadline_text_verbatim}&rdquo;</p> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {recurringDeadlines.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">{t("recurringTitle")}</h3>
              <ul className="divide-y rounded-lg border">
                {recurringDeadlines.map((d) => (
                  <li key={d.id} className="space-y-1 px-4 py-2.5 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-medium">{humanizeDeadlineType(d.deadline_type)}</span>
                        {d.program_id ? <span className="ml-2 text-xs text-muted-foreground">{programNameById.get(d.program_id) ?? t("programSpecific")}</span> : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {d.binding_policy ? <StatusBadge label={d.binding_policy === "binding" ? "Binding" : "Non-binding"} tone="neutral" /> : null}
                        <StatusBadge label={t("recurringBadge")} tone="neutral" />
                      </div>
                    </div>
                    <p className="text-muted-foreground">{formatRecurringDate(d.recurrence_month!, d.recurrence_day!, locale)}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        {university.website_url || university.admissions_url ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            {university.website_url ? (
              <a href={university.website_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-primary hover:underline">
                {t("visitWebsite")} <ExternalLink className="size-3.5" />
              </a>
            ) : null}
            {university.admissions_url ? (
              <a href={university.admissions_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-primary hover:underline">
                {t("admissions")}{university.application_system ? ` (${university.application_system})` : ""} <ExternalLink className="size-3.5" />
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </PreviewShell>
  );
}
