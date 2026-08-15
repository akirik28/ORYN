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

export const SECONDARY_NAV: NavItem[] = [
  { href: "/documents", label: "Documents", icon: FolderClosed },
  { href: "/settings", label: "Settings", icon: Settings },
];
