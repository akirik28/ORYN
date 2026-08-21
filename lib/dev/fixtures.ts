// Realistic fixture data for local visual development only (spec Phase 49 personas).
// Never imported by production data paths — only by app/(dev-preview)/**, which 404s
// outside development. See lib/dev/fixtures.ts's sibling README note in
// /docs/design-system.md for why this exists: this sandbox has no Supabase/Docker, so
// authenticated pages can't be rendered against real data during design work.
import type { ImpactLevel, OutlookLabel, Opportunity, ProfileDimension, University, WeeklyAction } from "@/types/database";
import type { TargetUniversityWithDetails } from "@/lib/universities/queries";
import type { WeeklyPlanWithActions } from "@/lib/plan/persist";

export const FIXTURE_STUDENT = {
  displayName: "Ada",
  profileStrengthScore: 77,
  trend: 3,
};

const DIMENSION_SCORES: Record<ProfileDimension, number> = {
  academics: 82,
  intellectual_curiosity: 74,
  leadership: 91,
  research: 42,
  entrepreneurship: 68,
  community_impact: 59,
  awards_distinction: 55,
  career_exploration: 71,
  execution_project_depth: 76,
};

export const FIXTURE_SCORES = (Object.entries(DIMENSION_SCORES) as [ProfileDimension, number][]).map(([dimension, score], index) => ({
  id: `score-${index}`,
  user_id: "fixture-user",
  dimension,
  score,
  confidence: "high" as const,
  calculation_version: "career_profile_v1",
  reason_codes: [],
  calculated_at: new Date().toISOString(),
}));

export const FIXTURE_BIGGEST_GAP = { dimension: "research" as ProfileDimension, score: 42 };
export const FIXTURE_BIGGEST_IMPROVEMENT = { dimension: "research" as ProfileDimension, delta: 8 };

export const FIXTURE_AVOID_RECOMMENDATION = {
  title: "Starting another entrepreneurship club",
  reason:
    "Leadership and entrepreneurship are already among your strongest areas. Completing your current research project has higher expected value right now.",
};

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export const FIXTURE_WEEKLY_ACTIONS: WeeklyAction[] = [
  {
    id: "action-1",
    plan_id: "plan-1",
    user_id: "fixture-user",
    title: "Finish your economics dataset",
    description: null,
    reason: "This is the last blocker on your research project — the analysis can't start without it.",
    category: "research",
    priority: 1,
    estimated_minutes: 150,
    impact_level: "very_high" as ImpactLevel,
    deadline: null,
    status: "not_started",
    source_type: "weekly_plan",
    source_id: null,
    reflection_outcome: null,
    reflection_note: null,
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "action-2",
    plan_id: "plan-1",
    user_id: "fixture-user",
    title: "Apply to the Economics Challenge",
    description: null,
    reason: "International, economics-focused, and closes in 6 days — a strong fit for your target field.",
    category: "opportunity",
    priority: 2,
    estimated_minutes: 60,
    impact_level: "high" as ImpactLevel,
    deadline: daysFromNow(6),
    status: "not_started",
    source_type: "opportunity",
    source_id: null,
    reflection_outcome: null,
    reflection_note: null,
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "action-3",
    plan_id: "plan-1",
    user_id: "fixture-user",
    title: "Write the conclusion of your research paper",
    description: null,
    reason: "Your analysis is done — closing this out finishes your strongest piece of evidence this year.",
    category: "research",
    priority: 3,
    estimated_minutes: 45,
    impact_level: "high" as ImpactLevel,
    deadline: null,
    status: "not_started",
    source_type: "weekly_plan",
    source_id: null,
    reflection_outcome: null,
    reflection_note: null,
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const FIXTURE_WEEKLY_PLAN: WeeklyPlanWithActions = {
  plan: {
    id: "plan-1",
    user_id: "fixture-user",
    week_start_date: new Date().toISOString().slice(0, 10),
    summary:
      "Your research project is close to done. Finishing it and applying to one strong competition would meaningfully move your profile this month.",
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  actions: FIXTURE_WEEKLY_ACTIONS,
};

function stubUniversity(id: string, name: string, country: string, city: string): University {
  return {
    id,
    name,
    country,
    city,
    institution_type: null,
    canonical_entity_id: null,
    country_entity_id: null,
    city_entity_id: null,
    website_url: null,
    admissions_url: null,
    application_system: null,
    logo_url: null,
    description: null,
    selectivity: null,
    student_size: null,
    latitude: null,
    longitude: null,
    external_ids: {},
    data_confidence: "medium",
    data_status: "fresh",
    last_checked_at: daysFromNow(-5),
    last_changed_at: daysFromNow(-60),
    created_at: daysFromNow(-400),
    updated_at: daysFromNow(-5),
  };
}

function stubTarget(id: string, university: University, outlook: OutlookLabel): TargetUniversityWithDetails {
  return {
    id,
    user_id: "fixture-user",
    university_id: university.id,
    program_id: null,
    status: "target",
    notes: null,
    academic_fit_score: null,
    profile_fit_score: null,
    outlook,
    estimate_range_low: null,
    estimate_range_high: null,
    outlook_confidence: "medium",
    outlook_model_version: "admission_model_v1",
    outlook_calculated_at: daysFromNow(-3),
    created_at: daysFromNow(-40),
    updated_at: daysFromNow(-3),
    university,
  };
}

export const FIXTURE_TARGET_UNIVERSITIES: TargetUniversityWithDetails[] = [
  stubTarget("target-1", stubUniversity("uni-1", "Bocconi University", "Italy", "Milan"), "competitive"),
  stubTarget("target-2", stubUniversity("uni-2", "London School of Economics", "United Kingdom", "London"), "reach"),
  stubTarget("target-3", stubUniversity("uni-3", "Erasmus University Rotterdam", "Netherlands", "Rotterdam"), "strong"),
];

export const FIXTURE_UNIVERSITY: University = {
  id: "uni-2",
  name: "London School of Economics and Political Science",
  country: "United Kingdom",
  city: "London",
  institution_type: "Public research university",
  canonical_entity_id: null,
  country_entity_id: null,
  city_entity_id: null,
  website_url: "https://www.lse.ac.uk",
  admissions_url: "https://www.lse.ac.uk/study-at-lse/Undergraduate/Applying-to-LSE",
  application_system: "UCAS",
  logo_url: null,
  description:
    "A specialist social science institution consistently ranked among the world's leading universities for economics, politics, and law.",
  selectivity: "Very high",
  student_size: 12000,
  latitude: 51.5144,
  longitude: -0.1165,
  external_ids: {},
  data_confidence: "high",
  data_status: "fresh",
  last_checked_at: daysFromNow(-2),
  last_changed_at: daysFromNow(-40),
  created_at: daysFromNow(-400),
  updated_at: daysFromNow(-2),
};

export const FIXTURE_OPPORTUNITIES: { opportunity: Opportunity; matchScore: number; reasonCodes: string[] }[] = [
  {
    opportunity: {
      id: "opp-1",
      title: "International Economics Challenge 2027",
      organization: "Global Economics Foundation",
      description:
        "A team-based competition analyzing real-world economic policy questions, open to students aged 15-18 worldwide.",
      category: "competition",
      official_url: "https://example.org/economics-challenge",
      application_url: "https://example.org/economics-challenge/apply",
      country: null,
      remote_allowed: true,
      minimum_age: 15,
      maximum_age: 18,
      eligible_countries: [],
      fields: ["Economics"],
      cost: 0,
      funding_available: false,
      deadline: daysFromNow(6),
      start_date: null,
      end_date: null,
      source: "tavily",
      source_url: "https://example.org/economics-challenge",
      source_confidence: "high",
      last_verified_at: daysFromNow(-3),
      status: "active",
      normalized_title: "international economics challenge",
      cycle_status: "open",
      selectivity_tier: "selective",
      verification_state: "verified_current",
      application_open_date: null,
      eligible_grades: [],
      citizenship_restrictions: null,
      residency_restrictions: null,
      eligible_citizenships: [],
      location_mode: "online",
      financial_aid_available: false,
      application_requirements: [],
      current_cycle_label: "2027",
      verified_at: daysFromNow(-3),
      organization_entity_id: null,
      country_entity_id: null,
      access_channel: null,
      created_at: daysFromNow(-30),
      updated_at: daysFromNow(-3),
    },
    matchScore: 91,
    reasonCodes: ["matches_your_interests", "addresses_a_current_gap"],
  },
  {
    opportunity: {
      id: "opp-2",
      title: "Youth Research Fellows Programme",
      organization: "OECD Youth Network",
      description: "An 8-week mentored research fellowship pairing students with economists on live policy datasets.",
      category: "research",
      official_url: "https://example.org/research-fellows",
      application_url: null,
      country: null,
      remote_allowed: true,
      minimum_age: 16,
      maximum_age: 19,
      eligible_countries: [],
      fields: ["Economics", "Public Policy"],
      cost: 0,
      funding_available: true,
      deadline: daysFromNow(21),
      start_date: null,
      end_date: null,
      source: "tavily",
      source_url: "https://example.org/research-fellows",
      source_confidence: "medium",
      last_verified_at: daysFromNow(-5),
      status: "active",
      normalized_title: "youth research fellows programme",
      cycle_status: "upcoming",
      selectivity_tier: "highly_selective",
      verification_state: "verified_current",
      application_open_date: null,
      eligible_grades: [],
      citizenship_restrictions: null,
      residency_restrictions: null,
      eligible_citizenships: [],
      location_mode: "online",
      financial_aid_available: true,
      application_requirements: [],
      current_cycle_label: "2027",
      verified_at: daysFromNow(-5),
      organization_entity_id: null,
      country_entity_id: null,
      access_channel: null,
      created_at: daysFromNow(-20),
      updated_at: daysFromNow(-5),
    },
    matchScore: 78,
    reasonCodes: ["addresses_a_current_gap"],
  },
];

export const FIXTURE_DEADLINES = [
  { id: "d1", title: "Apply to the Economics Challenge", date: daysFromNow(6), href: "/opportunities", source: "opportunity" as const },
  { id: "d2", title: "LSE — Economics, personal statement", date: daysFromNow(12), href: "/applications", source: "application" as const },
  { id: "d3", title: "Erasmus Rotterdam — program deadline", date: daysFromNow(28), href: "/universities/uni-3", source: "university" as const },
];
