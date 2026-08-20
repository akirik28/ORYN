/**
 * Derives a student's current US-style grade level (9-12) from `graduation_year` — the one
 * academic fact ORYN already asks at onboarding (`features/onboarding/onboarding-wizard.tsx`)
 * and stores on every profile. Not a new field, not an inference beyond arithmetic on data the
 * student already gave: closes the gap named in `docs/counselor-core.md`'s known limitation
 * #5 ("Oryn doesn't derive a student's current grade from graduation_year anywhere").
 *
 * Assumption, documented rather than hidden: a school year runs roughly August through May/
 * June — the Northern Hemisphere convention every curriculum ORYN currently supports (AP, IB,
 * A-Level, Turkish curriculum) follows. A student graduating in `graduationYear` is grade 12
 * from August of `graduationYear - 1` through July of `graduationYear`, grade 11 the year
 * before that, and so on. Outside grades 9-12 (already graduated, or not yet in high school),
 * returns `null` rather than guessing — never extrapolated into middle-school or
 * post-graduation grade numbers this product doesn't otherwise reason about.
 */
export function currentGradeLevel(graduationYear: number | null, asOf: Date = new Date()): number | null {
  if (graduationYear === null) return null;

  const AUGUST = 7; // 0-indexed month a new academic year is treated as starting.
  const academicYearEnd = asOf.getUTCMonth() >= AUGUST ? asOf.getUTCFullYear() + 1 : asOf.getUTCFullYear();
  const grade = 12 - (graduationYear - academicYearEnd);

  if (grade < 9 || grade > 12) return null;
  return grade;
}

/**
 * `eligible_grades` on `opportunities` is stored as strings (e.g. `["9","10","11","12"]`) —
 * matches whatever an official source actually published, not necessarily a clean numeric
 * range. Loose numeric-equality check only; anything non-numeric in the list (rare, e.g. a
 * source that says "rising seniors") never matches and is left for a human to read directly
 * rather than guessed at.
 */
export function gradeMatchesEligibility(grade: number, eligibleGrades: string[]): boolean {
  return eligibleGrades.some((g) => Number(g) === grade);
}
