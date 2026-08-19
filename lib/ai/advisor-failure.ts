import { AIProviderNotConfiguredError } from "./provider";

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
  return { status: "failed", errorMessage: "Something went wrong. Please try again." };
}
