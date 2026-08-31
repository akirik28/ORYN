import type { DataConfidence, OutlookLabel } from "@/types/database";
import type { FieldAvailabilityResult } from "./field-availability";
import type { AdmissionSystemResolution, AdmissionSystemShape } from "./system-shape";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";

export const ADMISSION_MODEL_VERSION = "admission_model_v1";

/** Selectivity penalty applied to profile strength — configurable, named constants per
 * spec 17 ("all formula parameters must be configurable"), not magic numbers inline. */
const SELECTIVITY_PENALTY = {
  extreme: 45, // admission rate < 10%
  very_high: 22, // 10-25%
  high: 12, // 25-50%
  moderate: 5, // 50-75%
  lower: 0, // > 75%
  unknown: 15, // no admission rate on file — conservative middle-ground penalty
} as const;

function selectivityTier(admissionRate: number | null): keyof typeof SELECTIVITY_PENALTY {
  if (admissionRate === null) return "unknown";
  if (admissionRate < 0.1) return "extreme";
  if (admissionRate < 0.25) return "very_high";
  if (admissionRate < 0.5) return "high";
  if (admissionRate < 0.75) return "moderate";
  return "lower";
}

function classifyOutlook(compositeScore: number): OutlookLabel {
  if (compositeScore >= 70) return "likely";
  if (compositeScore >= 55) return "strong";
  if (compositeScore >= 40) return "competitive";
  if (compositeScore >= 20) return "reach";
  return "extreme_reach";
}

/**
 * How much to trust the profile-strength half of the outlook, given only how *complete*
 * the profile is. Exported so every caller derives this the same way instead of
 * re-forking a private rule — `lib/universities/counseling-adapter.ts` used to carry a
 * comment admitting it was hand-copying `refreshAdmissionOutlook`'s inline ternary
 * ("that one-line rule isn't re-exported as its own function, so it isn't re-derived here
 * either"), which is exactly the setup for the two copies drifting apart. Now there's one.
 *
 * Three bands, not two: the caller-side gate (`hasConfidentSignal` — see
 * `lib/admissions/persist.ts`) already refuses to compute an outlook at all below that
 * bar, so by the time this runs there is *some* real signal; this only decides how much.
 * A `completeness_percent` of 59 used to earn the identical "medium" as one of 5 — wrong
 * even in the populated case, just less visibly than the zero-signal case was. 60 is the
 * pre-existing "high" bar, unchanged; 30 is a plain midpoint below it, not tied to
 * `MIN_COMPLETENESS_FOR_JUDGMENT` (a different gate, in `lib/counselor/config.ts`, that
 * happens to use a nearby number for an unrelated reason — reusing it here would imply a
 * conceptual link that doesn't actually exist).
 */
export function dataConfidenceForCompleteness(completenessPercent: number): DataConfidence {
  if (completenessPercent >= 60) return "high";
  if (completenessPercent >= 30) return "medium";
  return "low";
}

/**
 * Gate 1 from `docs/research/counseling-intelligence/18-geography-conditional-scoring-design-
 * spec.md` §2: does the student's target admissions system review non-academic evidence at
 * all? "holistic" = USA always, UK/France narrowly (per that spec's §3.1-3.2). "credential_gate"
 * = Turkey/YKS, Germany generally, most of continental Europe (§3.3-3.4) — profile strength
 * built from the 9-dimension taxonomy is not what these systems actually evaluate on.
 * Optional and defaults to the pre-existing (implicitly "holistic") behavior — every caller
 * that doesn't pass it gets byte-identical output to before this field existed.
 *
 * @deprecated Superseded by `admissionSystem` (a resolved `AdmissionSystemResolution` from
 * `lib/admissions/system-shape.ts`), which carries the mechanism, the applicant pathway and
 * the sources rather than a coarse two-member verdict. Kept because it is a shipped public
 * contract with its own regression tests; new callers must pass `admissionSystem` instead.
 * `"credential_gate"` on its own cannot say *which* non-holistic mechanism applies, and the
 * two real ones need opposite messages — see `NotApplicableKind`.
 */
export type AdmissionSystemType = "holistic" | "credential_gate";

/**
 * Why the reach/competitive/likely scale was not applied. Kept separate from `OutlookLabel`
 * on purpose: `outlook_label` is a persisted Postgres enum (migration 0049) and these are
 * explanatory detail, so widening the column for every new reason would make a schema
 * migration the price of a better sentence. All of these persist as `not_applicable`.
 */
export type NotApplicableKind =
  /** No non-academic evidence review, and a competitive academic cutoff exists that Oryn
   * cannot see (Turkey/YKS, Ireland/CAO, Spain, Australia, German NC subjects). */
  | "no_evidence_review_rank_competitive"
  /** No non-academic evidence review, and no ranking to clear once the published threshold
   * is met — eligible functionally equals admitted (Dutch/Italian open programmes). */
  | "no_evidence_review_threshold"
  /** The field is not an undergraduate-admission object in this country at all
   * (RULE-ADMISSIONS-021: Medicine/Law in the US and Canada). Structurally different from
   * the two above — the target does not merely have unclear odds, it does not exist. */
  | "field_not_offered_at_undergraduate"
  /** Set only by the deprecated `admissionSystemType: "credential_gate"` path, which cannot
   * distinguish the first two. */
  | "credential_gate_unspecified";

export interface AdmissionOutlookInputs {
  /** 0-100 overall career profile score. */
  profileStrength: number;
  /** General institutional admission rate, 0-1, or null if unknown. Never treated as this student's individual probability — see the module doc below. */
  admissionRate: number | null;
  /** Confidence in the underlying profile data (low profile completeness => lower confidence in the whole outlook). */
  dataConfidence: DataConfidence;
  /** @deprecated See AdmissionSystemType. Ignored when `admissionSystem` is supplied. */
  admissionSystemType?: AdmissionSystemType;
  /**
   * Gate 1, resolved — `resolveAdmissionSystem()` from `./system-shape`. Takes precedence
   * over `admissionSystemType`. A `"holistic_review"` or `"unknown"` shape leaves every
   * output identical to omitting this field entirely: Oryn changes what it says only where
   * it has established that the reach/competitive/likely scale does not describe the target.
   */
  admissionSystem?: AdmissionSystemResolution;
  /**
   * Whether the student's intended field exists as an undergraduate credential in the
   * target's country — `checkUndergraduateFieldAvailability()` from `./field-availability`.
   * Callers should pass this only for a field the student has actually stated for this
   * target (an explicitly targeted programme), not one inferred from a general interest;
   * `"not_offered_at_undergraduate"` suppresses the classification outright, and its own
   * `explanation` is what the student is shown, since "Medicine is graduate-entry here, you
   * take a bachelor's first" is a genuinely useful answer where a generic disclaimer is not.
   */
  fieldAvailability?: FieldAvailabilityResult;
}

export interface AdmissionOutlookResult {
  outlook: OutlookLabel;
  compositeScore: number;
  selectivityTier: keyof typeof SELECTIVITY_PENALTY;
  /** Optional experimental range, whole-number percentage points, e.g. 15-25. Null unless there's enough real data to support even a wide approximation — never a single-point figure. */
  estimateRangeLow: number | null;
  estimateRangeHigh: number | null;
  estimateConfidence: DataConfidence | null;
  modelVersion: string;
  /**
   * Non-null exactly when `outlook === "not_applicable"` — the human-readable explanation to
   * pair with that label so a caller never has to reverse-engineer why. Migration 0049 added
   * `outlook_label`'s `not_applicable` member specifically so this field and `outlook` always
   * agree instead of `outlook` still claiming a confident reach/likely-style classification
   * while this field says it doesn't apply.
   */
  notApplicableReason: string | null;
  /** Non-null exactly when `notApplicableReason` is. Lets a caller pick different UI copy
   * for "this system doesn't read your activities" versus "this isn't an undergraduate
   * degree here" without string-matching the reason. */
  notApplicableKind: NotApplicableKind | null;
  /** Gate 1's resolved shape, echoed for callers that want to explain the mechanism without
   * re-resolving it. Null when the caller used the deprecated `admissionSystemType` path or
   * supplied nothing. */
  admissionSystemShape: AdmissionSystemShape | null;
  /** Gate 1's sourced mechanism sentence, when one was resolved — safe to show verbatim. */
  admissionSystemMechanism: string | null;
  /** Repo-relative research documents backing `notApplicableReason`/
   * `admissionSystemMechanism`. Empty when nothing beyond the base formula was applied. */
  sources: string[];
}

const NOT_APPLICABLE_REASONS: Record<NotApplicableKind, string> = {
  no_evidence_review_rank_competitive:
    "This target admits on academic results alone, in rank order against a cutoff that moves every year with demand. Oryn's reach/competitive/likely scale describes how a profile reads to a human reviewer, and there is no reviewer here — so it would be describing a step that doesn't exist. Oryn also can't show you where this cycle's cutoff will land, and won't guess.",
  no_evidence_review_threshold:
    "This target admits by meeting published requirements rather than by competing: once you're eligible, you're in. There's no reviewer reading your activities and no ranking to place highly in, so a reach/competitive/likely rating would be describing a mechanism this system doesn't have. What matters here is the requirement check, not a profile score.",
  field_not_offered_at_undergraduate:
    "This isn't an undergraduate path in this country, so there's no undergraduate admission to rate.",
  credential_gate_unspecified:
    "This target's admissions system is credential/exam-gated — non-academic profile strength is not a general input to the admission decision itself, so this outlook should not be shown as a normal reach/competitive/likely-style classification. See 18-geography-conditional-scoring-design-spec.md §3.3-3.4.",
};

/**
 * Turkish counterparts. "reach/competitive/likely" is left untranslated deliberately in both
 * languages — it's the literal vocabulary `OutlookBadge` renders on screen today, itself not
 * yet translated (a different, not-yet-assigned component), so naming it in Turkish here
 * would describe a badge that doesn't say that.
 *
 * Each hedge was checked specifically for whether the Turkish still admits the same limit the
 * English does, not just for fluency — the founder's own standing instruction for this slice.
 * "there is no reviewer here — so it would be describing a step that doesn't exist" survives
 * as "burada bir değerlendirici yok — yani var olmayan bir adımı anlatmış olurdu" (would be
 * describing a step that doesn't exist); "and won't guess" survives as "tahmin yürütmez"
 * (does not guess) — neither softens into a claim Oryn doesn't have grounds for.
 */
const NOT_APPLICABLE_REASONS_TR: Record<NotApplicableKind, string> = {
  no_evidence_review_rank_competitive:
    "Bu hedef yalnızca akademik sonuçlara göre, her yıl talebe göre değişen bir sıralama eşiğine göre kabul yapıyor. Oryn'ın reach/competitive/likely ölçeği bir profilin insan bir değerlendirici gözünde nasıl okunduğunu anlatır; burada bir değerlendirici yok — yani var olmayan bir adımı anlatmış olurdu. Oryn ayrıca bu dönemin eşiğinin nereye geleceğini gösteremez ve tahmin yürütmez.",
  no_evidence_review_threshold:
    "Bu hedef, yarışarak değil yayımlanmış koşulları karşılayarak kabul ediyor: uygun olduğun an kabul edilmiş olursun. Aktivitelerini okuyan bir değerlendirici yok, yüksek sıralanacağın bir sıralama da yok — bu yüzden bir reach/competitive/likely derecelendirmesi bu sistemde bulunmayan bir mekanizmayı anlatmış olurdu. Burada önemli olan gereklilik kontrolüdür, profil puanı değil.",
  field_not_offered_at_undergraduate: "Bu, bu ülkede bir lisans yolu değil; bu yüzden değerlendirilecek bir lisans kabulü de yok.",
  credential_gate_unspecified:
    "Bu hedefin kabul sistemi kimlik/sınav temelli (credential/exam-gated) — akademik olmayan profil gücü kabul kararına genel bir girdi değildir, bu yüzden bu görünüm normal bir reach/competitive/likely tarzı sınıflandırma olarak gösterilmemelidir. Bkz. 18-geography-conditional-scoring-design-spec.md §3.3-3.4.",
};

function notApplicableReasonFor(kind: NotApplicableKind, locale: Locale): string {
  return locale === "tr" ? NOT_APPLICABLE_REASONS_TR[kind] : NOT_APPLICABLE_REASONS[kind];
}

/** Maps Gate 1's shape onto the suppression decision. `holistic_review` and `unknown` both
 * mean "keep the existing classification": the first because the scale genuinely describes
 * the target, the second because Oryn has established nothing and must not act on a guess. */
function notApplicableKindForShape(shape: AdmissionSystemShape): NotApplicableKind | null {
  if (shape === "academic_rank_competitive") return "no_evidence_review_rank_competitive";
  if (shape === "academic_threshold") return "no_evidence_review_threshold";
  return null;
}

/**
 * Transparent heuristic admission outlook (spec Phase 16/17) — a general institutional
 * admission rate is never presented as an individual student's probability. The
 * composite score combines the student's profile strength with the school's selectivity;
 * the optional numeric range is a deliberately wide, low/medium-confidence approximation,
 * never higher confidence and never single-point precision.
 *
 * `locale` defaults to English; see lib/counselor/evidence.ts's buildRecommendation for the
 * full reasoning behind that default across this codebase's i18n work. Only affects
 * `notApplicableReason` — `admissionSystem.mechanism` (from system-shape.ts, concatenated in
 * front of it below) is untranslated for all but Turkey today; see that file's own note.
 */
export function computeAdmissionOutlook(inputs: AdmissionOutlookInputs, locale: Locale = DEFAULT_LOCALE): AdmissionOutlookResult {
  const tier = selectivityTier(inputs.admissionRate);
  const compositeScore = Math.max(0, Math.min(100, inputs.profileStrength - SELECTIVITY_PENALTY[tier]));

  // Precedence, most to least specific. A field that isn't an undergraduate object in this
  // country outranks Gate 1 entirely: if the degree path doesn't exist, how the country would
  // have evaluated it is moot. Gate 1 then outranks the deprecated coarse flag.
  const shape = inputs.admissionSystem?.shape ?? null;
  const notApplicableKind: NotApplicableKind | null =
    inputs.fieldAvailability?.availability === "not_offered_at_undergraduate"
      ? "field_not_offered_at_undergraduate"
      : shape !== null
        ? notApplicableKindForShape(shape)
        : inputs.admissionSystemType === "credential_gate"
          ? "credential_gate_unspecified"
          : null;
  const isNotApplicable = notApplicableKind !== null;

  // compositeScore is still computed above (a real, if not admissions-relevant, read of raw
  // profile strength vs. the target's selectivity) so callers keep a numeric field to persist/
  // display if useful, but the LABEL itself must not claim a holistic-review classification
  // that doesn't describe this target — that's what "not_applicable" (migration 0049) is for.
  const outlook = isNotApplicable ? "not_applicable" : classifyOutlook(compositeScore);

  let estimateRangeLow: number | null = null;
  let estimateRangeHigh: number | null = null;
  let estimateConfidence: DataConfidence | null = null;

  if (inputs.admissionRate !== null && !isNotApplicable) {
    const baseRate = inputs.admissionRate * 100;
    const nudge = (compositeScore - 50) * 0.4;
    const center = Math.max(1, Math.min(95, baseRate + nudge));
    estimateRangeLow = Math.round(Math.max(1, center - 10));
    estimateRangeHigh = Math.round(Math.min(99, center + 10));
    estimateConfidence = inputs.dataConfidence === "high" ? "medium" : "low";
  }

  // For the field case the student is shown the specific route ("Medicine is not an
  // undergraduate degree in the United States — you take a bachelor's first, then apply to
  // medical school"), never the generic sentence alone: the whole reason this kind is
  // separate is that a real answer exists here, and the country's general admissions
  // mechanism is beside the point once the degree path itself doesn't exist.
  const field = notApplicableKind === "field_not_offered_at_undergraduate" ? inputs.fieldAvailability! : null;
  const mechanism = field ? null : (inputs.admissionSystem?.mechanism ?? null);

  let notApplicableReason: string | null = null;
  if (isNotApplicable) {
    if (field) {
      // field.explanation is already in the caller's chosen locale by this point — it comes
      // from inputs.fieldAvailability, which the caller built via
      // checkUndergraduateFieldAvailability(query, locale). Only the fallback (an unresearched
      // field within a researched country/kind combination — should not occur in practice, but
      // this function stays total) needs its own locale lookup.
      notApplicableReason = [field.explanation ?? notApplicableReasonFor(notApplicableKind, locale), field.caveat]
        .filter((part): part is string => part !== null)
        .join(" ");
    } else {
      // mechanism (from inputs.admissionSystem, i.e. system-shape.ts) is untranslated for all
      // but Turkey today — see that file's own note. For every other country in this branch,
      // a Turkish reader gets an English mechanism sentence glued in front of a Turkish hedge
      // until system-shape.ts's remaining ~28 sentences are translated. Flagged, not hidden.
      notApplicableReason = mechanism === null
        ? notApplicableReasonFor(notApplicableKind, locale)
        : `${mechanism} ${notApplicableReasonFor(notApplicableKind, locale)}`;
    }
  }

  return {
    outlook,
    compositeScore: Math.round(compositeScore),
    selectivityTier: tier,
    estimateRangeLow,
    estimateRangeHigh,
    estimateConfidence,
    modelVersion: ADMISSION_MODEL_VERSION,
    notApplicableReason,
    notApplicableKind,
    admissionSystemShape: shape,
    admissionSystemMechanism: mechanism,
    sources: field ? field.sources : (inputs.admissionSystem?.sources ?? []),
  };
}
