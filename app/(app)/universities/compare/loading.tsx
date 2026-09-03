import { PageSkeleton } from "@/components/proxola/loading-skeleton";

// Overrides the parent /universities/loading.tsx ("cards" — a grid of browse cards, wrong
// shape here) with the "list" variant, closer to this page's actual table-of-rows layout.
export default function Loading() {
  return <PageSkeleton variant="list" rows={4} />;
}
