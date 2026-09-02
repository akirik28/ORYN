"use client";

import { useEffect, useRef } from "react";
import type { PlanTier } from "@/types/database";

/** Mirrors app/globals.css's [data-tier="ultra"] --tier-grad-1/2/3 — a canvas can't read a
 * CSS custom property directly, so these are kept in sync by hand, both places labeled. */
const EMBER_COLORS = ["255,194,74", "255,122,26", "232,52,44"] as const;

/** Matches the founder-approved prototype's own density (`Math.min(46, W/16)`) — capped
 * regardless of viewport width, so this never scales into a performance or "too busy" risk
 * on a very wide screen. */
function particleCountFor(width: number): number {
  return Math.max(0, Math.round(Math.min(46, width / 16)));
}

interface Particle {
  x: number;
  y: number;
  r: number;
  vy: number;
  vx: number;
  a: number;
  colorIndex: 0 | 1 | 2;
}

function spawn(width: number, height: number, y: number): Particle {
  return {
    x: Math.random() * width,
    y,
    r: 0.6 + Math.random() * 1.7,
    vy: 0.16 + Math.random() * 0.42,
    vx: (Math.random() - 0.5) * 0.16,
    a: 0.15 + Math.random() * 0.5,
    colorIndex: Math.random() < 0.45 ? 0 : Math.random() < 0.72 ? 1 : 2,
  };
}

/**
 * The single ambient layer for the whole app (2026-09-02, Ultra visual tier foundation).
 * Mounted once in app/(app)/layout.tsx, next to the existing RouteAmbientBlobs — same
 * `position: fixed; inset: 0; pointer-events: none` convention that component already
 * established, so DOM placement doesn't matter and every authenticated page gets this for
 * free with no per-page wiring.
 *
 * Two responsibilities, both gated on the exact same `tier === "ultra"` check:
 * 1. Sets `data-tier` on `<html>` — the single source of truth every [data-tier="ultra"]
 *    CSS selector in the app reads, per this whole feature's own architecture (see
 *    app/globals.css's Ultra section). Set here rather than server-side on <html> itself
 *    because the root layout (app/layout.tsx) wraps public, unauthenticated pages too and
 *    has no session to read a plan tier from — this stays scoped to the authenticated
 *    shell, so a signed-out visitor's <html> never carries the attribute at all.
 * 2. Owns the one ember canvas. The RAF loop only ever runs when both `tier === "ultra"`
 *    AND motion isn't reduced — never for a standard-tier student, which is the whole
 *    point: a background animation running for free users is a battery bug, not a feature.
 *
 * No large blur halo here on purpose — the ambient glow div below is deliberately soft and
 * low-opacity (a wash, not a spotlight), and it is the ONLY blur in this entire feature.
 * Every other Ultra-aware element (gradient text, chip glow, the flowing top bar) uses
 * app/globals.css's small, bounded treatments — see that file's own header comment for the
 * rule this component exists to be the one exception to.
 */
export function UltraAmbient({ tier }: { tier: PlanTier }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number | null>(null);
  const sizeRef = useRef({ width: 0, height: 0 });

  useEffect(() => {
    const html = document.documentElement;
    // See app/globals.css's own comment on .tier-transition-lock for the full story: an
    // element with transition-colors/transition-all whose color depends on --primary (or
    // any other tier-driven custom property) gets stuck on its pre-tier color the first
    // time this effect sets the attribute, because that's a post-mount DOM mutation, not a
    // class the element itself gains — confirmed live, not a general transition bug, only
    // this specific first-application timing. Locking transitions off for one frame around
    // the mutation, then releasing them, avoids the stuck frame instead of asking every
    // future tier-reactive element to remember to avoid transition-colors.
    html.classList.add("tier-transition-lock");
    // Only ever set for a real "ultra" value, never `data-tier="standard"` — every selector
    // in the app is `[data-tier="ultra"]`, so a literal "standard" string would be
    // functionally identical to leaving the attribute off, but absence is the cleaner
    // signal: exactly one value ever appears in the DOM, and nothing has to special-case a
    // stale "standard" left over if a third tier is ever added later.
    if (tier === "ultra") {
      html.dataset.tier = tier;
    } else {
      delete html.dataset.tier;
    }
    // Forces layout/style recalculation to happen NOW, while transitions are still locked,
    // rather than whenever the browser next feels like it — the lock has to be in effect
    // for the actual recalculation that picks up the new color, not just for the DOM write.
    void html.offsetHeight;
    const unlock = setTimeout(() => html.classList.remove("tier-transition-lock"), 50);
    return () => {
      clearTimeout(unlock);
      html.classList.remove("tier-transition-lock");
      // Only this component's own effect ever sets this attribute, so cleaning it up on
      // unmount (rather than leaving a stale "ultra" behind) is safe and correct — the
      // whole app shell unmounts together, not this component alone.
      delete html.dataset.tier;
    };
  }, [tier]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || tier !== "ultra") return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      sizeRef.current = { width, height };
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function seed() {
      const { width, height } = sizeRef.current;
      particlesRef.current = Array.from({ length: particleCountFor(width) }, () => spawn(width, height, Math.random() * height));
    }

    function drawFrame(fadeFactor: (particle: Particle) => number) {
      const { width, height } = sizeRef.current;
      ctx!.clearRect(0, 0, width, height);
      for (const p of particlesRef.current) {
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${EMBER_COLORS[p.colorIndex]},${(p.a * fadeFactor(p)).toFixed(3)})`;
        ctx!.fill();
      }
    }

    function tick() {
      const { width, height } = sizeRef.current;
      const particles = particlesRef.current;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.y -= p.vy;
        p.x += p.vx + Math.sin(p.y / 44) * 0.14;
        if (p.y < -6) particles[i] = spawn(width, height, height + 6);
      }
      drawFrame((p) => (p.y < height * 0.28 ? Math.max(0, p.y / (height * 0.28)) : 1));
      rafRef.current = requestAnimationFrame(tick);
    }

    resize();
    seed();
    window.addEventListener("resize", resize);

    if (reduceMotion) {
      // A static, premium-looking frame — not a degraded/empty one. No RAF loop at all.
      drawFrame(() => 0.8);
    } else {
      rafRef.current = requestAnimationFrame(tick);
    }

    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [tier]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* The one ambient glow for the whole app — soft, low-opacity, slowly rotating.
          Invisible (opacity: 0) whenever [data-tier="ultra"] isn't set, so this costs
          nothing for a standard-tier render beyond one inert div. */}
      <div className="ultra-ambient-glow" />
      <canvas ref={canvasRef} className="ultra-ambient-embers" />
    </div>
  );
}
