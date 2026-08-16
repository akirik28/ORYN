/**
 * Pure rules for the Skills section (spec: max ~15 active skills, no obvious
 * duplicates). Mirrors migration 0034's `skills_user_name_idx` unique index on
 * `(user_id, lower(name))` exactly — that index is the real, final backstop; this lets
 * the Server Action return a friendly "you already have that skill" instead of a raw
 * unique-violation, same convention as every other authorization-sensitive action in
 * this app.
 */

export const MAX_ACTIVE_SKILLS = 15;

export function canAddAnotherSkill(currentCount: number): boolean {
  return currentCount < MAX_ACTIVE_SKILLS;
}

export function isDuplicateSkillName(existingNames: string[], name: string): boolean {
  const normalized = name.trim().toLowerCase();
  return existingNames.some((existing) => existing.trim().toLowerCase() === normalized);
}
