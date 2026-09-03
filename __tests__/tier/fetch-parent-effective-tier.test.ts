import { describe, expect, test, vi, beforeEach } from "vitest";
import { fetchParentEffectiveTier } from "@/lib/tier/parent-tier";

const PARENT_ID = "11111111-1111-1111-1111-111111111111";
const STUDENT_ID = "22222222-2222-2222-2222-222222222222";

/** Chainable .eq().eq().maybeSingle() (parent_links) or .eq().maybeSingle() (profiles) —
 * one mock builder per table, matching how the real query is actually shaped. */
function makeAdmin(linkResult: { data: unknown; error: unknown }, profileResult: { data: unknown; error: unknown }) {
  return {
    from: (table: string) => {
      if (table === "parent_links") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({ maybeSingle: () => Promise.resolve(linkResult) }),
            }),
          }),
        };
      }
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: () => Promise.resolve(profileResult) }),
          }),
        };
      }
      throw new Error(`fetch-parent-effective-tier.test.ts: unexpected table "${table}"`);
    },
  } as never;
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("fetchParentEffectiveTier", () => {
  test("active link, ultra student -> ultra", async () => {
    const admin = makeAdmin({ data: { status: "active" }, error: null }, { data: { plan_tier: "ultra", ultra_gift_expires_at: null }, error: null });
    expect(await fetchParentEffectiveTier(admin, PARENT_ID, STUDENT_ID)).toBe("ultra");
  });

  test("active link, standard student -> standard", async () => {
    const admin = makeAdmin({ data: { status: "active" }, error: null }, { data: { plan_tier: "standard", ultra_gift_expires_at: null }, error: null });
    expect(await fetchParentEffectiveTier(admin, PARENT_ID, STUDENT_ID)).toBe("standard");
  });

  test("pending link, ultra student -> standard (leaks nothing before confirmation)", async () => {
    const admin = makeAdmin({ data: { status: "pending" }, error: null }, { data: { plan_tier: "ultra", ultra_gift_expires_at: null }, error: null });
    expect(await fetchParentEffectiveTier(admin, PARENT_ID, STUDENT_ID)).toBe("standard");
  });

  test("no link row at all -> standard", async () => {
    const admin = makeAdmin({ data: null, error: null }, { data: { plan_tier: "ultra", ultra_gift_expires_at: null }, error: null });
    expect(await fetchParentEffectiveTier(admin, PARENT_ID, STUDENT_ID)).toBe("standard");
  });

  test("parent_links doesn't exist yet (migration 0116 unapplied) -> standard, not a crash", async () => {
    const admin = makeAdmin(
      { data: null, error: { code: "PGRST205", message: "Could not find the table 'public.parent_links' in the schema cache" } },
      { data: null, error: null }
    );
    expect(await fetchParentEffectiveTier(admin, PARENT_ID, STUDENT_ID)).toBe("standard");
  });

  test("a different, unrelated read error on parent_links still degrades to standard rather than throwing", async () => {
    const admin = makeAdmin({ data: null, error: { code: "PGRST301", message: "JWT expired" } }, { data: null, error: null });
    expect(await fetchParentEffectiveTier(admin, PARENT_ID, STUDENT_ID)).toBe("standard");
  });

  test("active link but the student profile can't be read -> standard, not a crash", async () => {
    const admin = makeAdmin({ data: { status: "active" }, error: null }, { data: null, error: { code: "PGRST301", message: "JWT expired" } });
    expect(await fetchParentEffectiveTier(admin, PARENT_ID, STUDENT_ID)).toBe("standard");
  });
});
