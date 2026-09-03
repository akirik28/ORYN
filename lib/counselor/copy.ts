import type { Locale } from "@/lib/i18n/config";
import { dimensionLabel } from "@/lib/scoring/labels";
import { REQUIREMENT_CATEGORY_LABELS } from "@/lib/requirements/types";
import type { ProfileDimension, RecommendationClass, RequirementCategory } from "@/types/database";
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
  insufficient_data: "an area Proxola doesn't have enough data on yet",
};

/**
 * The "Addresses {dimension}, {severity} ({score}/100)." family from evidence.ts.
 *
 * `insufficient_data` omits the score entirely (2026-09-02, Phase 79's audit) — this
 * severity means Proxola hasn't confidently assessed the dimension at all, and the
 * underlying score is 0 by construction for a dimension with no evidence (same fact
 * lib/scoring/signal.ts's own EvidenceState machinery is built around). Before this fix,
 * "insufficient data (0/100)" was live on every Counselor Core card for an unassessed
 * dimension — quoting a score for a dimension Proxola admits it can't assess is exactly the
 * "0 reported as a real weakness" Phase 68 forbids, the same principle the dashboard's own
 * profile-signal panel already holds a few files away. `alreadyStrongWhyLine` below is not
 * a sibling instance of this bug: `whyForOpportunity` (evidence.ts) only ever calls it when
 * `score >= GAP_CLAIM_SCORE_CEILING`, so its score is always a genuinely, confidently high
 * one.
 */
export function gapWhyLine(dimension: ProfileDimension, severity: GapSeverity, score: number, locale: Locale): string {
  const scoreSuffix = severity === "insufficient_data" ? "" : ` (${score}/100)`;
  if (locale === "tr") {
    return `${dimensionLabel(dimension, "tr")} — ${SEVERITY_LABEL_TR[severity]}${scoreSuffix}.`;
  }
  return `Addresses ${dimensionLabel(dimension, "en")}, ${SEVERITY_LABEL_EN[severity]}${scoreSuffix}.`;
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
    ? "Proxola bu bilgiye henüz sahip değil — güvenilir öneriler için gerekli."
    : "Proxola doesn't have this information yet — needed for confident recommendations.";
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

// ---------------------------------------------------------------------------
// recommendationClass — same class of gap this file already closed once for
// requirementCategoryLabel above (its own comment: a counselor card used to render the
// raw enum, "Address: standardized_test (MIT)"). This instance reached further: the raw
// value was going into the weekly-plan/advisor/counselor-explain AI prompts
// (lib/ai/weekly-plan.ts's formatOne, lib/ai/counselor-explain.ts), and Phase 39's own
// live incident shows what an LLM does with an unlabeled identifier it's handed — it
// doesn't fail to parse "extreme_reach" or "avoid_for_now" (snake_case English isn't
// opaque to a model), it reproduces the identifier verbatim in the reply a student then
// reads. So the risk here is echo, not comprehension, and the design bar is "what would
// be fine for a student to see if the model quotes this back verbatim" — not merely
// "legible". Kept deliberately short: these labels sit inline in the two AI surfaces that
// carry roughly 90% of this product's spend (lib/ai/weekly-plan.ts's own cost comment),
// once per recommendation per call.
//
// `avoid_for_now` got the most attention — it's Phase 39's differentiating feature, the
// least legible of the four raw values, and the one most likely to be echoed back
// (`ADVISOR_SYSTEM_PROMPT` explicitly asks the model to name and explain what to avoid).
// "avoid for now" / "şimdilik önerilmiyor" ("not recommended for now") deliberately
// mirrors "do" → "recommended" / "önerilen" as a negation, so a four-item ladder
// (recommended > consider > lower priority > avoid for now) reads coherently as one
// scale in either language rather than four unrelated words. "lower priority" for
// `deprioritize` reuses AGENTS.md's own Phase 39 example wording ("currently a
// low-priority activity") rather than inventing new vocabulary for the same idea.
// ---------------------------------------------------------------------------

const RECOMMENDATION_CLASS_LABEL_EN: Record<RecommendationClass, string> = {
  do: "recommended",
  consider: "consider",
  deprioritize: "lower priority",
  avoid_for_now: "avoid for now",
};

const RECOMMENDATION_CLASS_LABEL_TR: Record<RecommendationClass, string> = {
  do: "önerilen",
  consider: "değerlendirilebilir",
  deprioritize: "düşük öncelik",
  avoid_for_now: "şimdilik önerilmiyor",
};

export function recommendationClassLabel(value: RecommendationClass, locale: Locale): string {
  return locale === "tr" ? RECOMMENDATION_CLASS_LABEL_TR[value] : RECOMMENDATION_CLASS_LABEL_EN[value];
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
//
// The per-restriction sentences (age/country/citizenship/grade) used to live here as a
// second, independently-worded implementation of the same messages `matching.ts` builds for
// the Opportunities pages — see `lib/opportunities/matching.ts`'s `eligibilityMessages` doc
// comment for why matching.ts's wording won the consolidation (docs/known-issues.md's
// "two independent eligibility pipelines" entry, now resolved). Only the two messages with
// no counterpart in matching.ts — a missing/unfetched opportunity row, and one that failed
// its own verification check — stay here.
// ---------------------------------------------------------------------------

export const eligibilityCopy = {
  dataNotFound: (locale: Locale) => (locale === "tr" ? "Bu fırsatın güncel verisi bulunamadı." : "This opportunity's current data couldn't be found."),

  notVerified: (locale: Locale) => (locale === "tr" ? "Bu fırsat şu anda doğrulanmış değil." : "This opportunity is not currently verified."),
};
