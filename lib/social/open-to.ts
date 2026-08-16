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

export function isValidOpenToOption(value: string): value is OpenToOption {
  return (OPEN_TO_OPTIONS as readonly string[]).includes(value);
}
