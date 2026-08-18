"use client";

import { useSyncExternalStore } from "react";
import { COMPARE_MAX as MAX_COMPARE } from "@/lib/universities/compare-constants";

const STORAGE_KEY = "oryn:compare-universities";

export interface CompareEntry {
  id: string;
  name: string;
}

/**
 * Selection for the compare tray (P0H) — a plain module-level external store backed by
 * localStorage, not React context: unlike region/country/filters, "what am I currently
 * comparing" isn't something a student shares as a link or expects to survive a fresh visit,
 * it's scratch state for the current browsing session, and there's only ever one tray per
 * browser regardless of how many components read it (UniversityCard, CompareBar) — so a
 * global store is the right shape, not per-subtree Provider state. Read side follows the same
 * useSyncExternalStore pattern already established in university-explorer-hero.tsx's
 * useIsDesktop, for the same reason: it's the hydration-safe way to read a browser-only value
 * without a setState-in-effect (a real lint error here, not just style).
 */
type Listener = () => void;
const listeners = new Set<Listener>();
let cached: CompareEntry[] | null = null;

function readStorage(): CompareEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CompareEntry[]) : [];
  } catch {
    return [];
  }
}

function writeStorage(next: CompareEntry[]) {
  cached = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked (e.g. private browsing) — `cached` above still drives every
    // subscriber for the rest of this page view, it just won't persist across a reload.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Stable reference between writes (required by useSyncExternalStore) — only `writeStorage`
 * ever replaces `cached`, so repeated reads with no intervening write return the same array. */
function getSnapshot(): CompareEntry[] {
  if (cached === null) cached = readStorage();
  return cached;
}

const EMPTY: CompareEntry[] = [];
function getServerSnapshot(): CompareEntry[] {
  // Must return the same reference every call (useSyncExternalStore compares by identity) —
  // a fresh `[]` literal here looks harmless but reads as "changed every render" and trips
  // React's own infinite-loop guard for this hook.
  return EMPTY;
}

export function useCompare() {
  const selected = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle(entry: CompareEntry) {
    const current = getSnapshot();
    if (current.some((e) => e.id === entry.id)) {
      writeStorage(current.filter((e) => e.id !== entry.id));
    } else if (current.length < MAX_COMPARE) {
      writeStorage([...current, entry]);
    }
  }

  return {
    selected,
    isSelected: (id: string) => selected.some((e) => e.id === id),
    toggle,
    clear: () => writeStorage([]),
    atLimit: selected.length >= MAX_COMPARE,
  };
}
