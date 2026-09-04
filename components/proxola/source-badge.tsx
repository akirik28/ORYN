import { ExternalLink } from "lucide-react";
import { ConfidenceIndicator, type ConfidenceLevel } from "@/components/proxola/confidence-indicator";
import { formatRelativeTime } from "@/lib/i18n/date";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

// Phase 36's SourceBadge: lets a student verify any high-impact claim (a deadline, a
// requirement, an admission outlook input) without making the page feel academic. Kept
// to a single line; ConfidenceIndicator is optional since not every source needs it.
//
// `locale` is optional and additive rather than this component fetching its own catalog
// namespace (getTranslations) — it renders many times per page (once per program/source
// row), and both callers (app/(app)/universities/[id]/page.tsx,
// app/(app)/opportunities/[id]/page.tsx) are Server Components that already have a `locale`
// and a translator in scope. Callers pass the three chrome strings from the shared
// top-level `sourceBadge` catalog namespace; a caller that passes nothing keeps getting
// exactly the original English. `formatRelativeTime` replaces a raw `formatDistanceToNow`
// call that bypassed lib/i18n/date.ts's locale-aware helper entirely, same plumbing-gap
// shape as features/universities/calendar-bound-fact-card.tsx's fix.
//
// `asOf` (B5, 2026-09-04): a genuinely different fact from `checkedAt`. `checkedAt` says
// when we last confirmed the source page still agrees with what we have on file; `asOf`
// says what period the figure ITSELF is for (`university_profile_metrics.stats_as_of`) —
// a page checked yesterday can still be quoting a tuition figure for an academic year that
// has since been superseded, and today nothing on screen told a student which case they
// were looking at. Free text end to end, never parsed as a date or formatted as one — the
// live data ranges from a bare "2026/27" to a full caveat sentence ("2024/25 academic year
// — the page states 2025/26 figures will be announced separately by mid-August"), so this
// renders it verbatim and lets the flex-wrap row break it onto its own line rather than
// truncating a caveat that exists specifically to prevent false precision. Optional and
// additive like every other prop here: a caller that doesn't pass it keeps its exact
// current output.
export function SourceBadge({
  sourceName,
  checkedAt,
  asOf,
  url,
  confidence,
  className,
  locale = DEFAULT_LOCALE,
  sourceLabel = "Source:",
  checkedLabel = (time: string) => `Checked ${time}`,
  asOfLabel = "As of:",
  viewSourceLabel = "View source",
}: {
  sourceName: string;
  checkedAt?: string | Date | null;
  /** Free text (`stats_as_of`) — the period the figure covers, not when it was checked. */
  asOf?: string | null;
  url?: string | null;
  confidence?: ConfidenceLevel;
  className?: string;
  locale?: Locale;
  sourceLabel?: string;
  checkedLabel?: (time: string) => string;
  asOfLabel?: string;
  viewSourceLabel?: string;
}) {
  const trimmedAsOf = asOf?.trim();
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground", className)}>
      <span>
        {sourceLabel} <span className="text-foreground/80">{sourceName}</span>
      </span>
      {trimmedAsOf ? (
        <span>
          {asOfLabel} <span className="text-foreground/80">{trimmedAsOf}</span>
        </span>
      ) : null}
      {checkedAt ? <span>{checkedLabel(formatRelativeTime(checkedAt, locale))}</span> : null}
      {confidence ? <ConfidenceIndicator level={confidence} locale={locale} /> : null}
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-primary hover:underline">
          {viewSourceLabel} <ExternalLink className="size-3" />
        </a>
      ) : null}
    </div>
  );
}
