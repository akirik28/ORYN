import type { CSSProperties } from "react";
import type { PlanTier } from "@/types/database";

/**
 * The dark hero-card background, previously the exact same literal `style={{ background:
 * "linear-gradient(145deg, #111030 0%, #1A1650 50%, #0E1540 100%)" }}` copy-pasted at 8 call
 * sites across 7 files (docs/hardcoded-color-sweep-2026-09-02.md). That duplication was the
 * symptom; the actual bug it caused is that a value set via the `style` prop is unreachable
 * by any CSS rule, including `[data-tier="ultra"]` — so this card stayed navy under Ultra no
 * matter how complete the token system got. Resolving the tier here in JS, the same way
 * lib/data/map-visuals.ts's resolveCountryFillStyle already does for the map, is what makes
 * it reachable at all.
 *
 * Ultra keeps the card dark rather than switching to a bright card. Every one of the 8 call
 * sites currently assumes light-on-dark content sitting on top of this background (a `.dark`
 * class scope, explicit `text-white/NN` labels, or NextMove's own ink cascade) — none of
 * which this change touches. A bright, light amber background under that same light text
 * would be unreadable: the pure tokens' own contrast against white is 4.2:1 for
 * --tier-grad-3, 2.6:1 for --tier-accent and 1.6:1 for --tier-grad-1 (computed from each
 * hex's WCAG relative luminance — a straight amber card fails badly at the lighter end).
 * Darkening each stop toward black keeps every stop in roughly the same dark band the
 * current navy already sits in, so the existing light-on-dark treatment keeps working
 * unmodified, while the hue shift alone (indigo -> red/orange/gold) is a large, obviously
 * different visual change on its own. The percentages below are a reasoned estimate, not a
 * measured one — darker for the source tokens that start lighter — ask for a live
 * oklch/contrast reading before trusting the exact numbers, the same way the map's own vivid
 * pass was confirmed after the fact rather than assumed.
 */
const STANDARD_STOP_1 = "#111030";
const STANDARD_STOP_2 = "#1A1650";
const STANDARD_STOP_3 = "#0E1540";

const ULTRA_STOP_1 = "color-mix(in oklch, var(--tier-grad-3), black 20%)";
const ULTRA_STOP_2 = "color-mix(in oklch, var(--tier-accent), black 45%)";
const ULTRA_STOP_3 = "color-mix(in oklch, var(--tier-grad-1), black 60%)";

/** The full 3-stop card — dashboard, features catalog, portfolio, and both University pages. */
export function heroGradientStyle(tier: PlanTier): CSSProperties {
  const [s1, s2, s3] =
    tier === "ultra" ? [ULTRA_STOP_1, ULTRA_STOP_2, ULTRA_STOP_3] : [STANDARD_STOP_1, STANDARD_STOP_2, STANDARD_STOP_3];
  return { background: `linear-gradient(145deg, ${s1} 0%, ${s2} 50%, ${s3} 100%)` };
}

/** Applications' hero only ever used the first two shades — preserved as its own 2-stop
 *  shape rather than forced to match the other 7 sites' 3-stop version. */
export function heroGradientStyleCompact(tier: PlanTier): CSSProperties {
  const [s1, s2] = tier === "ultra" ? [ULTRA_STOP_1, ULTRA_STOP_2] : [STANDARD_STOP_1, STANDARD_STOP_2];
  return { background: `linear-gradient(145deg, ${s1} 0%, ${s2} 100%)` };
}
