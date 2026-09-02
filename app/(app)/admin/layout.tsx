import type { ReactNode } from "react";

/**
 * Scopes the admin theme (app/globals.css's [data-surface="admin"] block) to this route
 * tree only — page.tsx keeps its own auth + composition job (docs/admin-panel-architecture-
 * 2026-09-02.md's D1) unchanged, this is purely the theme boundary. `data-surface="admin"`
 * on a wrapper here, not on `<html>`: the surrounding Sidebar/Topbar (how an admin actually
 * navigates, including back out to the student product) stay exactly as they are, and only
 * this route's own content area gets the dark green surface the founder asked for.
 *
 * Sits inside app/(app)/layout.tsx's own content padding rather than bleeding to the
 * shell's edges — that padding is asymmetric and responsive (px-4 pt-8 pb-24 md:px-8
 * md:pt-12 lg:pb-12), and a negative-margin cancel precise enough to undo it exactly is a
 * fragile trick for a return this task doesn't need. A rounded, bordered panel (the same
 * "contained panel" shape every other page in this shell already uses for its own cards)
 * reads as an intentional surface rather than a layout hack, and is what -radius/-border
 * below are for.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div data-surface="admin" className="min-h-[70vh] rounded-2xl border p-4 md:p-8" style={{ borderColor: "var(--admin-border)" }}>
      {children}
    </div>
  );
}
