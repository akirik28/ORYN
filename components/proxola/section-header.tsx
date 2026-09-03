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
    // flex-col below sm: side-by-side with no wrap and no min-w-0 on the title block meant
    // a wide action (Journey's new "Add to your journey" button, vs. every other caller's
    // short "Add") could collide with the title/description text at a narrow viewport —
    // caught live at 320px via the design-preview harness. Stacking removes the width race
    // entirely below sm rather than trying to shrink text that must stay readable.
    <div className={cn("flex flex-col items-start gap-3 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        <h2 className="text-base font-semibold tracking-tight text-ink-1">{title}</h2>
        {description ? <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-2">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
