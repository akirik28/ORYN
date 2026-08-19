import { describe, expect, test } from "vitest";
import { validateCampusImageCandidate, validateLogoCandidate } from "@/lib/acquisition/image-validation";

describe("validateCampusImageCandidate", () => {
  test("accepts a real 16:9 campus photo", () => {
    expect(validateCampusImageCandidate({ width: 1920, height: 1080 })).toEqual({ ok: true });
  });

  test("accepts a real 3:2 campus photo", () => {
    expect(validateCampusImageCandidate({ width: 1500, height: 1000 })).toEqual({ ok: true });
  });

  test("rejects a portrait photo", () => {
    const result = validateCampusImageCandidate({ width: 1080, height: 1920 });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("portrait or near-square");
  });

  test("rejects a near-square crop (e.g. a coat of arms or seal)", () => {
    const result = validateCampusImageCandidate({ width: 1000, height: 950 });
    expect(result.ok).toBe(false);
  });

  test("rejects below the minimum resolution even at a good aspect ratio", () => {
    const result = validateCampusImageCandidate({ width: 640, height: 360 });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("resolution");
  });

  test("rejects an extreme stitched-panorama aspect ratio", () => {
    const result = validateCampusImageCandidate({ width: 4000, height: 800 });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("panorama");
  });

  test("boundary: exactly the minimum resolution and aspect both pass", () => {
    expect(validateCampusImageCandidate({ width: 800, height: 450 }).ok).toBe(true);
  });
});

describe("validateLogoCandidate", () => {
  test("accepts a near-square logo well above the minimum", () => {
    expect(validateLogoCandidate({ width: 512, height: 512 })).toEqual({ ok: true });
  });

  test("accepts a wide wordmark logo", () => {
    expect(validateLogoCandidate({ width: 800, height: 200 })).toEqual({ ok: true });
  });

  test("rejects a favicon-grade icon", () => {
    const result = validateLogoCandidate({ width: 64, height: 64 });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("150px minimum");
  });
});
