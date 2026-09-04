import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { AdmissionRateBasis } from "@/types/database";

/**
 * B7 (CEO, 2026-09-04): the advisor's context never included institution admission-rate
 * data at all — [[project_oryn_advisor_context_freshness_audit]] found this as a real,
 * pre-existing gap, not a today-only regression. CEO's decision: wire it in, scoped to the
 * student's own target universities (bounded, small — 133 university_statistics rows total
 * live, and a student's own target list is a handful, never the whole catalog), with three
 * rules that shape this file directly:
 *
 * 1. Non-negotiable #11 (career profile score ≠ admission probability) extends here: an
 *    institution-wide rate is never this student's personal probability, and that has to be
 *    said in the context text itself, not left to the model to infer — see the explicit
 *    caveat in `formatAdmissionRateLine`'s `published` branch and the section-level
 *    reminder in `formatUniversityAdmissionContext`.
 * 2. No number without its basis, and each of the four bases gets a genuinely different
 *    sentence, not a shared template with one word swapped: `published` states the real
 *    rate with its source; `not_published` and `no_single_rate` are real, informative
 *    negatives (an institution not publishing a rate is a fact worth saying, not silence);
 *    `not_researched` produces nothing at all — "we don't know" is not a sentence, it's the
 *    absence of one.
 * 3. No fabricated precision: `admission_rate` is rendered at exactly the precision it's
 *    stored at (one decimal — matching how these figures are actually published, e.g.
 *    Oxford's real 14.2%), never rounded further or presented as a range/estimate the way
 *    the student-facing outlook page's own experimental range is. If there's no real number,
 *    no number is generated to fill the gap.
 *
 * Same resilience contract as lib/ai/opportunity-context.ts's buildOpportunityContextText:
 * additive only, a failure here must never block a reply, so it's swallowed and logged, not
 * thrown. Deliberately its own small query rather than extending
 * lib/ai/student-context.ts's buildStudentAdvisorContext (which already resolves the same
 * target university ids) — same reasoning as opportunity-context.ts choosing its own query
 * over reusing student-context.ts's target list: an independent, single-purpose module is
 * easier to keep additive-safe than a growing shared context builder.
 */

export interface TargetUniversityAdmissionFact {
  name: string;
  admissionRate: number | null;
  admissionRateBasis: AdmissionRateBasis | null;
  source: string | null;
}

/**
 * Pure formatting half, exported separately so it's testable without touching the network —
 * same split as opportunity-context.ts's formatOpportunityContext/buildOpportunityContextText.
 *
 * `not_researched` and a missing/unrecognized basis both fall through to `null` (no line at
 * all) — "we haven't checked" and "we don't have a basis on file for some other reason" are
 * the same honest non-statement, not two different sentences to invent.
 */
export function formatAdmissionRateLine(fact: TargetUniversityAdmissionFact): string | null {
  switch (fact.admissionRateBasis) {
    case "published":
      // Defensive, not expected in practice: migration 0119's own UPDATE only ever sets
      // "published" when admission_rate is already non-null, deterministically. If that
      // invariant is ever violated, the honest move is silence, not a fabricated number.
      if (fact.admissionRate == null) return null;
      return `${fact.name}: institution-wide admission rate ${(fact.admissionRate * 100).toFixed(1)}% — published by the institution; this is NOT this student's personal admission probability${fact.source ? `. Source: ${fact.source}` : ""}.`;
    case "not_published":
      return `${fact.name}: this institution does not publish a single admission rate.`;
    case "no_single_rate":
      return `${fact.name}: admission here is decided per-program; there is no single institution-wide rate.`;
    case "not_researched":
    default:
      return null;
  }
}

/**
 * `facts` in target-list order (not sorted/ranked) — matches how the rest of the context
 * presents a student's own choices back to them, in the order the student made them.
 */
export function formatUniversityAdmissionContext(facts: TargetUniversityAdmissionFact[]): string {
  const lines = facts.map(formatAdmissionRateLine).filter((line): line is string => line !== null);
  if (lines.length === 0) return "";

  return `\n\nInstitution-wide admission-rate facts for this student's target universities (each one is exactly what the institution has published or explicitly not published — never state or imply this is any student's personal chance of admission, and never invent a rate for a university not listed here):\n${lines.map((l) => `- ${l}`).join("\n")}`;
}

export async function buildUniversityAdmissionContextText(userId: string): Promise<string> {
  try {
    const supabase = await createClient();
    const { data: targets } = await supabase.from("target_universities").select("university_id").eq("user_id", userId);
    const universityIds = [...new Set((targets ?? []).map((t) => t.university_id))];
    if (universityIds.length === 0) return "";

    const [{ data: universities }, { data: stats }] = await Promise.all([
      supabase.from("universities").select("id, name").in("id", universityIds),
      supabase.from("university_statistics").select("university_id, admission_rate, admission_rate_basis, source").in("university_id", universityIds),
    ]);

    const nameById = new Map((universities ?? []).map((u) => [u.id, u.name]));
    const statsById = new Map((stats ?? []).map((s) => [s.university_id, s]));

    const facts: TargetUniversityAdmissionFact[] = universityIds.map((id) => {
      const stat = statsById.get(id);
      return {
        name: nameById.get(id) ?? "Unknown university",
        admissionRate: stat?.admission_rate ?? null,
        admissionRateBasis: stat?.admission_rate_basis ?? null,
        source: stat?.source ?? null,
      };
    });

    return formatUniversityAdmissionContext(facts);
  } catch (error) {
    console.error("[advisor] failed to fetch university admission-rate context, continuing without it", error);
    return "";
  }
}
