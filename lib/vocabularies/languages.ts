import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";

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

/** Single source for the closed CEFR-plus-two set — every Zod schema and TS type that needs
 * "one of these 8 exact values or null" (lib/validation/achievements.ts's LanguageSchema,
 * lib/validation/onboarding.ts's extractedLanguages, lib/profile/cv-import.ts's review/save
 * types) derives from this tuple rather than re-listing the 8 values, so the set can't
 * silently diverge between where it's validated and where it's typed. */
export const LANGUAGE_PROFICIENCY_VALUES = ["native", "bilingual", "c2", "c1", "b2", "b1", "a2", "a1"] as const;
export type LanguageProficiencyValue = (typeof LANGUAGE_PROFICIENCY_VALUES)[number];

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

/**
 * Locale (2026-09-01) — the last of the three `check:i18n` Data-modules files oryn-a7's
 * scanner fix surfaced (the other two, `lib/scoring/completeness.ts` and
 * `features/profile/field-config.ts`, were fixed earlier the same night).
 *
 * `hint` is translated even though nothing in the app currently renders it — confirmed by
 * grep, `LANGUAGE_PROFICIENCY_OPTIONS` (below) drops `hint` entirely and
 * `languageProficiencyLabel` never reads it either. The type's own doc comment says it's
 * "shown under the option," which is a real, still-unbuilt feature, not a defect this pass
 * introduces or is responsible for fixing — translating the string now means whoever builds
 * that UI later doesn't also have to translate it then, and a hint left in English forever
 * because "nothing reads it yet" is exactly the kind of half-finished translation this
 * session's i18n passes have been trying to close out.
 *
 * Values keyed by `value` (already a stable identifier — a CEFR code — never a display
 * string), same shape as `dimensionLabel`/`completenessChecklistLabel`.
 */
const LANGUAGE_PROFICIENCY_TR: Record<string, { label: string; hint: string }> = {
  native: { label: "Anadil", hint: "Konuşarak büyüdüğün ilk dilin." },
  bilingual: { label: "İki Dilli", hint: "İki dili anadil düzeyinde veya ona yakın bir düzeyde konuşursun." },
  c2: { label: "C2 — Ustalık", hint: "Neredeyse her şeyi anlarsın; kendini net bir şekilde ifade edersin." },
  c1: { label: "C1 — İleri Düzey", hint: "Akıcı ve doğal konuşursun; bu dilde bir üniversite programı okuyabilirsin." },
  b2: { label: "B2 — Üst Orta Düzey", hint: "Karmaşık metinler ve tartışmalarla rahatça başa çıkarsın." },
  b1: { label: "B1 — Orta Düzey", hint: "Günlük durumların çoğunun üstesinden tek başına gelirsin." },
  a2: { label: "A2 — Temel Düzey", hint: "Basit, günlük konuşmalar yapabilirsin." },
  a1: { label: "A1 — Başlangıç Düzeyi", hint: "Temel ifadeler kurabilir, kendini tanıtabilirsin." },
};

export function languageProficiencyHint(value: string, locale: Locale): string | null {
  if (locale === "tr") return LANGUAGE_PROFICIENCY_TR[value]?.hint ?? null;
  return LANGUAGE_PROFICIENCY_LEVELS.find((l) => l.value === value)?.hint ?? null;
}

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

/**
 * Human label for a stored proficiency value; falls back to the raw value for legacy rows.
 * `locale` is additive (defaults to English, same pattern as every other lib/-side label
 * accessor this session's i18n passes have threaded a locale through) — the one existing
 * caller (app/(app)/profile/page.tsx) now passes its own resolved locale.
 */
export function languageProficiencyLabel(value: string | null, locale: Locale = DEFAULT_LOCALE): string | null {
  if (!value) return null;
  if (locale === "tr") return LANGUAGE_PROFICIENCY_TR[value]?.label ?? LANGUAGE_PROFICIENCY_LEVELS.find((l) => l.value === value)?.label ?? value;
  return LANGUAGE_PROFICIENCY_LEVELS.find((l) => l.value === value)?.label ?? value;
}
