import type { LucideIcon } from "lucide-react";
import { Home, UserRound, Landmark, Compass, ListChecks, ClipboardCheck, Sparkles, FolderClosed, Settings, LayoutGrid, Bookmark } from "lucide-react";
import type en from "@/messages/en.json";

/**
 * A key in the `nav` namespace of the message catalogs. Typed off `messages/en.json`
 * rather than declared as `string`, so a renamed or misspelled key fails
 * `npm run typecheck` instead of rendering "nav.jouney" into the sidebar.
 */
type NavMessageKey = keyof (typeof en)["nav"];

export interface NavItem {
  href: string;
  /** Message key, not display text — resolved per-request against the student's locale.
   *  The English value in messages/en.json is the label these used to hold literally. */
  labelKey: NavMessageKey;
  icon: LucideIcon;
  /** Earns a slot in the mobile bottom bar. At most five — a sixth stops being a tap target. */
  mobilePrimary?: boolean;
  /** Used in the bottom bar only, where a 62px column ellipsises anything longer. Falls
   *  back to `labelKey`. Never used anywhere the full label has room. */
  shortLabelKey?: NavMessageKey;
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
  { href: "/dashboard", labelKey: "home", icon: Home, mobilePrimary: true },
  { href: "/advisor", labelKey: "counselor", icon: Sparkles, mobilePrimary: true },
  { href: "/profile", labelKey: "journey", icon: UserRound, mobilePrimary: true },
  { href: "/opportunities", labelKey: "opportunities", icon: Compass, mobilePrimary: true, shortLabelKey: "opportunitiesShort" },
  { href: "/universities", labelKey: "universities", icon: Landmark, mobilePrimary: true },
  { href: "/plan", labelKey: "plan", icon: ListChecks },
  { href: "/applications", labelKey: "applications", icon: ClipboardCheck },
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
  // Discovery surface for tools that were previously reachable only from a stack of small
  // text links in the Journey page's header (CV Generator, CV scanning, Story Bank,
  // Portfolio). See app/(app)/features/page.tsx.
  { href: "/features", labelKey: "features", icon: LayoutGrid },
  // Founder request, 2026-09-01 — everything saved (opportunities + universities) in one
  // place, with compare and filter. Secondary, not primary: real and useful, but not one
  // of the five destinations that earn a mobile bottom-bar slot, same tier as Features/
  // Documents/Settings below.
  { href: "/saved", labelKey: "saved", icon: Bookmark },
  { href: "/documents", labelKey: "documents", icon: FolderClosed },
  { href: "/settings", labelKey: "settings", icon: Settings },
];
