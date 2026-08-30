import { CommandPalette } from "@/features/search/command-palette";
import { NotificationBell } from "./notification-bell";
import type { Notification } from "@/types/database";

/**
 * Desktop top bar — ported from the Figma source (App.tsx `Topbar`): a frosted lavender
 * strip beside the fixed Sidebar, carrying only search + notifications (primary nav lives
 * in the sidebar now, and the account menu lives at the sidebar's foot). Literal source
 * colors, not the app's own header tokens — same rule as the rest of this shell pass.
 */
export function Topbar({ notifications }: { notifications: Notification[] }) {
  return (
    <div
      className="sticky top-0 z-20 hidden h-[52px] items-center gap-3 border-b px-6 backdrop-blur-xl lg:flex"
      style={{ borderColor: "rgba(61,53,232,0.10)", background: "rgba(224,221,248,0.75)" }}
    >
      <div className="max-w-[400px] flex-1">
        <CommandPalette variant="bar" />
      </div>
      <div className="ml-auto flex shrink-0 items-center">
        <NotificationBell notifications={notifications} />
      </div>
    </div>
  );
}
