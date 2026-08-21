import "server-only";

import { createClient } from "@/lib/supabase/server";
import { assembleRequirementFacts } from "./facts";
import { evaluateRequirement } from "./evaluate";
import { INFORMATIONAL_CATEGORIES } from "./types";

/**
 * Recomputes and caches this student's evaluation for every requirement attached to a
 * university (optionally narrowed to one program plus that university's program-agnostic
 * requirements). Cheap and deterministic (no AI/network call) — same "recompute on every
 * view" convention as lib/admissions/persist.ts's refreshAdmissionOutlook. Uses the
 * request-scoped client throughout: reading university_requirements relies on its
 * "authenticated read" RLS policy, and writing student_requirement_evaluations relies on
 * the caller's own owner-only policy — no admin client needed for either.
 */
export async function refreshRequirementEvaluations(universityId: string, userId: string, programId?: string | null): Promise<void> {
  const supabase = await createClient();

  const { data: requirements } = await supabase.from("university_requirements").select("*").eq("university_id", universityId);
  if (!requirements || requirements.length === 0) return;

  const applicable = requirements.filter((r) => r.program_id === null || r.program_id === programId);
  const evaluable = applicable.filter((r) => !INFORMATIONAL_CATEGORIES.includes(r.requirement_type));
  if (evaluable.length === 0) return;

  const facts = await assembleRequirementFacts(supabase, userId);
  const now = new Date().toISOString();

  const rows = evaluable.map((requirement) => {
    // The row itself is the qualifier source: RequirementQualifiersSchema reads migration
    // 0056's columns off it by name and strips the rest, so this is correct both before that
    // migration is applied (every qualifier absent, behaviour unchanged) and after.
    const result = evaluateRequirement(requirement.requirement_type, requirement.structured_rule, facts, requirement);
    return {
      user_id: userId,
      requirement_id: requirement.id,
      status: result.status,
      reasoning: result.reasoning,
      evaluated_at: now,
    };
  });

  await supabase.from("student_requirement_evaluations").upsert(rows, { onConflict: "user_id,requirement_id" });
}
