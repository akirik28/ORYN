/**
 * Exact-match program resolution for the requirements/deadlines ingestion pipelines —
 * deliberately NOT alias-aware or fuzzy, unlike lib/acquisition/identity.ts's university
 * resolution one file over. A wrong university match sends a reader to a slightly-wrong
 * front page; a wrong program match puts a specific date or requirement in front of a
 * student that belongs to a DIFFERENT course than the one they're evaluating — the harm
 * compounds rather than dilutes, which is why this file's whole contract is one line:
 * exact string match after trimming whitespace, or null. Nothing else counts as a match —
 * not a substring, not a stripped degree-type suffix ("MBBS" vs "Medicine MBBS"), not a
 * case fold, not a similarity score. If a future change here needs a threshold, it has
 * stopped being this function.
 *
 * Both lib/requirements/ingest.ts and lib/deadlines/ingest.ts import this rather than each
 * reimplementing it, so the two pipelines can never quietly disagree about what "the same
 * program" means.
 */

export interface ProgramLookupRow {
  id: string;
  universityId: string;
  name: string;
}

export interface ProgramResolution {
  programId: string | null;
  /** Null when programId is set (a real match) OR when programName itself was empty/absent
   * — there being nothing to resolve is not a failure worth logging. Non-null explains a
   * genuine miss: zero exact matches at this university, or two-or-more (ambiguous —
   * refusing to guess which one the record meant). Callers should log this, not discard it
   * silently — it is the only record of why a program-specific fact landed unlinked. */
  reason: string | null;
}

export function resolveExactProgram(universityId: string, programName: string | null | undefined, programs: readonly ProgramLookupRow[]): ProgramResolution {
  const trimmed = programName?.trim();
  if (!trimmed) return { programId: null, reason: null };
  const matches = programs.filter((p) => p.universityId === universityId && p.name === trimmed);
  if (matches.length === 0) {
    return { programId: null, reason: `program_name "${trimmed}" has no exact-match program at this university.` };
  }
  if (matches.length > 1) {
    return { programId: null, reason: `program_name "${trimmed}" matches ${matches.length} programs at this university — ambiguous, refusing to guess.` };
  }
  return { programId: matches[0].id, reason: null };
}
