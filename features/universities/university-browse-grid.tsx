"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UniversityCard } from "./university-card";
import { loadMoreUniversities } from "@/app/(app)/universities/actions";
import type { UniversityBrowseParams, UniversityCardMeta } from "@/lib/universities/browse-page";
import type { University } from "@/types/database";

/**
 * Browse results that keep loading as you scroll, replacing the numbered pager.
 *
 * Page 1 is still server-rendered, so the first screen is unchanged HTML; this component
 * only appends what follows, via a Server Action that resolves through the same
 * `loadUniversityBrowsePage` the page used. The visible "Load more" button is the real
 * control and the IntersectionObserver just clicks it — scroll-only loading is unreachable
 * by keyboard, invisible to a screen reader, and strands anyone whose browser blocks the
 * observer.
 *
 * Filter and sort changes are URL navigations, which re-render the server page; the caller
 * keys this component on those params so React remounts it rather than syncing props into
 * state from an effect.
 */
export function UniversityBrowseGrid({
  initialUniversities,
  initialMeta,
  initialSavedIds,
  initialHasMore,
  params,
  compact = false,
  buildCountryHref,
}: {
  initialUniversities: University[];
  initialMeta: Record<string, UniversityCardMeta>;
  initialSavedIds: string[];
  initialHasMore: boolean;
  params: Omit<UniversityBrowseParams, "page">;
  compact?: boolean;
  /** Pre-resolved per-country hrefs — building them needs the page's own param state, which
   *  this component deliberately doesn't carry. */
  buildCountryHref?: Record<string, string>;
}) {
  const [universities, setUniversities] = useState(initialUniversities);
  const [meta, setMeta] = useState(initialMeta);
  const [savedIds, setSavedIds] = useState(() => new Set(initialSavedIds));
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
      const result = await loadMoreUniversities(params, next);
      if (result.error) {
        setError(result.error);
        return;
      }
      // Dedupe on id: a fast double-trigger (observer plus a click) would otherwise append
      // the same page twice and render duplicate React keys.
      setUniversities((prev) => {
        const seen = new Set(prev.map((u) => u.id));
        return [...prev, ...result.universities.filter((u) => !seen.has(u.id))];
      });
      setMeta((prev) => ({ ...prev, ...result.meta }));
      setSavedIds((prev) => new Set([...prev, ...result.savedIds]));
      setPage(next);
      setHasMore(result.hasMore);
    });
  }, [params, hasMore, isPending, page]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    // rootMargin so the next batch is usually in place before the student reaches the end.
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) loadMore();
    }, { rootMargin: "700px 0px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return (
    <>
      <div className={compact
            ? // Single column at every width. The container query that used to go two-up
              // here contradicted the call site's own reasoning (app/(app)/universities/
              // page.tsx: "One column, not two"), and on a wide screen the results panel
              // did cross the @2xl threshold — so cards sat side by side exactly where a
              // stacked list was intended, with the action row overflowing again.
              "grid gap-4 lg:max-h-[calc(100svh-12rem)] lg:overflow-y-auto lg:pr-2"
            : "grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        }
      >
        {universities.map((university) => {
          const m = meta[university.id] ?? {};
          return (
            <UniversityCard
              key={university.id}
              university={university}
              isSaved={savedIds.has(university.id)}
              qsRank={m.qsRank}
              cost={m.cost}
              researchTopics={m.researchTopics}
              imageUrl={m.imageUrl}
              compact={compact}
              countryHref={university.country ? (buildCountryHref?.[university.country] ?? null) : null}
            />
          );
        })}
      </div>

      {/* A silently growing list is infinite scroll's usual accessibility failure. */}
      <div aria-live="polite" className="sr-only">
        {isPending ? "Loading more universities" : `${universities.length} universities shown`}
      </div>

      {hasMore ? (
        <div ref={sentinelRef} className="flex flex-col items-center gap-2 py-6">
          {error ? <p className="text-sm text-error">{error}</p> : null}
          <Button variant="outline" size="sm" onClick={loadMore} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" /> Loading…
              </>
            ) : error ? (
              "Try again"
            ) : (
              "Load more"
            )}
          </Button>
        </div>
      ) : universities.length > 0 ? (
        <p className="py-6 text-center text-xs text-ink-4">That&apos;s every university matching these filters.</p>
      ) : null}
    </>
  );
}
