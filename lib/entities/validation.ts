/**
 * Pure validation for custom-entity creation — no `server-only` import (unlike
 * lib/entities/resolve.ts, which uses this), same split as every other rules file in
 * lib/entities/, so this stays unit-testable without a database.
 *
 * The length bound matches the guard inside
 * `create_or_resolve_user_submitted_entity` (migration 0039), so an over-long name is
 * rejected with a readable message here rather than surfacing as a raw exception.
 *
 * No website field: a canonical entity's official_url is sourced during verification,
 * from the official page itself. Accepting one from a student would put unverified data
 * on a shared registry row that other students read.
 */

export const MAX_CANONICAL_NAME_LENGTH = 300;

export interface CustomEntityValidationInput {
  displayName: string;
}

export type CustomEntityValidationError = "empty_name" | "name_too_long";

export function validateCustomEntityInput(input: CustomEntityValidationInput): CustomEntityValidationError | null {
  const name = input.displayName.trim();
  if (!name) return "empty_name";
  if (name.length > MAX_CANONICAL_NAME_LENGTH) return "name_too_long";
  return null;
}
