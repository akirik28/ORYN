"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Landmark } from "lucide-react";
import { EmptyState } from "@/components/oryn/empty-state";
import { SavedUniversityRow } from "./saved-university-row";
import type { TargetUniversityWithDetails } from "@/lib/universities/queries";
import type { PlanTier, TargetStatus } from "@/types/database";

const FILTER_VALUES: (TargetStatus | "all")[] = ["all", "exploring", "target", "applying", "applied", "accepted", "waitlisted", "rejected"];

/**
 * Client-side filter, not a server round-trip: a student's own saved list is bounded by
 * how much any one person actually saves (nowhere near the ~1,000-university browse
 * catalogue this filter would be wrong for), so re-fetching on every filter change would
 * trade a fast, already-in-memory operation for a network request with nothing to show for
 * it — see app/(app)/universities/page.tsx's own URL-param filtering for what this
 * deliberately isn't reusing, and why: that page's filters (region, cost, size, ranking)
 * scope a catalogue query, not a small already-fetched list.
 */
export function SavedUniversitiesSection({ targets, planTier }: { targets: TargetUniversityWithDetails[]; planTier?: PlanTier }) {
  const t = useTranslations("saved");
  const tStatus = useTranslations("universities.targetStatus");
  const [filter, setFilter] = useState<TargetStatus | "all">("all");

  const filtered = useMemo(() => (filter === "all" ? targets : targets.filter((target) => target.status === filter)), [targets, filter]);

  if (targets.length === 0) {
    return <EmptyState icon={Landmark} title={t("noUniversitiesTitle")} description={t("noUniversitiesDescription")} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="saved-university-filter" className="text-sm text-ink-3">
          {t("filterByStatus")}
        </label>
        <select
          id="saved-university-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value as TargetStatus | "all")}
          className="h-9 rounded-lg border bg-background px-2.5 text-sm"
        >
          {FILTER_VALUES.map((value) => (
            <option key={value} value={value}>
              {value === "all" ? t("allStatuses") : tStatus(value)}
            </option>
          ))}
        </select>
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon={Landmark} title={t("noMatchesTitle")} description={t("noMatchesDescription")} />
      ) : (
        <ul>
          {filtered.map((target) => (
            <SavedUniversityRow key={target.id} target={target} planTier={planTier} />
          ))}
        </ul>
      )}
    </div>
  );
}
