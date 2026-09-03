"use client";

import { useEffect } from "react";
import type { AccountRole } from "@/types/database";

/**
 * Sets `data-role="parent"` on `<html>` -- the single source of truth every
 * `[data-role="parent"]` CSS selector and `parent:` Tailwind variant reads (see
 * app/globals.css's "Parent-role theme" section). Mirrors ultra-ambient.tsx's own
 * data-tier effect exactly (mount-time set, transition-lock around the write so a
 * transition-colors element doesn't get stuck on its pre-attribute color, unmount-time
 * cleanup) -- deliberately the same mechanism, not a second one, per spec K5.
 *
 * No canvas, no animation: unlike Ultra's ember layer, the parent theme has no motion
 * budget (spec G5's "no AI anywhere" extends in spirit to "no premium visual flourish
 * either" -- a parent's view is meant to be calm and legible, not a second thing to sell).
 * This component is therefore just the attribute lifecycle, nothing else.
 */
export function ParentAmbient({ role }: { role: AccountRole }) {
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("tier-transition-lock");
    if (role === "parent") {
      html.dataset.role = role;
    } else {
      delete html.dataset.role;
    }
    void html.offsetHeight;
    const unlock = setTimeout(() => html.classList.remove("tier-transition-lock"), 50);
    return () => {
      clearTimeout(unlock);
      html.classList.remove("tier-transition-lock");
      delete html.dataset.role;
    };
  }, [role]);

  return null;
}
