import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cycleStatusLabel } from "@/lib/opportunities/lifecycle";
import { categoryLabel } from "@/lib/opportunities/labels";
import type { Locale } from "@/lib/i18n/config";
import type { Opportunity, OpportunityCategory } from "@/types/database";
import type { OpportunityFacets } from "@/lib/opportunities/browse";

const PILL = "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors duration-(--duration-fast)";
const PILL_ACTIVE = "border-brand-primary bg-brand-primary text-primary-foreground";
const PILL_INACTIVE = "border-border hover:border-brand-primary-border hover:bg-brand-primary-subtle";
const SELECT_CLASS = "h-9 rounded-lg border bg-background px-2.5 text-sm";

const CYCLE_STATUS_OPTION_VALUES: Opportunity["cycle_status"][] = ["open", "upcoming", "closed", "date_not_announced"];

export interface OpportunityBrowseParams {
  q?: string;
  category?: string;
  country?: string;
  remoteOnly?: boolean;
  freeOnly?: boolean;
  cycleStatus?: string;
}

function categoryHref(current: OpportunityBrowseParams, category: string | undefined): string {
  const params = new URLSearchParams();
  params.set("view", "browse");
  if (current.q) params.set("q", current.q);
  if (category) params.set("category", category);
  if (current.country) params.set("country", current.country);
  if (current.remoteOnly) params.set("remote", "1");
  if (current.freeOnly) params.set("free", "1");
  if (current.cycleStatus) params.set("cycle", current.cycleStatus);
  return `/opportunities?${params.toString()}`;
}

/**
 * Category is expressed as real <Link>s (query params, no JS needed — same pattern as
 * RegionGridExplorer for universities), so switching category is a single click/tap and
 * shareable as a URL. The remaining facets (text, country, remote, free, cycle status)
 * combine as an AND and go through one plain GET form instead: five independent link
 * combinations would be 2^5 URLs to reason about, where a form is just... a form.
 * Category-specific structured filters from the founder's spec (residential, team size,
 * paid/stipend, ...) aren't built here because the columns don't exist yet — adding UI
 * for data the ingestion pipeline doesn't populate would be exactly the "manufactured
 * value" AGENTS.md rules out. Real today: category, subject-adjacent search, country,
 * remote/online, free/paid, and cycle status, all backed by actual columns.
 */
export function OpportunityFilterBar({ facets, current }: { facets: OpportunityFacets; current: OpportunityBrowseParams }) {
  const t = useTranslations("opportunities.filterBar");
  const locale = useLocale() as Locale;
  const totalActive = facets.categoryCounts.reduce((sum, c) => sum + c.count, 0);
  const hasAnyFilter = Boolean(
    current.q || current.category || current.country || current.remoteOnly || current.freeOnly || current.cycleStatus
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="navigation" aria-label={t("categoryNavAriaLabel")}>
        <Link href={categoryHref(current, undefined)} className={cn(PILL, !current.category ? PILL_ACTIVE : PILL_INACTIVE)}>
          {t("all")} <span className="opacity-70">· {totalActive}</span>
        </Link>
        {facets.categoryCounts.map(({ category, count }) => (
          <Link
            key={category}
            href={categoryHref(current, category)}
            className={cn(PILL, current.category === category ? PILL_ACTIVE : PILL_INACTIVE, count === 0 && current.category !== category && "opacity-50")}
          >
            {categoryLabel(category as OpportunityCategory, locale)} <span className="opacity-70">· {count}</span>
          </Link>
        ))}
      </div>

      <form action="/opportunities" method="GET" className="flex flex-wrap items-end gap-3 rounded-2xl border bg-card p-4">
        <input type="hidden" name="view" value="browse" />
        {current.category ? <input type="hidden" name="category" value={current.category} /> : null}

        <div className="min-w-48 flex-1 space-y-1.5">
          <label htmlFor="opp-q" className="text-xs font-medium text-muted-foreground">
            {t("search")}
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input id="opp-q" name="q" defaultValue={current.q} placeholder={t("searchPlaceholder")} className="pl-7" />
          </div>
        </div>

        {facets.countries.length > 0 ? (
          <div className="space-y-1.5">
            <label htmlFor="opp-country" className="text-xs font-medium text-muted-foreground">
              {t("country")}
            </label>
            <select id="opp-country" name="country" defaultValue={current.country ?? ""} className={SELECT_CLASS}>
              <option value="">{t("any")}</option>
              {facets.countries.map(({ country, count }) => (
                <option key={country} value={country}>
                  {country} ({count})
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <label htmlFor="opp-cycle" className="text-xs font-medium text-muted-foreground">
            {t("cycleStatus")}
          </label>
          <select id="opp-cycle" name="cycle" defaultValue={current.cycleStatus ?? ""} className={SELECT_CLASS}>
            <option value="">{t("any")}</option>
            {CYCLE_STATUS_OPTION_VALUES.map((value) => (
              <option key={value} value={value}>
                {cycleStatusLabel(value, locale)}
              </option>
            ))}
          </select>
        </div>

        <label className="flex h-9 items-center gap-1.5 text-sm">
          <input type="checkbox" name="remote" value="1" defaultChecked={current.remoteOnly} className="size-4 rounded border-input accent-(--brand-primary)" />
          {t("remoteOnline")}
        </label>
        <label className="flex h-9 items-center gap-1.5 text-sm">
          <input type="checkbox" name="free" value="1" defaultChecked={current.freeOnly} className="size-4 rounded border-input accent-(--brand-primary)" />
          {t("freeOnly")}
        </label>

        <Button type="submit" size="sm">
          {t("applyButton")}
        </Button>
        {hasAnyFilter ? (
          <Button type="button" variant="ghost" size="sm" render={<Link href="/opportunities?view=browse" />} nativeButton={false}>
            {t("reset")}
          </Button>
        ) : null}
      </form>
    </div>
  );
}
