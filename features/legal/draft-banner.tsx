import { legalCopy, LEGAL_REVIEW_STATUS } from "@/lib/legal/content";

/**
 * The standing "this is not approved" notice at the top of every legal document.
 *
 * Renders nothing once `LEGAL_REVIEW_STATUS.approved` flips — one constant governs all
 * three pages, so approval cannot be applied to one document and forgotten on another.
 * Not dismissible: a banner a reader can close is a banner that stops being true.
 */
export function DraftBanner() {
  if (LEGAL_REVIEW_STATUS.approved) return null;

  const { label, body } = legalCopy.draftBanner;

  return (
    <aside
      role="note"
      aria-label={label}
      className="rounded-xl border border-amber-500/40 bg-amber-50 p-4 sm:p-5"
    >
      <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
        <span
          aria-hidden="true"
          className="inline-block size-2 shrink-0 rounded-full bg-amber-500"
        />
        {label}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-amber-900/85">{body}</p>
    </aside>
  );
}
