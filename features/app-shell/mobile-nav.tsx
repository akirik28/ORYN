"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SidebarNav } from "./sidebar-nav";
import { CareerProfileBadge } from "./career-profile-badge";
import { UserMenu } from "./user-menu";
import { NotificationBell } from "./notification-bell";
import type { Notification } from "@/types/database";

export function MobileNav({
  score,
  displayName,
  email,
  notifications,
}: {
  score: number | null;
  displayName: string;
  email: string | null;
  notifications: Notification[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center justify-between border-b bg-background px-4 py-3 md:hidden">
      <Link href="/dashboard">
        <Image src="/brand/logo-full.png" alt="Oryn" width={92} height={31} className="h-7 w-auto" />
      </Link>
      <div className="flex items-center gap-1">
        <ButtonLink href="/search" variant="ghost" size="icon" aria-label="Search">
          <Search className="size-4" />
        </ButtonLink>
        <NotificationBell notifications={notifications} />
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu className="size-5" />
        </Button>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <div className="flex h-full flex-col bg-sidebar p-4 text-sidebar-foreground">
            <SheetHeader className="p-0 pb-4">
              <SheetTitle>
                <Image src="/brand/logo-full.png" alt="Oryn" width={92} height={31} className="h-7 w-auto" />
              </SheetTitle>
            </SheetHeader>
            <div className="mb-4">
              <CareerProfileBadge score={score} />
            </div>
            <SidebarNav onNavigate={() => setOpen(false)} />
            <div className="mt-4 border-t border-sidebar-border pt-3">
              <UserMenu displayName={displayName} email={email} />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
