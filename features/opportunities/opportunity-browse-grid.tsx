"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OpportunityCard } from "./opportunity-card";
import { loadMoreOpportunities } from "@/app/(app)/opportunities/actions";
import { formatNumber } from "@/lib/i18n/format";
import type { OpportunityBrowseFilters, OpportunityBrowseRow } from "@/lib/opportunities/browse";
import type { SavedOpportunityStatus } from "@/types/database";

/**
 * Browse results that keep loading as you scroll, replacing the numbered pager
 * ("Page 1 of 12") — founder direction, 2026-08-30.
 *
 * Page 1 still renders on the server, so the first screen is server-rendered HTML exactly
 * as before; this component only appends what comes after it. Subsequent pages come from
 * `loadMoreOpportunities`, which reuses the same `browseOpportunities` query the page
 * itself used, so scrolled-in results can't drift from what the pager would have shown.
 *
 * A visible "Load more" button sits alongside the observer rather than behind it. Pure
 * scroll-triggered loading is unreachable by keyboard and invisible to a screen reader, and
 * it strands anyone whose browser or settings block the observer — the button is the real
 * control, and the observer just clicks it for you.
 */
export function OpportunityBrowseGrid({
  initialRows,
  initialStatuses,
  filters,
  initialHasMore,
}: {
  initialRows: OpportunityBrowseRow[];
  initialStatuses: Record<string, SavedOpportunityStatus>;
  filters: OpportunityBrowseFilters;
  initialHasMore: boolean;
}) {
  // Seeded once per mount. Changing filters must reset all of this, and the caller does
  // that by keying this component on the filters (see the page) so React remounts it —
  // rather than syncing props into state from an effect, which would cascade renders and
  // is what the react-hooks/set-state-in-effect rule is guarding against.
  const t = useTranslations("opportunities.browseGrid");
  const [rows, setRows] = useState(initialRows);
  const [statuses, setStatuses] = useState(initialStatuses);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    if (isPending || !hasMore) return;
    setError(null);
    startTransition(async () => {
      const next = page + 1;
      const result = await loadMoreOpportunities(filters, next);
      if (result.error) {
        setError(result.error);
        return;
      }
      // Guard against a duplicate append: a fast double-trigger (observer plus a click)
      // could otherwise add the same page twice and render duplicate React keys.
      setRows((prev) => {
        const seen = new Set(prev.map((r) => r.opportunity.id));
        return [...prev, ...result.rows.filter((r) => !seen.has(r.opportunity.id))];
      });
      setStatuses((prev) => ({ ...prev, ...result.statuses }));
      setPage(next);
      setHasMore(result.hasMore);
    });
  }, [filters, hasMore, isPending, page]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    // rootMargin: start fetching before the sentinel is actually visible, so the next batch
    // is usually already in place by the time the student reaches the end of the list.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "600px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map(({ opportunity, matchScore, eligible, eligibilityNotes, notActionable, needsVerification, reasonCodes, matchConfidence }) => (
          <OpportunityCard
            key={opportunity.id}
            opportunity={opportunity}
            matchScore={matchScore}
            reasonCodes={reasonCodes}
            matchConfidence={matchConfidence}
            eligible={eligible}
            eligibilityNotes={eligibilityNotes}
            notActionable={notActionable}
            needsVerification={needsVerification}
            initialStatus={statuses[opportunity.id] ?? null}
          />
        ))}
      </div>

      {/* aria-live so a screen reader hears that more results arrived — a silently growing
          list is the accessibility failure mode of infinite scroll. */}
      <div aria-live="polite" className="sr-only">
        {isPending ? t("loadingMoreSr") : t("shownCountSr", { count: formatNumber(rows.length) })}
      </div>

      {hasMore ? (
        <div ref={sentinelRef} className="flex flex-col items-center gap-2 py-6">
          {error ? <p className="text-sm text-error">{error}</p> : null}
          <Button variant="outline" size="sm" onClick={loadMore} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" /> {t("loading")}
              </>
            ) : error ? (
              t("tryAgain")
            ) : (
              t("loadMore")
            )}
          </Button>
        </div>
      ) : (
        <p className="py-6 text-center text-xs text-ink-3">{t("allShown")}</p>
      )}
    </>
  );
}
