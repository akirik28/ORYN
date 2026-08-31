import { canClaimGap, hasConfidentSignal, signalCoverage, type DimensionSignal } from "@/lib/scoring/signal";
import { dimensionLabel } from "@/lib/scoring/labels";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import type { ProfileDimension } from "@/types/database";

const EVIDENCE_STAT_LABEL_EN = { areasAssessed: "Areas assessed", alreadyStrong: "Already strong", noEvidenceYet: "No evidence yet" };
const EVIDENCE_STAT_LABEL_TR = { areasAssessed: "Değerlendirilen alan", alreadyStrong: "Zaten güçlü", noEvidenceYet: "Henüz kanıt yok" };

export interface HeroEvidenceStat {
  label: string;
  value: number;
  tone?: "positive" | "missing";
}

export type DashboardHeroKind = "claimable" | "rich_unclaimable" | "empty";

export interface DashboardHeroState {
  kind: DashboardHeroKind;
  /** Only set when `kind === "claimable"`. */
  gapLabel: string | null;
  /** Set whenever the profile has real signal (`claimable` or `rich_unclaimable`), so the
   * evidence disclosure reflects the whole profile, not just the one dimension a claimable
   * gap names. */
  evidence: HeroEvidenceStat[] | undefined;
}

/**
 * What the dashboard hero should say, kept out of the component so Home's headline logic
 * has one place to live and one place to test — same rationale as `describeProfileChange`
 * in `lib/scoring/change.ts`.
 *
 * `rankDimensionGaps` (upstream, in `lib/counselor/gaps.ts`) returns the single lowest-
 * scoring dimension whether or not Oryn has any confidence in that score, so this has to
 * ask two separate questions rather than one: does the *whole profile* have enough signal
 * to say anything (`hasConfidentSignal`), and can Oryn specifically *name* the weakest
 * dimension as a gap (`canClaimGap`, which is `hasConfidentSignal` plus "and this one
 * dimension in particular is assessed").
 *
 * Live Gate 2 finding, 2026-08-24 (docs/handoffs/gate2-ai-counselor-report-2026-08-24.md
 * §18): collapsing both questions into `canClaimGap` alone meant a rich, 90%-complete
 * profile whose literal weakest dimension happened to be unassessed rendered the identical
 * "there isn't enough recorded" copy as a genuinely empty profile — a false claim on a
 * strong account. `kind: "rich_unclaimable"` is the honest third state: real signal exists,
 * but no single dimension stands out enough to name.
 */
export function computeDashboardHeroState(
  profileSignal: DimensionSignal[],
  biggestGap: { dimension: ProfileDimension; score: number } | null,
  locale: Locale = DEFAULT_LOCALE,
): DashboardHeroState {
  const claimableGap = biggestGap && canClaimGap(profileSignal, biggestGap.dimension) ? biggestGap : null;
  const hasRichSignal = hasConfidentSignal(profileSignal);
  const statLabel = locale === "tr" ? EVIDENCE_STAT_LABEL_TR : EVIDENCE_STAT_LABEL_EN;

  // Counted by `signalCoverage`, not by hand. This block used to classify the states itself
  // and got both numbers wrong: it treated `limited_evidence` as the only unknown state, so
  // "Areas assessed" was `total - limitedEvidence` — which silently counted every
  // `not_assessed` dimension as assessed — and it then printed that same
  // `limited_evidence` count under the label "No evidence yet", which is the wording for
  // `not_assessed`. On a real account holding 3 assessed / 3 limited / 3 nothing-at-all it
  // rendered "Areas assessed 6 · No evidence yet 3" when the truth was 3 and 6 (founder
  // account, 2026-08-31). `isAssessed` is the one predicate that decides this question
  // everywhere else; re-deriving it locally is what let the two drift apart.
  const coverage = signalCoverage(profileSignal);
  const evidence: HeroEvidenceStat[] | undefined = hasRichSignal
    ? [
        { label: statLabel.areasAssessed, value: coverage.assessed },
        { label: statLabel.alreadyStrong, value: coverage.strong, tone: coverage.strong > 0 ? "positive" : undefined },
        ...(coverage.awaitingEvidence > 0
          ? [{ label: statLabel.noEvidenceYet, value: coverage.awaitingEvidence, tone: "missing" as const }]
          : []),
      ]
    : undefined;

  if (claimableGap) {
    return { kind: "claimable", gapLabel: dimensionLabel(claimableGap.dimension, locale), evidence };
  }
  if (hasRichSignal) {
    return { kind: "rich_unclaimable", gapLabel: null, evidence };
  }
  return { kind: "empty", gapLabel: null, evidence: undefined };
}
