/**
 * Turns a caught provider error into the message a student should see when the fault is
 * ours, not theirs — or null when it isn't one of those and the caller's own wording applies.
 *
 * Exists because "please try again" is the wrong answer to a spent balance, a bad key, or a
 * provider outage: the student repeats an action that cannot succeed and learns that the
 * failure is theirs to fix by trying harder. Every AI-backed entry point had that wording as
 * its fallback.
 *
 * Classified on HTTP `status`, duck-typed rather than imported from the SDK, so this stays a
 * plain unit-testable function with no provider in its module graph and any provider behind
 * the AIProvider interface classifies identically if it reports status the same way.
 *
 * Deliberately NOT matched on the error's message text. A credit-exhausted 400 says so in
 * prose today, but that prose belongs to the provider and can change without notice; a guess
 * that silently stopped matching would leave the generic wording in place while looking
 * fixed. Status alone separates the only two things a student needs told apart: come back
 * shortly, versus nothing you do will help right now.
 *
 * These strings are persisted (advisor_messages.error_message) and rendered, so they carry
 * no provider name, model, status code, or upstream text.
 */
export function aiServiceFailureMessage(error: unknown, subject = "The counselor"): string | null {
  const status = typeof error === "object" && error !== null && "status" in error ? (error as { status: unknown }).status : undefined;
  if (typeof status !== "number") return null;

  if (status === 429 || status >= 500) {
    return `${subject} is busy right now. Try again in a few minutes.`;
  }
  // Account or configuration. No retry prompt: retrying is exactly what will not work.
  if (status === 400 || status === 401 || status === 403) {
    return `${subject} is temporarily unavailable. This isn't something you did — it needs attention on our side.`;
  }
  return null;
}
