import type { OpportunityCategory } from "@/types/database";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";

/**
 * Student-facing labels for `OpportunityCategory` — used by the filter bar's category pills
 * and the detail page's category badge/eyebrow. Both previously called a naive
 * `humanize()`/`humanizeCategory()` (underscore-replace + capitalize the raw enum value),
 * which produces readable-enough English ("Summer program") but has nothing to fall back to
 * in Turkish ("Summer program" capitalized is still English). A real, closed 13-value enum
 * (types/database.ts's `OpportunityCategory`) gets a real translated map instead, same as
 * lib/programs/subject-labels.ts's SUBJECT_LABELS.
 */
const CATEGORY_LABEL_EN: Record<OpportunityCategory, string> = {
  competition: "Competition",
  research: "Research",
  internship: "Internship",
  summer_program: "Summer program",
  fellowship: "Fellowship",
  scholarship: "Scholarship",
  volunteering: "Volunteering",
  entrepreneurship: "Entrepreneurship",
  hackathon: "Hackathon",
  academic_program: "Academic program",
  online_program: "Online program",
  conference: "Conference",
  student_program: "Student program",
};

// "fellowship" stays as the English loanword rather than a Turkish paraphrase that would
// collide with "scholarship" (Burs): the two are genuinely different categories a student
// picks between (a fellowship's own name is usually English too — Fulbright Fellowship,
// Rhodes Fellowship — so this matches how the term already appears in Turkish coverage of
// international programs, not an untranslated gap). See __tests__/i18n/locale.test.ts's
// identical-value allowlist.
const CATEGORY_LABEL_TR: Record<OpportunityCategory, string> = {
  competition: "Yarışma",
  research: "Araştırma",
  internship: "Staj",
  summer_program: "Yaz programı",
  fellowship: "Fellowship",
  scholarship: "Burs",
  volunteering: "Gönüllülük",
  entrepreneurship: "Girişimcilik",
  hackathon: "Hackathon",
  academic_program: "Akademik program",
  online_program: "Çevrimiçi program",
  conference: "Konferans",
  student_program: "Öğrenci programı",
};

export function categoryLabel(category: OpportunityCategory, locale: Locale = DEFAULT_LOCALE): string {
  return locale === "tr" ? CATEGORY_LABEL_TR[category] : CATEGORY_LABEL_EN[category];
}
