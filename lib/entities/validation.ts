/**
 * Pure validation for custom-institution creation — no `server-only` import (unlike
 * lib/entities/resolve.ts, which uses this), same split as every other rules file in
 * lib/entities/, so this stays unit-testable without a database.
 */

export const MAX_CANONICAL_NAME_LENGTH = 300;

export interface CustomInstitutionValidationInput {
  canonicalName: string;
  websiteUrl: string | null;
}

export type CustomInstitutionValidationError = "empty_name" | "name_too_long" | "invalid_website";

export function validateCustomInstitutionInput(input: CustomInstitutionValidationInput): CustomInstitutionValidationError | null {
  const name = input.canonicalName.trim();
  if (!name) return "empty_name";
  if (name.length > MAX_CANONICAL_NAME_LENGTH) return "name_too_long";

  const website = input.websiteUrl?.trim();
  if (website && !/^https?:\/\/.+/i.test(website)) return "invalid_website";

  return null;
}
