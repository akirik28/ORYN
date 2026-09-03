import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MapPin, Users, DollarSign, GraduationCap, ExternalLink, Trophy, Target, TrendingUp, FileSearch } from "lucide-react";
import { subjectLabel } from "@/lib/programs/subject-labels";
import { EmptyState } from "@/components/oryn/empty-state";
import { lacksResearchDepth } from "@/lib/universities/data-depth";
import { requireUser, getCurrentProfile, getProfileScores } from "@/lib/security/dal";
import { resolvePlanTier } from "@/lib/tier/plan-tier";
import { heroGradientStyle } from "@/components/oryn/hero-gradient";
import { resolveLocale } from "@/lib/i18n/locale";
import { createClient } from "@/lib/supabase/server";
import { refreshAdmissionOutlook } from "@/lib/admissions/persist";
import { explainOutlook, type DimensionScoreInput } from "@/lib/admissions/explain";
import { refreshRequirementEvaluations } from "@/lib/requirements/persist";
import { NON_ACTIONABLE_VERIFICATION_STATES } from "@/lib/deadlines/ingest";
import { NON_ACTIONABLE_REQUIREMENT_VERIFICATION_STATES } from "@/lib/requirements/ingest";
import { CAO_POINTS_IE } from "@/lib/acquisition/verification";
import { toCalendarBoundFactDisplay } from "@/lib/requirements/calendar-bound";
import { CalendarBoundFactList } from "@/features/universities/calendar-bound-fact-card";
import { isDatedDeadlineUpcoming } from "@/lib/deadlines/lifecycle";
import { OutlookBadge } from "@/features/universities/outlook-badge";
import { SourceBadge } from "@/components/oryn/source-badge";
import { PageHeader } from "@/components/oryn/page-header";
import { SectionHeader } from "@/components/oryn/section-header";
import { SaveUniversityButton } from "@/features/universities/save-university-button";
import { DetailHeroImage } from "@/features/universities/detail-hero-image";
import { RequirementGroup } from "@/features/universities/requirement-group";
import { AdminRequirementForm } from "@/features/universities/admin-requirement-form";
import { DeadlineBadge } from "@/components/oryn/deadline-badge";
import { StatusBadge } from "@/components/oryn/status-badge";
import { canonicalUniversityId, isSupersededUniversityId } from "@/lib/universities/canonical";
import { getSupersessionMap, getUniversity, getUniversityRequirements, getUniversityStatistics } from "@/lib/universities/detail-reads";
import { formatTuition, tuitionQualifier } from "@/lib/universities/tuition-format";
import { formatNumber, formatCurrency } from "@/lib/i18n/format";
import { formatAbsoluteDate } from "@/lib/i18n/date";
import type { Locale } from "@/lib/i18n/config";
import type { RequirementEvaluationStatus, UniversityRequirement, UniversityProgram, UniversityDeadline } from "@/types/database";

/** `Awaited<ReturnType<typeof getTranslations>>` blows up with TS2589 ("type instantiation
 * excessively deep") the moment the resulting value is actually called with interpolation
 * values, on this file's own scale of catalog namespace — next-intl's translator type is
 * generic over the full message shape, and passing it as a plain prop forces TypeScript to
 * re-resolve that generic at every call site. This is the narrow shape every `t`/`tQsSize`/
 * `tBindingPolicy` call in this file actually uses (a key, optionally interpolation values),
 * used only for passing translators between this page's own local helper functions. */
type Translator = (key: string, values?: Record<string, string | number>) => string;

/** QS's own official Size classification (S/M/L/XL) — a coarse FTE-based band, not an exact
 * headcount; QS doesn't publish the numeric thresholds between them. Used only as a fallback
 * when no exact `student_size` exists yet — see scripts/acquire-qs-institution-profile.ts.
 * Maps the DB code to a `universities.qsSize` catalog key rather than holding the label text
 * itself — page-local (only this page's StatCard reads it) but the actual English/Turkish
 * strings live in the catalog like everything else on this page now. */
const QS_SIZE_LABEL_KEYS: Record<string, string> = {
  XS: "extraSmall",
  S: "small",
  M: "medium",
  L: "large",
  XL: "extraLarge",
};

/** Null means unknown, not non_binding — see the column comment on
 * university_deadlines.binding_policy. Only rendered when a value is actually present.
 * Same catalog-key-indirection as QS_SIZE_LABEL_KEYS above. */
const BINDING_POLICY_LABEL_KEYS: Record<string, string> = {
  binding: "binding",
  restrictive_single_choice: "restrictive",
  non_binding: "nonBinding",
};

/** Turkish for the outlook estimate's confidence word — the only enum interpolated
 * directly into the "Your outlook" panel's own English sentence rather than sourced from
 * lib/admissions/*.ts. Page-local since nothing else on this page renders it. */
const CONFIDENCE_LABEL_TR: Record<"high" | "medium" | "low", string> = {
  high: "yüksek",
  medium: "orta",
  low: "düşük",
};


// Without this, every university detail page shared the layout's generic default title —
// the browser tab and history both just said "Oryn" regardless of which of 1,000+
// universities was open. Deliberately a second, lighter query (name only) rather than
// hoisting the page's own full select("*") into a shared cached fetcher — that's a larger
// refactor than this fix calls for.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  // docs/performance.md §5: generateMetadata used to independently re-fetch both the
  // supersession map and this university's row, on top of the page component doing the
  // exact same two reads moments later. Shared, cache()'d helpers now
  // (lib/universities/detail-reads.ts) -- see that file's own doc comment for why dedup
  // needs its own createClient() internally rather than a passed client.
  const supersessionMap = await getSupersessionMap();
  const university = await getUniversity(canonicalUniversityId(supersessionMap, id));
  return { title: university?.name ?? "University" };
}

export default async function UniversityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireUser();
  const supabase = await createClient();
  const locale = await resolveLocale();
  const t = (await getTranslations("universities.detail")) as Translator;
  // qsSize/bindingPolicy are separate catalog namespaces (siblings of `detail`, not nested
  // inside it) — same reason as onboarding-wizard.tsx's tCommon: `t("qsSize.small")` would
  // silently look for `universities.detail.qsSize.small`, which doesn't exist.
  const tQsSize = (await getTranslations("universities.qsSize")) as Translator;
  const tBindingPolicy = (await getTranslations("universities.bindingPolicy")) as Translator;
  const tSourceBadge = (await getTranslations("sourceBadge")) as Translator;

  // A loser row still has a real, working detail page (it must — programs/requirements/FKs on
  // one side of a pair are exactly why the row can't just be deleted), but no surface should
  // let a student land on it as if it were the canonical result: redirect to the winner instead
  // of rendering. Catches every path here, not just the now-fixed browse/search — an old
  // bookmark, a program search result, a saved deep link. See lib/universities/canonical.ts.
  const supersessionMap = await getSupersessionMap();
  if (isSupersededUniversityId(supersessionMap, id)) {
    redirect(`/universities/${canonicalUniversityId(supersessionMap, id)}`);
  }

  const university = await getUniversity(id);
  if (!university) notFound();

  const [programsRes, allRequirements, deadlinesRes, stats, sourcesRes, targetRes, scores, rankingsRes, metricsRes] = await Promise.all([
    supabase.from("university_programs").select("*").eq("university_id", id).eq("verification_state", "verified_current"),
    // Shared, cache()'d — docs/performance.md §5. Was queried identically (select("*"),
    // same filter) again inside refreshRequirementEvaluations below; that function now
    // shares this same call instead of re-fetching it.
    getUniversityRequirements(id),
    supabase
      .from("university_deadlines")
      .select(
        "id, program_id, deadline_type, deadline_date, recurrence, recurrence_month, recurrence_day, cycle_label, verification_state, deadline_text_verbatim, source_url, binding_policy"
      )
      .eq("university_id", id),
    // Shared, cache()'d — docs/performance.md §5. refreshAdmissionOutlook below used to
    // independently re-fetch this same table (a narrower column list) for this same
    // university; now shares this call too.
    getUniversityStatistics(id),
    supabase.from("university_sources").select("*").eq("university_id", id).order("retrieved_at", { ascending: false }),
    supabase.from("target_universities").select("*").eq("university_id", id).eq("user_id", session.userId!).maybeSingle(),
    // Shared, cache()'d — docs/performance.md §2/§5. Also closes one of that section's own
    // findings: refreshAdmissionOutlook below used to independently re-fetch this same
    // table for this same student; now it shares this call too (see that function).
    getProfileScores(session.userId!),
    supabase
      .from("university_rankings")
      .select("ranking_provider, ranking_edition, rank_display, source_url, verified_at, data_quality_flag")
      .eq("university_id", id)
      .order("ranking_provider"),
    supabase
      .from("university_profile_metrics")
      .select("metric_code, value_numeric, value_text, unit, source_url, source_type, verified_at, precision_state, data_quality_flag")
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

  // The refresh returns what it computed, including WHY the reach/competitive/likely scale
  // was withheld when it was. `target_universities` persists only the label, and
  // "not_applicable" covers reasons that need opposite sentences — a credential-gated system
  // versus a degree that doesn't exist at undergraduate level here. See OutlookBadge.
  const outlook = targetRes.data ? await refreshAdmissionOutlook(targetRes.data.id, session.userId!, locale) : null;

  // A row a research pass has since confirmed closed (verified_historical) or unresolved
  // (conflicting) is real, correctly-sourced data worth keeping in the table — never worth
  // showing as though it still applies. Mirrors actionableDeadlines below, same reasoning.
  const requirements = allRequirements.filter((r) => !NON_ACTIONABLE_REQUIREMENT_VERIFICATION_STATES.has(r.verification_state));
  // Only rows explicitly tagged calendar_bound_fact_class — NOT every verified_historical
  // row. The other historical rows for this university (an ordinary stale fact, not a
  // calendar-bound one) stay excluded from `requirements` above and are not shown here
  // either; this list and that filter are deliberately disjoint, not a broader "show all
  // historical facts" toggle.
  const calendarBoundFacts = allRequirements
    .filter((r) => r.calendar_bound_fact_class === "cao_points_ie")
    .map((r) => toCalendarBoundFactDisplay(r, CAO_POINTS_IE, new Date(), locale));
  if (requirements.length > 0) {
    await refreshRequirementEvaluations(university.id, session.userId!, targetRes.data?.program_id ?? null, locale);
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

  // VERIFIED_HISTORICAL (and the other non-actionable states) are real, correctly-sourced
  // rows for a cycle that has already closed — the shared read-path rule from
  // lib/deadlines/upcoming.ts, reused rather than re-derived so this page can't quietly
  // drift from what "Due soon" already treats as actionable.
  const actionableDeadlines = (deadlinesRes.data ?? []).filter((d) => !NON_ACTIONABLE_VERIFICATION_STATES.has(d.verification_state));
  // SEV-1 fix (docs/research/verification/requirements-deadlines-audit-2026-08-22.md):
  // verification_state alone was trusted to mean "actionable" — it doesn't cover a date that
  // has simply passed since a row was last verified. isDatedDeadlineUpcoming applies the same
  // `>= today` rule lib/deadlines/upcoming.ts already does for the identical reason.
  const today = new Date().toISOString().slice(0, 10);
  const datedDeadlines = actionableDeadlines
    .filter((d) => isDatedDeadlineUpcoming(d, today))
    .sort((a, b) => a.deadline_date!.localeCompare(b.deadline_date!));
  // "recurring_annual_undated" rows carry a month/day, never a year — migration 0056's own
  // shape constraint guarantees deadline_date is null here. recurrence_month/day flow straight
  // into formatRecurringDate below, which never touches a Date object, so there is no path for
  // a missing year to turn into 1970 or today's year.
  const recurringDeadlines = actionableDeadlines
    .filter((d) => d.recurrence === "recurring_annual_undated" && d.recurrence_month != null && d.recurrence_day != null)
    .sort((a, b) => a.recurrence_month! - b.recurrence_month! || a.recurrence_day! - b.recurrence_day!);

  const dimensionScores: DimensionScoreInput[] = scores.map((s) => ({
    dimension: s.dimension,
    score: s.score,
    confidence: s.confidence,
  }));
  // Gate 1's resolved shape drives the explanation, not just the badge. Without it this panel
  // contradicts itself: a badge reading "Not a profile-review system" sitting directly above a
  // list of profile strengths, profile gaps, and essay/recommendation "unknowns" for a
  // mechanism (YKS, CAO, a Dutch open programme) that reads none of them.
  //
  // admissionRateKnown from `stats` (already fetched above for the StatCards) rather than
  // from `outlook`/`targetRes` — this is the one true source for "does university_statistics
  // have a row for this institution," and it's already in scope with no extra query.
  const explanation = explainOutlook(dimensionScores, outlook?.admissionSystemShape, stats?.admission_rate != null, locale);

  // Fresh-computation-wins, consistently: the badge already used `outlook` over the row for
  // staleness reasons, and the range and the reason have to agree with the badge or the panel
  // contradicts itself. Falls back to the persisted row only when this render didn't recompute
  // (no target => no refresh ran).
  const outlookEstimate =
    outlook !== null
      ? outlook.estimateRangeLow !== null && outlook.estimateRangeHigh !== null
        ? { low: outlook.estimateRangeLow, high: outlook.estimateRangeHigh, confidence: outlook.estimateConfidence }
        : null
      : targetRes.data?.estimate_range_low != null && targetRes.data.estimate_range_high != null
        ? {
            low: Math.round(targetRes.data.estimate_range_low * 100),
            high: Math.round(targetRes.data.estimate_range_high * 100),
            confidence: targetRes.data.outlook_confidence,
          }
        : null;
  const notApplicableReason = outlook?.notApplicableReason ?? null;
  // Only for the branch that currently renders a real reach/competitive/likely badge:
  // `notApplicableReason` above already concatenates this same sentence for the
  // not_applicable branch (outlook.ts's own mechanism + reason join), so repeating it here
  // too would show the identical sentence twice on that branch. `resolveAdmissionSystem`
  // computes this on every branch regardless — the entries researched under
  // docs/research/admissions-systems/ (Greece's four-subject weighting, Denmark's two
  // tracks, and the rest) were reaching every OTHER branch's calculation and then being
  // discarded before render (docs/research/admissions-systems/implementation-gap/
  // surfacing-audit-2026-09-03.md).
  const admissionSystemMechanism = notApplicableReason ? null : (outlook?.admissionSystemMechanism ?? null);
  const admissionSystemSources = notApplicableReason ? [] : (outlook?.sources ?? []);
  // The mechanism's own unknown ("where this cycle's cutoff lands") is worth showing for a real
  // admission that simply doesn't read profiles. It is not worth showing when the finding is
  // that the degree doesn't exist at this level — there is no cycle and no cutoff to wonder
  // about, and `field_not_offered_at_undergraduate` can co-occur with any shape.
  const showMechanismUnknowns =
    explanation.profileNotAnInput &&
    outlook?.notApplicableKind !== "field_not_offered_at_undergraduate" &&
    explanation.unknowns.length > 0;
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
  const qsSizeLabel = qsSizeCode ? (qsSizeCode in QS_SIZE_LABEL_KEYS ? tQsSize(QS_SIZE_LABEL_KEYS[qsSizeCode] as never) : qsSizeCode) : null;

  const imageMetric = metricByCode.get("primary_image_url");
  const imageLicenseMetric = metricByCode.get("primary_image_license");
  const imageAttributionMetric = metricByCode.get("primary_image_attribution");
  const imageCaptionParts = [imageAttributionMetric?.value_text, imageLicenseMetric?.value_text].filter((v): v is string => Boolean(v));

  // docs/handoffs/university-data-depth-honesty-2026-09-02.md: every section below is
  // independently conditional on its own table having rows, so a university with none of
  // the four just skipped straight from the header to a stat grid reading "Unavailable"
  // four times over -- indistinguishable from an ordinary university missing one or two
  // unpublished figures. This notice is the difference between those two cases.
  const lacksDepth = lacksResearchDepth({
    hasStatistics: stats !== null,
    programCount: programsRes.data?.length ?? 0,
    requirementCount: allRequirements.length,
    sourceCount: sourcesRes.data?.length ?? 0,
  });

  return (
    // Same dark "isFull"-screen treatment as the Explorer (app/(app)/universities/page.tsx)
    // — source's UniversityDetailScreen is dark too, and this page's whole component tree
    // is confirmed token-based (zero hardcoded hex across this file and its five imported
    // components), so `.dark` resolves it correctly the same way.
    <div
      className="dark space-y-8 rounded-[28px] p-4 text-foreground md:p-8"
      style={heroGradientStyle(profile ? resolvePlanTier(profile) : "standard")}
    >
      {imageMetric?.value_text ? (
        <DetailHeroImage
          src={imageMetric.value_text}
          alt={t("mainCampusAlt", { name: university.name })}
          caption={
            imageCaptionParts.length > 0 || imageMetric.source_url ? (
              <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                {imageCaptionParts.length > 0 ? <span>{imageCaptionParts.join(" · ")}</span> : null}
                {imageMetric.source_url ? (
                  <a href={imageMetric.source_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {imageCaptionParts.length > 0 ? `· ${t("sourceLink")}` : t("sourceLink")}
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
        action={<SaveUniversityButton universityId={university.id} universityName={university.name} targetId={targetRes.data?.id ?? null} status={targetRes.data?.status ?? null} />}
      />

      {university.institution_type ? (
        <span className="w-fit rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{university.institution_type}</span>
      ) : null}

      {university.description ? <p className="max-w-3xl text-muted-foreground">{university.description}</p> : null}

      {/* Phase 43/36/37/71: a page with no facts has nothing for SourceBadge to badge, so
          per-fact provenance doesn't cover this case. Absence of Oryn's data is not absence
          of the institution -- this only says Oryn hasn't researched it deeply, same
          restrained, non-alarming register as lib/scoring/signal.ts's not_assessed state
          ("Oryn is not making a judgement, because it cannot"), reused here for an
          institution rather than a student. No action prop: there is no student action to
          offer for a gap that's Oryn's to close, not theirs. */}
      {lacksDepth ? <EmptyState icon={FileSearch} title={t("notResearchedTitle")} description={t("notResearchedDescription")} /> : null}

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

      {/* UI-V3 § 26: the student's positioning comes before the institution's own
          statistics. This block was previously below the stat grid, rankings and
          description, so a page about whether *you* could go here opened with student
          counts. Same computation, same freshness comments — only its position moved. */}
      {targetRes.data ? (
        <section className="space-y-4 rounded-2xl border border-brand-primary-border bg-brand-primary-subtle p-6">
          {/* flex-wrap + gap: OutlookBadge (via StatusBadge) is whitespace-nowrap by
              design, and its longer labels ("Not an undergraduate degree here", "Not a
              profile-review system" — real, reachable not_applicable states) plus this
              row's own no-wrap could exceed the panel width at 320-375px with neither side
              able to shrink. Wraps to its own line instead of clipping under
              `<main>`'s overflow-x-hidden. */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 lang={locale} className="text-lg font-medium">
              {locale === "tr" ? "Kabul görünümün" : "Your outlook"}
            </h2>
            {/* The freshly computed label, not the row's — `targetRes.data` was read before
                the refresh above wrote to it, so the persisted value here is one render
                stale, and pairing a stale label with a fresh reason could show the reason
                for a classification that is no longer the one displayed. */}
            <OutlookBadge outlook={outlook?.outlook ?? targetRes.data.outlook} notApplicableKind={outlook?.notApplicableKind} locale={locale} />
          </div>
          {/* The freshly computed range, for the same reason as the badge above: `targetRes.data`
              was read before the refresh wrote to it, so pairing a stale range with a fresh
              label can print "Oryn estimate: 15-25%" directly under "Not rated on this scale" —
              exactly the false precision non-negotiable #5 forbids. `computeAdmissionOutlook`
              returns whole percentage points; the persisted columns store 0-1. */}
          {outlookEstimate ? (
            <p lang={locale} className="text-sm text-muted-foreground">
              {locale === "tr" ? "Oryn tahmini:" : "Oryn estimate:"}{" "}
              <span className="font-medium text-foreground">
                {outlookEstimate.low}–{outlookEstimate.high}%
              </span>{" "}
              {locale === "tr"
                ? `(${outlookEstimate.confidence ? CONFIDENCE_LABEL_TR[outlookEstimate.confidence] : ""} güven). Bu bir garanti veya resmi bir üniversite olasılığı değildir.`
                : `(${outlookEstimate.confidence} confidence). This is not a guarantee or an official university probability.`}
            </p>
          ) : null}
          {/* Phase 16.2's explanation is mandatory, and for a target Oryn declined to rate, the
              explanation IS the reason — the sourced mechanism sentence, not a strengths/gaps
              grid describing a review step this system doesn't have. Before this, the reason was
              computed in full and dropped on the floor. */}
          {notApplicableReason ? (
            <p lang={locale} className="max-w-3xl text-sm text-muted-foreground">
              {notApplicableReason}
            </p>
          ) : null}
          {notApplicableReason ? (
            showMechanismUnknowns ? (
              <div lang={locale} className="text-sm">
                <p className="font-medium text-muted-foreground">{locale === "tr" ? "Bilinmeyenler" : "Unknowns"}</p>
                <ul className="mt-1 space-y-0.5 text-muted-foreground">
                  {explanation.unknowns.map((u) => (
                    <li key={u}>? {u}</li>
                  ))}
                </ul>
              </div>
            ) : null
          ) : (
            <>
              {/* Same sourced-mechanism sentence the not_applicable branch above already
                  shows (concatenated into notApplicableReason there) — this is the branch
                  that was computing it and discarding it before render. Same register: a
                  plain muted paragraph, not folded into the strengths/gaps/unknowns grid,
                  since it describes the admissions MECHANISM, not this student's profile. */}
              {admissionSystemMechanism ? (
                <p lang={locale} className="max-w-3xl text-sm text-muted-foreground">
                  {admissionSystemMechanism}
                </p>
              ) : null}
              {admissionSystemSources.length > 0 ? (
                <SourceBadge
                  sourceName={locale === "tr" ? "Oryn'ın kabul sistemi araştırması" : "Oryn's admissions-system research"}
                  locale={locale}
                  sourceLabel={tSourceBadge("source")}
                  checkedLabel={(time) => tSourceBadge("checked", { time })}
                  viewSourceLabel={tSourceBadge("viewSource")}
                />
              ) : null}
              <div lang={locale} className="grid gap-4 text-sm sm:grid-cols-3">
                <div>
                  <p className="font-medium text-success">{locale === "tr" ? "Güçlü Yönler" : "Strengths"}</p>
                  <ul className="mt-1 space-y-0.5 text-muted-foreground">
                    {explanation.strengths.length > 0 ? (
                      explanation.strengths.map((s) => <li key={s}>+ {s}</li>)
                    ) : (
                      <li>
                        {locale === "tr"
                          ? explanation.insufficientData
                            ? "Bu konuda henüz yeterince bilgimiz yok."
                            : "Bunu görmek için profiline daha fazla bilgi ekle."
                          : explanation.insufficientData
                            ? "We don't know enough about this yet."
                            : "Add more profile data to see this."}
                      </li>
                    )}
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-warning">{locale === "tr" ? "Boşluklar" : "Gaps"}</p>
                  <ul className="mt-1 space-y-0.5 text-muted-foreground">
                    {explanation.gaps.length > 0 ? (
                      explanation.gaps.map((g) => <li key={g}>− {g}</li>)
                    ) : (
                      <li>
                        {locale === "tr"
                          ? explanation.insufficientData
                            ? "Bu konuda henüz yeterince bilgimiz yok."
                            : "Henüz belirgin bir şey yok."
                          : explanation.insufficientData
                            ? "We don't know enough about this yet."
                            : "None obvious yet."}
                      </li>
                    )}
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">{locale === "tr" ? "Bilinmeyenler" : "Unknowns"}</p>
                  <ul className="mt-1 space-y-0.5 text-muted-foreground">
                    {explanation.unknowns.map((u) => (
                      <li key={u}>? {u}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}
        </section>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Users}
          label={t("studentSize")}
          value={university.student_size ? formatNumber(university.student_size) : (qsSizeLabel ?? t("unavailable"))}
          caption={
            university.student_size && undergradCount != null && postgradCount != null
              ? t("undergradPostgradCaption", { undergrad: formatNumber(undergradCount), postgrad: formatNumber(postgradCount) })
              : !university.student_size && qsSizeLabel
                ? t("qsSizeBandCaption")
                : undefined
          }
        />
        <StatCard icon={GraduationCap} label={t("admissionRate")} value={stats?.admission_rate != null ? `${Math.round(stats.admission_rate * 100)}%` : t("unavailable")} />
        {/* These read two genuinely different concepts — US `cost_of_attendance` (an IPEDS
            all-in sticker-price estimate) vs a UK-and-onward `tuition_international_annual`
            (tuition only, official-university-page-sourced, often a range) — and are never
            shown under the same label, per the founder's explicit "never collapse different
            cost concepts" rule. Only one of the two is ever populated for a given university
            today (US vs non-US acquisition pipelines don't overlap), so at most one StatCard
            renders real data; if that ever changes, this still can't silently blend them. */}
        {stats?.cost_of_attendance ? (
          <StatCard icon={DollarSign} label={t("costOfAttendance")} value={formatCurrency(stats.cost_of_attendance)} />
        ) : internationalTuition != null ? (
          (() => {
            // Each figure's own precision_state governs its own prefix — international being
            // a range (or income-based) does not mean domestic is too, and vice versa. A prior
            // version of this block reused international's qualifier for both figures, which
            // silently mislabelled a UK domestic exact figure ("£9,790/yr") as "From £9,790/yr"
            // whenever the international side happened to be a range — caught live 2026-08-18
            // re-verifying Edinburgh right after adding the Italy upper_bound case.
            const q = tuitionQualifier(internationalTuitionMetric!.precision_state, locale);
            const domesticQ = domesticTuitionMetric ? tuitionQualifier(domesticTuitionMetric.precision_state, locale) : null;
            return (
              <StatCard
                icon={DollarSign}
                label={t("internationalTuition")}
                value={`${q.valuePrefix}${formatTuition(internationalTuition, internationalTuitionMetric!.unit, locale)}`}
                caption={
                  domesticTuition != null
                    ? `${q.note}${t("domesticRateCaption", { rate: `${domesticQ!.valuePrefix}${formatTuition(domesticTuition, domesticTuitionMetric!.unit, locale)}` })}`
                    : q.note
                      ? `${q.note}${t("seeUniversityForExactFee")}`
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
            const q = tuitionQualifier(domesticTuitionMetric!.precision_state, locale);
            return (
              <StatCard
                icon={DollarSign}
                label={t("domesticTuition")}
                value={`${q.valuePrefix}${formatTuition(domesticTuition, domesticTuitionMetric!.unit, locale)}`}
                caption={q.note ? `${q.note}${t("internationalFeeNotSeparate")}` : t("internationalFeeNotPublished")}
              />
            );
          })()
        ) : (
          <StatCard icon={DollarSign} label={t("costOfAttendance")} value={t("unavailable")} />
        )}
        <StatCard icon={Target} label={t("testScores")} value={testScoreRangeLabel(stats, t)} />
        <StatCard icon={TrendingUp} label={t("graduationRate")} value={stats?.graduation_rate != null ? `${Math.round(stats.graduation_rate * 100)}%` : t("unavailable")} />
      </div>

      {/* Phase 36/71: admission rate, test scores, and graduation rate above all come from
          this one `university_statistics` row, and every row on file already carries a
          real `source`/`data_confidence` (confirmed live: 129/129 do) — this badge was the
          missing wire, not missing data. Placed once for the whole stat grid rather than
          once per card: they share one row, so repeating it per card would imply four
          independent sources instead of one. Deliberately separate from "Your outlook"
          above (which already carries its own "not a guarantee" disclaimer) — this badge's
          job is only to say where the raw institutional number came from, not to reinterpret
          the personalized estimate. */}
      {stats?.source ? (
        <SourceBadge
          sourceName={stats.source}
          checkedAt={stats.updated_at}
          confidence={stats.data_confidence ?? undefined}
          locale={locale}
          sourceLabel={tSourceBadge("source")}
          checkedLabel={(time) => tSourceBadge("checked", { time })}
          viewSourceLabel={tSourceBadge("viewSource")}
        />
      ) : null}

      {programsRes.data && programsRes.data.length > 0 ? (
        <section className="space-y-5">
          <SectionHeader title={t("programsTitle")} description={t("programsDescription")} />
          {groupProgramsBySubject(programsRes.data, locale).map(([subject, programs]) => (
            <div key={subject} className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">{subject}</h3>
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
                          aria-label={t("officialPageAriaLabel", { name: program.name })}
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
          <SectionHeader title={t("researchStrengthsTitle")} description={t("researchStrengthsDescription")} />
          <div className="flex flex-wrap gap-2">
            {researchTopics.map((topic) => (
              <span key={topic} className="rounded-full border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
                {topic}
              </span>
            ))}
          </div>
          {researchTopicsMetric?.source_url ? (
            <SourceBadge
              sourceName="OpenAlex"
              checkedAt={researchTopicsMetric.verified_at}
              url={researchTopicsMetric.source_url}
              locale={locale}
              sourceLabel={tSourceBadge("source")}
              checkedLabel={(time) => tSourceBadge("checked", { time })}
              viewSourceLabel={tSourceBadge("viewSource")}
            />
          ) : null}
        </section>
      ) : null}

      {/* Was `{requirements.length > 0 ? <section>...</section> : null}` — for 89% of
          universities (measured 2026-09-03) this section simply didn't exist, no
          different from having scrolled past where it would be. The outlook section
          above already tells a student when Oryn can't rate a target
          (`notApplicableReason`); this section told them nothing. Same fix, same
          register: the section always renders, and an empty result says so rather
          than disappearing. Deliberately NOT `lacksResearchDepth`'s EmptyState
          (lib/universities/data-depth.ts) — that fires only when stats, programs,
          requirements AND sources are ALL empty, so it misses the common case of a
          university with programs but zero requirements specifically. */}
      <section className="space-y-4">
        <SectionHeader title={t("requirementCheckTitle")} description={t("requirementCheckDescription")} />
        {requirements.length > 0 ? (
          <>
            {universityWideRequirements.length > 0 ? (
              <RequirementGroup
                title={locale === "tr" ? "Program kaydedilmemiş" : "Program not recorded"}
                description={
                  locale === "tr"
                    ? "Üniversitenin kendi sayfalarından alındı — Oryn bunların her birinin hangi programa ait olduğunu kaydetmedi."
                    : "Sourced from the university's own pages — Oryn hasn't recorded which specific program each of these belongs to."
                }
                items={universityWideRequirements}
                evaluationByRequirement={evaluationByRequirement}
                locale={locale}
                t={t}
              />
            ) : null}
            {[...requirementsByProgram.entries()].map(([programId, items]) => (
              <RequirementGroup
                key={programId}
                title={programNameById.get(programId) ?? t("programFallback")}
                items={items}
                evaluationByRequirement={evaluationByRequirement}
                locale={locale}
                t={t}
              />
            ))}
          </>
        ) : (
          <p lang={locale} className="max-w-3xl text-sm text-muted-foreground">
            {t("requirementCheckEmptyMessage")}
          </p>
        )}
      </section>

      {calendarBoundFacts.length > 0 ? (
        <section className="space-y-4">
          <CalendarBoundFactList title={t("recentAdmissionsData")} items={calendarBoundFacts} />
        </section>
      ) : null}

      {datedDeadlines.length > 0 || recurringDeadlines.length > 0 ? (
        <section className="space-y-4">
          <SectionHeader title={t("importantDatesTitle")} description={t("importantDatesDescription")} />
          {datedDeadlines.length > 0 ? (
            <DeadlineGroup title={t("upcoming")} kind="dated" items={datedDeadlines} programNameById={programNameById} locale={locale} t={t} tBindingPolicy={tBindingPolicy} />
          ) : null}
          {recurringDeadlines.length > 0 ? (
            <DeadlineGroup title={t("recurringTitle")} kind="recurring" items={recurringDeadlines} programNameById={programNameById} locale={locale} t={t} tBindingPolicy={tBindingPolicy} />
          ) : null}
        </section>
      ) : null}

      {profile?.is_admin ? <AdminRequirementForm universityId={university.id} programs={programsRes.data ?? []} /> : null}

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

      {sourcesRes.data && sourcesRes.data.length > 0 ? (
        <section className="space-y-2">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase" lang={locale}>{t("sourcesHeading")}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {sourcesRes.data.map((source) => (
              <SourceBadge
                key={source.id}
                sourceName={source.source_domain ?? source.source_url ?? t("unknownSource")}
                checkedAt={source.retrieved_at}
                url={source.source_url}
                locale={locale}
                sourceLabel={tSourceBadge("source")}
                checkedLabel={(time) => tSourceBadge("checked", { time })}
                viewSourceLabel={tSourceBadge("viewSource")}
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
function groupProgramsBySubject(programs: UniversityProgram[], locale: Locale): [string, UniversityProgram[]][] {
  const bySubject = new Map<string, UniversityProgram[]>();
  for (const program of programs) {
    const label = subjectLabel(program.subject_taxonomy ?? "other", locale);
    bySubject.set(label, [...(bySubject.get(label) ?? []), program]);
  }
  const otherLabel = subjectLabel("other", locale);
  return [...bySubject.entries()]
    .map(([label, items]): [string, UniversityProgram[]] => [label, [...items].sort((a, b) => a.name.localeCompare(b.name))])
    .sort(([labelA, itemsA], [labelB, itemsB]) => {
      if (labelA === otherLabel) return 1;
      if (labelB === otherLabel) return -1;
      return itemsB.length - itemsA.length;
    });
}

/** SAT preferred over ACT when both are on file — no ranking claim, just a stable pick so
 * the card doesn't flip between the two across universities that report both. SAT/ACT are
 * the tests' own real names, not translated; only the "Unavailable" fallback needs `t`. */
function testScoreRangeLabel(
  stats: { sat_range_low: number | null; sat_range_high: number | null; act_range_low: number | null; act_range_high: number | null } | null | undefined,
  t: Translator
): string {
  if (stats?.sat_range_low != null && stats?.sat_range_high != null) return `SAT ${stats.sat_range_low}–${stats.sat_range_high}`;
  if (stats?.act_range_low != null && stats?.act_range_high != null) return `ACT ${stats.act_range_low}–${stats.act_range_high}`;
  return t("unavailable");
}

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

/** "15 January, annually" / "Her yıl 15 Ocak" — never a year. `formatAbsoluteDate` is given a
 * synthetic, fixed-year UTC date (year 2000 is arbitrary — only its month/day are read) so
 * there is no real Date object for a missing year to be silently coerced into (1970, the
 * current year, etc); Intl's own month/day ordering per locale replaces the old hand-rolled
 * MONTH_NAMES array. */
function formatRecurringDate(month: number, day: number, locale: Locale, t: Translator): string {
  const date = formatAbsoluteDate(new Date(Date.UTC(2000, month - 1, day)), locale, { month: "long", day: "numeric", timeZone: "UTC" });
  return t("recurringAnnually", { date });
}

/** deadline_date is a real, cycle-specific date here — appending a local midnight time avoids
 * new Date("YYYY-MM-DD") parsing as UTC and displaying a day early in negative-UTC timezones. */
function formatDeadlineDate(dateString: string, locale: Locale): string {
  return formatAbsoluteDate(new Date(`${dateString}T00:00:00`), locale);
}

function humanizeDeadlineType(type: string): string {
  const spaced = type.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

type DeadlineRow = Pick<
  UniversityDeadline,
  "id" | "program_id" | "deadline_type" | "deadline_date" | "recurrence" | "recurrence_month" | "recurrence_day" | "cycle_label" | "deadline_text_verbatim" | "source_url" | "binding_policy"
>;

function DeadlineGroup({
  title,
  kind,
  items,
  programNameById,
  locale,
  t,
  tBindingPolicy,
}: {
  title: string;
  kind: "dated" | "recurring";
  items: DeadlineRow[];
  programNameById: Map<string, string>;
  locale: Locale;
  t: Translator;
  tBindingPolicy: Translator;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <ul className="divide-y rounded-lg border">
        {items.map((d) => (
          <li key={d.id} className="space-y-1 px-4 py-2.5 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-medium">{humanizeDeadlineType(d.deadline_type)}</span>
                {d.program_id ? <span className="ml-2 text-xs text-muted-foreground">{programNameById.get(d.program_id) ?? t("programSpecific")}</span> : null}
                {d.cycle_label ? <span className="ml-2 text-xs text-muted-foreground">· {d.cycle_label}</span> : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {d.binding_policy ? (
                  <StatusBadge
                    label={d.binding_policy in BINDING_POLICY_LABEL_KEYS ? tBindingPolicy(BINDING_POLICY_LABEL_KEYS[d.binding_policy] as never) : d.binding_policy}
                    tone="neutral"
                  />
                ) : null}
                {kind === "dated" ? <DeadlineBadge date={d.deadline_date!} locale={locale} /> : <StatusBadge label={t("recurringBadge")} tone="neutral" />}
              </div>
            </div>
            <p className="text-muted-foreground">
              {kind === "dated" ? formatDeadlineDate(d.deadline_date!, locale) : formatRecurringDate(d.recurrence_month!, d.recurrence_day!, locale, t)}
            </p>
            {d.deadline_text_verbatim ? <p className="text-xs text-muted-foreground italic">&ldquo;{d.deadline_text_verbatim}&rdquo;</p> : null}
            {d.source_url ? (
              <a href={d.source_url} target="_blank" rel="noopener noreferrer" className="inline-block text-xs text-primary hover:underline">
                {t("sourceLink")}
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
