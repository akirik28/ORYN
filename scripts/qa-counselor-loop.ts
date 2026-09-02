/**
 * Counselor-loop QA harness — ORYN multi-agent coordination assignment, 2026-08-21.
 *
 * Runs 4 synthetic personas through the deterministic parts of the counselor loop
 * (lib/scoring, lib/scoring/completeness, lib/admissions/outlook, lib/opportunities/matching,
 * lib/requirements/evaluate) and prints exactly what each engine actually produces.
 *
 * Not a permanent script — QA tooling for a one-time audit, not part of the shipped app.
 * No database, no network, no AI calls: every input below is hand-constructed in-memory
 * fixture data, not a live pull from Supabase (this session has no DB credentials and
 * would not read real student data even if it did).
 */
import { computeCareerProfile, computeCompleteness } from "../lib/scoring";
import { computeAdmissionOutlook } from "../lib/admissions/outlook";
import { computeOpportunityMatch, type OpportunityForMatching, type StudentMatchProfile } from "../lib/opportunities/matching";
import { evaluateRequirement } from "../lib/requirements/evaluate";
import type { RequirementFacts } from "../lib/requirements/types";
import type {
  Activity, Award, CareerGoal, Certification, Course, EducationRecord, Project,
  ResearchExperience, StudentInterest, TargetUniversity, TestScore, VolunteeringExperience, WorkExperience,
} from "../types/database";

const NOW = new Date("2026-08-21T00:00:00Z");
let idCounter = 0;
const id = () => `qa-${++idCounter}`;
const stamp = { created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" };
const evidence = { source: "self_reported" as const, evidence_status: "self_reported" as const };

function activity(p: Partial<Activity>): Activity {
  return {
    id: id(), user_id: "qa", organization: null, organization_entity_id: null, description: null,
    start_date: null, end_date: null, ongoing: false, hours_per_week: null, location: null,
    story_notes: null, is_leadership_role: false, people_led: null, organization_scope: null,
    weeks_per_year: null, opportunity_id: null, category: "club", title: "Untitled",
    ...evidence, ...stamp, ...p,
  };
}
function award(p: Partial<Award>): Award {
  return { id: id(), user_id: "qa", organization: null, organization_entity_id: null, description: null,
    award_date: null, location: null, story_notes: null, level: null, title: "Untitled", ...evidence, ...stamp, ...p };
}
function project(p: Partial<Project>): Project {
  return { id: id(), user_id: "qa", organization: null, organization_entity_id: null, description: null,
    start_date: null, end_date: null, ongoing: false, hours_per_week: null, location: null, story_notes: null,
    role: null, outcome_summary: null, users_reached: null, revenue_amount: null, repo_url: null, live_url: null,
    title: "Untitled", ...evidence, ...stamp, ...p };
}
function research(p: Partial<ResearchExperience>): ResearchExperience {
  return { id: id(), user_id: "qa", organization: null, organization_entity_id: null, description: null,
    start_date: null, end_date: null, ongoing: false, hours_per_week: null, location: null, story_notes: null,
    mentor_name: null, field: null, methodology: null, independence_level: null, output_type: "none",
    output_url: null, title: "Untitled", ...evidence, ...stamp, ...p };
}
function volunteering(p: Partial<VolunteeringExperience>): VolunteeringExperience {
  return { id: id(), user_id: "qa", organization: null, organization_entity_id: null, description: null,
    start_date: null, end_date: null, ongoing: false, hours_per_week: null, location: null, story_notes: null,
    cause_area: null, weeks_per_year: null, title: "Untitled", ...evidence, ...stamp, ...p };
}
function course(p: Partial<Course>): Course {
  return { id: id(), user_id: "qa", education_record_id: null, subject: null, academic_year: null,
    grade_value: null, grade_scale: null, credit_hours: null, course_name: "Untitled", level: "regular", ...stamp, ...p };
}
function testScore(p: Partial<TestScore>): TestScore {
  return { id: id(), user_id: "qa", max_score: null, subscores: {}, test_date: null, test_name: "Untitled", score: "0", ...stamp, ...p };
}
function educationRecord(p: Partial<EducationRecord>): EducationRecord {
  return { id: id(), user_id: "qa", school_entity_id: null, country_entity_id: null, country: null, curriculum: null,
    start_date: null, end_date: null, is_current: true, overall_gpa: null, gpa_scale: null, notes: null,
    school_name: "Unknown School", stage: "high_school", ...stamp, ...p };
}
function targetUniversity(p: Partial<TargetUniversity>): TargetUniversity {
  return { id: id(), user_id: "qa", university_id: "qa-univ", program_id: null, status: "target", notes: null,
    academic_fit_score: null, profile_fit_score: null, outlook: null, estimate_range_low: null,
    estimate_range_high: null, outlook_confidence: null, outlook_model_version: null, outlook_calculated_at: null,
    ...stamp, ...p };
}
function careerGoal(p: Partial<CareerGoal>): CareerGoal {
  return { id: id(), user_id: "qa", category: null, target_date: null, priority: 1, status: "active",
    title: "Untitled", ...stamp, ...p };
}

interface Persona {
  name: string;
  description: string;
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
  targetUniversities: TargetUniversity[];
  goals: CareerGoal[];
  interests: string[];
  skillCount: number;
  featuredCount: number;
  hasContactInfo: boolean;
  headline: string | null;
  about: string | null;
}

// ============ PERSONA A — Turkey/YKS-track, strong academics, thin everything else ============
const personaA: Persona = {
  name: "A — Turkey/YKS-track, strong academics, thin extracurriculars",
  description:
    "16yo, target Turkey, Turkish national curriculum, high GPA, no APs/IBs (not offered on this "+
    "track), a couple of standardized-test-style entries, one unremarkable club membership, nothing else. "+
    "The counseling-intelligence research's own #1 finding this month: YKS placement is exam-score-dominated "+
    "(RULE-COUNSEL-228/242) with a small grades-linked OBP component, and near-zero admissions weight on the "+
    "other 8 dimensions this engine scores. This persona exists to see whether the engine's OUTPUT (not just "+
    "prose elsewhere) already reflects that, or actively works against it.",
  educationRecords: [
    educationRecord({ country: "Turkey", curriculum: "turkish_curriculum", overall_gpa: 92, gpa_scale: 100, is_current: true, start_date: "2023-09-01" }),
  ],
  courses: [
    course({ course_name: "Matematik", subject: "Math", level: "regular" }),
    course({ course_name: "Fizik", subject: "Physics", level: "regular" }),
    course({ course_name: "Kimya", subject: "Chemistry", level: "regular" }),
  ],
  testScores: [testScore({ test_name: "TYT Deneme (practice)", score: "115", max_score: "120", test_date: "2026-06-01" })],
  activities: [activity({ title: "Chess Club", category: "club" })],
  awards: [],
  certifications: [],
  projects: [],
  researchExperiences: [],
  volunteeringExperiences: [],
  workExperiences: [],
  targetUniversities: [], goals: [], interests: ["Computer Science"],
  skillCount: 1, featuredCount: 0, hasContactInfo: true, headline: null, about: null,
};

// ============ PERSONA B — AGENTS.md's own canonical example (strong ent/leadership, weak research) ============
const personaB: Persona = {
  name: "B — Strong entrepreneurship & leadership, weak research (AGENTS.md's own worked example)",
  description:
    "US-target, solid-not-exceptional academics, a real 18-month-founded venture with modest revenue/users, "+
    "a substantive elected leadership role (people led, org scope), zero research. This is literally the "+
    "product spec's Phase 8.3/39 worked example — testing whether the raw scores this engine produces would "+
    "actually support the founder's own 'don't start another club, do research instead' example output.",
  educationRecords: [educationRecord({ country: "USA", curriculum: "other", overall_gpa: 3.7, gpa_scale: 4.0, start_date: "2023-09-01" })],
  courses: [
    course({ course_name: "AP Economics", subject: "Economics", level: "ap" }),
    course({ course_name: "AP English", subject: "English", level: "ap" }),
    course({ course_name: "Honors Physics", subject: "Physics", level: "honors" }),
  ],
  testScores: [testScore({ test_name: "SAT", score: "1420", max_score: "1600", test_date: "2026-03-01" })],
  activities: [
    activity({
      title: "Student Council President", category: "student_government", is_leadership_role: true,
      people_led: 40, organization_scope: "Whole school (1,200 students)", start_date: "2025-01-01", end_date: null, ongoing: true,
    }),
  ],
  awards: [],
  certifications: [],
  projects: [
    project({
      title: "Campus Marketplace", role: "Founder", outcome_summary: "A peer-to-peer resale app for school supplies; ran a small resale operation each semester.",
      users_reached: 340, revenue_amount: 2100, start_date: "2025-01-15", end_date: null, ongoing: true, live_url: "https://example.invalid/campus-marketplace",
    }),
  ],
  researchExperiences: [],
  volunteeringExperiences: [volunteering({ title: "Food bank sorting", cause_area: "Food security", hours_per_week: 2, start_date: "2025-09-01", ongoing: true })],
  workExperiences: [],
  targetUniversities: [targetUniversity({})], goals: [careerGoal({ title: "Get into a top business program" })], interests: ["Entrepreneurship", "Business"],
  skillCount: 4, featuredCount: 1, hasContactInfo: true, headline: "Founder & student council president", about: "Building things and running the school.",
};

// ============ PERSONA C — Research-heavy STEM ============
const personaC: Persona = {
  name: "C — Research-heavy student aiming for STEM",
  description:
    "UK-target, strong rigor (A-levels), a real 10-month mentored research experience with methodology and "+
    "a poster presentation (not peer-reviewed), an international-tier science olympiad award, weak leadership "+
    "and community_impact by design (single dimension of intended weakness, to check whether the engine still "+
    "reads it as a real gap rather than 'the research overwhelms everything').",
  educationRecords: [educationRecord({ country: "United Kingdom", curriculum: "a_level", overall_gpa: null, gpa_scale: null, start_date: "2024-09-01" })],
  courses: [
    course({ course_name: "A-level Maths", subject: "Math", level: "a_level", grade_value: "A*", grade_scale: "A*-U" }),
    course({ course_name: "A-level Further Maths", subject: "Math", level: "a_level", grade_value: "A", grade_scale: "A*-U" }),
    course({ course_name: "A-level Physics", subject: "Physics", level: "a_level", grade_value: "A", grade_scale: "A*-U" }),
  ],
  testScores: [],
  activities: [],
  awards: [award({ title: "International Physics Olympiad — Bronze Medal", level: "International", award_date: "2026-07-01" })],
  certifications: [],
  projects: [],
  researchExperiences: [
    research({
      title: "Computational modeling of urban heat islands", mentor_name: "Dr. A. Researcher",
      field: "Environmental physics", methodology: "Built a finite-difference thermal model calibrated against public temperature-sensor data for three UK cities.",
      independence_level: "Designed and ran independently with weekly mentor check-ins", output_type: "poster",
      start_date: "2025-09-01", end_date: "2026-06-30",
    }),
  ],
  volunteeringExperiences: [],
  workExperiences: [],
  targetUniversities: [targetUniversity({})], goals: [careerGoal({ title: "Study physics at a research university" })], interests: ["Physics", "Environmental Science"],
  skillCount: 3, featuredCount: 1, hasContactInfo: true, headline: null, about: null,
};

// ============ PERSONA D — Early-stage 14yo, sparse profile ============
const personaD: Persona = {
  name: "D — Early-stage 14yo, sparse profile",
  description: "Freshly onboarded, one club activity, one course, nothing else. Tests graceful degradation, not crashes/nonsense.",
  educationRecords: [],
  courses: [course({ course_name: "Intro to Biology", subject: "Biology", level: "regular" })],
  testScores: [],
  activities: [activity({ title: "Robotics Club", category: "club" })],
  awards: [], certifications: [], projects: [], researchExperiences: [], volunteeringExperiences: [], workExperiences: [],
  targetUniversities: [], goals: [], interests: ["Engineering"],
  skillCount: 0, featuredCount: 0, hasContactInfo: false, headline: null, about: null,
};

const personas = [personaA, personaB, personaC, personaD];

// ============ Synthetic opportunities (illustrative shapes, NOT a live DB pull — no DB access this session) ============
const opportunities: (OpportunityForMatching & { label: string })[] = [
  { label: "US Chemistry Olympiad (competition)", category: "competition", minimumAge: 14, maximumAge: 18, eligibleCountries: [], fields: ["chemistry", "science"], country: "United States" },
  { label: "Summer research program, Turkey-eligible (research)", category: "research", minimumAge: 16, maximumAge: 18, eligibleCountries: ["Turkey", "United Kingdom"], fields: ["physics", "environmental science"], country: "United Kingdom" },
  { label: "Local tech internship (internship)", category: "internship", minimumAge: 16, maximumAge: null, eligibleCountries: ["USA"], fields: ["computer science", "entrepreneurship"], country: "United States" },
  { label: "Turkey-only national volunteering program (volunteering)", category: "volunteering", minimumAge: 14, maximumAge: null, eligibleCountries: ["Turkey"], fields: [], country: "Turkey" },
];

function studentMatchProfile(p: Persona, weakest: string[]): StudentMatchProfile {
  const targetCountry = p.educationRecords[0]?.country ?? null;
  return {
    age: p.name.startsWith("D") ? 14 : 17,
    country: targetCountry,
    interests: p.interests as string[],
    weakestDimensions: weakest as StudentMatchProfile["weakestDimensions"],
  };
}

// ============ Run ============
console.log("=".repeat(100));
for (const p of personas) {
  console.log(`\n${"#".repeat(100)}\nPERSONA: ${p.name}\n${p.description}\n${"#".repeat(100)}`);

  const facts = {
    educationRecords: p.educationRecords, courses: p.courses, testScores: p.testScores,
    activities: p.activities, awards: p.awards, certifications: p.certifications, projects: p.projects,
    researchExperiences: p.researchExperiences, volunteeringExperiences: p.volunteeringExperiences,
    workExperiences: p.workExperiences, referenceDate: NOW,
  };

  const profile = computeCareerProfile(facts);
  console.log(`\n-- computeCareerProfile --  overall=${profile.overallScore}`);
  for (const d of profile.dimensions) {
    console.log(`   ${d.dimension.padEnd(24)} score=${String(d.score).padStart(3)}  confidence=${d.confidence.padEnd(6)}  reasons=[${d.reasonCodes.map((r) => r.code).join(",")}]`);
  }

  const sorted = [...profile.dimensions].sort((a, b) => a.score - b.score);
  const biggestGap = sorted[0];
  console.log(`   BIGGEST GAP per this run: ${biggestGap.dimension} (${biggestGap.score})`);

  const completeness = computeCompleteness({
    profile: { country: p.educationRecords[0]?.country ?? null, school_name: p.educationRecords[0]?.school_name ?? null, graduation_year: 2028, curriculum: p.educationRecords[0]?.curriculum ?? null, headline: p.headline, about: p.about },
    educationRecords: p.educationRecords, courses: p.courses, testScores: p.testScores, activities: p.activities,
    awards: p.awards, certifications: p.certifications, projects: p.projects, researchExperiences: p.researchExperiences,
    volunteeringExperiences: p.volunteeringExperiences, workExperiences: p.workExperiences,
    interests: p.interests.map((label): StudentInterest => ({ id: id(), user_id: "qa", label, is_custom: false, created_at: stamp.created_at })),
    goals: p.goals, targetUniversities: p.targetUniversities,
    skillCount: p.skillCount, featuredCount: p.featuredCount, hasContactInfo: p.hasContactInfo,
  });
  console.log(`\n-- computeCompleteness -- ${completeness}%`);

  console.log(`\n-- computeAdmissionOutlook -- (profileStrength=${profile.overallScore})`);
  for (const [label, admissionRate] of [["Highly selective (8%)", 0.08], ["Selective (35%)", 0.35], ["Unknown selectivity", null]] as const) {
    const outlook = computeAdmissionOutlook({ profileStrength: profile.overallScore, admissionRate, dataConfidence: completeness > 60 ? "high" : completeness > 30 ? "medium" : "low" });
    console.log(`   vs ${label.padEnd(24)} -> outlook=${outlook.outlook.padEnd(14)} composite=${outlook.compositeScore}  range=${outlook.estimateRangeLow ?? "-"}-${outlook.estimateRangeHigh ?? "-"} (${outlook.estimateConfidence ?? "n/a"})`);
  }

  console.log(`\n-- computeOpportunityMatch -- (against ${opportunities.length} synthetic opportunities)`);
  const weakest3 = sorted.slice(0, 3).map((d) => d.dimension);
  const student = studentMatchProfile(p, weakest3);
  for (const opp of opportunities) {
    const match = computeOpportunityMatch(student, opp);
    console.log(`   ${opp.label.padEnd(46)} eligible=${String(match.eligible).padEnd(5)} relevance=${String(match.relevanceScore).padStart(3)} need=${String(match.profileNeedScore).padStart(3)} match=${String(match.matchScore).padStart(3)}  ${match.eligibilityNotes ?? ""}`);
  }

  console.log(`\n-- evaluateRequirement (sample: minimum_grade rule, 3.5/4.0 GPA) --`);
  const reqFacts: RequirementFacts = {
    curricula: p.educationRecords.map((e) => e.curriculum).filter((c): c is NonNullable<typeof c> => c !== null),
    courses: p.courses.map((c) => ({ subject: c.subject, level: c.level, gradeValue: null })),
    gpas: p.educationRecords.filter((e) => e.overall_gpa != null && e.gpa_scale != null).map((e) => ({ value: e.overall_gpa!, scale: e.gpa_scale! })),
    testScores: p.testScores.map((t) => ({ testName: t.test_name, score: t.score })),
    languages: [],
  };
  const reqResult = evaluateRequirement("minimum_grade", { kind: "minimum_grade", scale: 4.0, minGpa: 3.5 }, reqFacts);
  console.log(`   status=${reqResult.status}  reasoning="${reqResult.reasoning}"`);
}
console.log("\n" + "=".repeat(100) + "\nDONE\n");
