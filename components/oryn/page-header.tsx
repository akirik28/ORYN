import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Eyebrow } from "./eyebrow";

// The top of every authenticated page. The title is set in the display face — this is
// Oryn speaking to the student, not a section label. Negative tracking and tight leading
// are what make a serif at this size read as editorial rather than as a document heading.
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="max-w-2xl">
        {eyebrow ? <Eyebrow className="mb-3">{eyebrow}</Eyebrow> : null}
        <h1 className="font-display text-3xl leading-[1.1] tracking-[-0.02em] text-balance md:text-4xl">{title}</h1>
        {description ? <p className="mt-3 text-ink-2">{description}</p> : null}
      </div>
      {/* Not shrink-0 (removed 2026-09-03): flex-shrink:0 disables shrinking outright,
          which overrides min-width entirely -- min-w-0 alone did nothing while shrink-0
          stayed, confirmed live (the item still measured wider than its own parent at
          375px). Without shrink-0, this item can actually be constrained to the space this
          row of the outer flex-wrap has, which is what lets OpportunityActions' (and every
          other multi-button action's) own internal flex-wrap do its job instead of the
          button row overflowing the viewport. Harmless on desktop: nothing here forces
          shrinking below content size unless the line's content genuinely doesn't fit. */}
      {action ? <div className="flex min-w-0 flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}
