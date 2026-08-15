import type {
  Activity,
  Award,
  Certification,
  Course,
  EducationRecord,
  Project,
  ResearchExperience,
  TestScore,
  VolunteeringExperience,
  WorkExperience,
  DataConfidence,
  ProfileDimension,
} from "@/types/database";

/** Everything the scoring engine needs. Assembled server-side from the DB, never fetched by the engine itself — keeps this module pure and unit-testable without a database. */
export interface ScoringFacts {
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
  /** "Now", injectable so ongoing-commitment duration math is deterministic in tests. */
  referenceDate?: Date;
}

export interface ReasonCode {
  code: string;
  detail: string;
}

export interface DimensionResult {
  dimension: ProfileDimension;
  score: number;
  confidence: DataConfidence;
  reasonCodes: ReasonCode[];
}

export const CAREER_PROFILE_SCORE_VERSION = "career_profile_v1";
