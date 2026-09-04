import { APIConnectionError } from "@anthropic-ai/sdk";
import { AIProviderNotConfiguredError, AIResponseIncompleteError } from "./provider";
import { aiServiceFailureMessage } from "./service-failure";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";

export interface AdvisorFailureClassification {
  status: "failed";
  errorMessage: string;
}

/**
 * Maps a caught error from generateAdvisorReply into the safe, user-facing message to
 * persist on the failed advisor_messages row (migration 0046). Centralized so the initial
 * send (app/(app)/advisor/actions.ts) and the retry action use identical wording, and so
 * the raw error (which may contain connection details, provider internals, etc. — see
 * SECURITY.md on not leaking internals) never reaches the client or the database.
 *
 * `locale` is additive, threaded from the two Server Actions above via `resolveLocale()`.
 */
export function classifyAdvisorFailure(error: unknown, locale: Locale = DEFAULT_LOCALE): AdvisorFailureClassification {
  const tr = locale === "tr";
  if (error instanceof AIProviderNotConfiguredError) {
    return {
      status: "failed",
      errorMessage: tr
        ? "Yapay zeka danışmanı henüz yapılandırılmadı. Bir Anthropic API anahtarı eklemek için API_SETUP.md dosyasına bakın."
        : "The AI Advisor isn't configured yet. See API_SETUP.md to add an Anthropic API key.",
    };
  }
  if (error instanceof AIResponseIncompleteError) {
    // The advisor ran out of room to answer rather than actually erroring. Retrying is
    // genuinely worth it (reasoning length varies turn to turn), and narrowing the question
    // is the reliable fix — so say both, instead of the generic "something went wrong",
    // which told the student nothing and made a known failure look like an unknown one.
    // No stop_reason, token counts, or provider names: this string is persisted on the
    // advisor_messages row and shown to the student.
    return {
      status: "failed",
      errorMessage: tr
        ? "Danışman yanıtı bitirmeden önce yer sıkıntısı yaşadı. Tekrar dene, ya da daha odaklı bir soru sor."
        : "The advisor ran out of room before it finished answering. Try again, or ask a more focused question.",
    };
  }
  if (error instanceof APIConnectionError) {
    // Covers both a plain dropped connection and its own subclass, APIConnectionTimeoutError
    // — the streaming call's 120s timeout (lib/ai/anthropic-provider.ts's own
    // ADVISOR_STREAM_TIMEOUT_MS comment has the full reasoning) throws exactly this. Neither
    // "the request was the problem" (AIResponseIncompleteError's honest framing above) nor "we
    // know the service is struggling" (the status-based branch below, which a client-side
    // timeout was never given a status code to match) is true here — the honest middle
    // ground is naming the actual shape of what happened (took too long) without guessing
    // whose fault it was.
    return {
      status: "failed",
      errorMessage: tr
        ? "Bu yanıt beklenenden uzun sürdü. Tekrar dene."
        : "That reply took longer than expected. Try again.",
    };
  }
  /**
   * Everything above is a fault in the request; what follows is a fault in the service, and
   * telling a student "please try again" for one of those sends them into a loop that cannot
   * succeed. Shared with the weekly-plan action via lib/ai/service-failure.ts — see that
   * module for why it classifies on status rather than on the provider's message text.
   */
  const serviceMessage = aiServiceFailureMessage(error, undefined, locale);
  if (serviceMessage) return { status: "failed", errorMessage: serviceMessage };

  return { status: "failed", errorMessage: tr ? "Bir şeyler ters gitti. Lütfen tekrar dene." : "Something went wrong. Please try again." };
}
