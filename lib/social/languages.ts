/**
 * Pure rule for the Languages section — mirrors lib/social/skills.ts's shape exactly, one
 * function instead of two since languages carry no count cap.
 *
 * There is no DB unique index on `languages(user_id, name)` the way migration 0034 added
 * one for skills, so unlike skills this check is the *only* thing preventing duplicates —
 * a student who records "english" and later "English" should have one language, not two.
 */
export function isDuplicateLanguage(existingNames: string[], name: string): boolean {
  const normalized = name.trim().toLowerCase();
  return existingNames.some((existing) => existing.trim().toLowerCase() === normalized);
}
