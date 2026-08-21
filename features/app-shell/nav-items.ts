import type { LucideIcon } from "lucide-react";
import { Home, UserRound, Landmark, Compass, ListChecks, ClipboardCheck, Sparkles, FolderClosed, Settings } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const PRIMARY_NAV: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/universities", label: "Universities", icon: Landmark },
  { href: "/opportunities", label: "Opportunities", icon: Compass },
  { href: "/plan", label: "Plan", icon: ListChecks },
  { href: "/applications", label: "Applications", icon: ClipboardCheck },
  { href: "/advisor", label: "Advisor", icon: Sparkles },
];

/**
 * Connections and Messages are deliberately absent here — hidden from navigation on the
 * founder's decision, 2026-08-21, NOT abandoned. Everything behind them stays: the routes,
 * `lib/messaging/*`, and the `connections` / `messages` / `message_reports` tables (all at zero
 * rows, so no user is affected by the removal).
 *
 * Why hidden: student-to-student messaging is named twice in AGENTS.md as out of scope for V1 —
 * once in Phase 54's "DO NOT BUILD YET" list, and once in Phase 12's minor-safe design section,
 * which matters more. ORYN's users are 14-18. Private messaging between minors carries
 * moderation, reporting and consent obligations that are not addressed yet; `message_reports`
 * exists but its flow has never been exercised.
 *
 * Why kept: the founder intends this to return as a full social layer — posts, likes and
 * reposts, LinkedIn-shaped — rather than as 1:1 chat. So treat this code as the seed of a
 * planned feature, not dead code to be cleaned up. Anyone tempted to delete it should read
 * Phase 54 first: it lists "social feed", "likes" and "follower counts" as later-phase work,
 * which is consistent with that plan; the constraint is timing, not direction.
 *
 * Whoever builds it: the minor-safety questions above are the gate, not an afterthought.
 */
export const SECONDARY_NAV: NavItem[] = [
  { href: "/documents", label: "Documents", icon: FolderClosed },
  { href: "/settings", label: "Settings", icon: Settings },
];
