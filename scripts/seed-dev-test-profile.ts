#!/usr/bin/env node
/**
 * Fills the `npm run dev:test-account` student (test@oryn.dev) with a full, realistic
 * profile so every screen has real content to render. Without this the account logs in to
 * a wall of empty states, which makes UI work on the dashboard, portfolio, advisor,
 * benchmarking and public-profile screens impossible to actually look at.
 *
 * Run with: npm run dev:seed-profile   (run dev:test-account first if the account is new)
 *
 * The persona is deliberately Persona B from AGENTS.md's Phase 49 fixture list: strong
 * entrepreneurship and leadership, genuinely thin research. That shape is what makes the
 * product's differentiating features demonstrable — "your biggest gap is research", the
 * "one thing not to do" card, and gap-driven opportunity matching all have something real
 * to say about it. A uniformly excellent profile would render those surfaces mute.
 *
 * Deliberately does NOT write profile_scores / profile_score_snapshots. Those are computed
 * from the facts below by lib/scoring (recomputeCareerProfile, which the dashboard runs on
 * load) — hand-writing scores here would be inventing numbers the scoring engine never
 * produced, and they'd silently disagree with it the moment the rules change.
 *
 * Idempotent: every child table is cleared for this one user before reinserting, so
 * re-running never accumulates duplicates.
 *
 * Same conventions as scripts/create-dev-test-account.ts — no `lib/` imports (nothing here
 * runs inside Next's bundler, and much of lib/ is marked "server-only"), env from
 * .env.local, plain @supabase/supabase-js against the service key.
 *
 * DEV/QA ONLY. This writes a fictional student into whichever Supabase project
 * SUPABASE_SECRET_KEY points at. Never run it against a production project.
 */

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local -- fine, maybe using real environment variables already.
}

const TEST_EMAIL = "test@oryn.dev";

/** Child tables wiped (for this user only) before reseeding, so reruns stay idempotent. */
const OWNED_TABLES = [
  "featured_items",
  "courses",
  "education_records",
  "test_scores",
  "activities",
  "awards",
  "certifications",
  "projects",
  "research_experiences",
  "volunteering_experiences",
  "work_experiences",
  "sports_experiences",
  "skills",
  "languages",
  "student_interests",
  "career_goals",
] as const;

async function findTestUserId(admin: SupabaseClient): Promise<string> {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((u) => u.email === TEST_EMAIL);
    if (match) return match.id;
    if (data.users.length < 200) break;
  }
  throw new Error(`No ${TEST_EMAIL} account found. Run \`npm run dev:test-account\` first.`);
}

async function insert(admin: SupabaseClient, table: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return [];
  const { data, error } = await admin.from(table).insert(rows).select("id");
  if (error) throw new Error(`${table}: ${error.message}`);
  console.log(`  ${table}: ${rows.length}`);
  return data ?? [];
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local -- see API_SETUP.md.");
    process.exit(1);
  }

  const admin = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const userId = await findTestUserId(admin);
  console.log(`Seeding ${TEST_EMAIL} (${userId})\n`);

  console.log("Clearing previous seed...");
  for (const table of OWNED_TABLES) {
    const { error } = await admin.from(table).delete().eq("user_id", userId);
    if (error) throw new Error(`clearing ${table}: ${error.message}`);
  }

  console.log("\nWriting profile...");
  const { error: profileError } = await admin
    .from("profiles")
    .update({
      first_name: "Ada",
      last_name: "Yilmaz",
      display_name: "Ada Yilmaz",
      birth_year: 2009,
      country: "Turkey",
      city: "Istanbul",
      school_name: "Robert College",
      graduation_year: 2028,
      curriculum: "ib",
      preferred_language: "en",
      timezone: "Europe/Istanbul",
      target_geographies: ["uk", "europe", "usa"],
      weekly_time_budget: "5_10h",
      onboarding_completed: true,
      headline: "IB Diploma student building an economics research habit around a student-run marketplace.",
      about:
        "I run a campus resale marketplace that has moved about 400 orders since 2025, and I care most about the economics behind why it works. I am strongest at shipping things and organising people, and I am deliberately spending this year getting better at the part I am weakest at: doing real, methodical research rather than just having opinions about data.",
      open_to: ["research", "internship", "competitions", "mentorship"],
      show_gpa: true,
      is_public: true,
      looking_for: "A research mentor in applied economics, and summer programmes that take international students.",
      // Deliberately not setting citizenship_countries: it arrives in migration 0047, which
      // is not applied in every environment (the same gap that broke
      // refreshOpportunityMatches). Setting it would make this script fail wholesale on
      // those environments for one optional field.
    })
    .eq("id", userId);
  if (profileError) throw new Error(`profiles: ${profileError.message}`);
  console.log("  profiles: updated");

  console.log("\nWriting academics...");
  const [education] = await insert(admin, "education_records", [
    {
      user_id: userId,
      school_name: "Robert College",
      country: "Turkey",
      stage: "high_school",
      curriculum: "ib",
      start_date: "2022-09-05",
      is_current: true,
      overall_gpa: 3.82,
      gpa_scale: 4.0,
      notes: "IB Diploma Programme, HL Economics / HL Mathematics AA / HL English.",
    },
  ]);

  await insert(
    admin,
    "courses",
    [
      ["Economics HL", "Economics", "ib_hl", "6"],
      ["Mathematics: Analysis and Approaches HL", "Mathematics", "ib_hl", "6"],
      ["English A: Language and Literature HL", "English", "ib_hl", "6"],
      ["Physics SL", "Physics", "ib_sl", "6"],
      ["Turkish A: Literature SL", "Turkish", "ib_sl", "7"],
      ["French ab initio SL", "French", "ib_sl", "5"],
    ].map(([course_name, subject, level, grade_value]) => ({
      user_id: userId,
      education_record_id: education?.id ?? null,
      course_name,
      subject,
      level,
      academic_year: "2025-2026",
      grade_value,
      grade_scale: "IB 1-7",
    }))
  );

  await insert(admin, "test_scores", [
    { user_id: userId, test_name: "SAT", score: "1470", max_score: "1600", test_date: "2026-05-02", subscores: { math: 780, reading_writing: 690 } },
    { user_id: userId, test_name: "IELTS Academic", score: "7.5", max_score: "9.0", test_date: "2026-03-14", subscores: { listening: 8.0, reading: 8.0, writing: 6.5, speaking: 7.5 } },
    { user_id: userId, test_name: "IB Predicted", score: "38", max_score: "45", test_date: "2026-06-19", subscores: {} },
  ]);

  console.log("\nWriting experience...");
  const projects = await insert(admin, "projects", [
    {
      user_id: userId,
      title: "Kampus Exchange — student resale marketplace",
      organization: "Robert College",
      role: "Founder and lead developer",
      description:
        "A web marketplace where students at three Istanbul high schools resell textbooks, calculators and lab kits to each other instead of rebuying them. I built it, run it, and handle disputes between buyers and sellers myself.",
      start_date: "2025-02-10",
      ongoing: true,
      hours_per_week: 6.0,
      outcome_summary:
        "Around 400 completed orders across three schools since launch. Takes no commission and covers hosting from a small annual school-council grant.",
      users_reached: 620,
      live_url: "https://example.invalid/kampus-exchange",
    },
    {
      user_id: userId,
      title: "Textbook price tracker",
      description:
        "A small scraper and dashboard that tracked list prices for the fifteen most-assigned textbooks at my school across four retailers, to work out whether the resale marketplace was actually saving anyone money.",
      start_date: "2025-09-01",
      end_date: "2025-12-15",
      ongoing: false,
      hours_per_week: 3.0,
      outcome_summary: "Found a median 41% gap between new and resale prices, which became the argument for expanding to two more schools.",
    },
  ]);

  const activities = await insert(admin, "activities", [
    {
      user_id: userId,
      title: "President, Economics Society",
      organization: "Robert College",
      category: "club",
      description:
        "Run a weekly seminar where members present one paper or dataset to the group. Rebuilt the format from guest-speaker-driven to member-presentation-driven, which is why attendance stopped depending on whether a speaker showed up.",
      is_leadership_role: true,
      people_led: 24,
      organization_scope: "School",
      start_date: "2025-09-08",
      ongoing: true,
      hours_per_week: 4.0,
      weeks_per_year: 32.0,
      location: "Istanbul, Turkey",
    },
    {
      user_id: userId,
      title: "Delegate, Model United Nations",
      organization: "Robert College MUN",
      category: "club",
      description: "ECOFIN committee delegate across four conferences, including two international ones in The Hague and Vienna.",
      is_leadership_role: false,
      start_date: "2023-10-02",
      ongoing: true,
      hours_per_week: 2.5,
      weeks_per_year: 26.0,
      location: "Istanbul, Turkey",
    },
    {
      user_id: userId,
      title: "Peer tutor, mathematics",
      organization: "Robert College Learning Centre",
      category: "community_org",
      description: "Two hours a week tutoring Year 9 and 10 students in algebra and functions.",
      is_leadership_role: false,
      start_date: "2024-09-16",
      ongoing: true,
      hours_per_week: 2.0,
      weeks_per_year: 30.0,
    },
  ]);

  const awards = await insert(admin, "awards", [
    {
      user_id: userId,
      title: "Second place, National High School Entrepreneurship Challenge",
      organization: "TOBB / Junior Achievement Turkiye",
      level: "National",
      description: "Pitched Kampus Exchange against 60 shortlisted teams. Judged on traction and unit economics rather than the pitch alone.",
      award_date: "2026-04-18",
      location: "Ankara, Turkey",
    },
    {
      user_id: userId,
      title: "Best Delegate, ECOFIN",
      organization: "The Hague International Model United Nations",
      level: "International",
      award_date: "2026-01-24",
      location: "The Hague, Netherlands",
    },
    {
      user_id: userId,
      title: "School prize for Economics",
      organization: "Robert College",
      level: "School",
      award_date: "2025-06-12",
    },
  ]);

  await insert(admin, "research_experiences", [
    {
      user_id: userId,
      title: "Does resale access change what students spend on course materials?",
      organization: "Robert College — IB Extended Essay",
      mentor_name: "Dr. Elif Kaya (supervising teacher)",
      field: "Economics",
      description:
        "Extended Essay in progress, using order data from Kampus Exchange plus a survey of 180 students to ask whether access to a resale market changes total spend or just shifts it.",
      methodology: "Descriptive statistics on order records, plus a paired before/after survey. No causal identification strategy — this is a first attempt and I know its limits.",
      independence_level: "Independent with a supervising teacher",
      output_type: "none",
      start_date: "2026-03-02",
      ongoing: true,
      hours_per_week: 3.0,
    },
  ]);

  await insert(admin, "work_experiences", [
    {
      user_id: userId,
      title: "Summer intern, operations",
      organization: "Getir",
      employment_type: "internship",
      description: "Six weeks shadowing the warehouse operations team, mostly cleaning up and charting picking-time data.",
      start_date: "2025-06-30",
      end_date: "2025-08-08",
      ongoing: false,
      hours_per_week: 20.0,
      paid: true,
      location: "Istanbul, Turkey",
    },
  ]);

  await insert(admin, "volunteering_experiences", [
    {
      user_id: userId,
      title: "Weekend numeracy volunteer",
      organization: "Toplum Gonulluleri Vakfi",
      description: "Saturday-morning numeracy sessions for primary school students in Esenler.",
      cause_area: "Education",
      start_date: "2024-10-05",
      ongoing: true,
      hours_per_week: 3.0,
      weeks_per_year: 28.0,
      location: "Istanbul, Turkey",
    },
  ]);

  await insert(admin, "certifications", [
    {
      user_id: userId,
      title: "CS50x: Introduction to Computer Science",
      organization: "HarvardX",
      issue_date: "2025-01-20",
      credential_url: "https://example.invalid/cs50x-certificate",
    },
  ]);

  await insert(admin, "sports_experiences", [
    {
      user_id: userId,
      sport: "Rowing",
      team_name: "Robert College Rowing",
      position: "Bow",
      level: "school",
      is_captain: false,
      start_date: "2023-09-11",
      ongoing: true,
      hours_per_week: 6.0,
      weeks_per_year: 30.0,
      location: "Istanbul, Turkey",
    },
  ]);

  console.log("\nWriting skills, languages, interests, goals...");
  await insert(
    admin,
    "skills",
    [
      ["Python", "technical", "Intermediate"],
      ["SQL", "technical", "Intermediate"],
      ["Excel / Google Sheets", "analytical", "Advanced"],
      ["Data visualisation", "analytical", "Intermediate"],
      ["Public speaking", "communication", "Advanced"],
      ["Event organisation", "leadership", "Advanced"],
      ["Academic writing", "communication", "Intermediate"],
    ].map(([name, category, proficiency]) => ({ user_id: userId, name, category, proficiency }))
  );

  await insert(
    admin,
    "languages",
    [
      ["Turkish", "Native"],
      ["English", "Fluent"],
      ["French", "Beginner"],
    ].map(([name, proficiency]) => ({ user_id: userId, name, proficiency }))
  );

  await insert(
    admin,
    "student_interests",
    [
      ["Economics", false],
      ["Entrepreneurship", false],
      ["Mathematics", false],
      ["Computer Science", false],
      ["Behavioural economics", true],
    ].map(([label, is_custom]) => ({ user_id: userId, label, is_custom }))
  );

  await insert(admin, "career_goals", [
    { user_id: userId, title: "Study Economics at a strong UK or European university", category: "university", target_date: "2028-01-15", priority: 1, status: "active" },
    { user_id: userId, title: "Finish the Extended Essay with real survey data behind it", category: "research", target_date: "2026-11-30", priority: 1, status: "active" },
    { user_id: userId, title: "Get Kampus Exchange to 1000 completed orders", category: "project", target_date: "2027-06-30", priority: 2, status: "active" },
    { user_id: userId, title: "Raise SAT reading and writing above 720", category: "testing", target_date: "2026-12-05", priority: 2, status: "active" },
  ]);

  console.log("\nWriting contact info and featured items...");
  const { error: contactError } = await admin.from("contact_info").upsert(
    {
      user_id: userId,
      email: TEST_EMAIL,
      email_visibility: "connections",
      github_url: "https://example.invalid/github/ada",
      github_visibility: "public",
      website_url: "https://example.invalid/ada",
      website_visibility: "public",
      linkedin_url: "https://example.invalid/linkedin/ada",
      linkedin_visibility: "public",
    },
    { onConflict: "user_id" }
  );
  if (contactError) throw new Error(`contact_info: ${contactError.message}`);
  console.log("  contact_info: upserted");

  const featured: Record<string, unknown>[] = [];
  if (projects[0]) featured.push({ user_id: userId, item_type: "project", item_id: projects[0].id, display_order: 0 });
  if (awards[0]) featured.push({ user_id: userId, item_type: "award", item_id: awards[0].id, display_order: 1 });
  if (activities[0]) featured.push({ user_id: userId, item_type: "activity", item_id: activities[0].id, display_order: 2 });
  await insert(admin, "featured_items", featured);

  console.log("\nWriting target universities...");
  await seedTargetUniversities(admin, userId);

  console.log("\nDone. Log in as test@oryn.dev and open /dashboard -- the scoring engine");
  console.log("computes the career profile from these facts on load, so the scores you see");
  console.log("are the real ones, not values written by this script.");
}

/**
 * Target universities FK into the global `universities` catalogue, which is populated by the
 * separate acquisition scripts and may be partly empty in any given environment. Look each
 * one up by name and skip the misses with a note rather than failing the whole seed — a
 * missing university row is an environment fact, not a bug in this script.
 */
async function seedTargetUniversities(admin: SupabaseClient, userId: string) {
  const wanted: { name: string; status: string; notes: string }[] = [
    { name: "London School of Economics and Political Science", status: "target", notes: "First choice. BSc Economics — needs A*AA equivalent, so the IB predicted has to hold." },
    { name: "Bocconi University", status: "target", notes: "International Economics and Management. Early rounds close well before the UK deadlines." },
    { name: "Erasmus University Rotterdam", status: "exploring", notes: "Likelier admit, and the econometrics teaching is meant to be strong." },
    { name: "University of Warwick", status: "exploring", notes: "Backup for the LSE application." },
  ];

  await admin.from("target_universities").delete().eq("user_id", userId);

  const rows: Record<string, unknown>[] = [];
  const missing: string[] = [];
  for (const w of wanted) {
    const { data } = await admin.from("universities").select("id").ilike("name", w.name).limit(1).maybeSingle();
    if (data?.id) rows.push({ user_id: userId, university_id: data.id, status: w.status, notes: w.notes });
    else missing.push(w.name);
  }

  await insert(admin, "target_universities", rows);
  if (missing.length > 0) {
    console.log(`  skipped (not in this environment's universities table): ${missing.join(", ")}`);
  }
}

main().catch((error) => {
  console.error("Failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
