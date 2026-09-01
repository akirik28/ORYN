import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";

/**
 * The instruction that makes a model answer in the student's own language.
 *
 * Every AI surface in this product wrote English regardless of locale until 2026-09-01, so a
 * Turkish student got a Turkish interface wrapped around English counsel — the one
 * inconsistency a translated UI makes *more* visible rather than less.
 *
 * Appended to a system prompt rather than threaded into each one's wording, so a new AI
 * surface gets this by importing one function instead of by remembering the reasoning.
 *
 * Three things it deliberately says, each protecting something the product already decided:
 *
 * - **Names and quoted source text stay as they are.** Oryn's whole traceability discipline
 *   rests on a student being able to check a claim against its source; a machine-translated
 *   university name, programme title, or quoted requirement cannot be checked against
 *   anything. This is the same rule the plan states for sourced content, applied to prose the
 *   model writes about it.
 * - **Don't translate a term you would have to invent.** Turkish has settled words for most
 *   of this, and where it does not, an invented one reads as authority the product has not
 *   earned. `lib/legal/content.ts` took the same position with KVKK vocabulary.
 * - **The voice does not change with the language.** Phase 57's brief — specific, analytical,
 *   calm, no praise inflation — is a property of the counsel, not of English.
 *
 * Wired into all six AI surfaces that produce prose a student reads. The three sharing
 * `buildStudentAdvisorContext` (advisor-chat, weekly-plan, research-generator) take the
 * language from the student's stored `preferred_language`, because two of them also run from
 * cron where there is no request. The other three (essay-outlines, refine-achievement, and
 * counselor-explain when it lands) are only ever called from a Server Action, so their caller
 * passes `resolveLocale()` — which prefers the cookie, and should: the student is looking at
 * the interface in that language right now.
 *
 * WHAT THIS DOES NOT DO, and it matters: nothing here measures the *quality* of Turkish
 * output. There is no AI output-quality eval suite at all -- in EITHER language. The tests
 * around these surfaces assert what goes into the prompt and that usage is logged; none
 * assess what the model says back. So the honest statement is not "Turkish is unmeasured"
 * but "nothing is". Building the harness costs nothing; running it costs model calls, and
 * checking whether Turkish
 * counsel keeps the demanding-mentor register costs real model calls. The mechanism is
 * asserted; the register is not. See docs/i18n-coverage.md.
 */
export function outputLanguageInstruction(locale: Locale): string | null {
  if (locale === DEFAULT_LOCALE) return null;

  const languageName = locale === "tr" ? "Turkish (Türkçe)" : locale;
  return [
    `Write your entire response in ${languageName}. The student reads this interface in ${languageName}; answering in English is not an option.`,
    "Keep proper names exactly as given — universities, programmes, competitions, organisations, and any text quoted from a source. A translated name cannot be checked against the source it came from.",
    "Where a field has no settled term in the student's language, keep the original rather than inventing one.",
    "Your tone does not change with the language: specific, analytical, calm. No praise inflation.",
  ].join(" ");
}

/** Appends the instruction to a system prompt, or returns it unchanged for the default locale. */
export function withOutputLanguage(systemPrompt: string, locale: Locale): string {
  const instruction = outputLanguageInstruction(locale);
  return instruction ? `${systemPrompt}\n\n${instruction}` : systemPrompt;
}
