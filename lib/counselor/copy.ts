import type { Locale } from "@/lib/i18n/config";
import { dimensionLabel } from "@/lib/scoring/labels";
import { REQUIREMENT_CATEGORY_LABELS } from "@/lib/requirements/types";
import type { ProfileDimension, RequirementCategory } from "@/types/database";
import type { GapSeverity } from "./types";

/**
 * Locale-aware sentence-building for the counselor's "why" reasoning and eligibility notes —
 * the sentences the whole product is judged on (CEO's framing, and correct: this is the only
 * text a student sees that explains a recommendation rather than just stating one).
 *
 * Dimension names come from `lib/scoring/labels.ts`'s `dimensionLabel()` (added for slice
 * (b), which needed the same 9 Turkish names for a second surface) — this file used to carry
 * its own private duplicate rather than widen that module's shape, back when only this file
 * needed Turkish dimension names at all; now that a second caller genuinely exists, the
 * shared version is the single source of truth and this file just calls it.
 *
 * `requirementCategoryLabel` below went through the same widening: its English branch used
 * to return the bare `RequirementCategory` enum value (e.g. "standardized_test") rather than
 * a real label, because nothing outside this file read the English side and the counselor's
 * own sentences never render a category alone. Now that app/(app)/universities/[id]/page.tsx
 * and features/universities/admin-requirement-form.tsx need the identical English/Turkish
 * pair this file already builds, the English branch reads from
 * `lib/requirements/types.ts`'s `REQUIREMENT_CATEGORY_LABELS` (the pre-existing, correct
 * English map) instead of the raw enum — fixing a live bug (a counselor card titled "Address:
 * standardized_test (MIT)") as a side effect of the widening, not a separate change.
 *
 * **Not translated word-for-word — restructured per sentence.** English "Addresses X,
 * moderate gap (43/100)" is itself telegraphic label-style copy, not a full sentence; the
 * Turkish keeps that same telegraphic register ("X — orta düzeyde boşluk (43/100)") rather
 * than forcing verb-final grammar onto a UI tag, which is what produces the "grammatical but
 * nobody would say it" failure mode. Where the English *is* a full sentence, the Turkish is
 * a separately-composed full Turkish sentence, not a word-order-preserving translation.
 *
 * **Proper nouns and free text stay untranslated on purpose.** A stored country name
 * (`opportunity.eligible_countries`), a citizenship list, or `citizenship_restrictions` free
 * text is source data, not chrome — translating it risks silently asserting something the
 * data doesn't actually say. Every template that interpolates one of these is built so the
 * surrounding Turkish grammar doesn't require case-marking the interpolated value (e.g.
 * "X öğrencilerine açık değil" needs no suffix on X), rather than guessing at vowel harmony
 * for a string that might not even be Turkish content.
 */

const SEVERITY_LABEL_TR: Record<GapSeverity, string> = {
  critical: "kritik düzeyde boşluk",
  moderate: "orta düzeyde boşluk",
  minor: "hafif düzeyde boşluk",
  insufficient_data: "yeterli veri yok",
};

const SEVERITY_LABEL_EN: Record<GapSeverity, string> = {
  critical: "a significant current gap",
  moderate: "a moderate current gap",
  minor: "a minor current gap",
  insufficient_data: "an area Oryn doesn't have enough data on yet",
};

/** The "Addresses {dimension}, {severity} ({score}/100)." family from evidence.ts. */
export function gapWhyLine(dimension: ProfileDimension, severity: GapSeverity, score: number, locale: Locale): string {
  if (locale === "tr") {
    return `${dimensionLabel(dimension, "tr")} — ${SEVERITY_LABEL_TR[severity]} (${score}/100).`;
  }
  return `Addresses ${dimensionLabel(dimension, "en")}, ${SEVERITY_LABEL_EN[severity]} (${score}/100).`;
}

/** The "already strong, not a reason to prioritize" variant — kept separate from
 * gapWhyLine rather than folded into SEVERITY_LABEL, matching evidence.ts's own branch. */
export function alreadyStrongWhyLine(dimension: ProfileDimension, score: number, locale: Locale): string {
  if (locale === "tr") {
    return `${dimensionLabel(dimension, "tr")} — zaten güçlü (${score}/100), bu nedenle önceliklendirme gerekçesi değil.`;
  }
  return `Addresses ${dimensionLabel(dimension, "en")}, already strong (${score}/100) — not a reason to prioritize this.`;
}

export function verifiedActiveLine(locale: Locale): string {
  return locale === "tr" ? "Şu anda aktif olduğu doğrulandı." : "Verified as currently active.";
}

export function missingInfoWhyLine(locale: Locale): string {
  return locale === "tr"
    ? "Oryn bu bilgiye henüz sahip değil — güvenilir öneriler için gerekli."
    : "Oryn doesn't have this information yet — needed for confident recommendations.";
}

const REQUIREMENT_CATEGORY_LABEL_TR: Record<RequirementCategory, string> = {
  curriculum: "Müfredat",
  required_subject: "Zorunlu ders",
  minimum_grade: "Asgari not",
  standardized_test: "Standart sınav",
  english_proficiency: "İngilizce yeterliliği",
  language_proficiency: "Dil yeterliliği",
  essay: "Kompozisyon",
  recommendation: "Referans mektubu",
  interview: "Mülakat",
  portfolio: "Portfolyo",
  entrance_exam: "Giriş sınavı",
  prerequisite_coursework: "Ön koşul dersler",
  application_deadline: "Başvuru son tarihi",
  supplemental_requirement: "Ek gereklilik",
  international_requirement: "Uluslararası öğrenci gerekliliği",
};

export function requirementCategoryLabel(category: RequirementCategory, locale: Locale): string {
  return locale === "tr" ? REQUIREMENT_CATEGORY_LABEL_TR[category] : REQUIREMENT_CATEGORY_LABELS[category];
}

/** candidates.ts's two requirement-action title templates. `label` is already resolved
 * (either a free-text requirement title, which stays as stored in either language, or a
 * category label already passed through requirementCategoryLabel above).
 *
 * `status` takes the evaluator's full status type rather than a narrowed "not_met" |
 * "unknown" — candidates.ts's caller already filters to just those two before calling this,
 * but the filter is a runtime Set.has() check, which TypeScript can't narrow a union on, so
 * matching the caller's own original `=== "not_met" ? A : B` shape (treating anything else
 * as the "unknown" branch) avoids forcing an unsound cast at the call site. */
export function requirementActionTitle(label: string, universityName: string, status: string, locale: Locale): string {
  if (locale === "tr") {
    return status === "not_met" ? `Ele al: ${label} (${universityName})` : `Kontrol için gerekli bilgiyi ekle: ${label} (${universityName})`;
  }
  return status === "not_met" ? `Address: ${label} (${universityName})` : `Add the information needed to check: ${label} (${universityName})`;
}

// ---------------------------------------------------------------------------
// Eligibility notes (lib/counselor/eligibility.ts)
// ---------------------------------------------------------------------------

export const eligibilityCopy = {
  dataNotFound: (locale: Locale) => (locale === "tr" ? "Bu fırsatın güncel verisi bulunamadı." : "This opportunity's current data couldn't be found."),

  notVerified: (locale: Locale) => (locale === "tr" ? "Bu fırsat şu anda doğrulanmış değil." : "This opportunity is not currently verified."),

  ageRequirementUnknown: (locale: Locale) =>
    locale === "tr"
      ? "Bu fırsatın bir yaş şartı var; doğum yılınız kayıtlı olmadan Oryn bunu kontrol edemez."
      : "This opportunity has an age requirement Oryn can't check without your birth year on file.",

  countryUnknown: (locale: Locale) =>
    locale === "tr" ? "Bu fırsat ülkeye göre kısıtlı ve ülkeniz henüz kayıtlı değil." : "This opportunity is restricted by country and your country isn't on file yet.",

  // studentCountry is stored, proper-noun profile/opportunity data — never translated. The
  // Turkish clause is built so no suffix has to attach to it (see file header).
  countryNotEligible: (studentCountry: string, locale: Locale) =>
    locale === "tr" ? `Şu anda ${studentCountry} öğrencilerine açık değil.` : `Not currently open to students in ${studentCountry}.`,

  citizenshipUnknown: (locale: Locale) =>
    locale === "tr" ? "Bu fırsat belirli bir vatandaşlık gerektiriyor ve sizinki henüz kayıtlı değil." : "This opportunity requires a specific citizenship and yours isn't on file yet.",

  citizenshipNotEligible: (eligible: string, onFile: string, locale: Locale) =>
    locale === "tr"
      ? `Gerekli vatandaşlık: ${eligible}; kayıtlı vatandaşlığınız: ${onFile}.`
      : `Requires citizenship in ${eligible}; citizenship on file is ${onFile}.`,

  citizenshipRestrictionOnFile: (restriction: string, locale: Locale) =>
    locale === "tr" ? `Kayıtlı vatandaşlık kısıtlaması (otomatik doğrulanmadı): ${restriction}` : `Citizenship restriction on file (not automatically verified): ${restriction}`,

  residencyRestrictionOnFile: (restriction: string, locale: Locale) =>
    locale === "tr" ? `Kayıtlı ikamet kısıtlaması (otomatik doğrulanmadı): ${restriction}` : `Residency restriction on file (not automatically verified): ${restriction}`,

  countryEligibilityUnverified: (locale: Locale) =>
    locale === "tr"
      ? "Bu fırsat için ülke uygunluğu henüz doğrulanmadı — kısıtlamalar için resmi sayfayı kontrol edin."
      : "Country eligibility hasn't been verified for this opportunity yet — check the official page for restrictions.",

  gradeLevelUnknown: (locale: Locale) =>
    locale === "tr"
      ? "Bu fırsat sınıf seviyesine göre kısıtlı ve mezuniyet yılınız kayıtlı olmadan Oryn mevcut sınıfınızı hesaplayamaz."
      : "This opportunity restricts eligibility by grade level and Oryn can't compute your current grade without a graduation year on file.",

  gradeNotEligible: (eligibleGrades: string, currentGrade: number, locale: Locale) =>
    locale === "tr" ? `Uygun sınıflar: ${eligibleGrades}; şu anki sınıfınız: ${currentGrade}.` : `Restricted to grades ${eligibleGrades}; you're currently grade ${currentGrade}.`,
};
