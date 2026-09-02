/**
 * Client-safe types + constants for the portfolio feature, split out from build.ts
 * (which is `server-only` and pulls in the Supabase client) — a Client Component
 * importing anything from a server-only module drags the whole module into the client
 * bundle graph and fails the build, even if it only wanted a type and a constant.
 */

import type { EvidenceStatus } from "@/types/database";

export type PortfolioCategory =
  | "education"
  | "leadership"
  | "activities"
  | "sports"
  | "research"
  | "projects"
  | "awards"
  | "certifications"
  | "volunteering"
  | "work";

export interface PortfolioItem {
  id: string;
  category: PortfolioCategory;
  title: string;
  organization: string | null;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  ongoing: boolean;
  meta: string | null;
  /** When the row was added to Oryn — distinct from startDate (which is often backdated
   * to when the activity actually happened). Powers "recently added" on a public profile
   * (lib/portfolio/recent.ts), never shown as if it were the achievement's own date. */
  createdAt: string;
  /** null for `education` (that table has no evidence_status column — a school record
   * isn't a self-reported achievement in the same sense) and for any category whose
   * source row's own status is `self_reported`, per evidenceStatusPresentation's own
   * documented reasoning: that's the default nearly every item carries, and showing it
   * every time would read as a nag rather than information. Render through the same
   * lib/profile/evidence-status-presentation.ts mapping AchievementSection already uses,
   * not a second one — Phase 21's "evidence added is not verification" distinction has to
   * hold everywhere an achievement is shown, not just on the page it was first built for. */
  evidenceStatus: EvidenceStatus | null;
}

export interface PortfolioSkill {
  id: string;
  name: string;
  category: string;
}

export const PORTFOLIO_CATEGORY_LABELS: Record<PortfolioCategory, string> = {
  education: "Education",
  leadership: "Leadership",
  activities: "Activities",
  sports: "Sports",
  research: "Research",
  projects: "Projects",
  awards: "Awards",
  certifications: "Certifications",
  volunteering: "Volunteering",
  work: "Work",
};
