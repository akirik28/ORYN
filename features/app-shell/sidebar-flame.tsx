"use client";

import { useEffect, useRef } from "react";
import type { PlanTier } from "@/types/database";

/**
 * Animated flame texture for the Ultra-tier sidebar (2026-09-02). The founder rejected the
 * page-level ambient glow as "just a blur" and asked specifically for the bar itself to look
 * like it's burning, with real motion in the pixels — a static gradient, however vivid,
 * doesn't satisfy that. This is a ported, founder-pre-approved reference (CEO handoff, from
 * a tier-bar artifact the founder already signed off on), adapted to this component's props
 * and to reading this app's own tokens rather than a second hardcoded palette.
 *
 * THE ONE RULE THAT MATTERS, carried over verbatim because it was learned the hard way
 * (not in this codebase): brightness is a CONTINUOUS FUNCTION of (position, time) inside
 * drawFlame below. No wave objects, no particle pool, no emitter, no lifetimes. Two earlier
 * attempts at this exact effect held waves as objects and both visibly froze after ~20s —
 * the problem was never that lifetimes were too short, it was that lifetimes existed at all.
 * A closed-form function has nothing to run out of. Do not "fix" a stall in this function by
 * tuning a duration; that's re-introducing the bug this rule exists to rule out.
 *
 * Self-gated on `tier`, matching ultra-ambient.tsx's own shape exactly (same reason: directly
 * unit-testable in isolation with the same RAF-spy pattern, rather than needing the caller's
 * render logic to prove the battery-safety property). Sidebar renders this unconditionally;
 * this component decides whether to actually draw or animate.
 */
export function SidebarFlame({ tier }: { tier: PlanTier }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || tier !== "ultra") return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    // Reads the same tokens tier-grad-text/tier-grad-fill draw from (app/globals.css), so
    // retuning that palette retunes the flame too instead of leaving a second copy to drift.
    // "Hot" (the flame tip) has no token of its own — nothing else in the app needs a fourth
    // color just for this one highlight.
    const style = getComputedStyle(document.documentElement);
    const palette: Palette = {
      hot: [255, 244, 214],
      core: hexToRgb(style.getPropertyValue("--tier-grad-1")) ?? [255, 194, 74],
      far: hexToRgb(style.getPropertyValue("--tier-grad-3")) ?? [232, 52, 44],
    };

    function resize() {
      const rect = parent!.getBoundingClientRect();
      canvas!.width = Math.max(1, Math.round(rect.width * dpr));
      canvas!.height = Math.max(1, Math.round(rect.height * dpr));
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    let raf = 0;

    function paint(nowMs: number) {
      const rect = parent!.getBoundingClientRect();
      drawFlame(ctx!, rect.width, rect.height, (nowMs - start) / 1000, palette);
    }

    if (reduceMotion) {
      // Static, not animated — same posture as ultra-ambient.tsx's own reduced-motion
      // frame: the surface still reads premium, nothing moves.
      paint(start);
    } else {
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
  }, [tier]);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0" />;
}

interface Palette {
  hot: [number, number, number];
  core: [number, number, number];
  far: [number, number, number];
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Ported from the founder-approved reference (CEO handoff, 2026-09-02) — see this file's
 * header comment for the rule that governs every line here. The reference was already
 * adapted for a vertical bar (flame travels up the long axis); kept intact rather than
 * re-derived, including the dot-matrix/additive-compositing/turbulence structure, since
 * it's the specific effect already signed off on, not a new design.
 */
function drawFlame(ctx: CanvasRenderingContext2D, W: number, H: number, T: number, palette: Palette) {
  ctx.clearRect(0, 0, W, H);
  if (W <= 0 || H <= 0) return;

  const pitch = Math.max(9, Math.round(W / 8.6));
  const cols = Math.max(6, Math.floor(W / pitch));
  const rows = Math.max(14, Math.floor(H / pitch));
  const ox = (W - cols * pitch) / 2 + pitch / 2;
  const oy = (H - rows * pitch) / 2 + pitch / 2;
  const flowSpeed = 1.3;
  const mid = (cols - 1) / 2 || 1;

  const hx = palette.hot[0] * 0.55 + palette.core[0] * 0.45;
  const hy = palette.hot[1] * 0.55 + palette.core[1] * 0.45;
  const hz = palette.hot[2] * 0.55 + palette.core[2] * 0.45;

  // Additive: overlapping glow ADDS rather than painting over, so no dot occludes the one
  // behind it — the literal implementation of "etraftan çıkan ışık birbirini kapamasın."
  ctx.globalCompositeOperation = "lighter";

  const bloom = ctx.createLinearGradient(0, H, 0, 0);
  bloom.addColorStop(0, `rgba(${palette.hot.join(",")},0.22)`);
  bloom.addColorStop(0.16, `rgba(${palette.core.join(",")},0.17)`);
  bloom.addColorStop(0.55, `rgba(${palette.far.join(",")},0.1)`);
  bloom.addColorStop(1, `rgba(${palette.far.join(",")},0)`);
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, W, H);

  for (let j = 0; j < rows; j++) {
    const py = oy + j * pitch;
    const behind = H - py;
    const taper = 1 - Math.min(1, behind / (H * 0.98));
    const halfW = 0.34 + 0.78 * taper;
    const env = Math.max(0.22, 1 - behind / (H * 1.25));
    const flick = 0.84 + 0.16 * Math.sin(T * 8.7 + j * 2.31);

    const cool = Math.min(1, behind / (H * 0.5));
    let a0: [number, number, number], a1: [number, number, number], f: number;
    if (cool < 0.4) {
      a0 = palette.hot;
      a1 = palette.core;
      f = cool / 0.4;
    } else {
      a0 = palette.core;
      a1 = palette.far;
      f = (cool - 0.4) / 0.6;
    }
    const cr = a0[0] + (a1[0] - a0[0]) * f;
    const cg = a0[1] + (a1[1] - a0[1]) * f;
    const cb = a0[2] + (a1[2] - a0[2]) * f;

    for (let i = 0; i < cols; i++) {
      const px = ox + i * pitch;
      const vx = (i - (cols - 1) / 2) / mid;

      const lag = Math.sin(vx * 2.4 + T * 1.55) * 0.3 + Math.sin(vx * 5.1 - T * 2.25) * 0.13;
      const phase = behind / (H * 0.155) - T * flowSpeed + lag;
      const r1 = Math.pow(0.5 + 0.5 * Math.sin(phase * 6.28318), 2.1);
      const r2 = Math.pow(0.5 + 0.5 * Math.sin(phase * 12.5664 + vx * 1.7 + T * 0.9), 3.2);
      const vprof = Math.exp(-(vx * vx) / (2 * halfW * halfW));
      const flow = (r1 * 0.8 + r2 * 0.36) * env * vprof * flick * 1.32;

      const z = 0.5 + 0.5 * Math.sin(T * 0.85 + j * 0.41 + i * 1.07);
      const lift = Math.pow(z, 1.55);
      const rad = (1.5 + Math.min(2.7, flow * 2.1)) * (0.56 + 0.82 * lift);
      const alpha = Math.min(1, (0.15 + flow) * (0.5 + 0.64 * lift));
      const fwd = Math.min(1, lift * flow * 1.15);
      const R = cr + (hx - cr) * fwd;
      const G = cg + (hy - cg) * fwd;
      const B = cb + (hz - cb) * fwd;

      ctx.beginPath();
      ctx.arc(px, py, rad, 0, 6.2832);
      ctx.fillStyle = `rgba(${R | 0},${G | 0},${B | 0},${alpha.toFixed(3)})`;
      ctx.fill();
    }
  }
  ctx.globalCompositeOperation = "source-over";
}
