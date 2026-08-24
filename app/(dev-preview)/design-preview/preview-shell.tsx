"use client";

import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { TopNav } from "@/features/app-shell/top-nav";
import { UserMenu } from "@/features/app-shell/user-menu";
import { CommandPalette } from "@/features/search/command-palette";

// Mirrors app/(app)/layout.tsx's structure with fixture data — real nav/header
// components, no auth/data-fetching. See app/(dev-preview)/design-preview/page.tsx.
export function PreviewShell({ children, score = 77 }: { children: ReactNode; score?: number | null }) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-[1360px] items-center gap-6 px-8">
          <Link href="/design-preview" aria-label="Oryn — home" className="shrink-0">
            <Image src="/brand/logo-full.png" alt="Oryn" width={92} height={31} className="h-7 w-auto" />
          </Link>
          <TopNav />
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <CommandPalette variant="bar" />
            <UserMenu displayName="Ada" email="ada@example.com" score={score} />
          </div>
        </div>
      </header>
      <main className="min-w-0 flex-1 overflow-x-hidden bg-background">
        <div className="mx-auto w-full max-w-[1200px] px-4 pt-8 pb-24 md:px-8 md:pt-12 md:pb-12">{children}</div>
      </main>
    </div>
  );
}
