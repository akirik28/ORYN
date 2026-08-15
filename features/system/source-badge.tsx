import { formatDistanceToNow } from "date-fns";
import { BadgeCheck } from "lucide-react";

/** Reusable source-traceability chip (Phase 36) — used anywhere a fact came from an external provider. */
export function SourceBadge({ source, retrievedAt, url }: { source: string; retrievedAt: string | Date | null; url?: string | null }) {
  const content = (
    <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
      <BadgeCheck className="size-3.5 text-primary" />
      Source: {source}
      {retrievedAt ? <span>· Checked {formatDistanceToNow(new Date(retrievedAt), { addSuffix: true })}</span> : null}
    </span>
  );

  if (url) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="hover:opacity-80">
        {content}
      </a>
    );
  }
  return content;
}
