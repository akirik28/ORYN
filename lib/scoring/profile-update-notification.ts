import "server-only";

import type { ProfileChange, DimensionChange } from "./change";
import { dimensionLabel } from "./labels";
import type { Locale } from "@/lib/i18n/config";

/**
 * How large a single dimension's move has to be, in points (0-100 scale), before it's
 * worth interrupting a student with a notification for it — Phase 40's own words: "avoid
 * meaningless score movement." Deliberately a higher bar than the pre-existing "keep a
 * history snapshot" threshold (lib/scoring/persist.ts's changedMeaningfully, >= 1 point on
 * the OVERALL score) — a silent history record and an interruption are different costs,
 * and the second one should need more to justify it.
 *
 * Grounded in real data, not picked cold: every dimension change ever recorded in
 * oryn-qa-scratch's profile_score_snapshots (2026-09-02) is >= 4 points — the smallest was
 * a research dimension moving 4->5; every other real edit (adding a course, an award, a
 * project) moved its dimension by 12-55 points at once. 5 sits just above the smallest
 * real observed movement, comfortably below every other one, and above the "keep a
 * snapshot" floor — so this notifies on genuine, deliberate profile changes and not on the
 * kind of sub-point drift a scoring-formula tweak could in principle produce.
 */
export const NOTIFIABLE_DIMENSION_DELTA = 5;

/**
 * Completeness milestones worth telling a student about (Phase 67: completeness is "how
 * much Oryn knows about you", a genuinely different metric from profile strength). Round
 * numbers a progress bar would naturally pause at, not every 1% tick — reaching one is a
 * real, nameable moment ("your profile is now half filled in"); nobody needs to be told
 * they went from 61% to 62%.
 */
const COMPLETENESS_MILESTONES = [25, 50, 75, 100] as const;

export interface ProfileUpdateEvent {
  /** Both directions — Phase 40's "avoid meaningless movement" is about magnitude, not
   * sign; a dimension that dropped 8 points because evidence was rejected is exactly as
   * much "the consequence of something" as one that rose 8 points. Sorted the same way
   * ProfileChange itself is: improved largest-gain-first, declined largest-drop-first. */
  dimensionChanges: readonly DimensionChange[];
  /** The highest new milestone reached this update, or null if none was crossed. If an
   * edit jumps completeness across more than one band at once (25 -> 80, say), only the
   * highest is reported — a student cares that they crossed into "mostly done", not that
   * they technically passed through 50 on the way. */
  completenessMilestone: number | null;
}

/**
 * Whether this profile update is worth a notification, and what it's about — pure, no I/O,
 * so the decision itself is directly testable without touching Supabase. Returns null when
 * there is nothing worth interrupting the student for: no dimension moved past
 * NOTIFIABLE_DIMENSION_DELTA in either direction, and no completeness milestone was newly
 * reached.
 *
 * `previousCompleteness === null` (no earlier value to compare, e.g. the very first
 * computation onboarding produces) means "say nothing" for the completeness half of this
 * check — the same principle lib/scoring/change.ts's `hasHistory` already applies to
 * dimension changes, extended here for consistency rather than reinvented.
 */
export function detectNotifiableProfileUpdate(change: ProfileChange, previousCompleteness: number | null, newCompleteness: number): ProfileUpdateEvent | null {
  const dimensionChanges = [...change.improved, ...change.declined].filter((d) => Math.abs(d.delta) >= NOTIFIABLE_DIMENSION_DELTA);

  const completenessMilestone =
    previousCompleteness === null ? null : COMPLETENESS_MILESTONES.filter((m) => previousCompleteness < m && newCompleteness >= m).at(-1) ?? null;

  if (dimensionChanges.length === 0 && completenessMilestone === null) return null;
  return { dimensionChanges, completenessMilestone };
}

/** Narrower than next-intl's real `getTranslations` return type, same convention
 * lib/deadlines/scan.ts's own NotificationTranslator uses — this is all the formatter
 * below needs, and what its tests mock directly. */
type NotificationTranslator = (
  key: "profileUpdateTitle" | "profileUpdateItem" | "completenessMilestoneReached",
  values?: Record<string, string | number>
) => string;

/** "+8" / "-3" — the sign is part of the value, not the translation, since a delta's
 * direction reads the same in either language; only the surrounding sentence is translated. */
function signedDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : `${delta}`;
}

/**
 * Builds one notification's title/body/link from a ProfileUpdateEvent — pure, no I/O, same
 * "formatting is directly testable" split lib/deadlines/scan.ts's buildDigestNotification
 * established. Always one notification for however many things changed (Phase 24: "avoid
 * spam, aggregate where possible") — there is no single-vs-multi branch the way the
 * deadline digest has, because this category never shipped a per-item shape to stay
 * compatible with; every dimension change is a line in one body, joined with "; " for the
 * same reason (notification-bell.tsx's plain `line-clamp-2` span, no
 * `white-space: pre-line` — see scan.ts's identical note).
 *
 * Links to /profile/history (Phase 40/41's own Progress page — the score-trend view this
 * notification is describing), not the dashboard — a more precise destination than "the
 * homepage happens to also show a Career Profile card".
 */
export function buildProfileUpdateNotification(event: ProfileUpdateEvent, translate: NotificationTranslator, locale: Locale): { title: string; body: string | null; link: string } {
  const items = event.dimensionChanges.map((d) => translate("profileUpdateItem", { name: dimensionLabel(d.dimension, locale), delta: signedDelta(d.delta) }));
  if (event.completenessMilestone !== null) {
    items.push(translate("completenessMilestoneReached", { percent: event.completenessMilestone }));
  }

  if (event.dimensionChanges.length === 0) {
    // Completeness-only event: the one line already says everything there is to say —
    // repeating it as both title and body would be a hollow notification, the "already
    // covered by the title" problem the deadline digest's single-hit path also avoids.
    return { title: items[0], body: null, link: "/profile/history" };
  }

  return { title: translate("profileUpdateTitle"), body: items.join("; "), link: "/profile/history" };
}
