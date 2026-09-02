import { CommandPalette } from "@/features/search/command-palette";
import { NotificationBell } from "./notification-bell";
import { UsageIndicator } from "./usage-indicator";
import type { Notification, PlanTier } from "@/types/database";
import type { MonthlyQuota } from "@/lib/ai/monthly-quota";

/**
 * Desktop top bar — ported from the Figma source (App.tsx `Topbar`): a frosted lavender
 * strip beside the fixed Sidebar, carrying only search + notifications (primary nav lives
 * in the sidebar now, and the account menu lives at the sidebar's foot). Literal source
 * colors, not the app's own header tokens — same rule as the rest of this shell pass.
 *
 * UsageIndicator added 2026-09-02 (founder: the usage bar must be always visible, not
 * confined to /advisor) — same utility-cluster slot as NotificationBell, same reasoning
 * for living here rather than being invented per-page.
 *
 * border/background read through --tier-topbar-border/--tier-topbar-bg (app/globals.css),
 * 2026-09-02: this strip is frosted and color-matched to the page ground on purpose (it's
 * translucent over whatever sits behind it), so it re-tints alongside the page background
 * turning warm under Ultra rather than staying the one lavender-tinted surface left behind.
 * Same literal values as before at Standard tier.
 */
export function Topbar({
  notifications,
  unreadCount,
  quota,
  budgetDegraded,
  tier,
}: {
  notifications: Notification[];
  unreadCount: number;
  quota: MonthlyQuota;
  budgetDegraded: boolean;
  tier: PlanTier;
}) {
  return (
    <div
      className="sticky top-0 z-20 hidden h-[52px] items-center gap-3 border-b px-6 backdrop-blur-xl lg:flex"
      style={{ borderColor: "var(--tier-topbar-border)", background: "var(--tier-topbar-bg)" }}
    >
      <div className="max-w-[400px] flex-1">
        <CommandPalette variant="bar" />
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <UsageIndicator quota={quota} budgetDegraded={budgetDegraded} tier={tier} />
        <NotificationBell notifications={notifications} unreadCount={unreadCount} />
      </div>
    </div>
  );
}
