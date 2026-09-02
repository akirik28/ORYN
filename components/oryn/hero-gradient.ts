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
 * History worth keeping, because the direction reversed once already tonight: the first
 * version of this file recolored the gradient itself to a darkened flame palette. That was
 * withdrawn before ever being pushed — the founder's actual instruction (relayed by oryn-a7,
 * quoting the reference prototype at .../scratchpad/oryn-ultra-skin.html) was written against
 * a dark app ground, where an amber glow made sense. The ground itself is now amber
 * (oryn/ultra-tier-foundation-2026-09-02), so the founder explicitly asked to port the same
 * *technique* — a glowing card — with the *hue* changed to blue, precisely because
 * amber-on-amber would disappear against the new ground: "since we made the background
 * amber, port it so it glows blue."
 *
 * So: the background gradient itself no longer changes with tier at all — it is the exact
 * original literal in both cases, which is what keeps every one of the 8 sites' existing
 * light-on-dark content (a `.dark` class scope, explicit `text-white/NN` labels, or
 * NextMove's own ink cascade) correct with zero changes. What Ultra adds is a border-color
 * shift plus a two-layer glow: a soft, wide halo (the prototype's `.aura`, translated from a
 * separate blurred pseudo-layer into a wide box-shadow so it needs no new DOM node and isn't
 * clipped by the 4-of-8 sites that set `overflow-hidden` on this same element — box-shadow
 * paints outside an element's own overflow clip, unlike a child element would) and a tighter
 * grounding shadow underneath, both using --brand-primary — the app's own existing indigo,
 * not a new invented blue. That's deliberate per oryn-a7: it's the prototype's own
 * *Standard*-state color (its `--calm`), which every one of its `.ultra` rules used to
 * override to flame — under this reversed direction, the cool color is what Ultra keeps.
 * Skipped: the prototype's rotating conic aura and its canvas ember-particle system. Both are
 * real animation/DOM additions with no equivalent anywhere in these 8 static Server
 * Component pages today — porting a particle sim here would be a materially bigger, different
 * task than converting a gradient. (Motion on this card, if wanted later, is its own piece —
 * canvas-driven flame texture is already being built elsewhere, in the topbar usage meter and
 * tier slider.)
 */
const STANDARD_STOP_1 = "#111030";
const STANDARD_STOP_2 = "#1A1650";
const STANDARD_STOP_3 = "#0E1540";

const ULTRA_BORDER = "1px solid color-mix(in oklch, var(--brand-primary), transparent 55%)";
const ULTRA_SHADOW =
  "0 0 60px 10px color-mix(in oklch, var(--brand-primary), transparent 75%), " +
  "0 25px 65px -20px color-mix(in oklch, var(--brand-primary), transparent 25%)";

function withUltraGlow(background: string, tier: PlanTier): CSSProperties {
  if (tier === "ultra") {
    return { background, border: ULTRA_BORDER, boxShadow: ULTRA_SHADOW };
  }
  return { background };
}

/** The full 3-stop card — dashboard, features catalog, portfolio, and both University pages. */
export function heroGradientStyle(tier: PlanTier): CSSProperties {
  return withUltraGlow(`linear-gradient(145deg, ${STANDARD_STOP_1} 0%, ${STANDARD_STOP_2} 50%, ${STANDARD_STOP_3} 100%)`, tier);
}

/** Applications' hero only ever used the first two shades — preserved as its own 2-stop
 *  shape rather than forced to match the other 7 sites' 3-stop version. */
export function heroGradientStyleCompact(tier: PlanTier): CSSProperties {
  return withUltraGlow(`linear-gradient(145deg, ${STANDARD_STOP_1} 0%, ${STANDARD_STOP_2} 100%)`, tier);
}
