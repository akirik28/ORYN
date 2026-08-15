/**
 * Client-safe types + constants for the portfolio feature, split out from build.ts
 * (which is `server-only` and pulls in the Supabase client) — a Client Component
 * importing anything from a server-only module drags the whole module into the client
 * bundle graph and fails the build, even if it only wanted a type and a constant.
 */

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
