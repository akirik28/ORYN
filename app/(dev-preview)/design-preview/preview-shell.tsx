"use client";

import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { TopNav } from "@/features/app-shell/top-nav";
import { UserMenu } from "@/features/app-shell/user-menu";
import { MobileNav } from "@/features/app-shell/mobile-nav";
import { CommandPalette } from "@/features/search/command-palette";
import type { DimensionSignal } from "@/lib/scoring/signal";

// Mirrors app/(app)/layout.tsx's structure with fixture data — real nav/header
// components, no auth/data-fetching. See app/(dev-preview)/design-preview/page.tsx.
//
// `hidden lg:block` on the desktop header + MobileNav rendered unconditionally above it
// (added 2026-08-29, mobile-parity audit) — missing before, so every design-preview page
// showed the desktop header uniformly squeezed below `lg` (1024px) instead of the real
// mobile shell app/(app)/layout.tsx actually renders there. Caught checking a real mobile-
// width layout bug (features/profile/quick-add-entry.tsx's SectionHeader overflow) and
// worth fixing at the source: every page mounted through this shell gets an accurate
// mobile chrome now, not just the one that happened to expose the gap.
export function PreviewShell({ children, signal }: { children: ReactNode; signal: DimensionSignal[] }) {
  return (
    <div className="flex min-h-svh flex-col">
      <MobileNav signal={signal} displayName="Ada" email="ada@example.com" notifications={[]} />
      <header className="sticky top-0 z-30 hidden border-b bg-background/85 backdrop-blur-md lg:block">
        <div className="mx-auto flex h-16 w-full max-w-[1360px] items-center gap-6 px-8">
          <Link href="/design-preview" aria-label="Oryn — home" className="shrink-0">
            <Image src="/brand/logo-full.png" alt="Oryn" width={92} height={31} className="h-7 w-auto" />
          </Link>
          <TopNav />
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <CommandPalette variant="bar" />
            <UserMenu displayName="Ada" email="ada@example.com" signal={signal} />
          </div>
        </div>
      </header>
      <main className="min-w-0 flex-1 overflow-x-hidden bg-background">
        <div className="mx-auto w-full max-w-[1200px] px-4 pt-8 pb-24 md:px-8 md:pt-12 lg:pb-12">{children}</div>
      </main>
    </div>
  );
}
