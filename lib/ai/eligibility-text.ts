import type { EligibilityResult } from "@/lib/counselor/types";

/**
 * The single place ORYN renders a Counselor Core eligibility verdict into prompt text.
 *
 * Every AI surface that grounds itself in real opportunities has to answer the same
 * question — "may this student actually apply?" — and has to answer it the same way, or the
 * product contradicts itself across surfaces. That already happened once: an opportunity
 * carrying "country eligibility hasn't been verified" on the advisor's context was handed to
 * the weekly-plan prompt with no eligibility field at all, so the same program read as
 * "verified and eligible" there. Extracted from lib/ai/opportunity-context.ts (where the
 * correct rendering was first written) rather than copied into a second caller.
 *
 * The rendering contract:
 *  - `known_eligible` returns null and renders nothing. This is the "no news is good news"
 *    default that lib/ai/student-context.ts already uses for its evidence tags — a caveat on
 *    every single line would train the model to ignore caveats.
 *  - `unknown` is never silence. An empty `eligible_countries` means "we haven't checked",
 *    not "open to everyone" — that distinction is made upstream in
 *    lib/counselor/eligibility.ts and must survive into the prompt, so an absent note still
 *    produces an explicit sentence rather than nothing.
 *  - `known_ineligible` is defense in depth. lib/counselor/scoring.ts filters these out
 *    before any caller sees them; this branch exists so that if that upstream contract ever
 *    changes, the failure mode is a labelled line, not a silently-recommended program the
 *    student cannot enter.
 *
 * Pure and provider-agnostic — no "server-only" tag, because it touches no secret, no
 * network, and no database, and tagging it would only make it harder to test.
 */
export function formatEligibilityCaveat(eligibility: EligibilityResult): string | null {
  if (eligibility.verdict === "known_ineligible") {
    return `NOT ELIGIBLE: ${eligibility.notes.join(" ")}`;
  }
  if (eligibility.verdict === "unknown") {
    return `ELIGIBILITY UNKNOWN: ${eligibility.notes.join(" ") || "not enough information on file to check."}`;
  }
  return null;
}
