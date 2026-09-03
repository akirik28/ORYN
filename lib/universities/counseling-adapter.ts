import { classifySubjects, type SubjectTaxonomy } from "@/lib/programs/subject-taxonomy";
import { checkUndergraduateFieldAvailability } from "@/lib/admissions/field-availability";
import { computeAdmissionOutlook, type NotApplicableKind } from "@/lib/admissions/outlook";
import { resolveAdmissionSystem, type AdmissionSystemShape } from "@/lib/admissions/system-shape";
import { explainOutlook, type DimensionScoreInput } from "@/lib/admissions/explain";
import { evaluateRequirement } from "@/lib/requirements/evaluate";
import { INFORMATIONAL_CATEGORIES, MANUAL_REVIEW_CATEGORIES } from "@/lib/requirements/types";
import type { RequirementFacts } from "@/lib/requirements/types";
import { requirementCategoryLabel } from "@/lib/counselor/copy";
import { formatTuition, tuitionQualifier } from "@/lib/universities/tuition-format";
import { formatCurrency } from "@/lib/i18n/format";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import type {
  DataConfidence,
  OutlookLabel,
  RequirementCategory,
  RequirementEvaluationStatus,
  TargetStatus,
} from "@/types/database";

/**
 * University counseling adapter (B7, counselor-data-quality-v1 founder brief) — "what does
 * this university mean for THIS student," assembled from pieces that already exist and are
 * already independently correct: `computeAdmissionOutlook`/`explainOutlook`
 * (lib/admissions), `evaluateRequirement` (lib/requirements), the verified program catalog,
 * and tuition's US-vs-international/domestic separation rule. Composition only, exactly like
 * `lib/counselor/dashboard-contract.ts` (B4) is for the dashboard: no new scoring, no new
 * admissions-probability concept, no re-derivation of a status this module didn't already
 * compute elsewhere. See the founder's explicit instruction on this package: "do not
 * implement fake acceptance chance, do not turn university match into an opaque score."
 *
 * Pure and DB-free, same boundary as `computeAdmissionOutlook`/`explainOutlook`/
 * `evaluateRequirement` themselves — a caller (a future simplified detail page, or today's
 * page if it's ever migrated to call this instead of stitching its own 8-query fan-out)
 * fetches the raw rows and passes in the narrow slices below. This module never touches
 * `createClient()`, so it's unit-testable the same way the pieces it composes are.
 *
 * Two fields go beyond a pure pass-through of existing output, because the founder's brief
 * names them explicitly and the current detail page doesn't actually surface either one as a
 * discrete, addressable thing (it only surfaces per-requirement reasoning text inline):
 *   - `missingEvidence` — the subset of requirement evaluations whose status is "unknown"
 *     specifically because a fact is missing from the student's own profile (never rules
 *     Proxola simply doesn't evaluate — see the exclusions below).
 *   - `recommendedActions` — those same items (plus a couple of other deterministic,
 *     state-derived cases) reframed as a short, deduplicated action list. Every entry's text
 *     is either `evaluateRequirement`'s own reasoning, verbatim, or static factual copy about
 *     product state (e.g. "not yet added as a target") — never a fabricated recommendation
 *     about what would actually improve the student's chances. That kind of prioritization
 *     judgment is Counselor Core's job (lib/counselor/**), deliberately not reproduced here.
 */

// ---------------------------------------------------------------------------
// Inputs — narrow slices, same convention as lib/requirements/types.ts's RequirementFacts
// ---------------------------------------------------------------------------

export interface CounselingProgramInput {
  id: string;
  name: string;
  degreeLevel: string | null;
  officialProgramUrl: string | null;
  subjectTaxonomy: SubjectTaxonomy | null;
  secondarySubjectTags: string[];
}

export interface CounselingRequirementInput {
  id: string;
  programId: string | null;
  requirementType: RequirementCategory;
  title: string | null;
  isRequired: boolean;
  sourceUrl: string | null;
}

export interface CounselingRequirementEvaluationInput {
  requirementId: string;
  status: RequirementEvaluationStatus;
  reasoning: string;
}

export interface CounselingTuitionFigure {
  amount: number;
  unit: string;
  precisionState: string;
}

export interface CounselingTuitionInput {
  /** US IPEDS all-in sticker-price estimate. Never blended with the international/domestic
   * figures below — see app/(app)/universities/[id]/page.tsx's own StatCard comment for why. */
  costOfAttendance: number | null;
  internationalTuition: CounselingTuitionFigure | null;
  domesticTuition: CounselingTuitionFigure | null;
}

export interface CounselingTargetInput {
  id: string;
  programId: string | null;
  status: TargetStatus;
}

export interface UniversityCounselingViewInput {
  universityId: string;
  universityName: string;

  /** `universities.country`. Feeds Gate 1 (`resolveAdmissionSystem`) and the
   * undergraduate-field-existence check. Optional so existing callers keep compiling;
   * omitting it resolves to an "unknown" admissions system, which leaves the outlook exactly
   * as it was before Gate 1 existed rather than guessing at a mechanism. */
  universityCountry?: string | null;

  /** `profiles.country` — the student's residence/school location, never citizenship.
   * Decides which of a country's parallel admissions pathways applies (Ireland's CAO vs.
   * non-EU-direct, Hong Kong's JUPAS vs. non-JUPAS, France's Parcoursup vs. DAP, Turkey's
   * domestic vs. foreign-national). See lib/admissions/system-shape.ts for why residence and
   * not citizenship is the correct signal for every one of those splits. */
  studentCountry?: string | null;

  /** Already filtered to `verification_state = 'verified_current'` by the caller — this
   * module doesn't re-derive that filter (see the fixed-this-session commit on the detail
   * page for why it must never widen to include unverified/discontinued rows). */
  verifiedPrograms: CounselingProgramInput[];

  /** Free-text labels from `student_interests` and/or `career_goals`, caller-ordered —
   * earlier entries are tried first when matching a program subject. Purely textual; this
   * module never guesses a "target major" the student hasn't actually stated somewhere. */
  studentInterestLabels: string[];

  /** Every requirement row for this university (university-wide and per-program), mirroring
   * what the detail page fetches today — this module doesn't scope by program itself. */
  requirements: CounselingRequirementInput[];

  /** This student's persisted evaluation for each requirement, where one exists — from
   * `student_requirement_evaluations` after `refreshRequirementEvaluations` has run. A
   * requirement with no matching entry here is handled explicitly, not assumed "met". */
  requirementEvaluations: CounselingRequirementEvaluationInput[];

  tuition: CounselingTuitionInput;

  /** Null when the student hasn't added this university to My Universities yet. Outlook is
   * only ever computed when this is present — same precondition the detail page already
   * enforces (`refreshAdmissionOutlook` only ever runs `if (targetRes.data)`). */
  target: CounselingTargetInput | null;

  /** Institutional admission rate, 0-1, from `university_statistics` — general, never this
   * student's individual probability (computeAdmissionOutlook's own contract). */
  admissionRate: number | null;

  /** 0-100 overall career profile score (`profiles.profile_strength_score`). */
  profileStrength: number;

  /** Confidence in the underlying profile data feeding the outlook. Callers assembling
   * this from live data should use `lib/admissions/outlook.ts`'s exported
   * `dataConfidenceForCompleteness` — the same function `refreshAdmissionOutlook` calls —
   * rather than re-deriving the completeness threshold by hand (that rule wasn't always
   * exported; a caller here once had to hand-copy it, which is exactly how two divergent
   * copies happen). */
  profileDataConfidence: DataConfidence;

  /** This student's own dimension scores (score + confidence per dimension), for
   * `explainOutlook` — confidence must travel with the score, not just the number, so a
   * dimension with no underlying facts can be excluded from naming a strength/gap instead of
   * being silently treated as a real 0 (see lib/admissions/explain.ts). */
  profileDimensionScores: DimensionScoreInput[];
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

export interface CounselingProgramSummary {
  id: string;
  name: string;
  degreeLevel: string | null;
  officialProgramUrl: string | null;
}

export interface ProgramFocus {
  /** Where the target major came from, in priority order: an explicit program the student
   * already targeted at this university beats an inferred match from a stated interest,
   * which beats "the student hasn't told Proxola what they want to study here." */
  interestSource: "target_program" | "stated_interest" | "none";
  /** The interest label that produced (or was tried for) a match — null when
   * `interestSource` is "target_program" (no inference involved) or "none". */
  matchedSubjectLabel: string | null;
  /** Verified programs matching the target major/interest. Can be empty even when
   * `interestSource` isn't "none" — that itself is meaningful (see recommendedActions). */
  matchedPrograms: CounselingProgramSummary[];
  totalVerifiedProgramCount: number;
}

export interface TuitionContext {
  kind: "cost_of_attendance" | "international" | "domestic" | "unavailable";
  displayValue: string | null;
  caption: string | null;
  /** The same winning figure `displayValue` formats, before any qualifier/currency-symbol
   *  text is applied — null exactly when `kind` is "unavailable". Added 2026-09-03 so the
   *  cost-bucket browse filter can bucket on a real number through this same priority order
   *  (cost_of_attendance -> international -> domestic) instead of re-deriving which figure
   *  wins a second time; `displayValue` is for showing a student, this is for comparing
   *  against a range. */
  rawAmount: number | null;
}

export interface AdmissionOutlookSummary {
  outlook: OutlookLabel;
  compositeScore: number;
  estimateRangeLow: number | null;
  estimateRangeHigh: number | null;
  estimateConfidence: DataConfidence | null;
  modelVersion: string;
  strengths: string[];
  gaps: string[];
  unknowns: string[];
  /** True when Proxola had no evidenced dimension to draw strengths/gaps from at all (every
   * dimension "low" confidence) — see `OutlookExplanation.insufficientData` in
   * lib/admissions/explain.ts. The UI must render this as "we don't know enough yet," not as
   * "no strengths/gaps found." */
  insufficientData: boolean;
  /** True when Gate 1 established this target does not read non-academic evidence, so
   * `strengths`/`gaps` are empty by construction rather than for want of profile data — see
   * `OutlookExplanation.profileNotAnInput`. The UI must render `notApplicableReason` in place
   * of the strengths/gaps framing here, never "add more profile data to see this." */
  profileNotAnInput: boolean;
  /** Non-null exactly when `outlook === "not_applicable"`. Unlike the persisted path
   * (`lib/admissions/persist.ts`, where `target_universities` has no column for it), this
   * view carries the explanation to the caller, so the UI never has to render a bare
   * "not applicable" badge with no reason attached. */
  notApplicableReason: string | null;
  notApplicableKind: NotApplicableKind | null;
  /** Gate 1's resolved shape and its sourced one-sentence mechanism description, for a
   * "how this university actually admits" line. Null when Proxola has not established it —
   * which is a state the UI should show as unknown, never as "holistic". */
  admissionSystemShape: AdmissionSystemShape | null;
  admissionSystemMechanism: string | null;
  /** Repo-relative research documents backing the two fields above. */
  sources: string[];
}

export interface RequirementRollupItem {
  requirementId: string;
  category: RequirementCategory;
  title: string | null;
  isRequired: boolean;
  status: RequirementEvaluationStatus;
  reasoning: string;
  sourceUrl: string | null;
}

export interface MissingEvidenceItem {
  requirementId: string;
  title: string;
  reasoning: string;
}

export interface RecommendedAction {
  label: string;
  detail: string;
  requirementId: string | null;
}

export interface UniversityCounselingView {
  universityId: string;
  universityName: string;
  isTarget: boolean;
  targetStatus: TargetStatus | null;
  /** Null exactly when `isTarget` is false — see the input doc comment. */
  outlook: AdmissionOutlookSummary | null;
  programFocus: ProgramFocus;
  tuition: TuitionContext;
  requirements: RequirementRollupItem[];
  requirementCounts: Record<RequirementEvaluationStatus, number>;
  missingEvidence: MissingEvidenceItem[];
  recommendedActions: RecommendedAction[];
}

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

const MAX_RECOMMENDED_ACTIONS = 5;

/** `evaluateRequirement`'s manual-review and informational branches never read `facts` — both
 * are unconditional checks near the top of the function, before `rawStructuredRule` or `facts`
 * is ever touched (see lib/requirements/evaluate.ts). That makes it safe to reuse the function
 * here with a placeholder facts object for either category, instead of duplicating either
 * branch's literal reasoning string. `refreshRequirementEvaluations` does persist a row for
 * manual-review categories (only informational ones are filtered out before upserting), so
 * this fallback is normally only exercised for informational rows in practice — kept for both
 * so the function stays correct even if a caller's fetch is incomplete.
 *
 * The one check that now runs ahead of those two is the evaluation gate, which reads only
 * `rawQualifiers` — omitted here, since `CounselingRequirementInput` carries no qualifier
 * columns. The persisted path (`student_requirement_evaluations`, written by
 * `refreshRequirementEvaluations`, which does pass the row) is where a gated row's own
 * reasoning reaches this view; this fallback only ever runs for a row that path skipped. */
const FACT_INDEPENDENT_FACTS: RequirementFacts = { curricula: [], courses: [], gpas: [], testScores: [], languages: [] };

function resolveRequirementStatus(
  requirement: CounselingRequirementInput,
  evaluationByRequirementId: Map<string, CounselingRequirementEvaluationInput>,
  locale: Locale
): { status: RequirementEvaluationStatus; reasoning: string } {
  const evaluation = evaluationByRequirementId.get(requirement.id);
  if (evaluation) return evaluation;
  if (INFORMATIONAL_CATEGORIES.includes(requirement.requirementType) || MANUAL_REVIEW_CATEGORIES.includes(requirement.requirementType)) {
    return evaluateRequirement(requirement.requirementType, null, FACT_INDEPENDENT_FACTS, undefined, locale);
  }
  // Genuinely absent (the caller didn't refresh evaluations before assembling, or this
  // requirement was added since the last refresh). Not the same as `evaluateRequirement`'s
  // "no structured rule recorded" case — that would misreport a rule that may well exist as
  // if it didn't. This is just an honest "not evaluated yet."
  return {
    status: "unknown",
    reasoning:
      locale === "tr"
        ? "Bu gereklilik henüz profiline göre kontrol edilmedi."
        : "This requirement hasn't been checked against your profile yet.",
  };
}

function deriveProgramFocus(input: UniversityCounselingViewInput): ProgramFocus {
  const totalVerifiedProgramCount = input.verifiedPrograms.length;

  if (input.target?.programId) {
    const targeted = input.verifiedPrograms.filter((p) => p.id === input.target!.programId);
    return {
      interestSource: "target_program",
      matchedSubjectLabel: null,
      matchedPrograms: targeted.map(toProgramSummary),
      totalVerifiedProgramCount,
    };
  }

  const candidates: { tag: SubjectTaxonomy; label: string }[] = [];
  const seenTags = new Set<SubjectTaxonomy>();
  for (const label of input.studentInterestLabels) {
    const { primary } = classifySubjects(label);
    if (primary === "other" || seenTags.has(primary)) continue;
    seenTags.add(primary);
    candidates.push({ tag: primary, label });
  }

  for (const candidate of candidates) {
    const matches = input.verifiedPrograms.filter(
      (p) => p.subjectTaxonomy === candidate.tag || p.secondarySubjectTags.includes(candidate.tag)
    );
    if (matches.length > 0) {
      return {
        interestSource: "stated_interest",
        matchedSubjectLabel: candidate.label,
        matchedPrograms: matches.map(toProgramSummary),
        totalVerifiedProgramCount,
      };
    }
  }

  return {
    interestSource: candidates.length > 0 ? "stated_interest" : "none",
    matchedSubjectLabel: candidates[0]?.label ?? null,
    matchedPrograms: [],
    totalVerifiedProgramCount,
  };
}

function toProgramSummary(program: CounselingProgramInput): CounselingProgramSummary {
  return { id: program.id, name: program.name, degreeLevel: program.degreeLevel, officialProgramUrl: program.officialProgramUrl };
}

/**
 * Mirrors the detail page's own tuition StatCard branch (US `cost_of_attendance` vs
 * UK-and-onward international/domestic `tuition_*_annual`, never blended) as data instead of
 * JSX, using the same pure formatters (`formatTuition`/`tuitionQualifier`) the page itself
 * already uses. The page isn't migrated to call this — see this module's header comment —
 * so keep the two in sync if either branch's rule changes.
 *
 * Exported and `locale`-aware (2026-09-03) — the browse card and compare page reuse this
 * exact priority order (cost_of_attendance -> international -> domestic -> unavailable) so a
 * third and fourth copy of it never has to be written; both now source `internationalTuition`/
 * `domesticTuition` from the same 173 real `university_profile_metrics` rows the detail page
 * already reads, closing a real gap — the browse card's own prop comment used to say tuition
 * coverage was "US-only," which was accurate when written and had gone stale underneath it,
 * the same shape as a cycle label describing a cancelled cycle as current. `locale` defaults
 * to English, same as `tuitionQualifier`/`formatTuition` themselves — this function's own
 * pre-existing caller (`buildUniversityCounselingView`) already receives a real `locale` and
 * simply wasn't passing it through; that was a latent i18n gap in the counseling view itself,
 * fixed as a side effect of making this reusable, not a new behavior invented for the new
 * callers.
 */
export function deriveTuitionContext(tuition: CounselingTuitionInput, locale: Locale = DEFAULT_LOCALE): TuitionContext {
  if (tuition.costOfAttendance != null) {
    return { kind: "cost_of_attendance", displayValue: formatCurrency(tuition.costOfAttendance), caption: null, rawAmount: tuition.costOfAttendance };
  }

  if (tuition.internationalTuition != null) {
    const intl = tuition.internationalTuition;
    const q = tuitionQualifier(intl.precisionState, locale);
    const domestic = tuition.domesticTuition;
    let caption: string | null = null;
    if (domestic != null) {
      const domesticQ = tuitionQualifier(domestic.precisionState, locale);
      caption = `${q.note}Domestic rate: ${domesticQ.valuePrefix}${formatTuition(domestic.amount, domestic.unit, locale)}`;
    } else if (q.note) {
      caption = `${q.note}— see university for your exact fee`;
    }
    return { kind: "international", displayValue: `${q.valuePrefix}${formatTuition(intl.amount, intl.unit, locale)}`, caption, rawAmount: intl.amount };
  }

  if (tuition.domesticTuition != null) {
    const domestic = tuition.domesticTuition;
    const q = tuitionQualifier(domestic.precisionState, locale);
    const caption = q.note ? `${q.note}International fee not separately published` : "International fee not published as a single figure — varies by course";
    return { kind: "domestic", displayValue: `${q.valuePrefix}${formatTuition(domestic.amount, domestic.unit, locale)}`, caption, rawAmount: domestic.amount };
  }

  return { kind: "unavailable", displayValue: null, caption: null, rawAmount: null };
}

/**
 * The student's intended field at this university, split by how strongly they said it.
 *
 * The distinction is load-bearing, not fussiness. `stated` means they picked a specific
 * programme here; `inferred` means Proxola matched a free-text interest label. Only `stated`
 * is allowed to change the outlook — suppressing a genuinely holistic US undergraduate
 * application because the student once typed "Medicine" into their interests would replace
 * one wrong answer with another. The inferred case still gets told the structural fact
 * (see `recommendedActions`), it just doesn't have its outlook rewritten.
 */
function deriveTargetField(input: UniversityCounselingViewInput, programFocus: ProgramFocus): {
  stated: SubjectTaxonomy | null;
  inferred: SubjectTaxonomy | null;
} {
  const targetedProgramId = input.target?.programId;
  if (targetedProgramId) {
    const targeted = input.verifiedPrograms.find((p) => p.id === targetedProgramId);
    if (targeted?.subjectTaxonomy) return { stated: targeted.subjectTaxonomy, inferred: null };
  }

  if (programFocus.matchedSubjectLabel) {
    const { primary } = classifySubjects(programFocus.matchedSubjectLabel);
    if (primary !== "other") return { stated: null, inferred: primary };
  }

  return { stated: null, inferred: null };
}

function deriveOutlook(
  input: UniversityCounselingViewInput,
  statedField: SubjectTaxonomy | null,
  locale: Locale
): AdmissionOutlookSummary | null {
  if (!input.target) return null;

  const targetCountry = input.universityCountry ?? null;
  const admissionSystem = resolveAdmissionSystem(
    {
      targetCountry,
      studentCountry: input.studentCountry ?? null,
      targetUniversityName: input.universityName,
      targetField: statedField,
    },
    locale
  );

  const outlook = computeAdmissionOutlook(
    {
      profileStrength: input.profileStrength,
      admissionRate: input.admissionRate,
      dataConfidence: input.profileDataConfidence,
      admissionSystem,
      fieldAvailability: checkUndergraduateFieldAvailability({ country: targetCountry, field: statedField }, locale),
    },
    locale
  );
  // Gate 1's own answer feeds the explanation too, not just the label. Without this the
  // panel contradicts its own badge: "not a profile-review system" over a list of profile
  // strengths, gaps, and essay/recommendation "unknowns" that this mechanism never reads.
  //
  // admissionRateKnown from input.admissionRate -- the same value just passed into
  // computeAdmissionOutlook above, not a second, independently-sourced check.
  const explanation = explainOutlook(input.profileDimensionScores, outlook.admissionSystemShape, input.admissionRate != null, locale);

  return {
    outlook: outlook.outlook,
    compositeScore: outlook.compositeScore,
    estimateRangeLow: outlook.estimateRangeLow,
    estimateRangeHigh: outlook.estimateRangeHigh,
    estimateConfidence: outlook.estimateConfidence,
    modelVersion: outlook.modelVersion,
    strengths: explanation.strengths,
    gaps: explanation.gaps,
    unknowns: explanation.unknowns,
    insufficientData: explanation.insufficientData,
    profileNotAnInput: explanation.profileNotAnInput,
    notApplicableReason: outlook.notApplicableReason,
    notApplicableKind: outlook.notApplicableKind,
    admissionSystemShape: outlook.admissionSystemShape,
    admissionSystemMechanism: outlook.admissionSystemMechanism,
    sources: outlook.sources,
  };
}

const EMPTY_STATUS_COUNTS: Record<RequirementEvaluationStatus, number> = {
  met: 0,
  likely_met: 0,
  not_met: 0,
  unknown: 0,
  needs_manual_review: 0,
};

/**
 * Assembles the counseling view for one university from already-fetched, already-correct
 * pieces. Pure and total — never throws on missing/empty input, mirroring every other
 * lib/admissions and lib/requirements function it composes.
 */
export function buildUniversityCounselingView(input: UniversityCounselingViewInput, locale: Locale = DEFAULT_LOCALE): UniversityCounselingView {
  const evaluationByRequirementId = new Map(input.requirementEvaluations.map((e) => [e.requirementId, e]));

  const rollup: RequirementRollupItem[] = input.requirements.map((requirement) => {
    const resolved = resolveRequirementStatus(requirement, evaluationByRequirementId, locale);
    return {
      requirementId: requirement.id,
      category: requirement.requirementType,
      title: requirement.title,
      isRequired: requirement.isRequired,
      status: resolved.status,
      reasoning: resolved.reasoning,
      sourceUrl: requirement.sourceUrl,
    };
  });

  // Counted over the same "evaluable" set lib/requirements/persist.ts itself uses (every
  // category except the informational ones) — informational rows are a date to read, not a
  // pass/fail signal, so folding them into "unknown" would inflate that bucket meaninglessly.
  const requirementCounts: Record<RequirementEvaluationStatus, number> = { ...EMPTY_STATUS_COUNTS };
  for (const item of rollup) {
    if (INFORMATIONAL_CATEGORIES.includes(item.category)) continue;
    requirementCounts[item.status] += 1;
  }

  // "Missing evidence" = Proxola could evaluate this if the student's own profile had the fact —
  // excludes informational rows (nothing to evidence) and MANUAL_REVIEW_CATEGORIES (Proxola
  // never evaluates those regardless of what's on file; see recommendedActions below instead).
  const missingEvidence: MissingEvidenceItem[] = rollup
    .filter((item) => item.status === "unknown" && !INFORMATIONAL_CATEGORIES.includes(item.category) && !MANUAL_REVIEW_CATEGORIES.includes(item.category))
    .map((item) => ({ requirementId: item.requirementId, title: item.title ?? requirementCategoryLabel(item.category, locale), reasoning: item.reasoning }));

  const manualReviewItems = rollup.filter((item) => item.status === "needs_manual_review" && MANUAL_REVIEW_CATEGORIES.includes(item.category));

  const programFocus = deriveProgramFocus(input);
  const tuition = deriveTuitionContext(input.tuition, locale);
  const targetField = deriveTargetField(input, programFocus);
  const outlook = deriveOutlook(input, targetField.stated, locale);

  const recommendedActions: RecommendedAction[] = [];

  if (!input.target) {
    recommendedActions.push({
      label: `Add ${input.universityName} as a target university`,
      detail: "Proxola only computes an admission outlook and requirement check once you've added a university to My Universities.",
      requirementId: null,
    });
  }

  // RULE-ADMISSIONS-021 at the interest level. When the field is only *inferred* from a
  // stated interest, the student's undergraduate application to this university is still a
  // real thing with a real outlook — so this surfaces the structural fact as an action
  // instead of suppressing the outlook, which `deriveOutlook` reserves for an explicitly
  // targeted programme. Both branches use the same sourced check; only the consequence
  // differs. Placed ahead of the requirement actions because "this isn't an undergraduate
  // degree here" outranks any missing-evidence item.
  if (targetField.inferred) {
    const inferredAvailability = checkUndergraduateFieldAvailability({
      country: input.universityCountry ?? null,
      field: targetField.inferred,
    });
    if (inferredAvailability.availability === "not_offered_at_undergraduate" && inferredAvailability.explanation) {
      recommendedActions.push({
        label: inferredAvailability.caveat
          ? `${inferredAvailability.explanation} ${inferredAvailability.caveat}`
          : inferredAvailability.explanation,
        detail: `Based on your stated interest in "${programFocus.matchedSubjectLabel}"`,
        requirementId: null,
      });
    }
  }

  const seenMissingCategories = new Set<RequirementCategory>();
  for (const item of missingEvidence) {
    const rollupItem = rollup.find((r) => r.requirementId === item.requirementId)!;
    if (seenMissingCategories.has(rollupItem.category)) continue;
    seenMissingCategories.add(rollupItem.category);
    recommendedActions.push({ label: item.reasoning, detail: requirementCategoryLabel(rollupItem.category, locale), requirementId: item.requirementId });
  }

  const seenManualReviewCategories = new Set<RequirementCategory>();
  for (const item of manualReviewItems) {
    if (seenManualReviewCategories.has(item.category)) continue;
    seenManualReviewCategories.add(item.category);
    recommendedActions.push({ label: item.reasoning, detail: requirementCategoryLabel(item.category, locale), requirementId: item.requirementId });
  }

  if (programFocus.interestSource !== "none" && programFocus.matchedPrograms.length === 0) {
    recommendedActions.push({
      label:
        programFocus.interestSource === "target_program"
          ? "Proxola can't currently verify the specific program you're targeting here is still offered — check the university's own page directly."
          : `Proxola hasn't verified a program at ${input.universityName} matching "${programFocus.matchedSubjectLabel}" yet — check the university's own catalog directly.`,
      detail: "Program catalog",
      requirementId: null,
    });
  } else if (programFocus.totalVerifiedProgramCount === 0) {
    recommendedActions.push({
      label: `Proxola hasn't verified any programs at ${input.universityName} yet.`,
      detail: "Program catalog",
      requirementId: null,
    });
  }

  return {
    universityId: input.universityId,
    universityName: input.universityName,
    isTarget: input.target !== null,
    targetStatus: input.target?.status ?? null,
    outlook,
    programFocus,
    tuition,
    requirements: rollup,
    requirementCounts,
    missingEvidence,
    recommendedActions: recommendedActions.slice(0, MAX_RECOMMENDED_ACTIONS),
  };
}
