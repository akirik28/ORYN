import type { EvidenceStatus } from "@/types/database";

/**
 * The Journey timeline (UI-V3 § 16) — every recorded experience on one spine, anchored by
 * year.
 *
 * The product stores achievements in ten separate tables because they carry different
 * facts. A student doesn't experience their life in ten tables, so this normalizes them
 * into one comparable shape without flattening what makes them different: `weight`
 * survives the merge and is what lets a two-year leadership role render as a story while
 * an AP course renders as a one-line row.
 */
export type JourneyWeight = "story" | "experience" | "achievement" | "compact";

export type JourneyKind =
  | "leadership"
  | "activity"
  | "research"
  | "project"
  | "work"
  | "volunteering"
  | "sport"
  | "award"
  | "certification"
  | "course"
  | "test_score"
  | "education";

export interface JourneyEntry {
  id: string;
  kind: JourneyKind;
  weight: JourneyWeight;
  title: string;
  organization: string | null;
  description: string | null;
  /** ISO date used for ordering. Null when the record carries no date at all. */
  sortDate: string | null;
  /** What the student sees — a range for spans, a single date for moments. */
  dateLabel: string | null;
  ongoing: boolean;
  evidenceStatus: EvidenceStatus | null;
}

/**
 * Weight is assigned by what a record *is*, not by which table it came from — which is why
 * `leadership` and `activity` are separate kinds over one table. An activity flagged
 * `is_leadership_role` is the kind of thing a student would describe in a paragraph; the
 * school newspaper they contributed to twice is not, and rendering both as story modules
 * would make the page a wall and tell the student nothing about what carries weight.
 */
const WEIGHT_BY_KIND: Record<JourneyKind, JourneyWeight> = {
  leadership: "story",
  research: "story",
  project: "story",
  work: "experience",
  volunteering: "experience",
  activity: "experience",
  sport: "experience",
  education: "experience",
  award: "achievement",
  certification: "compact",
  course: "compact",
  test_score: "compact",
};

export function weightFor(kind: JourneyKind): JourneyWeight {
  return WEIGHT_BY_KIND[kind];
}

/** The year a record belongs to. Undated records group under `null`, never under today. */
export function yearOf(entry: JourneyEntry): number | null {
  if (!entry.sortDate) return null;
  const year = new Date(entry.sortDate).getFullYear();
  return Number.isFinite(year) ? year : null;
}

function formatMonthYear(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/**
 * A span's label. `ongoing` wins over `end`: a record can carry a stale end_date and still
 * be flagged ongoing, and telling a student their current role ended is worse than being
 * vague. An academic-year string ("2025–2026") is passed through untouched — it's already
 * the form the student entered and reformatting it invents precision.
 */
export function spanLabel({
  start,
  end,
  ongoing,
}: {
  start: string | null;
  end: string | null;
  ongoing: boolean;
}): string | null {
  const from = start ? formatMonthYear(start) : null;
  if (ongoing) return from ? `${from} — now` : "Ongoing";
  const to = end ? formatMonthYear(end) : null;
  if (from && to) return from === to ? from : `${from} — ${to}`;
  return from ?? to;
}

export interface JourneyYearGroup {
  /** Null for records with no date — rendered last, under its own heading. */
  year: number | null;
  entries: JourneyEntry[];
}

/**
 * Newest first, undated last.
 *
 * Within a year, heavier records come first rather than strict reverse-chronology. The
 * page is a narrative, not a log: leading a year with "AP Microeconomics, Sep 2025" when
 * the student also founded something that year buries the thing that actually matters.
 * Ties fall back to date, then title, so ordering is stable across renders.
 */
export function groupJourneyByYear(entries: JourneyEntry[]): JourneyYearGroup[] {
  const order: Record<JourneyWeight, number> = { story: 0, experience: 1, achievement: 2, compact: 3 };
  const byYear = new Map<number | null, JourneyEntry[]>();

  for (const entry of entries) {
    const year = yearOf(entry);
    const list = byYear.get(year) ?? [];
    list.push(entry);
    byYear.set(year, list);
  }

  for (const list of byYear.values()) {
    list.sort(
      (a, b) =>
        order[a.weight] - order[b.weight] ||
        (b.sortDate ?? "").localeCompare(a.sortDate ?? "") ||
        a.title.localeCompare(b.title),
    );
  }

  return [...byYear.entries()]
    .sort(([a], [b]) => {
      if (a === null) return 1;
      if (b === null) return -1;
      return b - a;
    })
    .map(([year, entries]) => ({ year, entries }));
}
