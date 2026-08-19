"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { transition } from "@/lib/motion";
import { PRIMARY_NAV, SECONDARY_NAV } from "./nav-items";

export function SidebarNav({ onNavigate, idPrefix = "desktop" }: { onNavigate?: () => void; idPrefix?: string }) {
  const pathname = usePathname();

  const renderItem = (item: (typeof PRIMARY_NAV)[number]) => {
    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        className={cn(
          "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          active ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        )}
      >
        {active ? (
          <motion.span
            layoutId={`${idPrefix}-sidebar-active-pill`}
            transition={transition("fast")}
            className="absolute inset-0 rounded-lg bg-sidebar-accent"
          >
            {/* A precise brand-colored edge, not just a tinted background — the background
                tint alone (--sidebar-accent, low chroma by design so it stays calm) reads as
                "selected" but not distinctly as ORYN's own blue; this small solid accent is
                what actually makes the active state recognizable at a glance. */}
            <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-brand-primary" />
          </motion.span>
        ) : null}
        <Icon className={cn("relative size-4 shrink-0", active && "text-brand-primary")} />
        <span className="relative">{item.label}</span>
      </Link>
    );
  };

  return (
    <nav className="flex flex-1 flex-col gap-1">
      {PRIMARY_NAV.map(renderItem)}
      <div className="my-2 border-t border-sidebar-border" />
      {SECONDARY_NAV.map(renderItem)}
    </nav>
  );
}
