/**
 * Languages and proficiency levels.
 *
 * The `languages` table has existed since the initial schema (`name`, `proficiency`) but
 * was never surfaced in the profile UI, so a bilingual student had nowhere to record it —
 * which matters for a product whose users are applying internationally and where language
 * requirements are a real admissions gate.
 *
 * Proficiency uses CEFR plus the two states CEFR deliberately doesn't cover. CEFR is the
 * standard European universities actually state their requirements in, so a student
 * recording "C1" here is recording something a requirement check can compare against —
 * which free text ("pretty good", "advanced-ish") never could. Native and Bilingual sit
 * outside the A1-C2 ladder on purpose: a native speaker is not "C2 and a bit more", it is
 * a different kind of claim, and conflating them is what makes people file themselves
 * wrongly.
 *
 * No new column: language certificates (IELTS, TOEFL, DELF, Goethe, JLPT…) belong in the
 * existing `certifications` table, which already carries an issuing organisation and a
 * date. Adding a bespoke evidence column here would duplicate that.
 */

export interface ProficiencyLevel {
  value: string;
  label: string;
  /** Shown under the option so a student picks the right rung rather than the flattering one. */
  hint: string;
}

export const LANGUAGE_PROFICIENCY_LEVELS: ProficiencyLevel[] = [
  { value: "native", label: "Native", hint: "A first language you grew up speaking." },
  { value: "bilingual", label: "Bilingual", hint: "Two languages at native or near-native level." },
  { value: "c2", label: "C2 — Mastery", hint: "Understand virtually everything; express yourself precisely." },
  { value: "c1", label: "C1 — Advanced", hint: "Fluent and spontaneous; can study a degree in it." },
  { value: "b2", label: "B2 — Upper intermediate", hint: "Comfortable with complex text and debate." },
  { value: "b1", label: "B1 — Intermediate", hint: "Handle most everyday situations independently." },
  { value: "a2", label: "A2 — Elementary", hint: "Simple, routine exchanges." },
  { value: "a1", label: "A1 — Beginner", hint: "Basic phrases and introductions." },
];

export const LANGUAGE_PROFICIENCY_OPTIONS = LANGUAGE_PROFICIENCY_LEVELS.map((level) => ({
  value: level.value,
  label: level.label,
}));

/** Ordered by how often a student in ORYN's markets is likely to need it, then A-Z. */
export const LANGUAGE_NAME_SUGGESTIONS: string[] = [
  "English",
  "Turkish",
  "German",
  "French",
  "Spanish",
  "Italian",
  "Dutch",
  "Arabic",
  "Mandarin Chinese",
  "Russian",
  "Portuguese",
  "Japanese",
  "Korean",
  "Hindi",
  "Urdu",
  "Persian (Farsi)",
  "Greek",
  "Polish",
  "Swedish",
  "Norwegian",
  "Danish",
  "Finnish",
  "Czech",
  "Romanian",
  "Hungarian",
  "Bulgarian",
  "Serbian",
  "Croatian",
  "Ukrainian",
  "Hebrew",
  "Bengali",
  "Punjabi",
  "Tamil",
  "Vietnamese",
  "Thai",
  "Indonesian",
  "Malay",
  "Swahili",
  "Kurdish",
  "Azerbaijani",
  "Georgian",
  "Armenian",
  "Albanian",
  "Latin",
  "Ancient Greek",
  "Sign Language",
];

/** Human label for a stored proficiency value; falls back to the raw value for legacy rows. */
export function languageProficiencyLabel(value: string | null): string | null {
  if (!value) return null;
  return LANGUAGE_PROFICIENCY_LEVELS.find((l) => l.value === value)?.label ?? value;
}
