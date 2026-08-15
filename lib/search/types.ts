export type SearchResultType =
  | "university"
  | "program"
  | "opportunity"
  | "activity"
  | "award"
  | "certification"
  | "project"
  | "research_experience"
  | "volunteering_experience"
  | "work_experience"
  | "education_record"
  | "test_score"
  | "goal"
  | "application";

export interface SearchResult {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle: string | null;
  /** Where clicking this result should go. Points at the item's own detail page only
   * where one genuinely exists (universities, applications) — profile items, goals, and
   * opportunities are all managed inline on their owning list page, so the honest link is
   * that page, not a fabricated per-item route. */
  href: string;
}

export const SEARCH_RESULT_TYPE_LABELS: Record<SearchResultType, string> = {
  university: "University",
  program: "Program",
  opportunity: "Opportunity",
  activity: "Activity",
  award: "Award",
  certification: "Certification",
  project: "Project",
  research_experience: "Research",
  volunteering_experience: "Volunteering",
  work_experience: "Work experience",
  education_record: "Education",
  test_score: "Test score",
  goal: "Goal",
  application: "Application",
};
