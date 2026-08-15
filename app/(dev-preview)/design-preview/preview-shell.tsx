"use client";

import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { SidebarNav } from "@/features/app-shell/sidebar-nav";
import { UserMenu } from "@/features/app-shell/user-menu";
import { CareerProfileBadge } from "@/features/app-shell/career-profile-badge";
import { CommandPalette } from "@/features/search/command-palette";

// Mirrors app/(app)/layout.tsx's structure with fixture data — real nav/header
// components, no auth/data-fetching. See app/(dev-preview)/design-preview/page.tsx.
export function PreviewShell({ children, score = 77 }: { children: ReactNode; score?: number | null }) {
  return (
    <div className="flex min-h-svh md:flex-row">
      <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:border-r md:border-sidebar-border md:bg-sidebar md:text-sidebar-foreground">
        <div className="flex h-16 items-center justify-between px-5">
          <Link href="/design-preview">
            <Image src="/brand/logo-full.png" alt="Oryn" width={92} height={31} className="h-7 w-auto" />
          </Link>
          <CommandPalette />
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 pb-4">
          <CareerProfileBadge score={score} />
          <SidebarNav />
        </div>
        <div className="border-t border-sidebar-border p-3">
          <UserMenu displayName="Ada" email="ada@example.com" />
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-x-hidden bg-background">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">{children}</div>
      </main>
    </div>
  );
}
