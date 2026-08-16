import { describe, expect, test } from "vitest";
import {
  canAddAnotherFeaturedItem,
  isDuplicateFeaturedSource,
  isFeaturedSourceOwnedByRequester,
  allFeaturedIdsOwned,
  buildFeaturedReorder,
  resolveFeaturedItems,
  MAX_FEATURED_ITEMS,
} from "@/lib/social/featured-rules";
import { canViewPortfolio } from "@/lib/social/public-profile-authorization";
import type { FeaturedItem } from "@/types/database";

const ME = "11111111-1111-1111-1111-111111111111";
const STRANGER = "22222222-2222-2222-2222-222222222222";
const PROJECT_A = "33333333-3333-3333-3333-333333333333";
const PROJECT_B = "44444444-4444-4444-4444-444444444444";

function featuredRow(overrides: Partial<FeaturedItem>): FeaturedItem {
  return {
    id: overrides.id ?? "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    user_id: ME,
    item_type: "project",
    item_id: PROJECT_A,
    external_title: null,
    external_url: null,
    display_order: 0,
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("source ownership required (isFeaturedSourceOwnedByRequester)", () => {
  test("a source row owned by the requester: allowed", () => {
    expect(isFeaturedSourceOwnedByRequester({ user_id: ME }, ME)).toBe(true);
  });

  test("a source row owned by someone else: denied", () => {
    expect(isFeaturedSourceOwnedByRequester({ user_id: STRANGER }, ME)).toBe(false);
  });

  test("no source row found at all (bad id): denied", () => {
    expect(isFeaturedSourceOwnedByRequester(null, ME)).toBe(false);
  });
});

describe("max 5 featured items (canAddAnotherFeaturedItem)", () => {
  test("under the cap: allowed", () => {
    expect(MAX_FEATURED_ITEMS).toBe(5);
    expect(canAddAnotherFeaturedItem(0)).toBe(true);
    expect(canAddAnotherFeaturedItem(4)).toBe(true);
  });

  test("at or over the cap: denied", () => {
    expect(canAddAnotherFeaturedItem(5)).toBe(false);
    expect(canAddAnotherFeaturedItem(6)).toBe(false);
  });
});

describe("duplicate prevention (isDuplicateFeaturedSource)", () => {
  test("the same source item already featured: duplicate", () => {
    const existing = [{ itemType: "project" as const, itemId: PROJECT_A }];
    expect(isDuplicateFeaturedSource(existing, "project", PROJECT_A)).toBe(true);
  });

  test("same item id but a different item_type: not a duplicate (distinct source tables)", () => {
    const existing = [{ itemType: "award" as const, itemId: PROJECT_A }];
    expect(isDuplicateFeaturedSource(existing, "project", PROJECT_A)).toBe(false);
  });

  test("a different item entirely: not a duplicate", () => {
    const existing = [{ itemType: "project" as const, itemId: PROJECT_A }];
    expect(isDuplicateFeaturedSource(existing, "project", PROJECT_B)).toBe(false);
  });

  test("external links are never flagged as duplicates (no source uniqueness constraint)", () => {
    const existing = [{ itemType: "external_link" as const, itemId: null }];
    expect(isDuplicateFeaturedSource(existing, "external_link", null)).toBe(false);
  });
});

describe("reorder (allFeaturedIdsOwned + buildFeaturedReorder)", () => {
  test("every requested id owned: allowed", () => {
    expect(allFeaturedIdsOwned(["a", "b", "c"], ["a", "b", "c"])).toBe(true);
  });

  test("a requested id not among the owned set: denied", () => {
    expect(allFeaturedIdsOwned(["a", "b"], ["a", "b", "c"])).toBe(false);
  });

  test("empty request: denied, not a vacuous no-op", () => {
    expect(allFeaturedIdsOwned([], [])).toBe(false);
  });

  test("builds sequential display_order matching the requested order, not the original order", () => {
    expect(buildFeaturedReorder(["c", "a", "b"])).toEqual([
      { id: "c", displayOrder: 0 },
      { id: "a", displayOrder: 1 },
      { id: "b", displayOrder: 2 },
    ]);
  });
});

describe("deleted source excluded (resolveFeaturedItems)", () => {
  test("a source row present in the lookup resolves normally", () => {
    const rows = [featuredRow({ id: "f1", item_type: "project", item_id: PROJECT_A })];
    const sourceByKey = new Map([[`project:${PROJECT_A}`, { id: PROJECT_A, title: "Youth unemployment study" }]]);
    const resolved = resolveFeaturedItems(rows, sourceByKey);
    expect(resolved).toHaveLength(1);
    expect(resolved[0]).toMatchObject({ id: "f1", title: "Youth unemployment study" });
  });

  test("a since-deleted source row (missing from the lookup) is silently dropped, not shown stale", () => {
    const rows = [featuredRow({ id: "f1", item_type: "project", item_id: PROJECT_A })];
    const resolved = resolveFeaturedItems(rows, new Map());
    expect(resolved).toEqual([]);
  });

  test("one deleted item among several: only the deleted one is dropped", () => {
    const rows = [
      featuredRow({ id: "f1", item_type: "project", item_id: PROJECT_A, display_order: 0 }),
      featuredRow({ id: "f2", item_type: "project", item_id: PROJECT_B, display_order: 1 }),
    ];
    const sourceByKey = new Map([[`project:${PROJECT_A}`, { id: PROJECT_A, title: "Still here" }]]);
    const resolved = resolveFeaturedItems(rows, sourceByKey);
    expect(resolved.map((r) => r.id)).toEqual(["f1"]);
  });

  test("external links never depend on a source row lookup", () => {
    const rows = [featuredRow({ id: "f1", item_type: "external_link", item_id: null, external_title: "My site", external_url: "https://example.com" })];
    const resolved = resolveFeaturedItems(rows, new Map());
    expect(resolved).toEqual([{ id: "f1", itemType: "external_link", title: "My site", organization: null, description: null, url: "https://example.com", displayOrder: 0 }]);
  });
});

describe("source privacy cannot be bypassed by featuring (canViewPortfolio gate)", () => {
  // getFeaturedItems' very first line is `if (!canViewPortfolio(viewer)) return [];` — the
  // exact same gate the rest of the portfolio (lib/social/public-profile.ts) uses, so a
  // featured item is never visible to a stranger on a private profile even though the
  // underlying project/award/... row was individually owned by the profile's owner.
  test("owner previewing their own not-yet-public profile: still sees featured items", () => {
    expect(canViewPortfolio({ isSelf: true, isPublic: false })).toBe(true);
  });

  test("a stranger on a currently-public profile: sees featured items", () => {
    expect(canViewPortfolio({ isSelf: false, isPublic: true })).toBe(true);
  });

  test("a stranger on a currently-private profile: featured items are hidden, same as the rest of the portfolio", () => {
    expect(canViewPortfolio({ isSelf: false, isPublic: false })).toBe(false);
  });
});
