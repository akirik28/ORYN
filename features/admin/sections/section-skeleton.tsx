import { Skeleton } from "@/components/ui/skeleton";

/** Shared Suspense fallback for every self-fetching admin section (D1) — a slow section
 *  degrades its own card, not the page, so this only ever covers one card's worth of space. */
export function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-5 w-40" />
      <div className="space-y-2 rounded-lg border p-3">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    </div>
  );
}
