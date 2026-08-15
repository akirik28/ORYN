import { NextResponse } from "next/server";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { assertWithinRateLimit, RateLimitExceededError } from "@/lib/security/rate-limit";

/** Full data export (Phase 12 minor-safe requirement) — every table the student's own
 * data lives in, RLS-scoped via the normal request client (never the admin client).
 * `profiles` is keyed by `id` (it mirrors auth.users 1:1); every other table has its own
 * `user_id` column — handled separately below so each `.eq()` call stays correctly typed. */
const EXPORT_TABLES = [
  "education_records",
  "courses",
  "test_scores",
  "activities",
  "awards",
  "certifications",
  "projects",
  "research_experiences",
  "volunteering_experiences",
  "work_experiences",
  "skills",
  "languages",
  "evidence_files",
  "student_interests",
  "career_goals",
  "target_universities",
  "applications",
  "application_requirements",
  "saved_opportunities",
  "profile_scores",
  "profile_score_snapshots",
  "weekly_plans",
  "weekly_actions",
  "advisor_conversations",
  "advisor_messages",
] as const;

export async function GET() {
  const session = await requireUser();

  try {
    await assertWithinRateLimit(session.userId!, "export_data", { maxCalls: 5, windowMinutes: 60 });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    throw error;
  }

  const supabase = await createClient();

  const [profileResult, ...tableResults] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", session.userId!),
    ...EXPORT_TABLES.map((table) => supabase.from(table).select("*").eq("user_id", session.userId!)),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    userId: session.userId,
    data: {
      profiles: profileResult.data ?? [],
      ...Object.fromEntries(EXPORT_TABLES.map((table, i) => [table, tableResults[i]?.data ?? []])),
    },
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="oryn-export-${session.userId}.json"`,
    },
  });
}
