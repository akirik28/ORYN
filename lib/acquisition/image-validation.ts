/**
 * Pure quality gates for an acquired image candidate, checked against the REAL downloaded
 * bytes' dimensions — never against a URL, filename, or source type alone. A candidate that
 * fails either check is routed to manual review by the caller, never written as a fact.
 *
 * Campus and logo candidates are validated with separate rules: a campus/hero photo must be a
 * plausible landscape at a real resolution; a logo is commonly small and near-square, so it
 * only needs a sane minimum size.
 */

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ValidationResult {
  ok: boolean;
  /** Present only when `ok` is false — the exact reason, written to the acquisition script's
   * needs-review notes so a human reviewer doesn't have to re-derive it. */
  reason?: string;
}

const MIN_CAMPUS_WIDTH = 800;
const MIN_CAMPUS_HEIGHT = 450;
/** Just above square — rules out portrait and near-square crops (a headshot, a coat of arms, a
 * seal) without being so strict that a slightly-cropped landscape gets rejected. */
const MIN_CAMPUS_ASPECT = 1.15;
/** Above this, treat it as a stitched panorama or a banner strip — poor material for a
 * fixed-height card/hero crop even though it's technically "landscape". */
const MAX_CAMPUS_ASPECT = 2.6;

/** Real campus/building photo, suitable as a card hero or detail-page hero. */
export function validateCampusImageCandidate(dims: ImageDimensions): ValidationResult {
  if (dims.width < MIN_CAMPUS_WIDTH || dims.height < MIN_CAMPUS_HEIGHT) {
    return { ok: false, reason: `resolution ${dims.width}x${dims.height} is below the ${MIN_CAMPUS_WIDTH}x${MIN_CAMPUS_HEIGHT} minimum` };
  }
  const ratio = dims.width / dims.height;
  if (ratio < MIN_CAMPUS_ASPECT) {
    return { ok: false, reason: `aspect ratio ${ratio.toFixed(2)} is portrait or near-square, not a usable landscape campus photo` };
  }
  if (ratio > MAX_CAMPUS_ASPECT) {
    return { ok: false, reason: `aspect ratio ${ratio.toFixed(2)} is an extreme panorama, unsuitable for a card/hero crop` };
  }
  return { ok: true };
}

const MIN_LOGO_DIMENSION = 150;

/** Institution logo/mark — deliberately permissive on aspect ratio (most real logos are
 * near-square or wide wordmarks), gated only on a sane minimum size so a tiny favicon-grade
 * icon never gets promoted to `universities.logo_url`. */
export function validateLogoCandidate(dims: ImageDimensions): ValidationResult {
  if (dims.width < MIN_LOGO_DIMENSION || dims.height < MIN_LOGO_DIMENSION) {
    return { ok: false, reason: `logo ${dims.width}x${dims.height} is below the ${MIN_LOGO_DIMENSION}px minimum on a side` };
  }
  return { ok: true };
}
