import { AIProviderNotConfiguredError, AIResponseIncompleteError } from "./provider";
import { aiServiceFailureMessage } from "./service-failure";

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
 */
export function classifyAdvisorFailure(error: unknown): AdvisorFailureClassification {
  if (error instanceof AIProviderNotConfiguredError) {
    return { status: "failed", errorMessage: "The AI Advisor isn't configured yet. See API_SETUP.md to add an Anthropic API key." };
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
      errorMessage: "The advisor ran out of room before it finished answering. Try again, or ask a more focused question.",
    };
  }
  /**
   * Everything above is a fault in the request; what follows is a fault in the service, and
   * telling a student "please try again" for one of those sends them into a loop that cannot
   * succeed. Shared with the weekly-plan action via lib/ai/service-failure.ts — see that
   * module for why it classifies on status rather than on the provider's message text.
   */
  const serviceMessage = aiServiceFailureMessage(error);
  if (serviceMessage) return { status: "failed", errorMessage: serviceMessage };

  return { status: "failed", errorMessage: "Something went wrong. Please try again." };
}
