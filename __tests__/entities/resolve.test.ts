import { describe, expect, test } from "vitest";
import { isUuidLike } from "@/lib/validation/uuid";
import { validateCustomInstitutionInput } from "@/lib/entities/validation";

/**
 * lib/entities/resolve.ts (resolveInstitution/resolveUniversity/resolveOpportunity/
 * createCustomInstitution) is `server-only` and takes a live Supabase client — not
 * directly unit-testable, same as every other DB-touching module in this app. What IS
 * pure and tested here is exactly what those functions check *before* ever reaching the
 * database: isUuidLike (the actual gate resolveInstitution/resolveUniversity/
 * resolveOpportunity all call first, short-circuiting to null on a malformed id without
 * a query) and validateCustomInstitutionInput (the actual gate createCustomInstitution
 * calls before its duplicate-check query or insert). The database-level guarantees
 * (row exists, category matches the field it's being linked from, the DB's own unique
 * index) are structurally reviewable in lib/entities/resolve.ts's own queries, not
 * something a database-free test can honestly claim to prove — same "pure tests only
 * cover what's decidable without a database" convention this codebase already follows
 * elsewhere (e.g. lib/social/public-profile-authorization.ts's canViewBasicProfile).
 */
describe("invalid entity id rejected server-side — the isUuidLike gate resolve* functions use first", () => {
  test("a non-UUID string is rejected", () => {
    expect(isUuidLike("not-a-uuid")).toBe(false);
    expect(isUuidLike("'; drop table institutions; --")).toBe(false);
    expect(isUuidLike("")).toBe(false);
  });

  test("a syntactically valid UUID is accepted (existence/category is then the database's job)", () => {
    expect(isUuidLike("11111111-1111-1111-1111-111111111111")).toBe(true);
  });
});

describe("custom entity creation — validation rejected before any database round-trip", () => {
  test("an empty name is rejected", () => {
    expect(validateCustomInstitutionInput({ canonicalName: "   ", websiteUrl: null })).toBe("empty_name");
  });

  test("a name over the length limit is rejected", () => {
    expect(validateCustomInstitutionInput({ canonicalName: "x".repeat(301), websiteUrl: null })).toBe("name_too_long");
  });

  test("a name at exactly the length limit is allowed", () => {
    expect(validateCustomInstitutionInput({ canonicalName: "x".repeat(300), websiteUrl: null })).toBeNull();
  });

  test("a website not starting with http:// or https:// is rejected — blocks a javascript: URL from ever being stored", () => {
    expect(validateCustomInstitutionInput({ canonicalName: "Some School", websiteUrl: "javascript:alert(1)" })).toBe("invalid_website");
  });

  test("no website at all is fine (optional field)", () => {
    expect(validateCustomInstitutionInput({ canonicalName: "Some School", websiteUrl: null })).toBeNull();
  });

  test("a well-formed https website passes validation", () => {
    expect(validateCustomInstitutionInput({ canonicalName: "Some School", websiteUrl: "https://example.edu" })).toBeNull();
  });
});
