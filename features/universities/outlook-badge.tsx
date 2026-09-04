import { StatusBadge, type StatusTone } from "@/components/proxola/status-badge";
import { outlookLabel, type NotApplicableKind } from "@/lib/admissions/outlook";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import type { OutlookLabel } from "@/types/database";

// Selectivity, not sentiment: "Extreme Reach" isn't an error state and "Likely" isn't a
// guarantee (AGENTS.md's "never imply admissions certainty"), but the tone ramp still
// needs to read instantly. error/warning/brand/success track the same low-to-high
// likelihood ordering StatusBadge's tones already carry elsewhere in the product.
//
// "not_applicable" (migration 0049) is deliberately NOT on that ramp — it isn't a bad
// outlook, it's a statement that this scale doesn't describe the target. "neutral" tone,
// same as the "not yet assessed" case below, so it never reads as a reach-y classification
// by accident. Its LABEL comes from NOT_APPLICABLE_LABELS instead — see below.
// Tone is presentation-only and doesn't depend on locale, unlike the label (outlookLabel(),
// lib/admissions/outlook.ts — shared, because the model prompt needs the same words this
// badge shows), so it stays a plain static map rather than joining the label in one object.
const OUTLOOK_TONE: Record<OutlookLabel, StatusTone> = {
  extreme_reach: "error",
  reach: "warning",
  competitive: "brand",
  strong: "success",
  likely: "success",
  not_applicable: "neutral",
};

/**
 * `not_applicable` is one persisted enum member covering reasons that are not variations of
 * each other, and one of them was being described wrongly.
 *
 * "Not a profile-review system" is true of a Turkish or Dutch target: there is an
 * undergraduate admission, and the mechanism simply doesn't read a student's activities. It
 * is flatly false of undergraduate Medicine or Law in the US, where the finding
 * (RULE-ADMISSIONS-021, `lib/admissions/field-availability.ts`) is that *the degree does not
 * exist at that level* — there is no admission of any kind to characterise. Telling a student
 * that US Medicine "isn't a profile-review system" implies a judgement about a process they'd
 * then go looking for, when the real answer is that they take a bachelor's first and apply to
 * medical school afterwards.
 *
 * The fallback when the kind is unknown is deliberately the vaguest of the three: the badge
 * asserts only what `not_applicable` itself guarantees — that the reach/competitive/likely
 * scale was not applied — and leaves the reason to the surface that actually knows it. The
 * dashboard is that case today; it lists targets without resolving each one's field or
 * admissions mechanism, and a neutral truth there is better than a specific falsehood.
 */
const NOT_APPLICABLE_LABELS: Record<NotApplicableKind, string> = {
  no_undergraduate_pathway_for_applicant: "No admission pathway available",
  field_not_offered_at_undergraduate: "Not an undergraduate degree here",
  no_evidence_review_rank_competitive: "Not a profile-review system",
  no_evidence_review_threshold: "Not a profile-review system",
  credential_gate_unspecified: "Not a profile-review system",
};

/** Only this badge renders these — unlike OUTLOOK_LABELS, no second consumer has appeared,
 *  so the Turkish stays local here rather than moving into lib/admissions/outlook.ts. */
const NOT_APPLICABLE_LABELS_TR: Record<NotApplicableKind, string> = {
  no_undergraduate_pathway_for_applicant: "Kabul yolu yok",
  field_not_offered_at_undergraduate: "Burada lisans programı değil",
  no_evidence_review_rank_competitive: "Profil değerlendirmeli bir sistem değil",
  no_evidence_review_threshold: "Profil değerlendirmeli bir sistem değil",
  credential_gate_unspecified: "Profil değerlendirmeli bir sistem değil",
};

export function OutlookBadge({
  outlook,
  notApplicableKind,
  locale = DEFAULT_LOCALE,
}: {
  outlook: OutlookLabel | null;
  notApplicableKind?: NotApplicableKind | null;
  locale?: Locale;
}) {
  if (!outlook) {
    return <StatusBadge label={locale === "tr" ? "Henüz değerlendirilmedi" : "Not yet assessed"} tone="neutral" />;
  }

  const tone = OUTLOOK_TONE[outlook];
  const label =
    outlook === "not_applicable" && notApplicableKind
      ? (locale === "tr" ? NOT_APPLICABLE_LABELS_TR : NOT_APPLICABLE_LABELS)[notApplicableKind]
      : outlookLabel(outlook, locale);
  return <StatusBadge label={label} tone={tone} />;
}
