"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { formatAbsoluteDate } from "@/lib/i18n/date";
import { formatTokenCount } from "@/lib/i18n/format";
import { usageState } from "@/lib/ai/usage-state";
import { usePrefersReducedMotion } from "@/lib/ui/use-prefers-reduced-motion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Locale } from "@/lib/i18n/config";
import type { MonthlyQuota } from "@/lib/ai/monthly-quota";
import type { PlanTier } from "@/types/database";

/**
 * Founder, 2026-09-02, verbatim: "token limitini kullanıcılar da görsün, yani bir bar
 * olsun, hep görünen, rengi falan değişsin — ben çok sessizce yapmak istemiyorum çünkü
 * sonra bize suç atacak" — a visible usage bar, always present, colour changes with
 * state, explicitly not silent. features/advisor/monthly-usage-meter.tsx already builds
 * the full panel (this month / remaining / a sentence) but its only caller is the advisor
 * page itself — everywhere else, a student's usage was invisible until they happened to
 * visit /advisor. This is that same signal, always on screen, in the app shell every
 * authenticated page shares (app/(app)/layout.tsx → Topbar on desktop, MobileNav below
 * lg) — reusing lib/ai/usage-state.ts's classification rather than a second one, and the
 * exact same advisor.usageMeter copy (Phase 57's register, already written) in the
 * tooltip rather than new wording for the same fact.
 *
 * Standard tier: deliberately the exact same small pill this always was — a `title`-shaped
 * tooltip carrying the one sentence the founder's "not silently" reasoning calls for; the
 * full remaining-count/reset-date detail stays one tap away at /advisor. Never touched by
 * anything below; the whole point of this file's Ultra branch is that Standard is
 * byte-identical to before it existed.
 *
 * Ultra tier, second founder request the same night, verbatim: "onu biraz daha havalı
 * yapalım büyüt ve pixel pixel yanıyor efektini ver bittikçe rengi değişsin falan ama
 * dalgalansın ora da" — bigger, a pixel-by-pixel burning effect, colour changes with
 * depletion, and it should undulate. Widened again, third request that same night after
 * seeing it live — "üstteki bar bildirimlerin solundaki barı uzat biraz daha" — w-24 to
 * w-32; the height stays as first built, only the length grew a second time. Built on the
 * exact reference oryn-a7 handed off
 * (features/app-shell/sidebar-flame.tsx, itself ported from a founder-approved prototype,
 * 99.11% coverage) — the per-dot math below (turbulence, additive compositing, the
 * white-hot-to-tail temperature ramp) is that same closed-form structure, re-oriented
 * horizontal (this chip is wide and short; the sidebar is tall and narrow) with the "how
 * far the flame reaches" driven by `1 - quota.fraction` instead of a fixed full height —
 * a fuller allowance genuinely burns longer and taller, a nearly-spent one gutters down to
 * embers at the base. Same non-negotiable rule as the reference: brightness is a
 * *continuous function of position and time*. No wave objects, no particle pool, no
 * lifetimes — that architecture stalled twice before this pattern existed, and the fix was
 * never a longer lifetime, it was removing lifetimes as a concept.
 *
 * **The flame only ever renders for the "normal" state — degraded/low/exhausted/unknown
 * all keep today's exact plain colour-fill treatment, just inside the bigger Ultra
 * container.** This is deliberate, not a shortcut: the flame's own palette
 * (`--tier-grad-1/2/3`, gold through red) sits in the *same hue family* as the existing
 * amber "low/degraded" and rose "exhausted" warning colours (flagged before any of this
 * was built, oryn-3f's fleet principle — Ultra may add signal, it may never make two
 * previously-distinguishable states harder to tell apart). Reserving the flame for
 * "everything's fine" and falling back to the plain, already-proven amber/rose/dashed
 * treatment the instant it isn't keeps that guarantee by construction: a warning state
 * never has to compete with a flame occupying the same colour space, because the two never
 * render at the same time. `usedIsKnown: false` never gets the flame either way — a
 * burning bar is more attractive than a static one, which is exactly why it must never be
 * the thing shown when the real number underneath isn't actually known.
 */
export function UsageIndicator({ quota, budgetDegraded, tier }: { quota: MonthlyQuota; budgetDegraded: boolean; tier: PlanTier }) {
  const t = useTranslations("advisor.usageMeter");
  const locale = useLocale() as Locale;
  const state = usageState(quota, budgetDegraded);
  const resets = formatAbsoluteDate(quota.resetsAt, locale, { month: "short", day: "numeric" });

  const sentence =
    state === "unknown"
      ? t("unknown", { limit: formatTokenCount(quota.limit), date: resets })
      : state === "exhausted"
        ? t("exhausted", { limit: formatTokenCount(quota.limit), date: resets })
        : state === "degraded"
          ? t("degraded", { date: resets })
          : state === "low"
            ? t("low", { remaining: formatTokenCount(quota.remaining), date: resets })
            : t("normal", { remaining: formatTokenCount(quota.remaining), date: resets });

  const fillColor =
    state === "exhausted"
      ? "bg-rose-500"
      : state === "degraded" || state === "low"
        ? "bg-amber-500"
        : "bg-indigo-500 dark:bg-violet-400";

  // Same 3% floor as the full meter — a last message or two stays a visible sliver rather
  // than rounding away to nothing, and "unknown" never claims a fraction it doesn't have.
  const fillWidth = state === "unknown" ? 0 : state === "exhausted" ? 0 : Math.max((1 - quota.fraction) * 100, 3);

  const isUltra = tier === "ultra";
  const showFlame = isUltra && state === "normal";

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            href="/advisor"
            style={isUltra ? undefined : { background: "white", borderColor: "#EEEEF6" }}
            className={cn(
              "flex shrink-0 items-center overflow-hidden rounded-[9px] border px-2 transition-colors hover:border-current focus-visible:outline-none",
              isUltra
                ? "h-11 w-32 border-[#2A2440] bg-[#100D1B] dark:border-white/12"
                : "h-[34px] w-14 dark:border-white/12 dark:bg-transparent",
            )}
          />
        }
        aria-label={sentence}
      >
        {showFlame ? (
          <FlameFill fraction={quota.fraction} />
        ) : (
          <span
            className={cn("relative h-1.5 w-full overflow-hidden rounded-full", state === "unknown" ? "bg-black/10 dark:bg-white/10" : "bg-black/10 dark:bg-white/[0.07]")}
            aria-hidden="true"
          >
            {state === "unknown" ? (
              <span className="absolute inset-0 rounded-full border border-dashed border-black/20 dark:border-white/25" />
            ) : (
              <span className={cn("absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out", fillColor)} style={{ width: `${fillWidth}%` }} />
            )}
          </span>
        )}
      </TooltipTrigger>
      <TooltipContent>{sentence}</TooltipContent>
    </Tooltip>
  );
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
 * The canvas host — sized to fill its parent chip, gated on `usePrefersReducedMotion()`
 * the way this file's own header comment promises: read in the component body and carried
 * in the draw effect's own dependency array, not a mount-time `.matches` snapshot like the
 * reference this was ported from. A continuously burning bar living in the persistent app
 * shell, on every authenticated page, is exactly the case docs/reduced-motion-standard-
 * 2026-09-02.md named that mount-only pattern as a real gap for — this is the first real
 * caller of lib/ui/use-prefers-reduced-motion.ts, built to close it rather than repeat it.
 */
function FlameFill({ fraction }: { fraction: number }) {
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
    // Reads the same tokens sidebar-flame.tsx/tier-grad-text/tier-grad-fill draw from
    // (app/globals.css) — one Ultra flame identity across the app, not a second palette
    // invented for this one surface.
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

    const start = performance.now();
    let raf = 0;

    function paint(nowMs: number) {
      const rect = parent!.getBoundingClientRect();
      drawUsageFlame(ctx!, rect.width, rect.height, (nowMs - start) / 1000, palette, fraction);
    }

    if (reducedMotion) {
      // Static, not animated — same posture as ultra-ambient.tsx's and sidebar-flame.tsx's
      // own reduced-motion frame: the surface still reads premium, nothing moves. One
      // paint call, no RAF started at all.
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
    // `reducedMotion` in the dependency array (not read once) is the entire point: an OS
    // setting flipped mid-session tears down a running RAF loop and repaints one static
    // frame instead, or the reverse, without needing a reload.
  }, [fraction, reducedMotion]);

  return <canvas ref={canvasRef} aria-hidden="true" className="h-full w-full" />;
}

/**
 * Ported from features/app-shell/sidebar-flame.tsx's own reference (CEO handoff,
 * founder-approved prototype) and re-oriented: that version travels up a tall, narrow bar
 * from a fixed full height; this one travels rightward across a short, wide chip from a
 * fixed left edge, and "how far it reaches" is `healthyFraction * W` instead of always the
 * full axis — the one real behavioural difference the depletion signal needs. Every other
 * term (turbulence via row-lag, the temperature ramp, additive compositing, the flicker
 * and depth-breathing) is the same closed-form structure, not re-derived.
 *
 * `healthyFraction` is `1 - quota.fraction` — full allowance burns the whole width; a
 * nearly-spent one gutters down to a short flicker of embers at the base. Never called for
 * anything but the "normal" state (see this file's own header comment for why), so there
 * is no ambiguity about what a shrinking flame here means — no adjacent state ever needs
 * to compete with it for the same visual language.
 */
function drawUsageFlame(ctx: CanvasRenderingContext2D, W: number, H: number, T: number, palette: Palette, healthyFraction: number): void {
  ctx.clearRect(0, 0, W, H);
  if (W <= 0 || H <= 0) return;

  // Floored, not zero, even at genuinely 0 remaining — this function only ever runs for
  // the "normal" state, where remaining is never actually zero, but a small floor keeps
  // the matrix from collapsing to a single degenerate column if it ever is.
  const extent = Math.max(W * Math.min(1, Math.max(0, healthyFraction)), 8);

  const pitch = Math.max(6, Math.round(H / 5.2));
  const cols = Math.max(10, Math.floor(W / pitch));
  const rows = Math.max(4, Math.floor(H / pitch));
  const ox = (W - cols * pitch) / 2 + pitch / 2;
  const oy = (H - rows * pitch) / 2 + pitch / 2;
  const flowSpeed = 1.3;
  const mid = (rows - 1) / 2 || 1;

  const hx = palette.hot[0] * 0.55 + palette.core[0] * 0.45;
  const hy = palette.hot[1] * 0.55 + palette.core[1] * 0.45;
  const hz = palette.hot[2] * 0.55 + palette.core[2] * 0.45;

  // Additive: overlapping glow ADDS rather than painting over — "etraftan çıkan ışık
  // birbirini kapamasın" carried over from the reference verbatim.
  ctx.globalCompositeOperation = "lighter";

  const bloom = ctx.createLinearGradient(0, 0, W, 0);
  bloom.addColorStop(0, `rgba(${palette.hot.join(",")},0.22)`);
  bloom.addColorStop(0.16, `rgba(${palette.core.join(",")},0.17)`);
  bloom.addColorStop(0.55, `rgba(${palette.far.join(",")},0.1)`);
  bloom.addColorStop(1, `rgba(${palette.far.join(",")},0)`);
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < cols; i++) {
    const px = ox + i * pitch;
    const behind = px; // distance travelled rightward from the base at x=0
    const taper = 1 - Math.min(1, behind / (extent * 0.98));
    const halfH = 0.34 + 0.78 * taper;
    const env = Math.max(0.05, 1 - behind / (extent * 1.25));
    const flick = 0.84 + 0.16 * Math.sin(T * 8.7 + i * 2.31);

    const cool = Math.min(1, behind / (extent * 0.5));
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

    for (let j = 0; j < rows; j++) {
      const py = oy + j * pitch;
      const vy = (j - (rows - 1) / 2) / mid; // -1..1 across the bar's height

      const lag = Math.sin(vy * 2.4 + T * 1.55) * 0.3 + Math.sin(vy * 5.1 - T * 2.25) * 0.13;
      const phase = behind / (extent * 0.155) - T * flowSpeed + lag;
      const r1 = Math.pow(0.5 + 0.5 * Math.sin(phase * 6.28318), 2.1);
      const r2 = Math.pow(0.5 + 0.5 * Math.sin(phase * 12.5664 + vy * 1.7 + T * 0.9), 3.2);
      const vprof = Math.exp(-(vy * vy) / (2 * halfH * halfH));
      const flow = (r1 * 0.8 + r2 * 0.36) * env * vprof * flick * 1.32;

      const z = 0.5 + 0.5 * Math.sin(T * 0.85 + i * 0.41 + j * 1.07);
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
