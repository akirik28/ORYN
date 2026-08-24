"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { transition } from "@/lib/motion";
import { PRIMARY_NAV } from "./nav-items";

/**
 * Desktop top-level navigation (UI-V3 § 6), replacing the 256px sidebar.
 *
 * Why a top bar: the sidebar spent a sixth of every viewport on chrome that never
 * changes, and pushed every page into a narrow column — which is why so much of the
 * product ended up as stacked full-width cards. Moving navigation to a single row buys
 * back the horizontal space the editorial layouts need (a 1200px measure, a map beside
 * its results, a wide journey timeline).
 *
 * The active state is an underline rather than a filled pill: a pill is a control, and
 * the current section isn't something you press. `layoutId` slides it between items —
 * shared with nothing else on the page, and MotionConfig's reducedMotion="user" in the
 * root layout already neutralizes it for anyone who asked for that.
 */
export function TopNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="flex items-center gap-0.5">
      {PRIMARY_NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors",
              "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              active ? "font-medium text-ink-1" : "text-ink-3 hover:text-ink-1",
            )}
          >
            {item.label}
            {active ? (
              <motion.span
                layoutId="top-nav-active-underline"
                transition={transition("fast")}
                /* -bottom-px so the rule sits *on* the header's own border rather than
                   floating above it — the two read as one line, not two. */
                className="absolute -bottom-px left-3 right-3 h-px bg-brand-primary"
              />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
