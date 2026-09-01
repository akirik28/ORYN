import type { Locale } from "@/lib/i18n/config";

/** Controlled vocabulary for profiles.open_to (migration 0033) — a fixed multi-select
 * list, not free text, so it stays meaningful as an opportunity-matching signal rather
 * than degrading into arbitrary strings. Values are stored verbatim in the `open_to
 * text[]` column; this list is the single source of truth for what's valid. */
export const OPEN_TO_OPTIONS = [
  "internship",
  "research",
  "startup_team",
  "competitions",
  "hackathons",
  "volunteering",
  "mentorship",
  "project_collaboration",
  "study_group",
  "summer_programs",
] as const;

export type OpenToOption = (typeof OPEN_TO_OPTIONS)[number];

export const OPEN_TO_LABELS: Record<OpenToOption, string> = {
  internship: "Internship",
  research: "Research",
  startup_team: "Startup team",
  competitions: "Competitions",
  hackathons: "Hackathons",
  volunteering: "Volunteering",
  mentorship: "Mentorship",
  project_collaboration: "Project collaboration",
  study_group: "Study group",
  summer_programs: "Summer programs",
};

const OPEN_TO_LABELS_TR: Record<OpenToOption, string> = {
  internship: "Staj",
  research: "Araştırma",
  startup_team: "Girişim ekibi",
  competitions: "Yarışmalar",
  hackathons: "Hackathonlar",
  volunteering: "Gönüllülük",
  mentorship: "Mentorluk",
  project_collaboration: "Proje iş birliği",
  study_group: "Çalışma grubu",
  summer_programs: "Yaz programları",
};

/** Locale-aware lookup, same shape as lib/scoring/labels.ts's dimensionLabel — added
 * alongside OPEN_TO_LABELS rather than replacing it, so the many `open_to text[]`-storing
 * call sites that only ever meant English stay byte-identical. */
export function openToLabel(value: OpenToOption, locale: Locale): string {
  return locale === "tr" ? OPEN_TO_LABELS_TR[value] : OPEN_TO_LABELS[value];
}

export function isValidOpenToOption(value: string): value is OpenToOption {
  return (OPEN_TO_OPTIONS as readonly string[]).includes(value);
}
