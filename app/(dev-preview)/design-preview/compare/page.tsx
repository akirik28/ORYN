import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Scale } from "lucide-react";
import { EmptyState } from "@/components/proxola/empty-state";
import { PageHeader } from "@/components/proxola/page-header";
import { SourceBadge } from "@/components/proxola/source-badge";
import { heroGradientStyle } from "@/components/proxola/hero-gradient";
import { deriveTuitionContext } from "@/lib/universities/counseling-adapter";
import { resolveLocale } from "@/lib/i18n/locale";
import {
  FIXTURE_UNIVERSITY,
  FIXTURE_UNIVERSITY_2,
  FIXTURE_UNIVERSITY_3,
  FIXTURE_COMPARE_STATISTICS,
  FIXTURE_COMPARE_RANKINGS,
  FIXTURE_COMPARE_PROFILE_METRICS,
  FIXTURE_PROFILE_SIGNAL,
} from "@/lib/dev/fixtures";
import { PreviewShell } from "../preview-shell";
import type { University } from "@/types/database";
import type { ReactNode } from "react";

/**
 * Design-preview mirror of app/(app)/universities/compare/page.tsx (2026-09-03) — the
 * highest-consequence unreached surface from the visual QA pass, per oryn-a7. Rebased after
 * f5's tuition-row change landed on main mid-build: cost of attendance and tuition are now
 * separate rows (never blended — different concepts), with tuition reading 173 non-US
 * universities' `university_profile_metrics` instead of showing "—" across the board. This
 * preview was updated to match rather than left showing the pre-change table.
 * Real Server Component (`requireProfile()`, direct Supabase reads, the tier-gated
 * monthly-comparison-quota check) can't run in a dev-only preview, so this reproduces the
 * table's own row definitions against fixture data — the "real table" case only; the
 * quota-exhausted and "not enough selected" empty states are pure `EmptyState` renders
 * already exercised on other pages, not worth a second fixture just to re-prove.
 *
 * The `NA` ("—") cell is a REAL state here, not an oversight: Erasmus deliberately has no
 * `university_statistics` row, no QS rank, and no tuition metrics in the fixture data — the
 * same way a real university outside the covered set does. Bocconi shows populated
 * admission/graduation stats and a QS rank but still NA tuition, since a confidently-sourced
 * figure wasn't in hand to add honestly — see lib/dev/fixtures.ts's own comments on
 * FIXTURE_COMPARE_STATISTICS and FIXTURE_COMPARE_PROFILE_METRICS.
 */

const NA: ReactNode = <span className="text-muted-foreground">—</span>;

export default async function ComparePreviewPage({ searchParams }: { searchParams: Promise<{ tier?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();

  // Same reasoning as the map preview's own comment: this route has no session, so there's
  // no real profile.plan_tier to read, and heroGradientStyle computes its border/box-shadow
  // in JS at render time -- unlike a CSS-token-driven surface, the toolbar's own client-side
  // Ultra toggle only reaches this because it also updates ?tier= via router.replace(),
  // which this reads straight back out.
  const { tier: tierParam } = await searchParams;
  const tier = tierParam === "ultra" ? "ultra" : "standard";
  // Reads the real proxola_locale cookie rather than hardcoding "en" — see dashboard/page.tsx's
  // own comment on this exact class of bug, fixed the same way across every preview page
  // that had it during 2026-09-03's Turkish pass. The row labels below were still hardcoded
  // English until this same pass — locale threading alone wasn't enough, since these were
  // plain string literals rather than translated content.
  const locale = await resolveLocale();
  const t = await getTranslations("universities.comparePage");
  const tSourceBadge = await getTranslations("sourceBadge");

  const ordered: University[] = [FIXTURE_UNIVERSITY, FIXTURE_UNIVERSITY_2, FIXTURE_UNIVERSITY_3];
  const statsByUniId = new Map(FIXTURE_COMPARE_STATISTICS.map((s) => [s.university_id, s]));
  const rankByUniId = new Map(FIXTURE_COMPARE_RANKINGS.map((r) => [r.university_id, r.rank_display]));
  const topicRows = FIXTURE_COMPARE_PROFILE_METRICS.filter((m) => m.metric_code === "research_topics_top5");
  const topicsByUniId = new Map(topicRows.map((m) => [m.university_id, (m.value_text ?? "").split(" | ").filter(Boolean).slice(0, 3)]));
  const internationalTuitionByUniId = new Map(
    FIXTURE_COMPARE_PROFILE_METRICS.filter((m) => m.metric_code === "tuition_international_annual" && m.value_numeric != null).map((m) => [
      m.university_id,
      { amount: m.value_numeric!, unit: m.unit!, precisionState: m.precision_state! },
    ])
  );
  const domesticTuitionByUniId = new Map(
    FIXTURE_COMPARE_PROFILE_METRICS.filter((m) => m.metric_code === "tuition_domestic_annual" && m.value_numeric != null).map((m) => [
      m.university_id,
      { amount: m.value_numeric!, unit: m.unit!, precisionState: m.precision_state! },
    ])
  );

  const rows: { label: string; render: (u: University) => ReactNode }[] = [
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
    { label: t("applicationSystem"), render: (u) => u.application_system ?? NA },
    {
      label: t("researchStrengths"),
      render: (u) => {
        const topics = topicsByUniId.get(u.id) ?? [];
        if (topics.length === 0) return NA;
        return (
          <div className="flex flex-wrap gap-1">
            {topics.map((topic) => (
              <span key={topic} className="rounded-full border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground">
                {topic}
              </span>
            ))}
          </div>
        );
      },
    },
  ];

  return (
    <PreviewShell signal={FIXTURE_PROFILE_SIGNAL} tier={tier}>
      <div className="dark space-y-6 rounded-[28px] p-4 text-foreground md:p-8" style={heroGradientStyle(tier)}>
        <PageHeader title={t("title")} description={t("sideBySide", { count: ordered.length })} />

        <div className="glass-card overflow-x-auto rounded-2xl border border-white/65 bg-white/45 backdrop-blur-2xl">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="w-40 shrink-0 p-3 text-left font-medium text-muted-foreground">&nbsp;</th>
                {ordered.map((u) => (
                  <th key={u.id} className="p-3 text-left">
                    <span className="font-medium">{u.name}</span>
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

        {/* The two empty states the real page also renders — shown below the real table on
            this one preview page rather than as separate routes, since both are plain
            EmptyState calls with no fixture-specific data to get wrong. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/40 bg-white/10 p-4">
            <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Fewer than 2 selected</p>
            <EmptyState icon={Scale} title={t("nothingYetTitle")} description={t("nothingYetDescription")} />
          </div>
          <div className="rounded-2xl border border-white/40 bg-white/10 p-4">
            <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Selection resolved to fewer than 2</p>
            <EmptyState icon={Scale} title={t("notEnoughTitle")} description={t("notEnoughDescription")} />
          </div>
        </div>

        <Link href="/design-preview" className="inline-block text-sm text-brand-primary hover:underline">
          ← All previews
        </Link>
      </div>
    </PreviewShell>
  );
}
