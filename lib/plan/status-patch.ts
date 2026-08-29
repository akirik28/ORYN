import type { ActionStatus, ReflectionOutcome, WeeklyAction } from "@/types/database";

export type ActionStatusPatch = Partial<Pick<WeeklyAction, "status" | "completed_at" | "reflection_outcome" | "reflection_note">>;

/**
 * Builds the UPDATE patch for `updateActionStatus` (app/(app)/plan/actions.ts). Extracted
 * as a pure function so the bug it fixes is directly unit-testable — a "use server" file may
 * only export async functions (Server Action files elsewhere in this codebase already note
 * this constraint), so this couldn't live there.
 *
 * `reflection_outcome`/`reflection_note` are only ever included when the caller actually
 * passed a value, never defaulted to `null`. features/dashboard/weekly-focus.tsx's toggle()
 * marks an action complete first (no reflection data yet), then saveReflection() sends the
 * real outcome moments later in a second, independent request — two concurrent writes to the
 * same row. Building the patch unconditionally with `reflection_outcome: params.reflectionOutcome
 * ?? null` meant whichever request resolved last won: if the reflection-less completion call
 * happened to resolve after the reflection call, it silently overwrote the reflection the
 * student had just given with null. Never touching these two columns unless the caller has a
 * real value for them means the reflection-less call can no longer clobber one, regardless of
 * which request resolves first.
 */
export function buildActionStatusPatch(params: {
  status: ActionStatus;
  reflectionOutcome?: ReflectionOutcome;
  reflectionNote?: string;
}): ActionStatusPatch {
  const patch: ActionStatusPatch = {
    status: params.status,
    completed_at: params.status === "completed" ? new Date().toISOString() : null,
  };
  if (params.reflectionOutcome !== undefined) patch.reflection_outcome = params.reflectionOutcome;
  if (params.reflectionNote !== undefined) patch.reflection_note = params.reflectionNote;
  return patch;
}
