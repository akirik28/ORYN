import type { ProfileDimension } from "@/types/database";

export const DIMENSION_LABELS: Record<ProfileDimension, string> = {
  academics: "Academics",
  intellectual_curiosity: "Intellectual Curiosity",
  leadership: "Leadership",
  research: "Research",
  entrepreneurship: "Entrepreneurship",
  community_impact: "Community Impact",
  awards_distinction: "Awards & Distinction",
  career_exploration: "Career Exploration",
  execution_project_depth: "Execution / Project Depth",
};

/** Short forms for space-constrained UI like the radar chart axis labels. */
export const DIMENSION_LABELS_SHORT: Record<ProfileDimension, string> = {
  academics: "Academics",
  intellectual_curiosity: "Curiosity",
  leadership: "Leadership",
  research: "Research",
  entrepreneurship: "Entrepreneurship",
  community_impact: "Community",
  awards_distinction: "Awards",
  career_exploration: "Exploration",
  execution_project_depth: "Execution",
};

export const DIMENSION_ORDER: ProfileDimension[] = [
  "academics",
  "intellectual_curiosity",
  "leadership",
  "research",
  "entrepreneurship",
  "community_impact",
  "awards_distinction",
  "career_exploration",
  "execution_project_depth",
];
