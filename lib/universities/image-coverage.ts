/**
 * Pure classification logic for the university image coverage report
 * (scripts/university-image-coverage-report.ts). Split out from the script so the
 * categorization rules — which is what actually matters here, not the DB I/O — are unit
 * testable without a live Supabase connection.
 */

export interface UniversityImageState {
  id: string;
  hasRealImage: boolean;
  hasLogo: boolean;
  /** 'needs_review' | 'no_candidate' | null (only meaningful when !hasRealImage) — 'no_candidate'
   * covers a university with no `primary_image_status` row at all: no tier ever found a
   * candidate worth even rejecting. */
  pipelineStatus: "needs_review" | "no_candidate" | null;
}

/** What actually renders in the UI today — every university falls into exactly one bucket,
 * because features/universities/university-card.tsx's fallback chain (photo -> logo -> icon)
 * guarantees it structurally, not by measurement. This function just counts which tier each
 * university landed on. */
export type DisplayTier = "real_verified" | "logo_fallback" | "oryn_fallback";

export function displayTierOf(state: Pick<UniversityImageState, "hasRealImage" | "hasLogo">): DisplayTier {
  if (state.hasRealImage) return "real_verified";
  if (state.hasLogo) return "logo_fallback";
  return "oryn_fallback";
}

/**
 * Rejection-reason taxonomy for `needs_review` rows, derived from this pipeline's own `notes`
 * text (scripts/acquire-university-images.ts's exact wording for each rejection branch). Not
 * every category the founder's spec asked for is mechanically detectable here — this pipeline
 * has no visual/semantic check, so "wrong campus", "wrong constituent college", "generic city
 * photo", "ambiguous institution", and "logo mistaken for a crest" are NOT distinguishable from
 * notes text alone and are honestly left uncategorized rather than guessed at.
 */
export type RejectionCategory =
  | "portrait_or_near_square"
  | "extreme_panorama"
  | "too_small"
  | "download_failed_or_inaccessible"
  | "duplicate_image"
  | "upload_verification_failed"
  | "uncategorized";

const CATEGORY_PATTERNS: { category: RejectionCategory; pattern: RegExp }[] = [
  { category: "portrait_or_near_square", pattern: /portrait or near-square/i },
  { category: "extreme_panorama", pattern: /extreme panorama/i },
  { category: "too_small", pattern: /resolution .* (is )?below/i },
  { category: "duplicate_image", pattern: /already assigned to university_id/i },
  { category: "upload_verification_failed", pattern: /did not verify \(HEAD non-200\)/i },
  { category: "download_failed_or_inaccessible", pattern: /download failed or exceeded the size cap/i },
];

/**
 * A multi-candidate rejection note reads "N candidates tried, all failed. Last reason: X" (see
 * the script's `campusWrites.push` for the no-accepted-candidate branch) — categorize the
 * trailing real reason, not the wrapper text.
 */
function unwrapLastReason(notes: string): string {
  const match = notes.match(/Last reason:\s*(.+)$/i);
  return match ? match[1] : notes;
}

export function categorizeRejection(notes: string | null): RejectionCategory {
  if (!notes) return "uncategorized";
  const reason = unwrapLastReason(notes);
  for (const { category, pattern } of CATEGORY_PATTERNS) {
    if (pattern.test(reason)) return category;
  }
  return "uncategorized";
}
