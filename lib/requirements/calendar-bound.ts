import "server-only";

import { nextAnnualWindowStart, type AnnualCalendarWindow } from "@/lib/acquisition/verification";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import type { UniversityRequirement } from "@/types/database";

const MONTH_NAMES_TR = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

/**
 * The shape the calendar-bound fact display path is built around, and the actual
 * enforcement of "structurally incapable of a Met/Not-met verdict" the CEO asked for:
 * this interface carries no `RequirementEvaluationStatus`, no `evaluationReasoning`, no
 * `structured_rule` — nothing evaluateRequirement() produces or `RequirementEvaluation
 * Badge` renders. A component typed to accept only `CalendarBoundFactDisplay` cannot be
 * handed a Met/Not-met verdict by accident, because the type it accepts has nowhere to
 * put one — not "this component chooses not to render a badge today", which a later
 * edit could quietly undo.
 */
export interface CalendarBoundFactDisplay {
  id: string;
  /** Verbatim from the row — the actual sourced fact, e.g. "2025 CAO Round 1 points for
   * DN400 Medicine: 738". Never re-derived or reformatted: every real figure in this
   * corpus already states its own cycle year and programme, and parsing a number back out
   * of free text risks exactly the "confident but wrong" failure this whole feature
   * exists to avoid. */
  factText: string;
  sourceUrl: string | null;
  /** When ORYN retrieved this fact, for the existing SourceBadge "Checked N ago" framing. */
  retrievedAt: string | null;
  /** Human-readable next-check framing — see buildNextCheckLabel's own comment for why
   * this is a sentence, not a bare date: "due" and "not yet due" need different wording,
   * and getting that distinction wrong reads as either false urgency or false reassurance. */
  nextCheckLabel: string;
}

/**
 * "the next figure is expected around X" vs "a next figure was expected around X — it
 * may already be published; ORYN hasn't re-checked yet" are different claims, and
 * conflating them is a real error, not a wording nicety: this SAME function, called on
 * the SAME row, says one or the other depending only on whether `now` has crossed the
 * window's own start date — get the comparison direction wrong and every calendar-bound
 * fact reads as "coming soon" forever, including the ones already a year overdue.
 */
export function buildNextCheckLabel(window: AnnualCalendarWindow, retrievedAt: string | null, now: Date = new Date(), locale: Locale = DEFAULT_LOCALE): string {
  const monthName =
    locale === "tr"
      ? MONTH_NAMES_TR[window.month - 1]
      : new Date(Date.UTC(2000, window.month - 1, 1)).toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
  if (!retrievedAt) {
    return locale === "tr"
      ? `Her yıl ${monthName} civarında daha güncel bir rakam yayınlanmış olabilir — henüz yeniden kontrol edilmedi.`
      : `A fresher figure may already be available around ${monthName} each year — not yet re-checked.`;
  }
  const retrieved = new Date(Date.parse(retrievedAt));
  const nextWindow = nextAnnualWindowStart(window, retrieved);
  if (now.getTime() < nextWindow.getTime()) {
    return locale === "tr"
      ? `Bir sonraki rakamın ${monthName} ${nextWindow.getUTCFullYear()} civarında açıklanması bekleniyor.`
      : `The next figure is expected around ${monthName} ${nextWindow.getUTCFullYear()}.`;
  }
  return locale === "tr"
    ? `Yeni rakamın ${monthName} ${nextWindow.getUTCFullYear()} civarında açıklanması bekleniyordu — henüz yeniden kontrol edilmedi, o yüzden yayınlanmış olabilir.`
    : `A fresher figure was expected around ${monthName} ${nextWindow.getUTCFullYear()} — not yet re-checked, so it may already be published.`;
}

/** Builds the display shape from a raw row. `window` is a parameter, not hardcoded to
 * CAO_POINTS_IE, so a second calendar-bound fact class can reuse this without a second
 * copy of the shaping logic — only `CAO_POINTS_IE` exists as a concrete instance today. */
export function toCalendarBoundFactDisplay(
  row: Pick<UniversityRequirement, "id" | "title" | "requirement_detail" | "source_url" | "retrieved_at">,
  window: AnnualCalendarWindow,
  now: Date = new Date(),
  locale: Locale = DEFAULT_LOCALE
): CalendarBoundFactDisplay {
  return {
    id: row.id,
    // requirement_detail and title are the same text in this corpus (title is the same
    // string truncated to 200 chars at ingestion) — showing both would just repeat the
    // fact twice, so requirement_detail (the untruncated one) alone is the content.
    factText: row.requirement_detail?.trim() || row.title?.trim() || "",
    sourceUrl: row.source_url,
    retrievedAt: row.retrieved_at,
    nextCheckLabel: buildNextCheckLabel(window, row.retrieved_at, now, locale),
  };
}
