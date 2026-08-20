import { Award, Briefcase, Code2, FlaskConical, FolderOpen, HeartHandshake, Medal, Users, type LucideIcon } from "lucide-react";
import type { FeaturedItemType } from "@/types/database";

// Same "single source of truth" pattern as lib/opportunities/category-visuals.ts —
// reuses the same underlying metaphor per type where one already exists elsewhere in the
// app (research -> FlaskConical, work -> Briefcase, volunteering -> HeartHandshake, award
// -> Award) so a student doesn't learn two different icon vocabularies for the same
// concept on two different pages.
export const FEATURED_ITEM_ICON: Record<FeaturedItemType, LucideIcon> = {
  project: FolderOpen,
  research_experience: FlaskConical,
  award: Award,
  activity: Users,
  work_experience: Briefcase,
  volunteering_experience: HeartHandshake,
  sports_experience: Medal,
  external_link: Code2,
};

export const FEATURED_ITEM_LABEL: Record<FeaturedItemType, string> = {
  project: "Project",
  research_experience: "Research",
  award: "Award",
  activity: "Activity",
  work_experience: "Work experience",
  volunteering_experience: "Volunteering",
  sports_experience: "Sports",
  external_link: "Link",
};
