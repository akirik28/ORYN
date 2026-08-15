/**
 * Never surface a raw Postgres error message to the client (Phase 45: errors must be
 * human-readable; a raw message can also leak schema internals — e.g. the exact column a
 * migration hasn't added to the live database yet). Pure mapping only, so the contract
 * ("the user never sees `error.message` verbatim") is unit-testable; callers log the real
 * error server-side themselves before showing this.
 */
export type CrudAction = "save" | "delete";

export function toFriendlyDbErrorMessage(action: CrudAction): string {
  return action === "save" ? "Couldn't save this. Please try again." : "Couldn't delete this. Please try again.";
}
