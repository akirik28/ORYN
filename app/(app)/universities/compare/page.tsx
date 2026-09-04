import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, ExternalLink, Lock, Scale } from "lucide-react";
import { requireProfile } from "@/lib/security/dal";
import { resolvePlanTier } from "@/lib/tier/plan-tier";
import { resolveComparisonWidthCeiling, isComparisonQuotaExhausted } from "@/lib/comparison/limits";
import { getMonthlyComparisonUsage, logComparisonViewed } from "@/lib/comparison/usage";
import { heroGradientStyle } from "@/components/proxola/hero-gradient";
import { createClient } from "@/lib/supabase/server";
import { resolveLocale } from "@/lib/i18n/locale";
import { canonicalUniversityId, loadSupersessionMap } from "@/lib/universities/canonical";
import { deriveTuitionContext } from "@/lib/universities/counseling-adapter";
import { lacksApplicationDeadline, lacksCoreAdmissionStats, soonestApplicationDeadline } from "@/lib/universities/data-depth";
import { categorizeAndDedupeResearchTopics } from "@/lib/universities/research-taxonomy";
import { formatAbsoluteDate } from "@/lib/i18n/date";
import { PageHeader } from "@/components/proxola/page-header";
import { EmptyState } from "@/components/proxola/empty-state";
import { SourceBadge } from "@/components/proxola/source-badge";
import { Button } from "@/components/ui/button";
import type { University } from "@/types/database";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("universities.comparePage");
  return { title: t("pageTitle") };
}

const NA = <span className="text-muted-foreground">—</span>;

/**
 * Minimal, real comparison view (P0H) — a plain table, not a new design system. Every cell
 * that has no verified data reads "—", never a guessed or averaged figure.
 *
 * Cost of attendance and tuition are separate rows, never merged (2026-09-03) — they are
 * different concepts (US all-in sticker price vs. tuition-only) and the founder's own rule
 * is not to collapse them. Cost of attendance stays US-only (127/131 US universities);
 * tuition now reads `university_profile_metrics` (173 non-US universities, domestic and
 * international) rather than showing "—" for every one of them, the same fix applied to the
 * browse card the same night — see that card's own comment for the stale-premise history.
 *
 * Tier-gated (2026-09-02, founder directive relayed through oryn-a7): Standard is capped at
 * `widthCeiling` items (2) and a shared 5-comparisons/month allowance with opportunities;
 * Ultra is unchanged from before this pass. See lib/comparison/limits.ts's own header for
 * the full design — width is enforced by the `.slice(0, widthCeiling)` below regardless of
 * what the client-side picker already stopped the student from selecting, and frequency by
 * the check right before the real table renders, which is also where logComparisonViewed
 * fires. Same three-layer discipline features/advisor/response-mode-slider.tsx established:
 * the picker shouldn't offer it, the render path re-checks server-side, and re-checks again
 * at the exact point the differentiated behavior would happen — "even called directly."
 */
export default async function CompareUniversitiesPage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const { ids: idsParam } = await searchParams;
  const profile = await requireProfile();
  const userId = profile.id;
  const planTier = resolvePlanTier(profile);
  const widthCeiling = resolveComparisonWidthCeiling(planTier);
  const supabase = await createClient();
  const supersessionMap = await loadSupersessionMap(supabase);
  const locale = await resolveLocale();
  const t = await getTranslations("universities.comparePage");
  const tSourceBadge = await getTranslations("sourceBadge");

  const requestedIds = [...new Set((idsParam ?? "").split(",").map((id) => canonicalUniversityId(supersessionMap, id.trim())).filter(Boolean))].slice(0, widthCeiling);

  if (requestedIds.length < 2) {
    return (
      <div className="space-y-8">
        <PageHeader title={t("title")} description={t("description", { max: widthCeiling })} />
        <EmptyState icon={Scale} title={t("nothingYetTitle")} description={t("nothingYetDescription")} />
        <Link href="/universities" className="inline-flex items-center gap-1.5 text-sm text-brand-primary hover:underline">
          <ArrowLeft className="size-3.5" /> {t("backToExplorer")}
        </Link>
      </div>
    );
  }

  const [{ data: universities }, { data: stats }, { data: rankings }, { data: metrics }, { data: deadlines }] = await Promise.all([
    supabase.from("universities").select("*").in("id", requestedIds),
    supabase.from("university_statistics").select("*").in("university_id", requestedIds),
    supabase.from("university_rankings").select("university_id, rank_display").eq("ranking_provider", "QS").in("university_id", requestedIds),
    supabase
      .from("university_profile_metrics")
      .select("university_id, metric_code, value_text, value_numeric, unit, precision_state, source_url, verified_at")
      .in("university_id", requestedIds)
      .in("metric_code", ["research_topics_top5", "tuition_domestic_annual", "tuition_international_annual"]),
    supabase
      .from("university_deadlines")
      .select("university_id, deadline_type, deadline_date, recurrence, verification_state, recurrence_month, recurrence_day")
      .in("university_id", requestedIds),
  ]);

  // Preserve the order the student picked them in (requestedIds), not whatever order the DB
  // happens to return — a comparison table reordering itself under you is disorienting.
  const byId = new Map((universities ?? []).map((u) => [u.id, u]));
  const ordered = requestedIds.map((id) => byId.get(id)).filter((u): u is University => u != null);

  if (ordered.length < 2) {
    return (
      <div
        className="dark space-y-8 rounded-[28px] p-4 text-foreground md:p-8"
        style={heroGradientStyle(planTier)}
      >
        <PageHeader title={t("title")} description={t("description", { max: widthCeiling })} />
        <EmptyState icon={Scale} title={t("notEnoughTitle")} description={t("notEnoughDescription")} />
        <Link href="/universities" className="inline-flex items-center gap-1.5 text-sm text-brand-primary hover:underline">
          <ArrowLeft className="size-3.5" /> {t("backToExplorer")}
        </Link>
      </div>
    );
  }

  if (planTier !== "ultra") {
    const usage = await getMonthlyComparisonUsage(userId);
    if (isComparisonQuotaExhausted(planTier, usage)) {
      return (
        <div
          className="dark space-y-8 rounded-[28px] p-4 text-foreground md:p-8"
          style={heroGradientStyle(planTier)}
        >
          <PageHeader title={t("title")} description={t("description", { max: widthCeiling })} />
          <EmptyState
            icon={Lock}
            title={t("limitReachedTitle")}
            description={t("limitReachedDescription", { limit: usage.limit })}
            action={
              <Button size="sm" render={<Link href="/settings/plan" />} nativeButton={false}>
                {t("limitReachedCta")}
              </Button>
            }
          />
          <Link href="/universities" className="inline-flex items-center gap-1.5 text-sm text-brand-primary hover:underline">
            <ArrowLeft className="size-3.5" /> {t("backToExplorer")}
          </Link>
        </div>
      );
    }
  }
  await logComparisonViewed(
    userId,
    "university",
    ordered.map((u) => u.id)
  );

  const statsByUniId = new Map((stats ?? []).map((s) => [s.university_id, s]));
  const rankByUniId = new Map((rankings ?? []).map((r) => [r.university_id, r.rank_display]));
  const deadlineRowsByUniId = new Map<string, NonNullable<typeof deadlines>>();
  for (const d of deadlines ?? []) {
    deadlineRowsByUniId.set(d.university_id, [...(deadlineRowsByUniId.get(d.university_id) ?? []), d]);
  }
  const today = new Date();
  // CEO, 2026-09-04, from the display-honesty measurement (docs/research-topics-display-
  // honesty-2026-09-04.md): raw OpenAlex phrases, uncategorized, is the same self-
  // contradiction shape as the SourceBadge fix above -- most sharply here, since this is the
  // premium, paid feature. Same taxonomy the card already uses (categorizeAndDedupeResearchTopics),
  // same max=3 default (this row shares a narrow column with 2-4 other universities' cells, the
  // card's own space constraint, not the detail page's -- that page passes 5).
  //
  // Three distinct states per university, not two -- no row at all (unchanged NA, matches
  // every other row) is a different fact from a real row where nothing categorizes (a new,
  // explicit "couldn't classify" message, never NA -- a bare "--" here would read exactly like
  // "no data," the same silent-blank problem this whole pass exists to fix). The render below
  // picks between them using hasRawTopics, not categories.length alone.
  const topicRows = (metrics ?? []).filter((m) => m.metric_code === "research_topics_top5");
  const topicsByUniId = new Map(
    topicRows.map((m) => {
      const rawTopics = m.value_text?.split(" | ").filter(Boolean) ?? [];
      return [
        m.university_id,
        { categories: categorizeAndDedupeResearchTopics(rawTopics), hasRawTopics: rawTopics.length > 0, sourceUrl: m.source_url, verifiedAt: m.verified_at },
      ] as const;
    })
  );
  const internationalTuitionByUniId = new Map(
    (metrics ?? [])
      .filter((m) => m.metric_code === "tuition_international_annual" && m.value_numeric != null)
      .map((m) => [m.university_id, { amount: m.value_numeric!, unit: m.unit, precisionState: m.precision_state }])
  );
  const domesticTuitionByUniId = new Map(
    (metrics ?? [])
      .filter((m) => m.metric_code === "tuition_domestic_annual" && m.value_numeric != null)
      .map((m) => [m.university_id, { amount: m.value_numeric!, unit: m.unit, precisionState: m.precision_state }])
  );

  const rows: { label: string; render: (u: University) => React.ReactNode }[] = [
    { label: t("location"), render: (u) => [u.city, u.country].filter(Boolean).join(", ") || NA },
    { label: t("qsRanking"), render: (u) => (rankByUniId.get(u.id) ? `#${rankByUniId.get(u.id)}` : NA) },
    { label: t("institutionType"), render: (u) => u.institution_type ?? NA },
    { label: t("students"), render: (u) => (u.student_size != null ? u.student_size.toLocaleString("en-US") : NA) },
    {
      // CEO follow-up to C7 (2026-09-04): university_deadlines was never queried on this page
      // at all before this row — not a blank cell, an absent dimension. The type-aware gate
      // (lacksApplicationDeadline) is the exact same function the detail page's own honest
      // empty-state uses, so MIT's scholarship-only row reads the same "not confirmed" way
      // here as it does there, rather than silently implying no deadline research exists.
      // Never phrased as "no deadline" (a student could wrongly rule out a real option) and
      // always paired with a real link when one exists — same two constraints CEO set for the
      // detail page's version of this fix.
      label: t("applicationDeadline"),
      render: (u) => {
        const deadlineRows = deadlineRowsByUniId.get(u.id) ?? [];
        const officialUrl = u.admissions_url ?? u.website_url;
        if (lacksApplicationDeadline(deadlineRows.map((d) => d.deadline_type))) {
          return (
            <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>{t("applicationDeadlineNotConfirmed")}</span>
              {officialUrl ? (
                <a href={officialUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-primary hover:underline">
                  {t("visitSite")} <ExternalLink className="size-3" />
                </a>
              ) : null}
            </span>
          );
        }
        // A real application/early row exists (the gate above passed) but Yale — one of the
        // 12 real target_universities rows — has ONLY recurring_annual_undated rows for both
        // types, no dated one at all. soonestApplicationDeadline checks both branches for
        // exactly this reason — a dated-only search would silently render nothing for a
        // university the gate above just said has real data.
        const soonest = soonestApplicationDeadline(deadlineRows, today);
        if (!soonest) return NA;
        const typeLabel = soonest.deadlineType === "early" ? t("deadlineTypeEarly") : t("deadlineTypeApplication");
        return `${typeLabel}: ${formatAbsoluteDate(soonest.date, locale)}`;
      },
    },
    {
      label: t("costOfAttendance"),
      render: (u) => {
        const s = statsByUniId.get(u.id);
        if (s?.cost_of_attendance == null) return NA;
        const currency = s.cost_currency === "USD" || !s.cost_currency ? "$" : `${s.cost_currency} `;
        return t("costPerYear", { value: `${currency}${s.cost_of_attendance.toLocaleString("en-US")}` });
      },
    },
    {
      // Deliberately never fed costOfAttendance — this row exists specifically for the
      // tuition-only concept, so a US university's cost of attendance (already its own row
      // above) can't also surface here under a different label.
      label: t("tuition"),
      render: (u) => {
        const intl = internationalTuitionByUniId.get(u.id) ?? null;
        const dom = domesticTuitionByUniId.get(u.id) ?? null;
        if (!intl && !dom) return NA;
        const ctx = deriveTuitionContext({ costOfAttendance: null, internationalTuition: intl, domesticTuition: dom }, locale);
        return ctx.displayValue ?? NA;
      },
    },
    {
      label: t("admissionRate"),
      render: (u) => {
        const s = statsByUniId.get(u.id);
        return s?.admission_rate != null ? `${Math.round(s.admission_rate * 100)}%` : NA;
      },
    },
    {
      // Cost of attendance and admission rate above both come from this same
      // university_statistics row — but unlike the detail page's stat grid (one row, one
      // source, one badge for the whole grid), every COLUMN here is a different university
      // with its own row and its own recency. One badge for the whole table would imply a
      // single source/date shared by every column, which is exactly the false-precision-by-
      // juxtaposition risk this page is being fixed for: two universities' admission rates
      // pulled years apart would sit side by side with nothing marking the gap. A source row
      // — one badge per university, in its own column, the same shape every other fact in
      // this table already uses — is the placement that can't average that difference away.
      //
      // Suppressed when lacksCoreAdmissionStats fires (CEO follow-up to C7, 2026-09-04) — the
      // self-contradicting bug the detail page fixed the same day: Oxford's real `source` URL
      // rendering directly beneath admissionRate/costOfAttendance cells that both read "—".
      // Same function, same guard shape, second surface.
      label: t("statisticsSource"),
      render: (u) => {
        const s = statsByUniId.get(u.id);
        if (!s?.source) return NA;
        const missingCoreStats = lacksCoreAdmissionStats({
          admissionRate: s.admission_rate,
          satRangeLow: s.sat_range_low,
          actRangeLow: s.act_range_low,
          graduationRate: s.graduation_rate,
        });
        if (missingCoreStats) return NA;
        return (
          <SourceBadge
            sourceName={s.source}
            checkedAt={s.updated_at}
            confidence={s.data_confidence ?? undefined}
            locale={locale}
            sourceLabel={tSourceBadge("source")}
            checkedLabel={(time) => tSourceBadge("checked", { time })}
            viewSourceLabel={tSourceBadge("viewSource")}
          />
        );
      },
    },
    {
      label: t("applicationSystem"),
      render: (u) => u.application_system ?? NA,
    },
    {
      label: t("researchStrengths"),
      render: (u) => {
        const entry = topicsByUniId.get(u.id);
        if (!entry || !entry.hasRawTopics) return NA;
        if (entry.categories.length === 0) return <span>{t("researchStrengthsUnclassified")}</span>;
        return (
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap gap-1">
              {entry.categories.map((category) => (
                <span key={category} className="rounded-full border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground">
                  {category}
                </span>
              ))}
            </div>
            <SourceBadge
              sourceName="OpenAlex"
              checkedAt={entry.verifiedAt}
              url={entry.sourceUrl}
              locale={locale}
              sourceLabel={tSourceBadge("source")}
              checkedLabel={(time) => tSourceBadge("checked", { time })}
              viewSourceLabel={tSourceBadge("viewSource")}
            />
          </div>
        );
      },
    },
  ];

  return (
    // Not a source screen at all (this comparison table is real functionality beyond
    // source's scope) — dark-wrapped anyway for visual consistency with the rest of the
    // Universities section, same confirmed-token-based basis as the other two pages.
    <div
      className="dark space-y-6 rounded-[28px] p-4 text-foreground md:p-8"
      style={heroGradientStyle(planTier)}
    >
      <PageHeader title={t("title")} description={t("sideBySide", { count: ordered.length })} />
      <Link href="/universities" className="inline-flex items-center gap-1.5 text-sm text-brand-primary hover:underline">
        <ArrowLeft className="size-3.5" /> {t("backToExplorer")}
      </Link>

      <div className="glass-card overflow-x-auto rounded-2xl border border-white/65 bg-white/45 backdrop-blur-2xl">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="w-40 shrink-0 p-3 text-left font-medium text-muted-foreground">&nbsp;</th>
              {ordered.map((u) => (
                <th key={u.id} className="p-3 text-left">
                  <Link href={`/universities/${u.id}`} className="font-medium hover:underline">
                    {u.name}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b last:border-0">
                <td className="p-3 font-medium text-muted-foreground">{row.label}</td>
                {ordered.map((u) => (
                  <td key={u.id} className="p-3">
                    {row.render(u)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
