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
