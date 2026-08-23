import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// A section divider within a page — functional and dense, deliberately sans (not the
// display face) so it reads as UI structure rather than a statement to the student. A
// page whose every sub-heading is serif stops feeling premium and starts feeling like a
// wedding invitation; that judgement predates UI-V3 and still holds.
export function SectionHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div>
        <h2 className="text-base font-semibold tracking-tight text-ink-1">{title}</h2>
        {description ? <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-2">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
