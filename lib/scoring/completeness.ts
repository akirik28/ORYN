import type {
  Activity,
  Award,
  CareerGoal,
  Certification,
  Course,
  CurriculumType,
  EducationRecord,
  Project,
  ResearchExperience,
  StudentInterest,
  TargetUniversity,
  TestScore,
  VolunteeringExperience,
  WorkExperience,
} from "@/types/database";
import { clampScore } from "./math";

export interface CompletenessFacts {
  profile: {
    country: string | null;
    school_name: string | null;
    graduation_year: number | null;
    curriculum: CurriculumType | null;
    headline: string | null;
    about: string | null;
  };
  educationRecords: EducationRecord[];
  courses: Course[];
  testScores: TestScore[];
  activities: Activity[];
  awards: Award[];
  certifications: Certification[];
  projects: Project[];
  researchExperiences: ResearchExperience[];
  volunteeringExperiences: VolunteeringExperience[];
  workExperiences: WorkExperience[];
  interests: StudentInterest[];
  goals: CareerGoal[];
  targetUniversities: TargetUniversity[];
  /** Professional Profile pack additions (2026-08-16) — this is the same "how filled
   * out is your profile" concept the original 10 items already measured, just extended
   * to the new professional-identity surface (Profile Strength, spec section 14) rather
   * than tracked as a second, confusingly-similarly-named score. Never conflate with
   * `profiles.profile_strength_score`, which is the unrelated 9-dimension admissions
   * Career Profile score computed by lib/scoring/index.ts. */
  skillCount: number;
  featuredCount: number;
  hasContactInfo: boolean;
}

export interface CompletenessChecklistItem {
  label: string;
  done: boolean;
}

/**
 * Profile completeness (spec Phase 67, extended 2026-08-16): how much Oryn knows about
 * the student — completely independent of how strong that profile is. Equally-weighted
 * checklist items. Deliberately separate from lib/scoring/dimensions — a student can be
 * 100% complete and mediocre, or 10% complete with one outstanding activity.
 *
 * Single source of truth for both the plain percentage (computeCompleteness, used by
 * the existing scoring pipeline — lib/scoring/persist.ts) and the labeled suggestions
 * list (getCompletenessChecklist, used by the new Profile Strength UI) so the two can
 * never drift out of sync with each other.
 */
/** Counseling-relevant signal (spec Phase 67: "do we know enough about the student to
 * counsel them") — academics, activities, goals, targets. Deliberately excludes the
 * professional-profile-pack items below. */
function coreChecklist(facts: CompletenessFacts): CompletenessChecklistItem[] {
  return [
    {
      label: "Add your school and academic details",
      done: Boolean(facts.profile.country && facts.profile.school_name && facts.profile.graduation_year && facts.profile.curriculum),
    },
    { label: "Add an education record", done: facts.educationRecords.length > 0 },
    { label: "Add a test score or course", done: facts.testScores.length > 0 || facts.courses.length > 0 },
    { label: "Add an activity", done: facts.activities.length > 0 },
    { label: "Add an award or certification", done: facts.awards.length > 0 || facts.certifications.length > 0 },
    { label: "Add a project", done: facts.projects.length > 0 },
    {
      label: "Add research, volunteering, or work experience",
      done: facts.researchExperiences.length > 0 || facts.volunteeringExperiences.length > 0 || facts.workExperiences.length > 0,
    },
    { label: "Set a career goal", done: facts.goals.length > 0 },
    { label: "Add an interest", done: facts.interests.length > 0 },
    { label: "Add a target university", done: facts.targetUniversities.length > 0 },
  ];
}

/** Professional-profile polish (spec section 14, Profile Strength) — headline/bio/skills/
 * featured/contact. Real signal for "how filled-out is your public professional profile,"
 * but not counseling signal: a student who writes a bio and adds 3 skills but has no
 * activities, goals, or target universities doesn't thereby give Oryn more to counsel on. */
function professionalProfileChecklist(facts: CompletenessFacts): CompletenessChecklistItem[] {
  return [
    { label: "Add a headline", done: Boolean(facts.profile.headline) },
    { label: "Write an About summary", done: Boolean(facts.profile.about) },
    { label: "Add 3 or more skills", done: facts.skillCount >= 3 },
    { label: "Feature a project or achievement", done: facts.featuredCount > 0 },
    { label: "Add contact information", done: facts.hasContactInfo },
  ];
}

function buildChecklist(facts: CompletenessFacts): CompletenessChecklistItem[] {
  return [...coreChecklist(facts), ...professionalProfileChecklist(facts)];
}

function scorePercent(checklist: CompletenessChecklistItem[]): number {
  const completedCount = checklist.filter((item) => item.done).length;
  return clampScore((completedCount / checklist.length) * 100);
}

/** Full checklist (all 15 items) as a single percentage — "how filled-out is the whole
 * profile," professional polish included. Kept for any existing caller of the broad
 * concept; the counseling-facing score below is what should feed counseling logic. */
export function computeCompleteness(facts: CompletenessFacts): number {
  return scorePercent(buildChecklist(facts));
}

/** What `profiles.completeness_percent` should actually mean: does Oryn know enough about
 * the student to counsel them. Feeds lib/admissions/persist.ts's admission-outlook data
 * confidence and the AI advisor's stated "Profile completeness: X%" context line
 * (lib/ai/student-context.ts) — both should reflect academic/activity/goal signal, not
 * whether the student wrote a headline. The Profile Strength UI checklist
 * (getCompletenessChecklist, below) intentionally keeps the full 15-item list — that's a
 * different, legitimate "how filled-out is your public profile" concept, unchanged here. */
export function computeCounselingCompleteness(facts: CompletenessFacts): number {
  return scorePercent(coreChecklist(facts));
}

/** Powers the Profile Strength suggestions list — only the owner ever sees this
 * (never another user's), matching the DB column's own existing privacy posture
 * (`completeness_percent` has never been in the public_profiles column whitelist). */
export function getCompletenessChecklist(facts: CompletenessFacts): CompletenessChecklistItem[] {
  return buildChecklist(facts);
}
