import type { SubjectTaxonomy } from "./subject-taxonomy";

/** Student-facing labels for subject_taxonomy — used to group the University detail
 * page's Programs section. Keep in sync with SUBJECT_TAXONOMY. */
export const SUBJECT_LABELS: Record<SubjectTaxonomy, string> = {
  economics: "Economics",
  business: "Business & Management",
  finance: "Finance",
  computer_science: "Computer Science",
  artificial_intelligence: "AI & Data Science",
  engineering: "Engineering",
  medicine: "Medicine",
  law: "Law",
  psychology: "Psychology",
  political_science: "Political Science",
  international_relations: "International Relations",
  mathematics: "Mathematics",
  physics: "Physics",
  architecture: "Architecture",
  design: "Design",
  entrepreneurship: "Entrepreneurship",
  other: "Other programs",
};
