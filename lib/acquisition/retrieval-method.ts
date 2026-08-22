/**
 * The evidence gate's retrieval-method routing — one policy, shared by the programs and
 * opportunities ingestion pipelines.
 *
 * Why this exists (docs/handoffs/evidence-gate-false-rejections-2026-08-22.md, founder-approved
 * option 2): the gate used to decide "was this page actually read?" by prose-matching the
 * researcher's free-text `verification_status` for expected vocabulary. That produced false
 * rejections on records *more* rigorously sourced than ones that passed — "Retrieved directly
 * from admission.umontreal.ca, which returned HTTP 200" was rejected while a weaker attestation
 * containing the word "verified" was accepted, because the gate was matching a vocabulary, not
 * protecting an evidence standard. 2,097 well-sourced Canadian programme records were blocked
 * that way; the third independent demonstration of the same defect across three continents.
 *
 * The fix: records now declare HOW retrieval actually happened as a structured, closed-enum
 * fact (`retrieval_method`), and the gate routes on that declared fact. The prose stays — it is
 * the human-auditable attestation — but it is no longer what the pass/fail decision parses.
 *
 * Backward compatibility (THE BAR MUST NOT DROP):
 * - A record WITHOUT `retrieval_method` (the entire pre-existing corpus predates the field) is
 *   judged by the legacy prose matcher, `looksPageConfirmed()`, exactly as before. Absence of
 *   the field never widens anything: a legacy record passes or fails precisely as it always did.
 * - A record WITH the field must carry a recognized enum value. A malformed value fails closed —
 *   it does NOT fall back to prose matching, because a record that declares the structured fact
 *   and gets it wrong has not established what actually happened.
 * - A passing method (`live_fetch`/`browser_render`) accompanied by prose that itself discloses
 *   a blocked/archived retrieval fails as internally contradictory — the structured field can
 *   never be used to smuggle past what the record's own attestation admits. This guard only ever
 *   raises the bar, never lowers it.
 */

/** How the source page's content was actually obtained. Closed enum — the gate refuses
 * anything not listed here. Vocabulary from the founder-approved recommendation in
 * docs/handoffs/evidence-gate-false-rejections-2026-08-22.md. */
export const RETRIEVAL_METHODS = ["live_fetch", "browser_render", "archived_capture", "search_summary"] as const;

export type RetrievalMethod = (typeof RETRIEVAL_METHODS)[number];

export function isRetrievalMethod(value: unknown): value is RetrievalMethod {
  return typeof value === "string" && (RETRIEVAL_METHODS as readonly string[]).includes(value);
}

/** Prose disclosures that the page was NOT actually read live. Shared by the legacy matcher and
 * the contradiction guard. Same list `looksPageConfirmed` has always used. */
const BLOCKED_MARKERS = ["retrieval blocked", "page unfetched", "not fetched", "search result only", "unfetched"];

/** Prose disclosures that the content came from an archive service rather than the origin host.
 * Used only by the contradiction guard — a record declaring `live_fetch` while its own
 * attestation says "Wayback Machine" has not established what actually happened. */
const ARCHIVE_MARKERS = ["wayback", "archive.org", "web.archive", "internet archive"];

/** LEGACY prose matcher — a researcher-stated verification_status counts as page-confirmed only
 * when it says so explicitly, in the Drive-corpus vocabulary ("Verified - official ... page" vs
 * "... page retrieval blocked"). Kept verbatim as the fallback for records that predate
 * `retrieval_method`; new records should declare the structured field instead of relying on
 * this vocabulary. Moved here (from lib/programs/ingest.ts and its lib/opportunities/ingest.ts
 * mirror) so there is exactly one copy; both modules re-export it. */
export function looksPageConfirmed(verificationStatus: string): boolean {
  const s = verificationStatus.toLowerCase();
  if (!s.includes("verified")) return false;
  return !BLOCKED_MARKERS.some((marker) => s.includes(marker));
}

export interface RetrievalEvidenceVerdict {
  ok: boolean;
  detail: string;
}

/**
 * The one evidence-gate decision: does this record's declared (or, for legacy records,
 * prose-described) retrieval method establish that the source page was actually read live?
 *
 * Policy (see the module doc comment for the reasoning):
 * - `live_fetch` / `browser_render` → pass, unless the prose itself contradicts the claim.
 * - `archived_capture`             → fail. An archive capture, however honestly disclosed and
 *                                    however official the archived page, is not a live confirmed
 *                                    fetch of the current page. (This is the gate being RIGHT
 *                                    about McGill's Wayback-sourced records, now for the stated
 *                                    reason instead of by vocabulary accident.)
 * - `search_summary`               → fail. A search result is discovery evidence, not
 *                                    verification.
 * - missing/null/empty             → legacy prose matching, unchanged behavior.
 * - anything else                  → fail closed, no prose fallback.
 */
export function judgeRetrievalEvidence(retrievalMethod: string | null | undefined, verificationStatus: string): RetrievalEvidenceVerdict {
  if (retrievalMethod == null || retrievalMethod === "") {
    // Legacy record — the field predates it. Prose matching, exactly as before this field existed.
    if (!looksPageConfirmed(verificationStatus)) {
      return {
        ok: false,
        detail: `verification_status "${verificationStatus}" reads as a search result, not a confirmed fetched page. (Legacy record without retrieval_method — judged by the prose matcher; new records should declare retrieval_method explicitly.)`,
      };
    }
    return { ok: true, detail: "page-confirmed verification_status (legacy prose match; no retrieval_method declared)." };
  }

  if (!isRetrievalMethod(retrievalMethod)) {
    return {
      ok: false,
      detail: `retrieval_method "${retrievalMethod}" is not a recognized value (expected one of: ${RETRIEVAL_METHODS.join(", ")}). A declared retrieval_method must be valid — malformed values fail closed and are never judged by the prose fallback.`,
    };
  }

  switch (retrievalMethod) {
    case "archived_capture":
      return {
        ok: false,
        detail: "retrieval_method \"archived_capture\": an archive-service capture, however honestly disclosed, is not a live confirmed fetch of the current page — the record stays out until the live page itself is read.",
      };
    case "search_summary":
      return {
        ok: false,
        detail: "retrieval_method \"search_summary\": a search result is discovery evidence, not verification — the page itself was never read.",
      };
    case "live_fetch":
    case "browser_render": {
      const s = verificationStatus.toLowerCase();
      const contradiction = [...BLOCKED_MARKERS, ...ARCHIVE_MARKERS].find((marker) => s.includes(marker));
      if (contradiction) {
        return {
          ok: false,
          detail: `retrieval_method "${retrievalMethod}" contradicts the record's own verification_status, which discloses "${contradiction}" — an internally inconsistent record has not established what actually happened.`,
        };
      }
      return { ok: true, detail: `retrieval_method "${retrievalMethod}": the source page was retrieved live from the origin host.` };
    }
  }
}
