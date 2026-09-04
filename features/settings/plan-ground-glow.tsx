"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/lib/ui/use-prefers-reduced-motion";

/**
 * Founder, 2026-09-04, verbatim: "loş ışık tarzı, ve hareket etsin yine beyazlarla" — a
 * dim-*light* quality (a source, brighter near it, falling off — not just a darker color)
 * plus motion, with white, "yine" (again) pointing back at a specific animation he'd
 * already praised: "bu sağdaki animasyon çok çok iyi" (that one on the right).
 *
 * That's the Topbar UsageIndicator's flame (features/app-shell/usage-indicator.tsx's
 * drawUsageFlame) — literally on the right (Topbar's `ml-auto` cluster, first item before
 * the feedback button and notification bell), approved three times in one night as it was
 * built up, and the only Ultra motion treatment whose palette is actually white-hot at its
 * core (`hot: [255, 244, 214]`). `.tier-flow-bar` and `.ultra-ambient-glow` are both pure
 * `--tier-grad-*` gold-through-red — no white in either — so the flame is the one this
 * reuses, not those two.
 *
 * "Reuse," not "recreate": this borrows drawUsageFlame's closed-form shape — brightness as
 * a continuous function of position and time, additive ("lighter") compositing, no
 * particle objects or lifetimes, a white-hot core fading into the surface's own base color
 * — re-parameterized for a full-page wash instead of a 128×44 chip. Two deliberate
 * departures, both because the founder's own wording calls for something different from a
 * flame, not because the reference wasn't followed:
 *   1. Radial falloff from one corner instead of horizontal travel from a left edge — a
 *      light source in a room falls off in every direction; a fuel gauge only travels one.
 *   2. Slow breathing/drifting (T scaled ~0.2–0.25) instead of the flame's fast lick-and-
 *      flicker (T scaled ~8.7) — "loş ışık" is dim and calm, not combustion.
 */

// Mirrors drawUsageFlame's own near-white hot point (features/app-shell/usage-indicator.tsx)
// literally, not re-derived — "beyazlarla" (founder: with whites) is asking for that same
// white, not a new one.
const HOT: [number, number, number] = [255, 250, 235];

// Mirrors app/globals.css's .plan-page-ground light-mode gradient's own lightest (0%) stop,
// oklch(0.33 0.055 148) — measured live via canvas readback, kept in sync by hand the same
// way usage-indicator.tsx/ultra-ambient.tsx's EMBER_COLORS mirror their own CSS source,
// since a canvas can't read a CSS `background` gradient stop directly. The 0% stop
// specifically (not 55%/100%) because this glow is anchored near the top of the page
// (srcY below), where the 160deg gradient sits close to its own starting color.
const FAR: [number, number, number] = [32, 61, 37];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function drawAmbientLight(ctx: CanvasRenderingContext2D, W: number, H: number, T: number): void {
  ctx.clearRect(0, 0, W, H);
  if (W <= 0 || H <= 0) return;

  // Anchored high and to the right — echoes the Topbar flame's own position without
  // literally being it, and on any viewport wide enough for the max-w-3xl content column
  // to leave a margin, this sits in that margin rather than under the header text.
  const srcX = W * 0.86;
  const srcY = H * 0.05;
  const reach = Math.max(W, H) * 0.68;

  ctx.globalCompositeOperation = "lighter";

  // Slow breathing on the bloom's own reach and peak — this alone is most of "hareket
  // etsin" at the scale that reads on a full-page background (a large, slow change), the
  // same division of labor drawUsageFlame's linear bloom + per-dot loop split between them.
  const breathe = 0.5 + 0.5 * Math.sin(T * 0.22);
  const radius = radiusFor(reach, breathe);
  const peakAlpha = 0.10 + 0.035 * breathe;

  const bloom = ctx.createRadialGradient(srcX, srcY, 0, srcX, srcY, radius);
  bloom.addColorStop(0, `rgba(${HOT.join(",")},${peakAlpha.toFixed(3)})`);
  bloom.addColorStop(0.45, `rgba(${FAR.join(",")},${(peakAlpha * 0.5).toFixed(3)})`);
  bloom.addColorStop(1, `rgba(${FAR.join(",")},0)`);
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, W, H);

  // Sparse, slow-drifting glints on top of the bloom — the "yine beyazlarla" motion
  // drawUsageFlame's own dot field provides, at page scale and page pace (drifting, not
  // flickering). Pitch derived from area so the dot count (~70) stays roughly constant
  // regardless of viewport size, the same reasoning ultra-ambient.tsx's particleCountFor
  // caps density for the ember canvas.
  const pitch = Math.max(18, Math.sqrt((W * H) / 70));
  const cols = Math.max(4, Math.round(W / pitch));
  const rows = Math.max(4, Math.round(H / pitch));

  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const px = i * pitch + pitch / 2;
      const py = j * pitch + pitch / 2;
      const dist = Math.hypot(px - srcX, py - srcY);
      const env = Math.max(0, 1 - dist / radius);
      if (env <= 0.03) continue;

      const drift = 0.5 + 0.5 * Math.sin(T * 0.18 + i * 0.7 + j * 0.5);
      const flow = env * env * drift;
      if (flow <= 0.02) continue;

      const alpha = Math.min(0.4, flow * 0.4);
      const fwd = Math.min(1, flow * 1.4);
      const r = lerp(FAR[0], HOT[0], fwd);
      const g = lerp(FAR[1], HOT[1], fwd);
      const b = lerp(FAR[2], HOT[2], fwd);
      const rad = 1 + flow * 2.4;

      ctx.beginPath();
      ctx.arc(px, py, rad, 0, 6.2832);
      ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${alpha.toFixed(3)})`;
      ctx.fill();
    }
  }
  ctx.globalCompositeOperation = "source-over";
}

function radiusFor(reach: number, breathe: number): number {
  return reach * (0.88 + 0.12 * breathe);
}

/**
 * Mounted inside `.plan-page-ground` (features/settings/plan-tier-view.tsx), which is
 * already `position: absolute; inset: 0` anchored to the layout's own `<main
 * class="relative">` — never `fixed` (founder, 2026-09-04: "sol bar gözükmüyor"; see that
 * file's own header comment for the full incident). This canvas fills the same box and
 * inherits that same positioning discipline via a plain `absolute inset-0` on itself, not
 * a second containing-block decision — a `fixed` canvas layer here would reopen the exact
 * sidebar-covering trap the ground div itself was just fixed for.
 */
export function PlanGroundGlow() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      const rect = parent!.getBoundingClientRect();
      canvas!.width = Math.max(1, Math.round(rect.width * dpr));
      canvas!.height = Math.max(1, Math.round(rect.height * dpr));
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    const start = performance.now();
    let raf = 0;

    function paint(nowMs: number) {
      const rect = parent!.getBoundingClientRect();
      drawAmbientLight(ctx!, rect.width, rect.height, (nowMs - start) / 1000);
    }

    if (reducedMotion) {
      // Static, not animated — same posture as ultra-ambient.tsx's and usage-indicator.tsx's
      // own reduced-motion frame: the surface still reads as intended, nothing moves.
      paint(start);
    } else {
      // Paint once, synchronously, before the loop starts — not just inside `tick`. Without
      // this the ground shows its plain CSS gradient with no glow at all for however long
      // the first `requestAnimationFrame` takes to fire, exactly the gap usage-indicator.tsx
      // fixed for its own canvas (see that file's identical comment) — more visible here
      // since this canvas covers the whole page rather than a 128×44 chip.
      paint(start);
      const tick = (now: number) => {
        paint(now);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }

    return () => {
      window.removeEventListener("resize", resize);
      if (raf) cancelAnimationFrame(raf);
    };
    // `reducedMotion` in the dependency array, not read once — an OS setting flipped
    // mid-session tears down a running RAF loop and repaints one static frame instead, or
    // the reverse, without needing a reload. Same reasoning as usage-indicator.tsx's
    // identical dependency-array comment.
  }, [reducedMotion]);

  return <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />;
}
