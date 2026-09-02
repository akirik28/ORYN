"use client";

import type { ReactNode } from "react";
import { Sidebar } from "@/features/app-shell/sidebar";
import { Topbar } from "@/features/app-shell/topbar";
import { MobileNav } from "@/features/app-shell/mobile-nav";
import { RouteAmbientBlobs } from "@/features/app-shell/route-ambient-blobs";
import type { DimensionSignal } from "@/lib/scoring/signal";
import type { Notification } from "@/types/database";
import type { MonthlyQuota } from "@/lib/ai/monthly-quota";

// Real generated output from buildDigestNotification()/buildProfileUpdateNotification()
// (lib/deadlines/scan.ts, lib/scoring/profile-update-notification.ts) against realistic
// multi-item input, not hand-written copy — these two categories had never actually fired
// live as of 2026-09-02 (zero rows in either category), so this is the only way to see what
// an aggregated notification looks like before one exists for real. See
// docs/handoffs/notification-center-diagnosis-2026-09-02.md.
const PREVIEW_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    user_id: "u1",
    category: "deadline",
    title: "4 deadlines coming up",
    body: "University of Pennsylvania — tomorrow; International Economics Challenge 2027 — 3 days; London School of Economics — Economics, personal statement — 7 days; Youth Research Fellows Programme — 14 days",
    link: "/dashboard",
    read_at: null,
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: "n2",
    user_id: "u1",
    category: "profile_update",
    title: "Your profile score changed",
    body: "Research +8; Community Impact +3; Entrepreneurship -2; Awards & Distinction +6; Leadership -5; Academics +5; Your profile is now 75% complete",
    link: "/profile/history",
    read_at: null,
    created_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
  },
  {
    id: "n3",
    user_id: "u1",
    category: "new_opportunity",
    title: "New match: International Economics Challenge 2027",
    body: "A strong fit for your target field, closing in 6 days.",
    link: "/opportunities",
    read_at: null,
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "n4",
    user_id: "u1",
    category: "weekly_plan",
    title: "Your weekly plan is ready",
    body: "Finish your economics dataset, apply to the Economics Challenge, write your research conclusion.",
    link: "/plan",
    read_at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 27 * 60 * 60 * 1000).toISOString(),
  },
];

// The real layout gets this from a separate exact-count query (app/(app)/layout.tsx), not
// by counting PREVIEW_NOTIFICATIONS — mirrored the same way here so this fixture can't drift
// back into the bug that query exists to avoid (a badge derived from a capped list).
const PREVIEW_UNREAD_COUNT = PREVIEW_NOTIFICATIONS.filter((n) => !n.read_at).length;

// A representative mid-month state, not an edge case — same "realistic, not a corner
// case" spirit as PREVIEW_NOTIFICATIONS above. usage-indicator.tsx and monthly-usage-meter.tsx
// each have their own dedicated preview surfaces for exercising exhausted/degraded/unknown.
//
// limit: 50, not 300 -- lib/ai/monthly-quota.ts's MONTHLY_AI_QUOTAS.advisor_chat has been 50
// since it was re-derived from real token costs (2026-09-02); this fixture was never updated
// when that landed, so every screenshot of this harness was showing a ceiling nobody could
// actually hit. used: 20 (40%) picked fresh against the new limit for the same "mid-month,
// not an edge case" reason the comment above already states -- not scaled proportionally
// from the old 42/300 (14%), which wasn't a deliberately-chosen fraction to begin with.
const PREVIEW_QUOTA: MonthlyQuota = { used: 20, limit: 50, remaining: 30, fraction: 20 / 50, resetsAt: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 1)).toISOString(), usedIsKnown: true };

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
      <MobileNav
        signal={signal}
        displayName="Ada"
        email="ada@example.com"
        notifications={PREVIEW_NOTIFICATIONS}
        unreadCount={PREVIEW_UNREAD_COUNT}
        quota={PREVIEW_QUOTA}
        budgetDegraded={false}
      />
      <Sidebar displayName="Ada" email="ada@example.com" signal={signal} />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <RouteAmbientBlobs />
        <Topbar notifications={PREVIEW_NOTIFICATIONS} unreadCount={PREVIEW_UNREAD_COUNT} quota={PREVIEW_QUOTA} budgetDegraded={false} />
        <main className="relative z-[1] min-w-0 flex-1 overflow-x-hidden">
          <div className="mx-auto w-full max-w-[1200px] px-4 pt-8 pb-24 md:px-8 md:pt-12 lg:pb-12">{children}</div>
        </main>
      </div>
    </div>
  );
}
