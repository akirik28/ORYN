import type { LucideIcon } from "lucide-react";
import { Home, UserRound, Landmark, Compass, ListChecks, ClipboardCheck, Sparkles, FolderClosed, Settings } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Earns a slot in the mobile bottom bar. At most five — a sixth stops being a tap target. */
  mobilePrimary?: boolean;
  /** Used in the bottom bar only, where a 62px column ellipsises anything longer. Falls
   *  back to `label`. Never used anywhere the full label has room. */
  shortLabel?: string;
}

/**
 * Top-level navigation (UI-V3).
 *
 * Two labels were renamed this pass; no route moved, so every existing link, redirect and
 * bookmark still resolves:
 *
 * - `/advisor` reads as **Counselor**. This aligns the one user-facing label with the
 *   vocabulary the codebase already uses everywhere behind it (`lib/counselor`,
 *   `getCounselorRecommendations`, `CounselorPriorities`, `docs/counselor-core.md`) —
 *   "Advisor" only ever existed in the nav. It also says what the product is: a counselor
 *   gives you a considered position, an advisor is anyone with an opinion.
 * - `/profile` reads as **Journey**. The page is the student's accumulated evidence over
 *   time, not an account-settings profile, and calling it Profile invited exactly that
 *   confusion with the avatar menu.
 *
 * AGENTS.md Phase 42 lists the older labels; that list predates this rename and the
 * hrefs it maps to are unchanged.
 *
 * `mobilePrimary` marks the five that earn a slot in the mobile bottom bar. The rest stay
 * one tap away under "More" rather than being hidden — see `mobile-nav.tsx`.
 */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: Home, mobilePrimary: true },
  { href: "/advisor", label: "Counselor", icon: Sparkles, mobilePrimary: true },
  { href: "/profile", label: "Journey", icon: UserRound, mobilePrimary: true },
  { href: "/opportunities", label: "Opportunities", icon: Compass, mobilePrimary: true, shortLabel: "Explore" },
  { href: "/universities", label: "Universities", icon: Landmark, mobilePrimary: true },
  { href: "/plan", label: "Plan", icon: ListChecks },
  { href: "/applications", label: "Applications", icon: ClipboardCheck },
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
