"use client";

import { useTransition } from "react";
import { setDevTierPreview } from "@/lib/tier/dev-preview-actions";
import type { PlanTier } from "@/types/database";

/**
 * Dev-only control for lib/tier/dev-preview.ts's override — see that file for what it is
 * and is not. Only ever rendered when the server has already checked
 * `isDevTierPreviewAllowed()` (app/(app)/layout.tsx), so this component itself never has to
 * re-derive that gate; it exists to be looked at and clicked, not to be a second place the
 * production check could be gotten wrong.
 *
 * Deliberately unstyled-as-product-chrome — striped border, monospace, fixed to a corner —
 * so nobody mistakes this for a real subscription control. `effectiveTier` (what's actually
 * rendering right now) is shown alongside `realTier` (what resolvePlanTier actually
 * returned) specifically so it's visible WHEN an override is active, not only that the
 * control exists.
 */
export function DevTierPreviewToggle({ realTier, effectiveTier }: { realTier: PlanTier; effectiveTier: PlanTier }) {
  const [isPending, startTransition] = useTransition();
  const overriding = effectiveTier !== realTier;

  function set(tier: PlanTier | null) {
    startTransition(async () => {
      await setDevTierPreview(tier);
    });
  }

  return (
    <div
      className="fixed right-3 bottom-3 z-50 flex items-center gap-2 rounded-md border-2 border-dashed border-amber-500 bg-black/85 px-3 py-2 font-mono text-xs text-white shadow-lg"
      style={{ pointerEvents: isPending ? "none" : "auto" }}
    >
      <span className="font-bold text-amber-400">DEV PREVIEW</span>
      <span>
        real: <b>{realTier}</b>
        {overriding ? (
          <>
            {" "}
            → showing: <b className="text-amber-400">{effectiveTier}</b>
          </>
        ) : null}
      </span>
      <button type="button" onClick={() => set("ultra")} disabled={effectiveTier === "ultra"} className="rounded border border-white/40 px-2 py-0.5 hover:bg-white/10 disabled:opacity-40">
        Ultra
      </button>
      <button type="button" onClick={() => set("standard")} disabled={effectiveTier === "standard"} className="rounded border border-white/40 px-2 py-0.5 hover:bg-white/10 disabled:opacity-40">
        Standard
      </button>
      {overriding ? (
        <button type="button" onClick={() => set(null)} className="rounded border border-white/40 px-2 py-0.5 hover:bg-white/10">
          Clear
        </button>
      ) : null}
    </div>
  );
}
