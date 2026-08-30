"use client";

import type { ReactNode } from "react";
import { Sidebar } from "@/features/app-shell/sidebar";
import { Topbar } from "@/features/app-shell/topbar";
import { MobileNav } from "@/features/app-shell/mobile-nav";
import { RouteAmbientBlobs } from "@/features/app-shell/route-ambient-blobs";
import type { DimensionSignal } from "@/lib/scoring/signal";

// Mirrors app/(app)/layout.tsx's structure with fixture data — real shell components, no
// auth/data-fetching. See app/(dev-preview)/design-preview/page.tsx.
//
// Updated 2026-08-30 alongside the Figma-source shell transplant (sidebar + topbar,
// replacing the old horizontal TopNav header, then the ambient gradient + AmbientBlobs
// hoisted to the real layout) — this harness renders whatever the real layout renders,
// so it needs the same structure or every page previewed through it drifts from
// production.
export function PreviewShell({ children, signal }: { children: ReactNode; signal: DimensionSignal[] }) {
  return (
    <div
      className="flex min-h-svh flex-col lg:flex-row"
      style={{ background: "linear-gradient(145deg, #DDDAF5 0%, #D8DFF5 30%, #DDD8F2 55%, #D4DBF0 100%)" }}
    >
      <MobileNav signal={signal} displayName="Ada" email="ada@example.com" notifications={[]} />
      <Sidebar displayName="Ada" email="ada@example.com" signal={signal} />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <RouteAmbientBlobs />
        <Topbar notifications={[]} />
        <main className="relative z-[1] min-w-0 flex-1 overflow-x-hidden">
          <div className="mx-auto w-full max-w-[1200px] px-4 pt-8 pb-24 md:px-8 md:pt-12 lg:pb-12">{children}</div>
        </main>
      </div>
    </div>
  );
}
