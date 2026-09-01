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
import type { Locale } from "@/lib/i18n/config";

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

/**
 * One stable identity per checklist item, independent of `label`'s display text. Needed
 * because `label` reaches students two ways: as `item.label` (this file's original, only
 * consumer-facing use) and, via `lib/counselor/candidates.ts`'s `profileTaskCandidates`, as
 * `source.checklistKey` — which `lib/counselor/evidence.ts`'s `sourceId`/`recommendationId`
 * slugifies into this recommendation's `id`. Translating `label` in place would have moved
 * that id out from under anything keyed on it the moment a Turkish student loaded the page
 * (spec Phase 63's not-yet-built recommendation history is exactly this kind of consumer) —
 * this key is what stays stable while `label`/`completenessChecklistLabel` are free to vary
 * by locale.
 */
export type CompletenessChecklistKey =
  | "school_details"
  | "education_record"
  | "test_score_or_course"
  | "activity"
  | "award_or_certification"
  | "project"
  | "research_volunteering_work"
  | "career_goal"
  | "interest"
  | "target_university"
  | "headline"
  | "about_summary"
  | "skills"
  | "featured_item"
  | "contact_info";

export interface CompletenessChecklistItem {
  key: CompletenessChecklistKey;
  /** English display text — unchanged for the one pre-existing caller that still reads it
   *  directly. New locale-aware callers should key off `key` and call
   *  `completenessChecklistLabel(key, locale)` instead, same split as `dimensionLabel`. */
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
      key: "school_details",
      label: CHECKLIST_LABELS_EN.school_details,
      done: Boolean(facts.profile.country && facts.profile.school_name && facts.profile.graduation_year && facts.profile.curriculum),
    },
    { key: "education_record", label: CHECKLIST_LABELS_EN.education_record, done: facts.educationRecords.length > 0 },
    { key: "test_score_or_course", label: CHECKLIST_LABELS_EN.test_score_or_course, done: facts.testScores.length > 0 || facts.courses.length > 0 },
    { key: "activity", label: CHECKLIST_LABELS_EN.activity, done: facts.activities.length > 0 },
    { key: "award_or_certification", label: CHECKLIST_LABELS_EN.award_or_certification, done: facts.awards.length > 0 || facts.certifications.length > 0 },
    { key: "project", label: CHECKLIST_LABELS_EN.project, done: facts.projects.length > 0 },
    {
      key: "research_volunteering_work",
      label: CHECKLIST_LABELS_EN.research_volunteering_work,
      done: facts.researchExperiences.length > 0 || facts.volunteeringExperiences.length > 0 || facts.workExperiences.length > 0,
    },
    { key: "career_goal", label: CHECKLIST_LABELS_EN.career_goal, done: facts.goals.length > 0 },
    { key: "interest", label: CHECKLIST_LABELS_EN.interest, done: facts.interests.length > 0 },
    { key: "target_university", label: CHECKLIST_LABELS_EN.target_university, done: facts.targetUniversities.length > 0 },
  ];
}

/** Professional-profile polish (spec section 14, Profile Strength) — headline/bio/skills/
 * featured/contact. Real signal for "how filled-out is your public professional profile,"
 * but not counseling signal: a student who writes a bio and adds 3 skills but has no
 * activities, goals, or target universities doesn't thereby give Oryn more to counsel on. */
function professionalProfileChecklist(facts: CompletenessFacts): CompletenessChecklistItem[] {
  return [
    { key: "headline", label: CHECKLIST_LABELS_EN.headline, done: Boolean(facts.profile.headline) },
    { key: "about_summary", label: CHECKLIST_LABELS_EN.about_summary, done: Boolean(facts.profile.about) },
    { key: "skills", label: CHECKLIST_LABELS_EN.skills, done: facts.skillCount >= 3 },
    { key: "featured_item", label: CHECKLIST_LABELS_EN.featured_item, done: facts.featuredCount > 0 },
    { key: "contact_info", label: CHECKLIST_LABELS_EN.contact_info, done: facts.hasContactInfo },
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

const CHECKLIST_LABELS_EN: Record<CompletenessChecklistKey, string> = {
  school_details: "Add your school and academic details",
  education_record: "Add an education record",
  test_score_or_course: "Add a test score or course",
  activity: "Add an activity",
  award_or_certification: "Add an award or certification",
  project: "Add a project",
  research_volunteering_work: "Add research, volunteering, or work experience",
  career_goal: "Set a career goal",
  interest: "Add an interest",
  target_university: "Add a target university",
  headline: "Add a headline",
  about_summary: "Write an About summary",
  skills: "Add 3 or more skills",
  featured_item: "Feature a project or achievement",
  contact_info: "Add contact information",
};

const CHECKLIST_LABELS_TR: Record<CompletenessChecklistKey, string> = {
  school_details: "Okulunu ve akademik bilgilerini ekle",
  education_record: "Bir eğitim kaydı ekle",
  test_score_or_course: "Bir sınav sonucu veya ders ekle",
  activity: "Bir aktivite ekle",
  award_or_certification: "Bir ödül veya sertifika ekle",
  project: "Bir proje ekle",
  research_volunteering_work: "Araştırma, gönüllülük veya iş deneyimi ekle",
  career_goal: "Bir kariyer hedefi belirle",
  interest: "Bir ilgi alanı ekle",
  target_university: "Bir hedef üniversite ekle",
  headline: "Bir başlık ekle",
  about_summary: "Hakkımda özetini yaz",
  skills: "3 veya daha fazla beceri ekle",
  featured_item: "Bir proje veya başarıyı öne çıkar",
  contact_info: "İletişim bilgisi ekle",
};

/** Locale-aware accessor, same shape as `lib/scoring/labels.ts`'s `dimensionLabel` — the
 *  English strings live on `CompletenessChecklistItem.label` itself (unchanged, so the one
 *  pre-existing caller needs no change), this only adds the Turkish side. */
export function completenessChecklistLabel(key: CompletenessChecklistKey, locale: Locale): string {
  return locale === "tr" ? CHECKLIST_LABELS_TR[key] : CHECKLIST_LABELS_EN[key];
}
