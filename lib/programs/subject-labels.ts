import type { Locale } from "@/lib/i18n/config";
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

const SUBJECT_LABELS_TR: Record<SubjectTaxonomy, string> = {
  economics: "Ekonomi",
  business: "İşletme ve Yönetim",
  finance: "Finans",
  computer_science: "Bilgisayar Bilimi",
  artificial_intelligence: "Yapay Zeka ve Veri Bilimi",
  engineering: "Mühendislik",
  medicine: "Tıp",
  law: "Hukuk",
  psychology: "Psikoloji",
  political_science: "Siyaset Bilimi",
  international_relations: "Uluslararası İlişkiler",
  mathematics: "Matematik",
  physics: "Fizik",
  architecture: "Mimarlık",
  design: "Tasarım",
  entrepreneurship: "Girişimcilik",
  other: "Diğer programlar",
};

/** Same shape as lib/counselor/copy.ts's requirementCategoryLabel — English branch reads
 * the pre-existing SUBJECT_LABELS map rather than duplicating it, so there's exactly one
 * place that defines what "economics" means in English. */
export function subjectLabel(subject: SubjectTaxonomy, locale: Locale): string {
  return locale === "tr" ? SUBJECT_LABELS_TR[subject] : SUBJECT_LABELS[subject];
}
