"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { updateResponseMode } from "@/app/(app)/settings/actions";
import { formatAbsoluteDate } from "@/lib/i18n/date";
import { formatTokenCount } from "@/lib/i18n/format";
import { usePrefersReducedMotion } from "@/lib/ui/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n/config";
import type { MonthlyQuota } from "@/lib/ai/monthly-quota";
import type { ResponseMode } from "@/types/database";

const MODES: readonly ResponseMode[] = ["fast", "balanced", "thorough"];

function idxForMode(mode: ResponseMode): number {
  return MODES.indexOf(mode);
}

/**
 * Fast / Standard / Ultra — the response-mode control from the founder-approved prototype
 * (oryn-bar-motion.html), founder's own words: "hızlı standart ultra kayacının tasarımı
 * var zaten yaptın ya o çok güzeldi" (the design already exists, you already made it, it
 * was lovely). Ported, not redesigned: the glowing ball travelling a three-position track,
 * the dot-matrix flowing only at Ultra — completely static (density ramp, no motion) at
 * Fast and Standard, "that contrast is the whole point of the design, not decoration" —
 * and the white-hot-to-tail colour ramp are all the prototype's own structure. Dropped:
 * the prototype's own auto-cycling demo sequence and play/pause/speed controls — scratch
 * scaffolding built so the founder could preview the effect without dragging it themselves,
 * not something a real advisor page should do on its own.
 *
 * Two deliberate departures from the prototype's literal values, both because the
 * prototype's own numbers were illustrative rather than derived from anything real:
 *
 * 1. **Ultra's flame reads the app's own `--tier-grad-1/2/3` tokens** (the same ones
 *    features/app-shell/sidebar-flame.tsx and features/app-shell/usage-indicator.tsx's
 *    flame already read), not the prototype's own invented `--blue`/`--red`/`--hot` set.
 *    One Ultra flame identity across the product, not a second palette for this one
 *    surface — Fast/Standard reuse this app's own `--info`/`--brand-primary` tokens for
 *    the same reason.
 * 2. **One token figure, not three.** The prototype's `TOK` array gives each mode its own
 *    used/limit pair — demo values with no real derivation behind them (oryn-a7's own
 *    words: "those specific numbers are prototype values"). The real allowance
 *    (lib/ai/monthly-quota.ts) is one shared pool across all seven student-facing
 *    features, unaffected by which response mode is merely selected — showing a different
 *    number per mode here would either require inventing a per-mode projection with no
 *    real basis, or silently disagreeing with the exact same `quota` the sidebar meter and
 *    topbar chip already show. This renders the one real number instead.
 *
 * **What "Ultra" means while spend-degraded, decided deliberately, not left ambiguous**
 * (lib/ai/limits/budget.ts's degrade always overrides which model actually answers, the
 * same way it already silently overrides advisor_chat today): the ball's position always
 * reflects the saved preference, honestly, never a fake/dead control — a student setting
 * today's preference for after next month's reset is a real thing to want. But the flame
 * only actually flows when Ultra is BOTH selected AND currently in effect; while
 * `budgetDegraded` is true, Ultra's matrix stays static like Fast/Standard's always does,
 * and the note below the track says so in the same register the composer's own degrade
 * copy already uses. Silence here would be the fake-button failure this project forbids —
 * a control showing "Ultra" while quietly answering with the cheaper model and never
 * saying so.
 */
export function ResponseModeSlider({
  responseMode,
  budgetDegraded,
  quota,
}: {
  responseMode: ResponseMode;
  budgetDegraded: boolean;
  quota: MonthlyQuota;
}) {
  const t = useTranslations("advisor.responseMode");
  const locale = useLocale() as Locale;
  const reducedMotion = usePrefersReducedMotion();
  const [mode, setMode] = useState(responseMode);
  const [isPending, startTransition] = useTransition();
  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Spring state lives in refs, not React state — it changes every animation frame, and
  // routing that through setState would re-render this component 60 times a second for
  // no visual benefit the canvas itself doesn't already provide.
  const springRef = useRef({ cur: idxForMode(responseMode) / 2, target: idxForMode(responseMode) / 2, vel: 0 });

  const idx = idxForMode(mode);
  const ultraActive = mode === "thorough" && !budgetDegraded;
  const resets = formatAbsoluteDate(quota.resetsAt, locale, { month: "short", day: "numeric" });

  function commit(nextIdx: number) {
    const clamped = Math.max(0, Math.min(2, nextIdx));
    const next = MODES[clamped]!;
    if (next === mode) return;
    const previous = mode;
    setMode(next); // optimistic — same rollback-on-error shape as
    // features/applications/status-control.tsx's changeStatus
    springRef.current.target = clamped / 2;
    startTransition(async () => {
      const result = await updateResponseMode(next);
      if (result.error) {
        setMode(previous);
        springRef.current.target = idxForMode(previous) / 2;
        toast.error(result.error);
      }
    });
  }

  function handlePointer(clientX: number) {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    commit(Math.round(((clientX - rect.left) / rect.width) * 2));
  }

  // Draws + drives the spring. One paint under reduced motion (ball snaps straight to
  // target, matrix never flows regardless of mode); a continuous RAF loop otherwise. Same
  // "check before ever starting the loop, dependency array not a mount-time read" shape
  // this file's own header points at — reducedMotion here is what makes a live OS toggle
  // actually stop the loop mid-session instead of waiting for a reload.
  useEffect(() => {
    const canvas = canvasRef.current;
    const track = trackRef.current;
    if (!canvas || !track) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const style = getComputedStyle(document.documentElement);
    const palette = paletteFor(idx, style);

    function resize() {
      const rect = track!.getBoundingClientRect();
      canvas!.width = Math.max(1, Math.round(rect.width * dpr));
      canvas!.height = Math.max(1, Math.round(rect.height * dpr));
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    const t0 = performance.now();

    function paint(now: number) {
      const rect = track!.getBoundingClientRect();
      const spring = springRef.current;
      spring.cur += (spring.target - spring.cur) * 0.14 * 0.86;
      // `palette`/`ultraActive` from the effect's own outer scope, not re-derived from the
      // ball's eased position — matches the prototype's own behaviour exactly: colour and
      // whether the matrix flows snap instantly to the new target the moment it's chosen,
      // independent of the ball still easing toward it. Only the ball's position glides.
      drawResponseModeFlame(ctx!, rect.width, rect.height, (now - t0) / 1000, palette, spring.cur, ultraActive);
    }

    if (reducedMotion) {
      springRef.current.cur = springRef.current.target;
      paint(t0);
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
  }, [idx, ultraActive, reducedMotion]);

  return (
    <div className="rounded-2xl border border-white/65 bg-white/45 p-4 backdrop-blur-xl dark:border-white/12 dark:bg-white/[0.04]">
      <div className="mb-2 flex flex-wrap items-baseline gap-2">
        <span className="text-xs text-muted-foreground">{t("label")}</span>
        <span className="font-display text-base font-semibold" style={{ color: paletteColor(idx) }}>
          {t(`modes.${mode}`)}
        </span>
        <span className="ml-auto font-mono text-sm tabular-nums" style={{ color: paletteColor(idx) }}>
          {formatTokenCount(quota.remaining)}
          <span className="ml-1 text-xs font-normal text-muted-foreground">/ {formatTokenCount(quota.limit)} {t("tokens")}</span>
        </span>
      </div>

      <div ref={trackRef} className="relative h-[52px] cursor-pointer touch-none overflow-hidden rounded-2xl border border-black/10 bg-[#100D1B]">
        <canvas ref={canvasRef} aria-hidden="true" className="block h-full w-full" />
        {/* Overlay is the real interactive/accessible surface; the canvas underneath is
            purely decorative — same split ultra-ambient.tsx's own aria-hidden canvas uses. */}
        <div
          role="slider"
          tabIndex={isPending ? -1 : 0}
          aria-label={t("ariaLabel")}
          aria-valuemin={0}
          aria-valuemax={2}
          aria-valuenow={idx}
          aria-valuetext={t(`modes.${mode}`)}
          className="absolute inset-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          onPointerDown={(e) => handlePointer(e.clientX)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowUp") {
              commit(idx + 1);
              e.preventDefault();
            } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
              commit(idx - 1);
              e.preventDefault();
            }
          }}
        />
      </div>

      <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
        <span className={cn(idx === 0 && "font-medium text-foreground")}>{t("modes.fast")}</span>
        <span className={cn(idx === 2 && "font-medium text-foreground")}>{t("modes.thorough")}</span>
      </div>

      {mode === "thorough" && budgetDegraded ? (
        <p className="mt-2.5 text-xs text-muted-foreground">{t("overridden", { date: resets })}</p>
      ) : null}
    </div>
  );
}

interface FlamePalette {
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

/** Fast/Standard reuse this app's own `--info`/`--brand-primary` tokens (this file's own
 * header explains why, over the prototype's invented `--fast`/`--std` set); Ultra reuses
 * the same `--tier-grad-1/2/3` flame identity every other Ultra surface already reads. */
function paletteFor(modeIdx: number, style: CSSStyleDeclaration): FlamePalette {
  if (modeIdx === 2) {
    return {
      hot: [255, 244, 214],
      core: hexToRgb(style.getPropertyValue("--tier-grad-1")) ?? [255, 194, 74],
      far: hexToRgb(style.getPropertyValue("--tier-grad-3")) ?? [232, 52, 44],
    };
  }
  if (modeIdx === 1) {
    const std = hexToRgb(style.getPropertyValue("--brand-primary")) ?? [99, 91, 240];
    return { hot: [244, 242, 255], core: [196, 186, 255], far: std };
  }
  const fast = hexToRgb(style.getPropertyValue("--info")) ?? [76, 155, 255];
  return { hot: [238, 255, 254], core: [196, 244, 242], far: fast };
}

function paletteColor(modeIdx: number): string {
  return modeIdx === 2 ? "var(--tier-grad-3)" : modeIdx === 1 ? "var(--brand-primary)" : "var(--info)";
}

/**
 * Ported from the founder-approved prototype's own `draw()` (oryn-bar-motion.html) —
 * closed-form, no wave objects, no particle pool, no lifetimes, the identical rule this
 * whole flame family shares (features/app-shell/sidebar-flame.tsx, usage-indicator.tsx):
 * brightness is a continuous function of position and time, so it cannot stall. `cur` is
 * the ball's spring-eased position (0..1 across the track, driven by the caller's own RAF
 * loop, not by anything in here); `flowing` gates the one thing the prototype's own note
 * insists on — "sadece Ultra'da var" (only exists at Ultra) — the matrix is a completely
 * static density ramp at Fast/Standard, no time-dependent motion at all, and only starts
 * flowing once `flowing` is true. Additive compositing, row-lag turbulence, the
 * white-hot-to-tail temperature ramp and the depth-breathing dots are the prototype's own
 * structure, re-typed, not re-derived.
 */
function drawResponseModeFlame(ctx: CanvasRenderingContext2D, W: number, H: number, T: number, palette: FlamePalette, cur: number, flowing: boolean): void {
  ctx.clearRect(0, 0, W, H);
  if (W <= 0 || H <= 0) return;

  const ballR = Math.min(18, H * 0.42);
  const bx = ballR + 4 + cur * (W - 2 * (ballR + 4));
  const by = H / 2;

  const pitch = Math.max(6, Math.round(H / 5.2));
  const cols = Math.max(14, Math.floor(W / pitch));
  const rows = Math.max(6, Math.floor(H / pitch));
  const ox = (W - cols * pitch) / 2 + pitch / 2;
  const oy = (H - rows * pitch) / 2 + pitch / 2;
  const flowSpeed = 1.55;
  const mid = (rows - 1) / 2 || 1;

  const hx = palette.hot[0] * 0.55 + palette.core[0] * 0.45;
  const hy = palette.hot[1] * 0.55 + palette.core[1] * 0.45;
  const hz = palette.hot[2] * 0.55 + palette.core[2] * 0.45;

  ctx.globalCompositeOperation = "lighter";

  if (flowing) {
    const bloom = ctx.createLinearGradient(bx, 0, Math.max(-W * 0.1, bx - W * 0.92), 0);
    bloom.addColorStop(0, `rgba(${palette.hot.join(",")},0.22)`);
    bloom.addColorStop(0.16, `rgba(${palette.core.join(",")},0.17)`);
    bloom.addColorStop(0.55, `rgba(${palette.far.join(",")},0.1)`);
    bloom.addColorStop(1, `rgba(${palette.far.join(",")},0)`);
    ctx.fillStyle = bloom;
    ctx.fillRect(0, 0, W, H);
  }

  for (let i = 0; i < cols; i++) {
    const colT = i / (cols - 1);
    const px = ox + i * pitch;
    const dens = 0.4 + 0.58 * Math.pow(colT, 1.05);
    const base = 0.15 + 0.48 * Math.pow(colT, 1.45);

    const behind = Math.max(0, bx - px);
    const taper = 1 - Math.min(1, behind / (W * 0.98));
    const halfH = 0.34 + 0.78 * taper;
    const env = Math.max(0.22, 1 - behind / (W * 1.25));
    const flick = 0.84 + 0.16 * Math.sin(T * 8.7 + i * 2.31);

    const cool = flowing ? Math.min(1, behind / (W * 0.5)) : 0.75;
    let a0: [number, number, number], a1: [number, number, number], f: number;
    if (flowing && cool < 0.4) {
      a0 = palette.hot;
      a1 = palette.core;
      f = cool / 0.4;
    } else {
      a0 = palette.core;
      a1 = palette.far;
      f = flowing ? (cool - 0.4) / 0.6 : cool;
    }
    const cr = a0[0] + (a1[0] - a0[0]) * f;
    const cg = a0[1] + (a1[1] - a0[1]) * f;
    const cb = a0[2] + (a1[2] - a0[2]) * f;

    const db = px - bx;
    const near = Math.exp(-(db * db) / (2 * (ballR * 1.7) * (ballR * 1.7)));

    for (let j = 0; j < rows; j++) {
      // Deterministic per-cell thinning (not Math.random — every frame must agree with
      // the last one, or the "no lifetimes" guarantee is broken by the back door).
      if (((i * 7 + j * 13) % 97) / 97 > dens) continue;
      const vy = (j - (rows - 1) / 2) / mid;

      const lag = Math.sin(vy * 2.4 + T * 1.55) * 0.3 + Math.sin(vy * 5.1 - T * 2.25) * 0.13;
      const phase = behind / (W * 0.155) - T * flowSpeed + lag;
      const r1 = Math.pow(0.5 + 0.5 * Math.sin(phase * 6.28318), 2.1);
      const r2 = Math.pow(0.5 + 0.5 * Math.sin(phase * 12.5664 + vy * 1.7 + T * 0.9), 3.2);
      const vprof = Math.exp(-(vy * vy) / (2 * halfH * halfH));
      const flow = flowing ? (r1 * 0.8 + r2 * 0.36) * env * vprof * flick * 1.32 : 0;

      const z = flowing ? 0.5 + 0.5 * Math.sin(T * 0.85 + i * 0.41 + j * 1.07) : 0.62;
      const lift = flowing ? Math.pow(z, 1.55) : z;
      const rad = (1.5 + Math.min(2.7, flow * 2.1 + near * 1.7)) * (0.56 + 0.82 * lift);
      const alpha = Math.min(1, (base + flow + near * (flowing ? 0.95 : 0.5)) * (0.5 + 0.64 * lift));
      const fwd = flowing ? Math.min(1, lift * flow * 1.15) : 0;
      const R = cr + (hx - cr) * fwd;
      const G = cg + (hy - cg) * fwd;
      const B = cb + (hz - cb) * fwd;

      ctx.beginPath();
      ctx.arc(px, oy + j * pitch, rad, 0, 6.2832);
      ctx.fillStyle = `rgba(${R | 0},${G | 0},${B | 0},${alpha.toFixed(3)})`;
      ctx.fill();
    }
  }

  const pulse = flowing ? 0.5 + 0.5 * Math.sin(performance.now() / 560) : 0.5 + 0.5 * Math.sin(performance.now() / 1500);
  const halo = ballR * (flowing ? 2.7 : 2.1) + pulse * ballR * (flowing ? 0.9 : 0.22);
  const hg = ctx.createRadialGradient(bx, by, ballR * 0.45, bx, by, halo);
  hg.addColorStop(0, `rgba(${palette.hot.join(",")},0.6)`);
  hg.addColorStop(0.34, `rgba(${palette.core.join(",")},0.34)`);
  hg.addColorStop(0.66, `rgba(${palette.far.join(",")},0.16)`);
  hg.addColorStop(1, `rgba(${palette.far.join(",")},0)`);
  ctx.beginPath();
  ctx.arc(bx, by, halo, 0, 6.2832);
  ctx.fillStyle = hg;
  ctx.fill();

  ctx.globalCompositeOperation = "source-over";
  const core = ctx.createRadialGradient(bx - ballR * 0.22, by - ballR * 0.24, ballR * 0.06, bx, by, ballR);
  core.addColorStop(0, "#ffffff");
  core.addColorStop(0.52, `rgba(${palette.hot.join(",")},1)`);
  core.addColorStop(1, `rgba(${palette.core.join(",")},1)`);
  ctx.beginPath();
  ctx.arc(bx, by, ballR, 0, 6.2832);
  ctx.fillStyle = core;
  ctx.fill();
}
