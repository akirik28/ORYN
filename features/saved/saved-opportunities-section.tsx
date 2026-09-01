"use client";

import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Compass } from "lucide-react";
import { EmptyState } from "@/components/oryn/empty-state";
import { SavedOpportunityRow } from "./saved-opportunity-row";
import { categoryLabel } from "@/lib/opportunities/labels";
import type { Locale } from "@/lib/i18n/config";
import type { SavedOpportunityWithDetails } from "@/lib/opportunities/saved";
import type { OpportunityCategory, SavedOpportunityStatus } from "@/types/database";

/** Client-side filter — see saved-universities-section.tsx's own comment for why (same
 * reasoning, same scale of data). Category options are built from what's actually in this
 * student's own saved list, not the full 13-value enum — an empty-everywhere dropdown of
 * categories they've never saved would be filter theater, not a real filter. */
export function SavedOpportunitiesSection({ saved }: { saved: SavedOpportunityWithDetails[] }) {
  const t = useTranslations("saved");
  const tCard = useTranslations("opportunities.card");
  const locale = useLocale() as Locale;
  const [statusFilter, setStatusFilter] = useState<SavedOpportunityStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<OpportunityCategory | "all">("all");

  const categories = useMemo(() => {
    const present = new Set(saved.map((s) => s.opportunity?.category).filter((c): c is OpportunityCategory => c != null));
    return [...present].sort();
  }, [saved]);

  const filtered = useMemo(
    () =>
      saved.filter((s) => {
        if (statusFilter !== "all" && s.status !== statusFilter) return false;
        if (categoryFilter !== "all" && s.opportunity?.category !== categoryFilter) return false;
        return true;
      }),
    [saved, statusFilter, categoryFilter]
  );

  if (saved.length === 0) {
    return <EmptyState icon={Compass} title={t("noOpportunitiesTitle")} description={t("noOpportunitiesDescription")} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="saved-opportunity-status-filter" className="text-sm text-ink-3">
            {t("filterByStatus")}
          </label>
          <select
            id="saved-opportunity-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as SavedOpportunityStatus | "all")}
            className="h-9 rounded-lg border bg-background px-2.5 text-sm"
          >
            <option value="all">{t("allStatuses")}</option>
            <option value="saved">{tCard("saved")}</option>
            <option value="applied">{tCard("applied")}</option>
          </select>
        </div>
        {categories.length > 1 ? (
          <div className="flex items-center gap-2">
            <label htmlFor="saved-opportunity-category-filter" className="text-sm text-ink-3">
              {t("filterByCategory")}
            </label>
            <select
              id="saved-opportunity-category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as OpportunityCategory | "all")}
              className="h-9 rounded-lg border bg-background px-2.5 text-sm"
            >
              <option value="all">{t("allCategories")}</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {categoryLabel(category, locale)}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon={Compass} title={t("noMatchesTitle")} description={t("noMatchesDescription")} />
      ) : (
        <ul>
          {filtered.map((s) => (
            <SavedOpportunityRow key={s.id} saved={s} />
          ))}
        </ul>
      )}
    </div>
  );
}
