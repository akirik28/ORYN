/**
 * Pure fallback logic for the admin moderation queue's reported-content preview
 * (app/(app)/admin/page.tsx) — shared by both the message_id and recommendation_id
 * branches, which used to duplicate the same `?? "(...) no longer available"` inline.
 * A report whose referenced row has since been deleted (message deleted, or a
 * recommendation removed by its author/hidden then removed) must resolve to a friendly
 * placeholder, never throw or render "undefined" — recommendation_id's own FK
 * (`references public.recommendations(id) on delete set null`, migration 0035) already
 * guarantees the report row survives deletion of what it references; this is what makes
 * that safe deletion actually render safely too.
 */
export function resolveReportedContentPreview(referencedId: string | null, contentById: Map<string, string>, missingLabel: string): string | null {
  if (!referencedId) return null;
  return contentById.get(referencedId) ?? missingLabel;
}
