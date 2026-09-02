import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { requireUser, requireProfile } from "@/lib/security/dal";
import { resolvePlanTier } from "@/lib/tier/plan-tier";
import { heroGradientStyle } from "@/components/oryn/hero-gradient";
import { createClient } from "@/lib/supabase/server";
import { resolveLocale } from "@/lib/i18n/locale";
import { canonicalUniversityId, loadSupersessionMap } from "@/lib/universities/canonical";
import { PageHeader } from "@/components/oryn/page-header";
import { EmptyState } from "@/components/oryn/empty-state";
import { SourceBadge } from "@/components/oryn/source-badge";
import { Scale } from "lucide-react";
import { COMPARE_MAX } from "@/lib/universities/compare-constants";
import type { University } from "@/types/database";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("universities.comparePage");
  return { title: t("pageTitle") };
}

const NA = <span className="text-muted-foreground">—</span>;

/**
 * Minimal, real comparison view (P0H) — a plain table, not a new design system. Every cell
 * that has no verified data reads "—", never a guessed or averaged figure (cost_of_attendance
 * coverage is US-only today; a university outside that set legitimately has nothing to show
 * here yet, and the table says so plainly rather than leaving the cell looking broken).
 */
export default async function CompareUniversitiesPage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const { ids: idsParam } = await searchParams;
  await requireUser();
  const planTier = resolvePlanTier(await requireProfile());
  const supabase = await createClient();
  const supersessionMap = await loadSupersessionMap(supabase);
  const locale = await resolveLocale();
  const t = await getTranslations("universities.comparePage");
  const tSourceBadge = await getTranslations("sourceBadge");

  const requestedIds = [...new Set((idsParam ?? "").split(",").map((id) => canonicalUniversityId(supersessionMap, id.trim())).filter(Boolean))].slice(0, COMPARE_MAX);

  if (requestedIds.length < 2) {
    return (
      <div className="space-y-8">
        <PageHeader title={t("title")} description={t("description")} />
        <EmptyState icon={Scale} title={t("nothingYetTitle")} description={t("nothingYetDescription")} />
        <Link href="/universities" className="inline-flex items-center gap-1.5 text-sm text-brand-primary hover:underline">
          <ArrowLeft className="size-3.5" /> {t("backToExplorer")}
        </Link>
      </div>
    );
  }

  const [{ data: universities }, { data: stats }, { data: rankings }, { data: metrics }] = await Promise.all([
    supabase.from("universities").select("*").in("id", requestedIds),
    supabase.from("university_statistics").select("*").in("university_id", requestedIds),
    supabase.from("university_rankings").select("university_id, rank_display").eq("ranking_provider", "QS").in("university_id", requestedIds),
    supabase.from("university_profile_metrics").select("university_id, metric_code, value_text").in("university_id", requestedIds).eq("metric_code", "research_topics_top5"),
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
        <PageHeader title={t("title")} description={t("description")} />
        <EmptyState icon={Scale} title={t("notEnoughTitle")} description={t("notEnoughDescription")} />
        <Link href="/universities" className="inline-flex items-center gap-1.5 text-sm text-brand-primary hover:underline">
          <ArrowLeft className="size-3.5" /> {t("backToExplorer")}
        </Link>
      </div>
    );
  }

  const statsByUniId = new Map((stats ?? []).map((s) => [s.university_id, s]));
  const rankByUniId = new Map((rankings ?? []).map((r) => [r.university_id, r.rank_display]));
  const topicsByUniId = new Map((metrics ?? []).map((m) => [m.university_id, m.value_text?.split(" | ").filter(Boolean).slice(0, 3) ?? []]));

  const rows: { label: string; render: (u: University) => React.ReactNode }[] = [
    { label: t("location"), render: (u) => [u.city, u.country].filter(Boolean).join(", ") || NA },
    { label: t("qsRanking"), render: (u) => (rankByUniId.get(u.id) ? `#${rankByUniId.get(u.id)}` : NA) },
    { label: t("institutionType"), render: (u) => u.institution_type ?? NA },
    { label: t("students"), render: (u) => (u.student_size != null ? u.student_size.toLocaleString("en-US") : NA) },
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
      label: t("statisticsSource"),
      render: (u) => {
        const s = statsByUniId.get(u.id);
        return s?.source ? (
          <SourceBadge
            sourceName={s.source}
            checkedAt={s.updated_at}
            confidence={s.data_confidence ?? undefined}
            locale={locale}
            sourceLabel={tSourceBadge("source")}
            checkedLabel={(time) => tSourceBadge("checked", { time })}
            viewSourceLabel={tSourceBadge("viewSource")}
          />
        ) : (
          NA
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
        const topics = topicsByUniId.get(u.id) ?? [];
        if (topics.length === 0) return NA;
        return (
          <div className="flex flex-wrap gap-1">
            {topics.map((t) => (
              <span key={t} className="rounded-full border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground">
                {t}
              </span>
            ))}
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
