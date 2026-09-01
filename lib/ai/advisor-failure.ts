import { AIProviderNotConfiguredError, AIResponseIncompleteError } from "./provider";

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
   * Everything above is a fault in the request. What follows is a fault in the service, and
   * telling a student "please try again" for one of those sends them into a loop that cannot
   * succeed — which is not hypothetical here: the Anthropic balance is small, auto-reload is
   * off, and a billing failure has already surfaced once in this product (a batch extraction
   * that reported a clean run mid-outage).
   *
   * The Anthropic SDK throws errors carrying an HTTP `status`. Duck-typed rather than
   * imported so this module stays a plain unit-testable function with no SDK in its graph,
   * and so a different provider behind the AIProvider interface classifies the same way if
   * it reports status the same way.
   *
   * Deliberately NOT matched on the error's message text. A credit-exhausted 400 says so in
   * prose today, but that prose is the provider's to change without notice, and a guess that
   * silently stops matching would put us back to the generic message while looking fixed.
   * Status alone separates the two things a student actually needs told apart: come back in
   * a few minutes, versus nothing you do will help right now.
   */
  const status = typeof error === "object" && error !== null && "status" in error ? (error as { status: unknown }).status : undefined;
  if (typeof status === "number") {
    if (status === 429 || status >= 500) {
      return { status: "failed", errorMessage: "The counselor is busy right now. Try again in a few minutes." };
    }
    if (status === 401 || status === 403 || status === 400) {
      // Account/configuration, not the student's question. No retry prompt: retrying is
      // exactly what will not work, and no provider name or reason — this string is
      // persisted on the row and shown to the student.
      return { status: "failed", errorMessage: "The counselor is temporarily unavailable. This isn't something you did — it needs attention on our side." };
    }
  }

  return { status: "failed", errorMessage: "Something went wrong. Please try again." };
}
