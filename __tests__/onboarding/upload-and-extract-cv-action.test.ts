import { describe, test, expect, vi, beforeEach } from "vitest";

/**
 * 2026-09-02 CV-import audit (spec Phases 26/60/61): `uploadAndExtractCV` had zero test
 * coverage. The behaviour most worth locking is Phase 61's "log the failure" — found broken
 * during the audit: every OTHER branch in the catch block was either logged or a validated,
 * expected condition (rate limit, misconfiguration, unsupported file type), but
 * `CVExtractionFailedError` — the actual "extraction/parsing failed" case Phase 61 is
 * about — returned a friendly message to the student and logged nothing server-side. Fixed
 * in the same commit; these pin the fix and guard the (correct, unchanged) behaviour of the
 * other branches so a future edit can't quietly re-silence this one again.
 */

const requireUser = vi.hoisted(() => vi.fn(async () => ({ userId: "user-1" })));
// 2026-09-03, closing the Ultra tier-economics boundary: uploadAndExtractCV now also calls
// getCurrentProfile() to resolve a real tier for extractCVData -- this mock didn't exist
// before that change, so the call resolved to undefined() and threw, unrelated to whatever
// each test below is actually about. Defaults to a Standard profile shape in beforeEach;
// no test here is about tier, so every existing assertion stays about what it was already
// about.
const getCurrentProfile = vi.hoisted(() => vi.fn());
const extractCVData = vi.hoisted(() => vi.fn());
const assertWithinAIRateLimit = vi.hoisted(() => vi.fn(async () => {}));
const logEvent = vi.hoisted(() => vi.fn());
const storageUpload = vi.hoisted(() => vi.fn(async () => ({ error: null })));

vi.mock("@/lib/security/dal", () => ({ requireUser, getCurrentProfile }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ storage: { from: () => ({ upload: storageUpload }) } })),
}));
vi.mock("@/lib/i18n/locale", () => ({ resolveLocale: vi.fn(async () => "en") }));
vi.mock("@/lib/ai/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/rate-limit")>();
  return { ...actual, assertWithinAIRateLimit };
});
vi.mock("@/lib/ai/cv-extraction", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/cv-extraction")>();
  return { ...actual, extractCVData };
});
vi.mock("@/lib/analytics/log", () => ({ logEvent }));

import { uploadAndExtractCV } from "@/app/(onboarding)/onboarding/actions";
import { CVExtractionFailedError } from "@/lib/ai/cv-extraction";

function fileFormData(overrides: Partial<{ name: string; type: string; size: number }> = {}) {
  const content = "a".repeat(overrides.size ?? 100);
  const file = new File([content], overrides.name ?? "resume.pdf", { type: overrides.type ?? "application/pdf" });
  const formData = new FormData();
  formData.append("file", file);
  return formData;
}

beforeEach(() => {
  vi.clearAllMocks();
  requireUser.mockResolvedValue({ userId: "user-1" });
  getCurrentProfile.mockResolvedValue({ plan_tier: "standard", ultra_gift_expires_at: null, paid_ultra_expires_at: null });
  assertWithinAIRateLimit.mockResolvedValue(undefined);
  storageUpload.mockResolvedValue({ error: null });
});

describe("uploadAndExtractCV — Phase 61 'log the failure'", () => {
  test("a CVExtractionFailedError logs the real underlying cause and returns the friendly message", async () => {
    const cause = new Error("model returned malformed JSON");
    extractCVData.mockRejectedValue(new CVExtractionFailedError(cause));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await uploadAndExtractCV(fileFormData());

    expect(result).toEqual({ success: false, error: "We couldn't fully read this document. You can retry or add the information manually." });
    // The whole point: the real cause reaches the server log, not just the friendly message
    // a student sees — a systematic problem (a schema drift, a provider change) must be
    // visible to whoever reads logs, not only ever surfaced as "we couldn't read this."
    expect(consoleError).toHaveBeenCalledWith("[onboarding] CV extraction failed", { cause });
    consoleError.mockRestore();
  });

  test("the upload to storage happens before extraction is attempted at all — the file is never lost to an extraction failure", async () => {
    extractCVData.mockRejectedValue(new CVExtractionFailedError(new Error("boom")));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await uploadAndExtractCV(fileFormData());

    expect(storageUpload).toHaveBeenCalled();
  });

  test("a rate-limit error is returned to the student and is not itself logged as a failure (already a validated, expected condition)", async () => {
    const { RateLimitExceededError } = await import("@/lib/ai/rate-limit");
    // RateLimitExceededError takes a locale, not a custom message (lib/errors/
    // rate-limit-exceeded.ts) — not asserted here either way, since this test is about
    // logging behavior, not that file's own message text.
    assertWithinAIRateLimit.mockRejectedValue(new RateLimitExceededError("en"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await uploadAndExtractCV(fileFormData());

    expect(result.success).toBe(false);
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  test("a genuinely unexpected error (matches none of the known types) still logs, via the pre-existing fallback branch", async () => {
    extractCVData.mockRejectedValue(new Error("something nobody named yet"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await uploadAndExtractCV(fileFormData());

    expect(result.success).toBe(false);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  test("a successful extraction logs the cv_imported analytics event and nothing to console.error", async () => {
    extractCVData.mockResolvedValue({
      education: [],
      activities: [{ title: "Robotics Club" }],
      awards: [],
      projects: [],
      research: [],
      workExperience: [],
      skills: [],
      languages: [],
      unclassified: [],
    });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await uploadAndExtractCV(fileFormData());

    expect(result.success).toBe(true);
    expect(logEvent).toHaveBeenCalledWith("user-1", "cv_imported", { itemCount: 1 });
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
