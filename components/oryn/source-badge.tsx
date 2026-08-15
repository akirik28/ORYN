import { formatDistanceToNow } from "date-fns";
import { ExternalLink } from "lucide-react";
import { ConfidenceIndicator, type ConfidenceLevel } from "@/components/oryn/confidence-indicator";
import { cn } from "@/lib/utils";

// Phase 36's SourceBadge: lets a student verify any high-impact claim (a deadline, a
// requirement, an admission outlook input) without making the page feel academic. Kept
// to a single line; ConfidenceIndicator is optional since not every source needs it.
export function SourceBadge({
  sourceName,
  checkedAt,
  url,
  confidence,
  className,
}: {
  sourceName: string;
  checkedAt?: string | Date | null;
  url?: string | null;
  confidence?: ConfidenceLevel;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground", className)}>
      <span>
        Source: <span className="text-foreground/80">{sourceName}</span>
      </span>
      {checkedAt ? <span>Checked {formatDistanceToNow(new Date(checkedAt), { addSuffix: true })}</span> : null}
      {confidence ? <ConfidenceIndicator level={confidence} /> : null}
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-primary hover:underline">
          View source <ExternalLink className="size-3" />
        </a>
      ) : null}
    </div>
  );
}
