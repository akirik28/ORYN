import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The research queue (docs/kumanda-merkezi-yapi-plani-2026-09-03.md: "araştırma uygulamanın
 * içinden AI API'si çağırmaz... bu ekran o akışı görünür kılar, otomatikleştirmez" — research
 * never calls an AI API from inside the app; this screen makes the existing hand-run flow
 * visible, it does not automate it). There is no database table for this today — the real,
 * current source of truth is docs/arastirma-kuyrugu.md, a file the integrator edits by hand
 * as territories are assigned and closed. Reading and rendering that file IS the honest
 * implementation; inventing a parallel DB table would create a second copy that drifts from
 * the one people actually edit.
 *
 * Parsed at request time, not built once and cached, so an edit to the doc shows up on next
 * render without a deploy — matching lib/admin/queries.ts's own getMigrationReality, the
 * only other place this codebase reads project files from disk at runtime (see its own
 * comment for the identical Vercel outputFileTracingIncludes caveat: this file must be
 * included in the serverless function's bundle, or this silently reads nothing in
 * production. Same caveat, not re-derived).
 *
 * Deliberately narrow and defensive: this parses exactly the two markdown tables the doc has
 * had all night, by column position, not a general-purpose markdown parser. If the doc's
 * shape ever changes enough to break this, the caller gets `null` (not a thrown render
 * error) and the screen says so — a stale or unreadable queue must never look like an empty
 * one, the identical "absence is not a known value" discipline this session applied to data
 * reads all night, applied here to a file read instead.
 */

const DOC_PATH = join(process.cwd(), "docs", "arastirma-kuyrugu.md");

export interface ResearchQueueRow {
  number: string;
  area: string;
  knownFact: string;
  /** Verbatim from the doc ("SAHİPLİ — oryn-d0 (2026-09-03)", "boş", "kapandı") — a status
   *  vocabulary the integrator writes by hand, not a closed enum this code should invent an
   *  English translation for and risk drifting from what the doc actually says. */
  status: string;
}

export interface ResearchLaneRow {
  lane: string;
  currentWork: string;
  next: string;
}

export interface ResearchQueue {
  rows: ResearchQueueRow[];
  lanes: ResearchLaneRow[];
}

function stripMarkdownBold(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "$1").trim();
}

function parseTableRows(lines: string[], startIndex: number, columnCount: number): { rows: string[][]; nextIndex: number } {
  const rows: string[][] = [];
  let i = startIndex;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line.startsWith("|")) break;
    // The `|---|---|` separator row and the header row both start with `|` too -- skip any
    // row whose cells are only dashes/colons (the separator) rather than trying to detect it
    // by position, since a doc edit could add/remove a blank line above the table.
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => stripMarkdownBold(c));
    if (cells.length === columnCount && !cells.every((c) => /^:?-+:?$/.test(c))) {
      rows.push(cells);
    }
    i++;
  }
  return { rows, nextIndex: i };
}

/** Returns `null` if the file can't be read or doesn't contain both expected tables --
 *  callers must render an honest "couldn't load" state, never an empty queue. */
export function readResearchQueue(): ResearchQueue | null {
  let content: string;
  try {
    content = readFileSync(DOC_PATH, "utf8");
  } catch {
    return null;
  }

  const lines = content.split("\n");
  const areaHeaderIndex = lines.findIndex((l) => l.trim() === "| # | Bölge | Bilinen gerçek | Durum |");
  const laneHeaderIndex = lines.findIndex((l) => l.trim() === "| Lane | Şu anki iş | Sonrası |");
  if (areaHeaderIndex === -1) return null;

  const { rows: areaCells } = parseTableRows(lines, areaHeaderIndex + 1, 4);
  const rows: ResearchQueueRow[] = areaCells.map(([number, area, knownFact, status]) => ({ number, area, knownFact, status }));
  if (rows.length === 0) return null;

  let lanes: ResearchLaneRow[] = [];
  if (laneHeaderIndex !== -1) {
    const { rows: laneCells } = parseTableRows(lines, laneHeaderIndex + 1, 3);
    lanes = laneCells.map(([lane, currentWork, next]) => ({ lane, currentWork, next }));
  }

  return { rows, lanes };
}
