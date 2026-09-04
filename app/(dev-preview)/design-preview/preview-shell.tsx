"use client";

import type { ReactNode } from "react";
import { Sidebar } from "@/features/app-shell/sidebar";
import { Topbar } from "@/features/app-shell/topbar";
import { MobileNav } from "@/features/app-shell/mobile-nav";
import { RouteAmbientBlobs } from "@/features/app-shell/route-ambient-blobs";
import { PreviewToolbar } from "./preview-toolbar";
import type { DimensionSignal } from "@/lib/scoring/signal";
import type { Notification, PlanTier } from "@/types/database";
// A pure `import type` (not a per-specifier `type` modifier on a value import): fully
// erased at compile time, unlike `import { X, type Y } from "..."`, which still leaves a
// runtime import of the module for X's sake. lib/ai/monthly-quota.ts starts with
// `import "server-only"`, which throws if any REAL (non-type) import pulls that module into
// a client bundle — this component is `"use client"`, so MonthlyQuota can only be borrowed
// as a type here, never as a value. The value this file actually needs at runtime
// (MONTHLY_AI_TOKEN_LIMIT) now lives in lib/ai/token-limits.ts instead, which has no such
// import and is safe for a client component to pull in directly (see that file's own
// header, added 2026-09-03 for exactly this).
import type { MonthlyQuota } from "@/lib/ai/monthly-quota";
import { MONTHLY_AI_TOKEN_LIMIT } from "@/lib/ai/token-limits";

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
// limit: lib/ai/monthly-quota.ts's real MONTHLY_AI_TOKEN_LIMIT, not a second hardcoded copy
// of it -- 236,150 tokens, not 50 uses, is the same allowance re-denominated a second time
// the same night (2026-09-02): the founder rejected "50 AI uses" as the same message count
// relabelled and asked for the real token figure. Became Record<PlanTier, number> on
// 2026-09-03 (the Ultra tier-economics build) -- this fixture already took a `tier` prop for
// other purposes (the flame effect, the upgrade-CTA gating below) but still showed
// Standard's number under an Ultra-styled bar, the exact tier-blind-display defect that
// build exists to close. Reading the constant directly (rather than hand-copying Ultra's
// 472,300) means this can never drift from the real enforced number the way a second
// literal could. Same 40% used proportion this fixture already chose deliberately (not an
// edge case) -- kept the ratio for both tiers, not just Standard's.
function buildPreviewQuota(tier: PlanTier): MonthlyQuota {
  const limit = MONTHLY_AI_TOKEN_LIMIT[tier];
  const used = Math.round(limit * 0.4);
  return {
    used,
    limit,
    remaining: limit - used,
    fraction: used / limit,
    resetsAt: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 1)).toISOString(),
    usedIsKnown: true,
  };
}

// Mirrors app/(app)/layout.tsx's structure with fixture data — real shell components, no
// auth/data-fetching. See app/(dev-preview)/design-preview/page.tsx.
//
// Updated 2026-08-30 alongside the Figma-source shell transplant (sidebar + topbar,
// replacing the old horizontal TopNav header, then the ambient gradient + AmbientBlobs
// hoisted to the real layout) — this harness renders whatever the real layout renders,
// so it needs the same structure or every page previewed through it drifts from
// production.
//
// No `tier` prop, 2026-09-02: briefly took one (for its own page-background gradient and
// for gating Sidebar's upgrade CTA) before both consumers moved to reading
// [data-tier="ultra"] directly instead — the page background is `var(--tier-page-bg-*)`,
// which an ancestor's data-tier attribute already drives with no JS value needed, and the
// CTA fix is Sidebar's own comment's whole point. This component renders the real
// Sidebar/Topbar, not a copy, but does NOT mount UltraAmbient (a different route group does
// its own data-tier stamping instead, see app/(dev-preview)/layout.tsx), so anything Ultra
// needs visible in this harness has to come from a token or a component this shell actually
// renders — never from that page-level effect.
// `tier` came out of this signature when the upgrade CTA's gating moved to a pure
// [data-tier="ultra"] CSS rule, and came back when the usage bar gained a canvas flame:
// Topbar/MobileNav now pass it to UsageIndicator, and a canvas cannot read an attribute
// off <html> the way a CSS rule can. That is the same split this codebase hit four times
// tonight -- CSS-variable tiering and JS-resolved tiering are two delivery paths, and a
// surface can legitimately need one without the other. Optional with a "standard" default
// so the preview routes that don't compute a tier keep working unchanged.
export function PreviewShell({
  children,
  signal,
  tier = "standard",
}: {
  children: ReactNode;
  signal: DimensionSignal[];
  tier?: PlanTier;
}) {
  const quota = buildPreviewQuota(tier);
  return (
    <div
      className="flex min-h-svh flex-col lg:flex-row"
      style={{ background: "linear-gradient(145deg, var(--tier-page-bg-1) 0%, var(--tier-page-bg-2) 30%, var(--tier-page-bg-3) 55%, var(--tier-page-bg-4) 100%)" }}
    >
      <MobileNav
        signal={signal}
        displayName="Ada"
        email="ada@example.com"
        notifications={PREVIEW_NOTIFICATIONS}
        unreadCount={PREVIEW_UNREAD_COUNT}
        quota={quota}
        budgetDegraded={false}
        tier={tier}
      />
      {/* ultraPriceTry: a literal fixture, same spirit as displayName="Ada" above, not
          lib/admin/finance.ts's ULTRA_PRICE_TRY — that file opens with `import
          "server-only"` (same constraint this component's own header describes for
          lib/ai/monthly-quota.ts), so it cannot be imported into this "use client" shell. */}
      <Sidebar displayName="Ada" email="ada@example.com" signal={signal} ultraPriceTry={399.99} />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <RouteAmbientBlobs />
        <Topbar notifications={PREVIEW_NOTIFICATIONS} unreadCount={PREVIEW_UNREAD_COUNT} quota={quota} budgetDegraded={false} tier={tier} />
        <main className="relative z-[1] min-w-0 flex-1 overflow-x-hidden">
          <div className="mx-auto w-full max-w-[1200px] px-4 pt-8 pb-24 md:px-8 md:pt-12 lg:pb-12">{children}</div>
        </main>
      </div>
      <PreviewToolbar />
    </div>
  );
}
