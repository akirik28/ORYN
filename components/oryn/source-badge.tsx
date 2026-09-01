import { ExternalLink } from "lucide-react";
import { ConfidenceIndicator, type ConfidenceLevel } from "@/components/oryn/confidence-indicator";
import { formatRelativeTime } from "@/lib/i18n/date";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

// Phase 36's SourceBadge: lets a student verify any high-impact claim (a deadline, a
// requirement, an admission outlook input) without making the page feel academic. Kept
// to a single line; ConfidenceIndicator is optional since not every source needs it.
//
// `locale` is optional and additive rather than this component fetching its own catalog
// namespace (getTranslations) — it renders many times per page (once per program/source
// row), and both current callers are Server Components that already have a `locale` and a
// translator in scope. Callers pass the three chrome strings straight from
// universities.sourceBadge.* (or their own equivalent); a caller that passes nothing keeps
// getting exactly today's English, so app/(app)/opportunities/[id]/page.tsx — the other
// consumer, not touched by this pass — is unaffected. `formatRelativeTime` replaces a raw
// `formatDistanceToNow` call that bypassed lib/i18n/date.ts's locale-aware helper entirely,
// same plumbing-gap shape as features/universities/calendar-bound-fact-card.tsx's fix.
export function SourceBadge({
  sourceName,
  checkedAt,
  url,
  confidence,
  className,
  locale = DEFAULT_LOCALE,
  sourceLabel = "Source:",
  checkedLabel = (time: string) => `Checked ${time}`,
  viewSourceLabel = "View source",
}: {
  sourceName: string;
  checkedAt?: string | Date | null;
  url?: string | null;
  confidence?: ConfidenceLevel;
  className?: string;
  locale?: Locale;
  sourceLabel?: string;
  checkedLabel?: (time: string) => string;
  viewSourceLabel?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground", className)}>
      <span>
        {sourceLabel} <span className="text-foreground/80">{sourceName}</span>
      </span>
      {checkedAt ? <span>{checkedLabel(formatRelativeTime(checkedAt, locale))}</span> : null}
      {confidence ? <ConfidenceIndicator level={confidence} /> : null}
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-primary hover:underline">
          {viewSourceLabel} <ExternalLink className="size-3" />
        </a>
      ) : null}
    </div>
  );
}
