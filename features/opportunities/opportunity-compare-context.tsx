"use client";

import { useSyncExternalStore } from "react";
import { resolveComparisonWidthCeiling } from "@/lib/comparison/limits";
import type { PlanTier } from "@/types/database";

const STORAGE_KEY = "proxola:compare-opportunities";

export interface OpportunityCompareEntry {
  id: string;
  title: string;
}

/**
 * Opportunities' own compare tray — same shape as features/universities/compare-context.tsx
 * on purpose (module-level external store, localStorage-backed, useSyncExternalStore reads),
 * not imported from it: the two stores hold different entity types under different keys, and
 * a shared generic here would be one abstraction serving two call sites, the first of which
 * already existed as working, tested code. Mirroring the pattern beats forking it, but two
 * genuinely different trays (universities vs opportunities) aren't the same tray. Reuses
 * resolveComparisonWidthCeiling (lib/comparison/limits.ts) rather than defining a second
 * width rule with the same value, since that one is already deliberately kept in its own
 * directive-free module for exactly this kind of cross-feature import (see that file's own
 * header) — same reason this file used to reuse universities' COMPARE_MAX directly before
 * the ceiling became tier-aware (2026-09-02).
 */
type Listener = () => void;
const listeners = new Set<Listener>();
let cached: OpportunityCompareEntry[] | null = null;

function readStorage(): OpportunityCompareEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OpportunityCompareEntry[]) : [];
  } catch {
    return [];
  }
}

function writeStorage(next: OpportunityCompareEntry[]) {
  cached = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked (e.g. private browsing) — `cached` still drives every
    // subscriber for the rest of this page view, it just won't persist across a reload.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): OpportunityCompareEntry[] {
  if (cached === null) cached = readStorage();
  return cached;
}

const EMPTY: OpportunityCompareEntry[] = [];
function getServerSnapshot(): OpportunityCompareEntry[] {
  return EMPTY;
}

/** `planTier` defaults to "ultra" — see features/universities/compare-context.tsx's own
 *  useCompare for why: a caller that never reads `atLimit` (the bar) doesn't need to pass
 *  one, and this only shapes the picker's UX — the compare page's own server-side slice is
 *  the real enforcement regardless of what this ceiling permitted. */
export function useOpportunityCompare(planTier: PlanTier = "ultra") {
  const selected = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ceiling = resolveComparisonWidthCeiling(planTier);

  function toggle(entry: OpportunityCompareEntry) {
    const current = getSnapshot();
    if (current.some((e) => e.id === entry.id)) {
      writeStorage(current.filter((e) => e.id !== entry.id));
    } else if (current.length < ceiling) {
      writeStorage([...current, entry]);
    }
  }

  return {
    selected,
    isSelected: (id: string) => selected.some((e) => e.id === id),
    toggle,
    clear: () => writeStorage([]),
    atLimit: selected.length >= ceiling,
  };
}
