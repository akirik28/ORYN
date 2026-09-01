"use client";

import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeadlineBadge } from "@/components/oryn/deadline-badge";
import { OpportunityActions } from "@/features/opportunities/opportunity-actions";
import { useOpportunityCompare } from "@/features/opportunities/opportunity-compare-context";
import { categoryLabel } from "@/lib/opportunities/labels";
import type { Locale } from "@/lib/i18n/config";
import type { SavedOpportunityWithDetails } from "@/lib/opportunities/saved";

/**
 * One row on the Saved page's Opportunities section. Reuses OpportunityActions as-is
 * (same save/mark-applied/not-interested control the detail page uses) rather than
 * building a second status-changing UI.
 */
export function SavedOpportunityRow({ saved }: { saved: SavedOpportunityWithDetails }) {
  const t = useTranslations("saved");
  const locale = useLocale() as Locale;
  const compare = useOpportunityCompare();
  const opportunity = saved.opportunity;
  if (!opportunity) return null;
  const isComparing = compare.isSelected(opportunity.id);

  return (
    <li className="flex flex-col gap-3 border-b border-border/60 py-4 last:border-0 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <Link href={`/opportunities/${opportunity.id}`} className="font-medium text-ink-1 hover:text-brand-primary hover:underline">
          {opportunity.title}
        </Link>
        <p className="mt-0.5 text-sm text-ink-3">
          {[opportunity.organization, categoryLabel(opportunity.category, locale)].filter(Boolean).join(" · ")}
        </p>
        {opportunity.deadline ? (
          <div className="mt-1.5">
            <DeadlineBadge date={opportunity.deadline} locale={locale} />
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={isComparing ? "secondary" : "outline"}
          size="sm"
          disabled={!isComparing && compare.atLimit}
          onClick={() => compare.toggle({ id: opportunity.id, title: opportunity.title })}
          title={!isComparing && compare.atLimit ? t("compareLimitTooltip") : undefined}
        >
          <Scale className="size-3.5" />
          {isComparing ? t("comparing") : t("compare")}
        </Button>
        <OpportunityActions
          opportunityId={opportunity.id}
          officialUrl={opportunity.official_url}
          applicationUrl={opportunity.application_url}
          initialStatus={saved.status}
        />
      </div>
    </li>
  );
}
