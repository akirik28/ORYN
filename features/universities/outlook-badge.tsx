import { StatusBadge, type StatusTone } from "@/components/oryn/status-badge";
import type { OutlookLabel } from "@/types/database";

// Selectivity, not sentiment: "Extreme Reach" isn't an error state and "Likely" isn't a
// guarantee (AGENTS.md's "never imply admissions certainty"), but the tone ramp still
// needs to read instantly. error/warning/brand/success track the same low-to-high
// likelihood ordering StatusBadge's tones already carry elsewhere in the product.
const OUTLOOK_CONFIG: Record<OutlookLabel, { label: string; tone: StatusTone }> = {
  extreme_reach: { label: "Extreme Reach", tone: "error" },
  reach: { label: "Reach", tone: "warning" },
  competitive: { label: "Competitive", tone: "brand" },
  strong: { label: "Strong", tone: "success" },
  likely: { label: "Likely", tone: "success" },
};

export function OutlookBadge({ outlook }: { outlook: OutlookLabel | null }) {
  if (!outlook) {
    return <StatusBadge label="Not yet assessed" tone="neutral" />;
  }

  const config = OUTLOOK_CONFIG[outlook];
  return <StatusBadge label={config.label} tone={config.tone} />;
}
