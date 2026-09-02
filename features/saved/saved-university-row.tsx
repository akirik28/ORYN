"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OutlookBadge } from "@/features/universities/outlook-badge";
import { SaveUniversityButton } from "@/features/universities/save-university-button";
import { useCompare } from "@/features/universities/compare-context";
import { resolveComparisonWidthCeiling } from "@/lib/comparison/limits";
import type { TargetUniversityWithDetails } from "@/lib/universities/queries";
import type { PlanTier } from "@/types/database";

/**
 * One row on the Saved page's Universities section. Reuses SaveUniversityButton as-is for
 * the status select + remove control (same component /universities and /universities/[id]
 * already use) rather than building a second status-changing UI — and features/universities/
 * compare-context.tsx's existing cross-page tray, so a university toggled here shows up in
 * the same CompareBar a student may have already populated from the explorer.
 */
export function SavedUniversityRow({ target, planTier = "ultra" }: { target: TargetUniversityWithDetails; planTier?: PlanTier }) {
  const t = useTranslations("saved");
  const compare = useCompare(planTier);
  const university = target.university;
  if (!university) return null;
  const isComparing = compare.isSelected(university.id);

  return (
    <li className="flex flex-col gap-3 border-b border-border/60 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <Link href={`/universities/${university.id}`} className="font-medium text-ink-1 hover:text-brand-primary hover:underline">
          {university.name}
        </Link>
        <p className="mt-0.5 text-sm text-ink-3">{[university.city, university.country].filter(Boolean).join(", ")}</p>
        <div className="mt-1.5">
          <OutlookBadge outlook={target.outlook} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={isComparing ? "secondary" : "outline"}
          size="sm"
          disabled={!isComparing && compare.atLimit}
          onClick={() => compare.toggle({ id: university.id, name: university.name })}
          title={!isComparing && compare.atLimit ? t("compareLimitTooltip", { max: resolveComparisonWidthCeiling(planTier) }) : undefined}
        >
          <Scale className="size-3.5" />
          {isComparing ? t("comparing") : t("compare")}
        </Button>
        <SaveUniversityButton universityId={university.id} universityName={university.name} targetId={target.id} status={target.status} />
      </div>
    </li>
  );
}
