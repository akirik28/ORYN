import type { Locale } from "@/lib/i18n/config";

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

const SEARCH_RESULT_TYPE_LABELS_TR: Record<SearchResultType, string> = {
  university: "Üniversite",
  program: "Program",
  opportunity: "Fırsat",
  activity: "Etkinlik",
  award: "Ödül",
  certification: "Sertifika",
  project: "Proje",
  research_experience: "Araştırma",
  volunteering_experience: "Gönüllülük",
  work_experience: "İş deneyimi",
  education_record: "Eğitim",
  test_score: "Sınav puanı",
  goal: "Hedef",
  application: "Başvuru",
};

/**
 * Locale-aware lookup, same shape as lib/scoring/labels.ts's dimensionLabel — the last
 * English-only label map (docs/i18n-coverage.md) with a student-facing consumer
 * (command-palette.tsx, search-view.tsx) and no accessor. SEARCH_RESULT_TYPE_LABELS stays
 * English-only and untouched; this is the additive, opt-in path callers switch to.
 */
export function searchResultTypeLabel(type: SearchResultType, locale: Locale): string {
  return locale === "tr" ? SEARCH_RESULT_TYPE_LABELS_TR[type] : SEARCH_RESULT_TYPE_LABELS[type];
}
