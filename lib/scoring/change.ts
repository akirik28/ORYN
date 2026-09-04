import type { ProfileDimension } from "@/types/database";
import { dimensionLabel } from "./labels";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";

export interface DimensionChange {
  dimension: ProfileDimension;
  delta: number;
}

export interface ProfileChange {
  /** False when there is no earlier snapshot to compare against — say nothing rather than "no change". */
  hasHistory: boolean;
  /** Improved dimensions, largest gain first. */
  improved: DimensionChange[];
  /** Declined dimensions, largest drop first. */
  declined: DimensionChange[];
  /** How many dimensions came back identical. */
  steady: number;
}

export const NO_PROFILE_CHANGE: ProfileChange = {
  hasHistory: false,
  improved: [],
  declined: [],
  steady: 0,
};

/**
 * Per-dimension movement since a previous snapshot.
 *
 * Replaces the single aggregate delta ("+3 this month") that Home and Progress used to
 * lead with. A student cannot act on a mean of nine dimensions: it moves for reasons that
 * are invisible in it, and two very different months produce the same number. Naming the
 * dimensions that actually moved is both more honest and more useful, and it is the only
 * form of "what changed" a student can trace back to something they did.
 *
 * The aggregate itself is untouched and still stored — ranking, snapshots and trend logic
 * all read it. It is simply no longer what a student is shown.
 */
export function buildProfileChange(
  current: readonly { dimension: ProfileDimension; score: number }[],
  previousDimensionScores: Readonly<Record<string, number>> | null,
): ProfileChange {
  if (!previousDimensionScores) return NO_PROFILE_CHANGE;

  const improved: DimensionChange[] = [];
  const declined: DimensionChange[] = [];
  let steady = 0;

  for (const row of current) {
    const before = previousDimensionScores[row.dimension];
    // A dimension with no earlier value isn't "unchanged" — there is nothing to compare.
    if (before === undefined) continue;
    const delta = row.score - before;
    if (delta > 0) improved.push({ dimension: row.dimension, delta });
    else if (delta < 0) declined.push({ dimension: row.dimension, delta });
    else steady += 1;
  }

  improved.sort((a, b) => b.delta - a.delta);
  declined.sort((a, b) => a.delta - b.delta);
  return { hasHistory: true, improved, declined, steady };
}

/**
 * One plain sentence describing the movement, or null when there is nothing truthful to
 * say. Kept here rather than in a component so Home and Progress cannot drift apart.
 *
 * `locale` defaults to English so Progress (not yet migrated) keeps producing byte-identical
 * output; only features/dashboard/dashboard-view.tsx passes a resolved student locale today.
 * The Turkish is a separately-composed sentence per branch, not a translated one — e.g. the
 * "N other areas" branch drops English's singular/plural suffix entirely ("3 alan", never
 * "3 alanlar"), because Turkish doesn't inflect a noun for count when a number precedes it;
 * building that branch by porting the English `?"" : "s"` ternary would have produced a
 * grammatical but foreign-sounding sentence.
 */
export function describeProfileChange(change: ProfileChange, locale: Locale = DEFAULT_LOCALE): string | null {
  if (!change.hasHistory) return null;
  const tr = locale === "tr";

  const [best] = change.improved;
  if (best) {
    const label = dimensionLabel(best.dimension, locale);
    const others = change.improved.length - 1;
    const lead = tr ? `Son incelemenden bu yana en çok ${label} alanı ilerledi.` : `${label} is the area that moved most since your last review.`;
    if (others > 0) {
      return tr ? `${lead} ${others} alan daha ilerledi.` : `${lead} ${others} other area${others === 1 ? "" : "s"} also moved forward.`;
    }
    return lead;
  }

  const [worst] = change.declined;
  if (worst) {
    const label = dimensionLabel(worst.dimension, locale);
    return tr
      ? `Son incelemenden bu yana hiçbir alan ilerlemedi; ${label} ise daha önce sahip olduğu kanıtın bir kısmını kaybetti.`
      : `Nothing moved forward since your last review, and ${label.toLowerCase()} has less supporting evidence than it did.`;
  }

  return tr ? "Profilin son incelemenden bu yana sabit kaldı." : "Your profile has held steady since your last review.";
}

/**
 * Same selection logic as describeProfileChange above (same ProfileChange shape, same
 * best/worst dimension picked, same tie-break-free ordering already sorted upstream), but a
 * genuinely separate function rather than a locale-style branch inside it — the audience
 * isn't a locale difference, it's a different reader entirely.
 *
 * Found 2026-09-04 (Turkish voice pass, docs/veli-hesabi-spec-2026-09-04.md's own P4/P5
 * territory): lib/digest/parent-commentary.ts's no-AI fallback path was calling
 * describeProfileChange directly and sending its output to a PARENT. That function's Turkish
 * says "Son incelemenden..." -- "since YOUR (sen) last review" -- addressed to the student
 * whose review it actually is. A parent reading that sentence isn't just getting the wrong
 * formality register (sen vs. siz, this codebase's established parent-facing register --
 * see features/parent/parent-panel-view.tsx, app/(parent)/login), they're reading a claim
 * about a review that was never theirs. This is the third-person-only rewrite: names the
 * student instead of addressing "you" at all, matching
 * lib/ai/parent-commentary-prompt.ts's own explicit instruction for the AI path ("in third
 * person... not 'you'... repeated") -- this fallback exists specifically for when that AI
 * path is unavailable, so it needs to honor the identical constraint without a model to
 * enforce it.
 *
 * Turkish deliberately never suffixes `studentDisplayName` with a possessive ("Ada'nın...").
 * That name is arbitrary, student-entered text -- correctly choosing 'ın/'in/'un/'ün (or
 * adding a buffer consonant at all, for a name ending in a vowel) needs the name's actual
 * last vowel, which cannot be hardcoded for text this codebase doesn't control. "{name} için"
 * (for/regarding {name}) sidesteps the whole question: "için" is a postposition and never
 * changes shape for what precedes it, regardless of that word's ending. This is not a new
 * pattern here -- honestNoActivityNarrative two functions below already uses the identical
 * "{name} için" construction for the identical reason.
 */
export function describeProfileChangeForParent(change: ProfileChange, studentDisplayName: string, locale: Locale = DEFAULT_LOCALE): string | null {
  if (!change.hasHistory) return null;
  const tr = locale === "tr";

  const [best] = change.improved;
  if (best) {
    const label = dimensionLabel(best.dimension, locale);
    const others = change.improved.length - 1;
    const lead = tr
      ? `${studentDisplayName} için bu hafta en çok ${label} alanı ilerledi.`
      : `${label} is the area that moved most for ${studentDisplayName} this week.`;
    if (others > 0) {
      return tr ? `${lead} ${others} alan daha ilerledi.` : `${lead} ${others} other area${others === 1 ? "" : "s"} also moved forward.`;
    }
    return lead;
  }

  const [worst] = change.declined;
  if (worst) {
    const label = dimensionLabel(worst.dimension, locale);
    return tr
      ? `${studentDisplayName} için bu hafta hiçbir alan ilerlemedi; ${label} ise daha önce sahip olduğu kanıtın bir kısmını kaybetti.`
      : `Nothing moved forward for ${studentDisplayName} this week, and ${label.toLowerCase()} has less supporting evidence than it did.`;
  }

  return tr ? `${studentDisplayName} için profil bu hafta sabit kaldı.` : `${studentDisplayName}'s profile held steady this week.`;
}
