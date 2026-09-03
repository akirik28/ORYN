import { describe, expect, test } from "vitest";
import { displayTierOf, categorizeRejection } from "@/lib/universities/image-coverage";

describe("displayTierOf", () => {
  test("a real image always wins, even when a logo also exists", () => {
    expect(displayTierOf({ hasRealImage: true, hasLogo: true })).toBe("real_verified");
    expect(displayTierOf({ hasRealImage: true, hasLogo: false })).toBe("real_verified");
  });

  test("falls back to the logo when there's no real image", () => {
    expect(displayTierOf({ hasRealImage: false, hasLogo: true })).toBe("logo_fallback");
  });

  test("falls back to the Proxola icon when there's neither", () => {
    expect(displayTierOf({ hasRealImage: false, hasLogo: false })).toBe("proxola_fallback");
  });
});

describe("categorizeRejection", () => {
  test.each([
    ["aspect ratio 0.95 is portrait or near-square, not a usable landscape campus photo", "portrait_or_near_square"],
    ["aspect ratio 2.98 is an extreme panorama, unsuitable for a card/hero crop", "extreme_panorama"],
    ["resolution 640x1000 is below the 800x450 minimum", "too_small"],
    ["Candidate found but download failed or exceeded the size cap.", "download_failed_or_inaccessible"],
    ["Same image already assigned to university_id abc-123 — possible mismatched Wikidata claim, held for manual review rather than auto-assigned to two institutions.", "duplicate_image"],
    ["Uploaded but the public URL did not verify (HEAD non-200) — not written as primary_image_url.", "upload_verification_failed"],
  ])("%s -> %s", (notes, expected) => {
    expect(categorizeRejection(notes)).toBe(expected);
  });

  test("unwraps a multi-candidate 'Last reason:' wrapper before categorizing", () => {
    const notes = "2 candidates tried, all failed. Last reason: resolution 500x500 is below the 800x450 minimum";
    expect(categorizeRejection(notes)).toBe("too_small");
  });

  test("returns uncategorized for null or unrecognized text, never throws", () => {
    expect(categorizeRejection(null)).toBe("uncategorized");
    expect(categorizeRejection("some completely different reason nobody wrote yet")).toBe("uncategorized");
  });
});
