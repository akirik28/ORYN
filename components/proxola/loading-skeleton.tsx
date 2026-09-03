import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Generic route-level loading fallback, meant to be dropped into an app/(app)/**/loading.tsx
// file so a page shows an instant, content-shaped placeholder while its Server Component
// data resolves — per AGENTS.md PHASE 44 ("Use skeletons... Do not show frozen buttons")
// — instead of the previous behavior, a blank hold on the last-rendered screen with no
// feedback that anything is happening. Deliberately generic: no page-specific shapes,
// counts, or copy baked in, so every loading.tsx can share this one component rather than
// hand-rolling its own, and the incoming UI-simplification pass can restyle it in one place
// without touching each route's loading.tsx individually.
export function PageSkeleton({
  rows = 4,
  variant = "list",
  showHeader = true,
  className,
}: {
  /** Number of placeholder rows/cards below the header. */
  rows?: number;
  /** "list": stacked bars, for table/list-shaped pages (Applications, Connections,
   * Documents, ...). "cards": a wrapping grid of taller blocks, for card-grid pages
   * (Opportunities, Universities). "detail": a couple of stat-card-sized blocks plus one
   * large content block, for single-record detail pages. */
  variant?: "list" | "cards" | "detail";
  /** Set false when the destination page's own header renders fast enough (e.g. it's
   * static) and only a below-the-fold section needs the placeholder. */
  showHeader?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-8", className)} role="status" aria-label="Loading">
      {showHeader ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
      ) : null}

      {variant === "list" ? (
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : variant === "cards" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: rows }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      )}
    </div>
  );
}

// Dashboard-specific loading fallback. Unlike PageSkeleton above, this mirrors
// DashboardView's actual block structure (editorial Next Move opening, an asymmetric
// focus/signal split, the outlook/opportunities pair) rather than a generic shape —
// justified here specifically because the dashboard is the one page the spec gives an
// exact reference layout for (AGENTS.md "Example homepage"), it's the landing page after
// every login, and its Server Component does several sequential/parallel queries plus a
// possible weekly-plan generation call, so it's slow enough and distinctive enough to earn
// its own skeleton. Keep it in step with DashboardView: a skeleton whose shape doesn't
// match what loads is a layout shift dressed up as polish.
export function DashboardSkeleton() {
  return (
    <div className="space-y-20 md:space-y-24" role="status" aria-label="Loading">
      {/* Opening: greeting line, then the hero statement. */}
      <div className="space-y-6">
        <Skeleton className="h-4 w-48 max-w-full" />
        <div className="space-y-4">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-10 w-[26rem] max-w-full" />
          <Skeleton className="h-10 w-[20rem] max-w-full" />
        </div>
        <div className="space-y-2 pt-2">
          <Skeleton className="h-4 w-full max-w-xl" />
          <Skeleton className="h-4 w-3/4 max-w-lg" />
        </div>
        <div className="flex gap-3 pt-2">
          <Skeleton className="h-8 w-40 rounded-lg" />
          <Skeleton className="h-8 w-32 rounded-lg" />
        </div>
      </div>

      <div className="grid gap-16 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-20">
        <div className="space-y-6">
          <Skeleton className="h-5 w-44" />
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2 pl-5">
                <Skeleton className="h-4 w-64 max-w-full" />
                <Skeleton className="h-3 w-full max-w-md" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-14">
          <div className="space-y-3">
            <Skeleton className="h-3 w-28" />
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
          <div className="space-y-3">
            <Skeleton className="h-3 w-20" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-16 md:grid-cols-2 md:gap-20">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

