/**
 * docs/veli-hesabi-spec-2026-09-04.md's data model (§5) -- these mirror the planned
 * `account_role`/`parent_links` shape 44's P1 migration will add, kept here rather than in
 * types/database.ts (hand-authored, not this lane's file to edit) until that migration lands
 * and the real generated types replace these. Column names match the spec exactly so wiring
 * this up later is a type swap, not a rewrite.
 */
export type AccountRole = "student" | "parent";
export type ParentLinkStatus = "pending" | "active" | "revoked";

export interface ParentLink {
  id: string;
  parent_user_id: string;
  student_user_id: string;
  status: ParentLinkStatus;
  invited_email: string | null;
  invited_at: string | null;
  confirmed_at: string | null;
}
