import { ADMISSION_MODEL_VERSION } from "./outlook";

/**
 * The one staleness rule both admission-outlook refresh paths — the read-time refresh
 * (`lib/universities/queries.ts`'s `refreshStaleOutlooks`) and the weekly backstop
 * (`lib/admissions/scan.ts`'s `scanStaleOutlooks`) — must agree on. Before this existed the
 * two were separately hand-written, timestamp-only copies of the same idea (see git history
 * on both), which is exactly the shape that drifts silently: nothing would have failed a
 * gate if only one of the two ever got a fix.
 *
 * `outlook_model_version` (written by every real outlook computation, see
 * `lib/admissions/persist.ts`) was tracked but never read back by either path until now —
 * a genuinely stale-by-formula row (the student's profile hasn't changed, but the formula
 * that scored it has) would sit forever, since nothing but a profile edit could ever flip
 * `outlook_calculated_at < profiles.updated_at`. Harmless today only because
 * `ADMISSION_MODEL_VERSION` has never been bumped in this project's live history (verified:
 * every live row carries the same one version) — this function is what makes the day it
 * does bump a self-healing event instead of a silent one, for both paths at once.
 *
 * `outlook_calculated_at === null` (never computed) is checked first and independently:
 * a target with no outlook yet has no model version to compare either, and the two `null`
 * checks are deliberately not conflated into one condition so each stays legible on its own.
 */
export function isOutlookStale(
  target: { outlook_calculated_at: string | null; outlook_model_version: string | null },
  profileUpdatedAtMs: number
): boolean {
  if (!target.outlook_calculated_at) return true;
  if (target.outlook_model_version !== ADMISSION_MODEL_VERSION) return true;
  return new Date(target.outlook_calculated_at).getTime() < profileUpdatedAtMs;
}
