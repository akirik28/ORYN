import Link from "next/link";
import { Sparkles } from "lucide-react";

/**
 * Ambient, always-visible reminder of where the student's profile stands — present in
 * the nav chrome itself so the AI-driven scoring feels like it surrounds the product
 * rather than living only on the dashboard.
 */
export function CareerProfileBadge({ score }: { score: number | null }) {
  return (
    <Link
      href="/profile"
      className="flex items-center gap-2.5 rounded-lg border border-sidebar-border bg-sidebar-accent/40 px-3 py-2.5 transition-colors hover:bg-sidebar-accent"
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-primary-soft text-brand-primary-strong">
        <Sparkles className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-sidebar-foreground/60">Career Profile</span>
        <span className="block font-heading text-base font-medium text-sidebar-foreground">
          {score === null ? "Not scored yet" : score}
        </span>
      </span>
    </Link>
  );
}
