import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// The top of every authenticated page. Title is set in the heading face (Newsreader) —
// this is Oryn speaking directly to the student, not a section label.
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
        {eyebrow ? (
          <p className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">{eyebrow}</p>
        ) : null}
        <h1 className="font-heading text-2xl leading-tight font-medium tracking-tight text-balance md:text-3xl">
          {title}
        </h1>
        {description ? <p className="mt-1.5 text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}
