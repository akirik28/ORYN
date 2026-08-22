/**
 * RULE-INGEST-003 (ORYN-BASORG, 2026-08-22, generalized from a `cycle_status`-only rule
 * after RES-V1 found `current_cycle_label` reachable by the same path): information-
 * monotonic writes. A write may populate an empty field, replace a value with a MORE
 * informative one backed by evidence, or correct a value the evidence shows is wrong. It
 * may NEVER replace a populated field with a LESS informative one because a research pass
 * couldn't determine it — inability to determine is a fact about the research, not about
 * the opportunity. Column-agnostic by design, not hardcoded to one field.
 *
 * This module is the mechanical half of the rule — the part a function can decide safely:
 *   - proposed empty/null, live populated            -> SKIP (would erase)
 *   - proposed populated, live empty/null             -> WRITE (populates a gap)
 *   - proposed populated, live populated, EQUAL        -> WRITE (idempotent refresh)
 *   - proposed populated but not in a closed field's live vocabulary -> SKIP ("no live-
 *     constraint equivalent" per the rule — never coerced into a nearby valid value)
 * The one case a function cannot decide safely — proposed populated, live populated,
 * DIFFERENT, both valid — is a substantive correction claim ("the evidence shows the live
 * value is wrong"). This module never approves that case itself; see `resolvedCorrections`
 * below. Per BASORG's ruling on DLOPP-B1-01/B5-13 (2026-08-22): when a field could
 * legitimately go either way, the fix is evidence, not a default — so the unresolved case
 * is HELD, not SKIPPED and not WRITTEN, and is reported as a distinct outcome so it isn't
 * mistaken for either.
 */

export type FieldAction = "write" | "skip" | "hold";

export interface FieldDecision {
  field: string;
  liveValue: string | null;
  proposedValue: string | null;
  action: FieldAction;
  reason: string;
}

/** An explicit, human-ruled approval for the one case this module can't decide alone —
 * proposed and live are both populated, valid, and different. Absence from this list means
 * HOLD, never a default WRITE or SKIP. Keyed by recordId + field so one approval can't
 * silently apply to a different field on the same record. */
export interface ResolvedCorrection {
  recordId: string;
  field: string;
  approved: boolean; // false entries exist so a HELD-then-ruled-down case shows up as an explicit skip with the ruling's reason, not as a plain hold
  reason: string;
}

function isEmpty(v: string | null | undefined): boolean {
  return v === null || v === undefined || v.trim() === "";
}

/**
 * Evaluate one field's proposed write against its live value.
 * `validVocabulary` is only for closed-enum columns (e.g. cycle_status) — omit it for free
 * text (e.g. current_cycle_label) or date-shaped fields (e.g. deadline), where any non-empty
 * proposed value is well-formed by construction and the only question is monotonicity.
 * `placeholderLiveValues` names live values that carry no real information despite being
 * non-null (e.g. cycle_status's own "unverified" — the schema's explicit "not yet known"
 * state, the same role NULL plays elsewhere). A live value in this set is treated as empty:
 * safe to populate with any valid proposed value, no hold required — matching how RES-V1
 * and BASORG already described "already unverified" records as no-ops, not corrections.
 */
export function checkFieldMonotonicity(
  recordId: string,
  field: string,
  liveValue: string | null,
  proposedValue: string | null,
  options: { validVocabulary?: ReadonlySet<string>; resolvedCorrections?: readonly ResolvedCorrection[]; placeholderLiveValues?: ReadonlySet<string> } = {}
): FieldDecision {
  const rawLive = isEmpty(liveValue) ? null : liveValue;
  const live = rawLive !== null && options.placeholderLiveValues?.has(rawLive) ? null : rawLive;
  const proposed = isEmpty(proposedValue) ? null : proposedValue;

  if (proposed === null) {
    if (live === null) {
      return { field, liveValue: live, proposedValue: proposed, action: "skip", reason: "Both empty — nothing to write." };
    }
    // Clearing a populated field to null is still "erasing," and still needs the same
    // explicit-approval path as any other correction — RULE-INGEST-003 permits it when
    // evidence shows the live value itself is wrong (e.g. a derived/projected fact with no
    // actual source), not merely because this pass didn't reconfirm it.
    const erasureResolution = options.resolvedCorrections?.find((r) => r.recordId === recordId && r.field === field);
    if (erasureResolution?.approved) {
      return { field, liveValue: live, proposedValue: proposed, action: "write", reason: `Evidence shows the live value is wrong; clearing rather than leaving a false fact live: ${erasureResolution.reason}` };
    }
    return { field, liveValue: live, proposedValue: proposed, action: "skip", reason: `Proposed value is empty while live holds "${live}" — writing would erase a populated field. RULE-INGEST-003.` };
  }

  if (options.validVocabulary && !options.validVocabulary.has(proposed)) {
    return {
      field,
      liveValue: live,
      proposedValue: proposed,
      action: "skip",
      reason: `Proposed value "${proposed}" has no live-constraint equivalent (not an exact member of this field's vocabulary) — skipped, never coerced to a nearby valid value. RULE-INGEST-003.`,
    };
  }

  if (live === null) {
    return { field, liveValue: live, proposedValue: proposed, action: "write", reason: "Live field is empty — populating." };
  }

  if (live === proposed) {
    return { field, liveValue: live, proposedValue: proposed, action: "write", reason: "Proposed value matches live exactly — idempotent refresh." };
  }

  const resolution = options.resolvedCorrections?.find((r) => r.recordId === recordId && r.field === field);
  if (resolution?.approved) {
    return { field, liveValue: live, proposedValue: proposed, action: "write", reason: `Evidence-backed correction, explicitly approved: ${resolution.reason}` };
  }
  if (resolution && !resolution.approved) {
    return { field, liveValue: live, proposedValue: proposed, action: "skip", reason: `Correction proposed but explicitly declined: ${resolution.reason}` };
  }

  return {
    field,
    liveValue: live,
    proposedValue: proposed,
    action: "hold",
    reason: `Both live ("${live}") and proposed ("${proposed}") are populated and different — this is a correction claim this module cannot verify on its own. Neither written nor skipped; held pending explicit source-evidence review. RULE-INGEST-003 / BASORG ruling 2026-08-22.`,
  };
}

export interface RecordMonotonicityResult {
  recordId: string;
  opportunityId: string;
  decisions: FieldDecision[];
  hasHolds: boolean;
  hasSkips: boolean;
  fieldsToWrite: readonly FieldDecision[];
}

/** Evaluate every field a DLOPP-shaped record proposes against live state for one
 * opportunity. `live` is the row exactly as read immediately before writing — a snapshot
 * from earlier in the run is stale by this rule's own standard. */
export function checkRecordMonotonicity(
  recordId: string,
  opportunityId: string,
  fields: readonly { field: string; liveValue: string | null; proposedValue: string | null; validVocabulary?: ReadonlySet<string>; placeholderLiveValues?: ReadonlySet<string> }[],
  resolvedCorrections: readonly ResolvedCorrection[] = []
): RecordMonotonicityResult {
  const decisions = fields.map((f) => checkFieldMonotonicity(recordId, f.field, f.liveValue, f.proposedValue, { validVocabulary: f.validVocabulary, resolvedCorrections, placeholderLiveValues: f.placeholderLiveValues }));
  return {
    recordId,
    opportunityId,
    decisions,
    hasHolds: decisions.some((d) => d.action === "hold"),
    hasSkips: decisions.some((d) => d.action === "skip"),
    fieldsToWrite: decisions.filter((d) => d.action === "write"),
  };
}
