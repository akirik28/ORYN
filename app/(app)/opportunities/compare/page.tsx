import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, Scale } from "lucide-react";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { resolveLocale } from "@/lib/i18n/locale";
import { categoryLabel } from "@/lib/opportunities/labels";
import { cycleStatusLabel, selectivityLabel } from "@/lib/opportunities/lifecycle";
import { formatCurrency } from "@/lib/i18n/format";
import { formatAbsoluteDate } from "@/lib/i18n/date";
import { PageHeader } from "@/components/oryn/page-header";
import { EmptyState } from "@/components/oryn/empty-state";
import { COMPARE_MAX } from "@/lib/universities/compare-constants";
import type { Opportunity } from "@/types/database";

export const metadata = { title: "Compare opportunities" };

const NA = <span className="text-muted-foreground">—</span>;

/**
 * Opportunities' own compare table — same shape as app/(app)/universities/compare/page.tsx
 * (plain table, real data only, "—" for anything unverified, order preserved from however
 * the student selected them), reading `ids` from the query string the same way. Its only
 * caller is features/opportunities/opportunity-compare-bar.tsx.
 */
export default async function CompareOpportunitiesPage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const { ids: idsParam } = await searchParams;
  await requireUser();
  const supabase = await createClient();
  const locale = await resolveLocale();
  const t = await getTranslations("opportunities.comparePage");

  const requestedIds = [...new Set((idsParam ?? "").split(",").map((id) => id.trim()).filter(Boolean))].slice(0, COMPARE_MAX);

  if (requestedIds.length < 2) {
    return (
      <div className="space-y-8">
        <PageHeader title={t("title")} description={t("description")} />
        <EmptyState icon={Scale} title={t("nothingYetTitle")} description={t("nothingYetDescription")} />
        <Link href="/saved" className="inline-flex items-center gap-1.5 text-sm text-brand-primary hover:underline">
          <ArrowLeft className="size-3.5" /> {t("backToSaved")}
        </Link>
      </div>
    );
  }

  const { data: opportunities } = await supabase.from("opportunities").select("*").in("id", requestedIds);
  const byId = new Map((opportunities ?? []).map((o) => [o.id, o]));
  const ordered = requestedIds.map((id) => byId.get(id)).filter((o): o is Opportunity => o != null);

  if (ordered.length < 2) {
    return (
      <div className="space-y-8">
        <PageHeader title={t("title")} description={t("description")} />
        <EmptyState icon={Scale} title={t("notEnoughTitle")} description={t("notEnoughDescription")} />
        <Link href="/saved" className="inline-flex items-center gap-1.5 text-sm text-brand-primary hover:underline">
          <ArrowLeft className="size-3.5" /> {t("backToSaved")}
        </Link>
      </div>
    );
  }

  const rows: { label: string; render: (o: Opportunity) => React.ReactNode }[] = [
    { label: t("category"), render: (o) => categoryLabel(o.category, locale) },
    {
      label: t("location"),
      render: (o) => {
        const parts = [o.country, o.remote_allowed ? t("remoteAllowed") : null].filter(Boolean);
        return parts.length > 0 ? parts.join(" · ") : NA;
      },
    },
    { label: t("deadline"), render: (o) => (o.deadline ? formatAbsoluteDate(o.deadline, locale) : NA) },
    { label: t("cycleStatus"), render: (o) => cycleStatusLabel(o.cycle_status, locale) ?? NA },
    { label: t("selectivity"), render: (o) => selectivityLabel(o.selectivity_tier, locale) ?? NA },
    { label: t("cost"), render: (o) => (o.cost != null ? (o.cost === 0 ? t("free") : formatCurrency(o.cost)) : NA) },
    {
      label: t("ageRange"),
      render: (o) => {
        if (o.minimum_age == null && o.maximum_age == null) return NA;
        if (o.minimum_age != null && o.maximum_age != null) return t("ageRangeBoth", { min: o.minimum_age, max: o.maximum_age });
        if (o.minimum_age != null) return t("ageRangeMin", { min: o.minimum_age });
        return t("ageRangeMax", { max: o.maximum_age! });
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("sideBySide", { count: ordered.length })} />
      <Link href="/saved" className="inline-flex items-center gap-1.5 text-sm text-brand-primary hover:underline">
        <ArrowLeft className="size-3.5" /> {t("backToSaved")}
      </Link>

      <div className="glass-card overflow-x-auto rounded-2xl border border-white/65 bg-white/45 backdrop-blur-2xl">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="w-40 shrink-0 p-3 text-left font-medium text-muted-foreground">&nbsp;</th>
              {ordered.map((o) => (
                <th key={o.id} className="p-3 text-left">
                  <Link href={`/opportunities/${o.id}`} className="font-medium hover:underline">
                    {o.title}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b last:border-0">
                <td className="p-3 font-medium text-muted-foreground">{row.label}</td>
                {ordered.map((o) => (
                  <td key={o.id} className="p-3">
                    {row.render(o)}
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
