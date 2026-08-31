"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
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
  variant = "compact",
}: {
  displayName: string;
  email: string | null;
  signal: DimensionSignal[];
  /** "sidebar": the larger profile-block trigger at the foot of the desktop Sidebar
   *  (features/app-shell/sidebar.tsx), styled after the Figma source's equivalent block.
   *  Same dropdown, same real data either way — only the trigger's size/layout changes. */
  variant?: "compact" | "sidebar";
}) {
  const tNav = useTranslations("nav");
  const coverage = signalCoverage(signal);
  const summary =
    coverage.assessed === 0
      ? "Add what you've done"
      : coverage.strong > 0
        ? `${coverage.strong} area${coverage.strong === 1 ? "" : "s"} strong`
        : `${coverage.assessed} area${coverage.assessed === 1 ? "" : "s"} assessed`;
  return (
    <DropdownMenu>
      {variant === "sidebar" ? (
        <DropdownMenuTrigger
          aria-label="Account menu"
          className="flex w-full items-center gap-2.5 rounded-lg p-1 text-left transition-colors hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
        >
          <span
            className="flex size-[34px] shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ background: "linear-gradient(135deg, #7B75F5, #3D35E8)" }}
          >
            {initialsFor(displayName)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-white/90">{displayName}</span>
            <span className="block truncate text-[11px] text-white/35">{summary}</span>
          </span>
        </DropdownMenuTrigger>
      ) : (
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
      )}
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
              <Icon className="size-4" /> {tNav(item.labelKey)}
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
