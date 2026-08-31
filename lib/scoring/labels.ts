import type { ProfileDimension } from "@/types/database";
import type { Locale } from "@/lib/i18n/config";

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

const DIMENSION_LABELS_TR: Record<ProfileDimension, string> = {
  academics: "Akademik",
  intellectual_curiosity: "Entelektüel Merak",
  leadership: "Liderlik",
  research: "Araştırma",
  entrepreneurship: "Girişimcilik",
  community_impact: "Toplumsal Etki",
  awards_distinction: "Ödüller ve Başarılar",
  career_exploration: "Kariyer Keşfi",
  execution_project_depth: "Uygulama / Proje Derinliği",
};

const DIMENSION_LABELS_SHORT_TR: Record<ProfileDimension, string> = {
  academics: "Akademik",
  intellectual_curiosity: "Merak",
  leadership: "Liderlik",
  research: "Araştırma",
  entrepreneurship: "Girişimcilik",
  community_impact: "Topluluk",
  awards_distinction: "Ödüller",
  career_exploration: "Keşif",
  execution_project_depth: "Uygulama",
};

/**
 * Locale-aware dimension label lookups.
 *
 * `DIMENSION_LABELS`/`DIMENSION_LABELS_SHORT` above stay English-only and untouched — ~15
 * call sites across features/ and app/ index them directly with no locale awareness at all,
 * and widening their own shape would force every one of those to suddenly handle a locale
 * they don't have. These two functions are the additive, opt-in path: a caller that has a
 * resolved student locale calls these instead; everyone else is unaffected.
 *
 * Originally two independent private Turkish maps existed — one here, one in
 * lib/counselor/copy.ts — before this function existed to be their single source. Kept here
 * rather than in lib/counselor/ because dimension names are used far beyond the counselor
 * (features/dashboard/profile-signal.tsx, features/profile/progress-view.tsx, etc.), which
 * is exactly the scope lib/scoring/labels.ts already owns for the English versions.
 */
export function dimensionLabel(dimension: ProfileDimension, locale: Locale): string {
  return locale === "tr" ? DIMENSION_LABELS_TR[dimension] : DIMENSION_LABELS[dimension];
}

export function dimensionLabelShort(dimension: ProfileDimension, locale: Locale): string {
  return locale === "tr" ? DIMENSION_LABELS_SHORT_TR[dimension] : DIMENSION_LABELS_SHORT[dimension];
}

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
