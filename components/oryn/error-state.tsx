import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// "We couldn't refresh X — the last verified data is still shown" — never a raw error
// code, and never blocks the rest of the page. Inline/contained by default; pass a
// `retry` action when the caller has one.
export function ErrorState({
  description,
  retry,
  className,
}: {
  description: ReactNode;
  retry?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-3 rounded-xl border border-warning/25 bg-warning/[0.06] p-4 text-sm", className)}>
      <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" />
      <div className="flex-1 space-y-2">
        <p className="text-foreground/90">{description}</p>
        {retry}
      </div>
    </div>
  );
}
