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
}

/**
 * Profile completeness (spec Phase 67): how much Oryn knows about the student —
 * completely independent of how strong that profile is. Ten equally-weighted checklist
 * items, 10 points each. Deliberately separate from lib/scoring/dimensions — a student
 * can be 100% complete and mediocre, or 10% complete with one outstanding activity.
 */
export function computeCompleteness(facts: CompletenessFacts): number {
  const checklist = [
    Boolean(facts.profile.country && facts.profile.school_name && facts.profile.graduation_year && facts.profile.curriculum),
    facts.educationRecords.length > 0,
    facts.testScores.length > 0 || facts.courses.length > 0,
    facts.activities.length > 0,
    facts.awards.length > 0 || facts.certifications.length > 0,
    facts.projects.length > 0,
    facts.researchExperiences.length > 0 || facts.volunteeringExperiences.length > 0 || facts.workExperiences.length > 0,
    facts.goals.length > 0,
    facts.interests.length > 0,
    facts.targetUniversities.length > 0,
  ];

  const completedCount = checklist.filter(Boolean).length;
  return clampScore((completedCount / checklist.length) * 100);
}
