import { Badge } from "@/components/ui/badge";
import type { RequirementEvaluationStatus } from "@/types/database";

const STATUS_CONFIG: Record<RequirementEvaluationStatus, { label: string; className: string }> = {
  met: { label: "Met", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  likely_met: { label: "Likely met", className: "border-emerald-500/30 text-emerald-700 dark:text-emerald-400" },
  not_met: { label: "Not met", className: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400" },
  unknown: { label: "Unknown", className: "text-muted-foreground" },
  needs_manual_review: { label: "Needs review", className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400" },
};

/** Phase 69 — never renders a bare boolean; always the reasoning behind it too, since a
 * met/not_met call here is Oryn's own inference against a requirement's stated rule, not
 * an official admissions decision. */
export function RequirementEvaluationBadge({ status }: { status: RequirementEvaluationStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
