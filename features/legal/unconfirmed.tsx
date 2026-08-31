import type { Locale } from "@/lib/i18n/config";
import { getLegalCopy, type Unresolved } from "@/lib/legal/content";

/**
 * A fact that has not been settled yet, rendered so it can never be misread as one that
 * has. The company's registered name, its address, and the contact email genuinely do not
 * exist yet; writing a plausible-looking value into a privacy notice would be inventing a
 * legal fact, which is the one thing these documents must not do.
 *
 * Deliberately loud: dashed border, amber ground, bracketed label. A reader skimming the
 * page should trip over it. `role="mark"` is not a thing, so the visual treatment carries
 * the meaning for sighted readers and the `title`/screen-reader text carries it otherwise.
 *
 * `locale` resolves `value.labelKey` and the "not yet supplied" framing through
 * `getLegalCopy` — the label is reader-facing text, so it translates like everything else
 * rather than being stuck in English on a Turkish page.
 */
export function Unconfirmed({ value, locale }: { value: Unresolved; locale: Locale }) {
  const t = getLegalCopy(locale).common;
  const label = t[value.labelKey];
  const pending = value.owner === "founder" ? t.unresolvedPendingFounder : t.unresolvedPendingCounsel;

  return (
    <span
      className="mx-0.5 inline-flex items-baseline gap-1 rounded-[5px] border border-dashed border-amber-500/60 bg-amber-500/10 px-1.5 py-0.5 align-baseline text-[0.85em] font-medium text-amber-900"
      title={`${t.unresolvedNotSupplied} — ${pending}`}
    >
      <span aria-hidden="true">[</span>
      {label}
      <span className="sr-only"> — {t.unresolvedNotSupplied}, {pending}</span>
      <span aria-hidden="true">]</span>
    </span>
  );
}
