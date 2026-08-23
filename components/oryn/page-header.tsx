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
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}
