"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { transition } from "@/lib/motion";

export interface ProfileSectionNavItem {
  id: string;
  label: string;
}

// Purely a navigation aid over the existing single-scroll profile page — every section it
// points to already exists and is unchanged. No tabs, nothing hidden: this only helps a
// reader jump to and track where they are in a long page, per the founder's "add a jump nav,
// don't restructure the page" call.
export function ProfileSectionNav({ items }: { items: ProfileSectionNavItem[] }) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const elements = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    // Activation band starts just below the sticky nav itself and covers the top third of the
    // remaining viewport — the active item is whichever section's start has most recently
    // crossed into that band, which is what actually tracks "where the reader is" while
    // scrolling rather than "what's technically still on screen."
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length === 0) return;
        const topMost = visible.reduce((a, b) => (a.boundingClientRect.top < b.boundingClientRect.top ? a : b));
        setActiveId(topMost.target.id);
      },
      { rootMargin: "-64px 0px -66% 0px", threshold: 0 }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  function scrollToSection(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
    setActiveId(id);
  }

  return (
    <nav
      aria-label="Profile sections"
      className="sticky top-0 z-10 -mx-4 flex gap-1 overflow-x-auto border-b bg-background/95 px-4 py-2 backdrop-blur-sm md:-mx-8 md:px-8"
    >
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            onClick={(e) => {
              e.preventDefault();
              scrollToSection(item.id);
            }}
            aria-current={active ? "true" : undefined}
            className={cn(
              "relative shrink-0 rounded-full border border-transparent px-3.5 py-1.5 text-sm font-medium whitespace-nowrap outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              active ? "text-brand-primary-strong" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {active ? (
              <motion.span
                layoutId="profile-section-nav-active-pill"
                transition={transition("fast")}
                className="absolute inset-0 -z-10 rounded-full bg-brand-primary-subtle"
              />
            ) : null}
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
