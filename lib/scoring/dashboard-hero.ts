import { canClaimGap, hasConfidentSignal, type DimensionSignal } from "@/lib/scoring/signal";
import { DIMENSION_LABELS } from "@/lib/scoring/labels";
import type { ProfileDimension } from "@/types/database";

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
): DashboardHeroState {
  const claimableGap = biggestGap && canClaimGap(profileSignal, biggestGap.dimension) ? biggestGap : null;
  const hasRichSignal = hasConfidentSignal(profileSignal);

  const strongCount = profileSignal.filter((row) => row.state === "strong").length;
  const unknownCount = profileSignal.filter((row) => row.state === "limited_evidence").length;
  const evidence: HeroEvidenceStat[] | undefined = hasRichSignal
    ? [
        { label: "Areas assessed", value: profileSignal.length - unknownCount },
        { label: "Already strong", value: strongCount, tone: strongCount > 0 ? "positive" : undefined },
        ...(unknownCount > 0 ? [{ label: "No evidence yet", value: unknownCount, tone: "missing" as const }] : []),
      ]
    : undefined;

  if (claimableGap) {
    return { kind: "claimable", gapLabel: DIMENSION_LABELS[claimableGap.dimension], evidence };
  }
  if (hasRichSignal) {
    return { kind: "rich_unclaimable", gapLabel: null, evidence };
  }
  return { kind: "empty", gapLabel: null, evidence: undefined };
}
