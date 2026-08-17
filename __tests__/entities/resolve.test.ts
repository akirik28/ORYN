import { describe, expect, test } from "vitest";
import { isUuidLike } from "@/lib/validation/uuid";
import { validateCustomEntityInput } from "@/lib/entities/validation";
import { ENTITY_SCOPES, ENTITY_SCOPE_NAMES, isEntityScope, CANONICAL_ENTITY_TYPES } from "@/lib/entities/field-policy";

/**
 * lib/entities/resolve.ts is `server-only` and takes a live Supabase client — not
 * directly unit-testable, same as every other DB-touching module in this app. What IS
 * pure and tested here is exactly what those functions check *before* ever reaching the
 * database: isUuidLike (the gate every resolve* function calls first, short-circuiting
 * to null on a malformed id without a query), validateCustomEntityInput (the gate
 * createCustomEntity calls before its duplicate-check query or RPC), and the field
 * policy that decides which entity types each column will even consider.
 *
 * The database-level guarantees (row exists, entity type matches the column, the unique
 * identity index, the SECURITY DEFINER write path) live in migrations 0038/0039 and are
 * not something a database-free test can honestly claim to prove — same "pure tests only
 * cover what's decidable without a database" convention this codebase already follows
 * elsewhere (e.g. lib/social/public-profile-authorization.ts's canViewBasicProfile).
 */
describe("invalid entity id rejected server-side — the isUuidLike gate resolve* functions use first", () => {
  test("a non-UUID string is rejected", () => {
    expect(isUuidLike("not-a-uuid")).toBe(false);
    expect(isUuidLike("'; drop table canonical_entities; --")).toBe(false);
    expect(isUuidLike("")).toBe(false);
  });

  test("a syntactically valid UUID is accepted (existence/entity type is then the database's job)", () => {
    expect(isUuidLike("11111111-1111-1111-1111-111111111111")).toBe(true);
  });
});

describe("custom entity creation — validation rejected before any database round-trip", () => {
  test("an empty name is rejected", () => {
    expect(validateCustomEntityInput({ displayName: "   " })).toBe("empty_name");
  });

  test("a name over the length limit is rejected", () => {
    expect(validateCustomEntityInput({ displayName: "x".repeat(301) })).toBe("name_too_long");
  });

  test("a name at exactly the length limit is allowed", () => {
    expect(validateCustomEntityInput({ displayName: "x".repeat(300) })).toBeNull();
  });

  test("a normal name passes", () => {
    expect(validateCustomEntityInput({ displayName: "Üsküdar American Academy" })).toBeNull();
  });
});

describe("field policy — the scope table the database triggers mirror", () => {
  test("every scope's allowed types are real canonical entity types", () => {
    for (const scope of ENTITY_SCOPE_NAMES) {
      for (const type of ENTITY_SCOPES[scope].allowedTypes) {
        expect(CANONICAL_ENTITY_TYPES).toContain(type);
      }
    }
  });

  test("a scope's custom fallback type is always one of its own allowed types", () => {
    for (const scope of ENTITY_SCOPE_NAMES) {
      const { customFallbackType, allowedTypes } = ENTITY_SCOPES[scope];
      if (customFallbackType) expect(allowedTypes).toContain(customFallbackType);
    }
  });

  test("curated registries expose no custom-creation path", () => {
    expect(ENTITY_SCOPES.university.customFallbackType).toBeNull();
    expect(ENTITY_SCOPES.opportunity.customFallbackType).toBeNull();
  });

  test("school fields accept only schools — a city or university id can never be linked as one", () => {
    expect([...ENTITY_SCOPES.school.allowedTypes]).toEqual(["school"]);
  });

  test("an unknown scope string is rejected rather than defaulting to something permissive", () => {
    expect(isEntityScope("organization")).toBe(false);
    expect(isEntityScope("")).toBe(false);
    expect(isEntityScope("work_organization")).toBe(true);
  });
});
