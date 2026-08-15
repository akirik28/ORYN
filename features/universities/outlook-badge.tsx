import { Badge } from "@/components/ui/badge";
import type { OutlookLabel } from "@/types/database";

const OUTLOOK_CONFIG: Record<OutlookLabel, { label: string; className: string }> = {
  extreme_reach: { label: "Extreme Reach", className: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400" },
  reach: { label: "Reach", className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  competitive: { label: "Competitive", className: "border-primary/30 bg-primary/10 text-primary" },
  strong: { label: "Strong", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  likely: { label: "Likely", className: "border-emerald-600/40 bg-emerald-600/15 text-emerald-800 dark:text-emerald-300" },
};

export function OutlookBadge({ outlook }: { outlook: OutlookLabel | null }) {
  if (!outlook) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Not yet assessed
      </Badge>
    );
  }

  const config = OUTLOOK_CONFIG[outlook];
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
