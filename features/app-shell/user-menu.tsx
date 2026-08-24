"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signalCoverage, type DimensionSignal } from "@/lib/scoring/signal";
import { SECONDARY_NAV } from "./nav-items";

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "");
  return initials.join("") || "?";
}

/**
 * Account menu. In UI-V3 this is the only chrome the sidebar's lower half left behind, so
 * it absorbs what lived there: Oryn's standing read on the student, and the secondary nav
 * (Documents, Settings).
 *
 * That read used to be the aggregate score — a bare "69" sitting in the chrome of every
 * page. It is now a count of what Oryn can actually stand behind, which is the same
 * ambient reassurance without asking a student to treat a mean of nine dimensions as a
 * verdict on themselves. The number is still stored; it is just not a thing to look at.
 */
export function UserMenu({
  displayName,
  email,
  signal,
}: {
  displayName: string;
  email: string | null;
  signal: DimensionSignal[];
}) {
  const coverage = signalCoverage(signal);
  const summary =
    coverage.assessed === 0
      ? "Add what you've done"
      : coverage.strong > 0
        ? `${coverage.strong} area${coverage.strong === 1 ? "" : "s"} strong`
        : `${coverage.assessed} area${coverage.assessed === 1 ? "" : "s"} assessed`;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="flex items-center gap-2 rounded-full p-0.5 transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <Avatar className="size-8">
          <AvatarFallback className="bg-brand-primary-soft text-sm text-brand-primary-strong">
            {initialsFor(displayName)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-1.5 py-1.5">
          <p className="truncate text-sm font-medium">{displayName}</p>
          {email ? <p className="truncate text-xs text-ink-3">{email}</p> : null}
        </div>
        <DropdownMenuSeparator />
        <Link
          href="/profile"
          className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1.5 transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <span className="text-sm text-ink-2">Career profile</span>
          <span className="text-sm text-ink-3">{summary}</span>
        </Link>
        <DropdownMenuSeparator />
        {SECONDARY_NAV.map((item) => {
          const Icon = item.icon;
          return (
            <DropdownMenuItem key={item.href} render={<Link href={item.href} />}>
              <Icon className="size-4" /> {item.label}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => void signOut()}>
          <LogOut className="size-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
