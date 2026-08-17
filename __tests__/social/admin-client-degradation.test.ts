// Regression coverage for a real bug found live-testing this pass: several cross-user
// reads on app/(app)/profile/page.tsx and app/(app)/u/[id]/page.tsx call
// createAdminClient() unconditionally. createAdminClient() throws *synchronously* when
// SUPABASE_SECRET_KEY isn't configured — uncaught, that took down the entire page with a
// 500 instead of just omitting the supplementary section it belonged to. Every function
// here now goes through tryCreateAdminClient() and degrades to its natural empty result
// instead. These tests pin that contract by actually removing the credential (not
// mocking createAdminClient) so a future regression that reintroduces a raw
// createAdminClient() call on one of these paths fails loudly.
import { afterEach, beforeEach, describe, expect, test } from "vitest";

const ORIGINAL_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ORIGINAL_SECRET = process.env.SUPABASE_SECRET_KEY;

beforeEach(() => {
  delete process.env.SUPABASE_SECRET_KEY;
});

afterEach(() => {
  if (ORIGINAL_URL === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGINAL_URL;
  if (ORIGINAL_SECRET === undefined) delete process.env.SUPABASE_SECRET_KEY;
  else process.env.SUPABASE_SECRET_KEY = ORIGINAL_SECRET;
});

describe("tryCreateAdminClient (lib/supabase/admin.ts)", () => {
  test("missing SUPABASE_SECRET_KEY: returns null instead of throwing", async () => {
    const { tryCreateAdminClient } = await import("@/lib/supabase/admin");
    expect(tryCreateAdminClient()).toBeNull();
  });

  test("createAdminClient itself still throws (tryCreateAdminClient isn't hiding a real config problem, just not crashing the page over it)", async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    expect(() => createAdminClient()).toThrow(/not configured/i);
  });
});

describe("cross-user reads degrade instead of crashing when the admin client is unavailable", () => {
  test("getFeaturedItems (app/(app)/profile and /u/[id]) resolves to [] rather than rejecting", async () => {
    const { getFeaturedItems } = await import("@/lib/social/featured");
    await expect(getFeaturedItems("11111111-1111-1111-1111-111111111111", { isSelf: true, isPublic: false })).resolves.toEqual([]);
  });

  test("getFilteredContactInfo (app/(app)/u/[id]) resolves to the empty contact shape rather than rejecting", async () => {
    const { getFilteredContactInfo } = await import("@/lib/social/contact-info");
    await expect(
      getFilteredContactInfo("11111111-1111-1111-1111-111111111111", { isSelf: false, hasAcceptedConnection: false })
    ).resolves.toEqual({
      phone: null,
      email: null,
      linkedinUrl: null,
      instagramHandle: null,
      githubUrl: null,
      websiteUrl: null,
      twitterHandle: null,
      discordHandle: null,
      openTo: [],
    });
  });

  test("getEndorsementsForSkills (app/(app)/u/[id]) resolves to zeroed entries rather than rejecting", async () => {
    const { getEndorsementsForSkills } = await import("@/lib/social/endorsements");
    await expect(getEndorsementsForSkills(["skill-1", "skill-2"], null)).resolves.toEqual({
      "skill-1": { count: 0, endorsedByMe: false },
      "skill-2": { count: 0, endorsedByMe: false },
    });
  });

  test("getRecommendationsFor (app/(app)/u/[id]) resolves to [] rather than rejecting", async () => {
    const { getRecommendationsFor } = await import("@/lib/social/recommendations-query");
    await expect(getRecommendationsFor("11111111-1111-1111-1111-111111111111")).resolves.toEqual([]);
  });

  test("getMutualConnections (app/(app)/u/[id]) resolves to a zero count rather than rejecting", async () => {
    const { getMutualConnections } = await import("@/lib/social/mutual-connections");
    await expect(
      getMutualConnections("11111111-1111-1111-1111-111111111111", "22222222-2222-2222-2222-222222222222")
    ).resolves.toEqual({ count: 0, preview: [] });
  });
});
