"use client";

import { useEffect } from "react";
import type { AccountRole } from "@/types/database";

/**
 * Sets `data-role="parent"` on `<html>`, client-side. `[data-role="parent"]` CSS selectors
 * and the `parent:` Tailwind variant only need SOME ancestor to carry the attribute (see
 * app/globals.css's "Parent-role theme" section) -- this is not the only way to supply one.
 * The real production /parent routes never render this component at all; app/parent/
 * layout.tsx sets the identical attribute server-side, directly on its own wrapper div, which
 * is present from the first byte of HTML and needs no mount-time effect or transition-lock to
 * avoid a flash. This component exists for app/(dev-preview)/design-preview/parent-panel/
 * specifically, which renders outside app/parent/layout.tsx entirely and has no server-set
 * attribute of its own to inherit (CORRECTED 2026-09-04, composed read, CEO dispatch: this
 * comment previously called it "the single source of truth," which stopped being true the
 * moment the real route group grew its own server-side mechanism).
 *
 * Mirrors ultra-ambient.tsx's own data-tier effect exactly (mount-time set, transition-lock
 * around the write so a transition-colors element doesn't get stuck on its pre-attribute
 * color, unmount-time cleanup) -- deliberately the same mechanism as that one, not a second
 * one, per spec K5.
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
