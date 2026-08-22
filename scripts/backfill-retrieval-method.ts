#!/usr/bin/env node
/**
 * One-time, evidence-derived backfill of `retrieval_method` for the blocked Canadian
 * programme corpus (docs/handoffs/evidence-gate-false-rejections-2026-08-22.md, GATE-FIX lane).
 *
 * What this does and deliberately does NOT do:
 * - Classifies each record's retrieval method FROM ITS OWN EXISTING verification_status
 *   attestation text — never from guesswork, never from which university the record belongs
 *   to alone. The rules below quote the actual attestation language they match; every rule was
 *   written after reading the corpus's distinct attestation texts, not before.
 * - Only touches records that FAIL the legacy prose gate (`looksPageConfirmed`). Records that
 *   already pass keep passing via the legacy fallback and are left byte-identical — this
 *   backfill exists to fix the falsely-rejected records, not to re-litigate accepted ones.
 * - Anything ambiguous stays unset (and therefore stays blocked). Fail closed.
 * - Writes the JSONL files in place with a per-line round-trip guard: before modifying
 *   anything, each line is re-serialized unchanged and byte-compared to the original; any
 *   mismatch aborts the whole file so the committed diff is guaranteed to be exactly
 *   "one field added per classified line" and nothing else.
 * - No database access of any kind. Ingestion (even dry-run) is a separate step/lane.
 *
 * Deterministic and idempotent: re-running produces the same classifications; a record that
 * already carries retrieval_method is verified against the rules (mismatch aborts) and left
 * unchanged.
 *
 * Usage:
 *   npx tsx scripts/backfill-retrieval-method.ts          # classify + rewrite + report
 *   npx tsx scripts/backfill-retrieval-method.ts --check  # classify + report only, no writes
 */
import { readFileSync, writeFileSync } from "node:fs";
import { looksPageConfirmed, type RetrievalMethod } from "../lib/acquisition/retrieval-method";

const CORPUS_DIR = "data/research/university-programs";

/** The six files containing blocked records. Toronto and UBC are deliberately absent — every
 * one of their records already passes the legacy gate (635 + 546, all ingested 2026-08-22). */
const FILES = [
  "ca_programs_alberta_2026-08-22.jsonl",
  "ca_programs_mcgill_2026-08-22.jsonl",
  "ca_programs_mcmaster_2026-08-22.jsonl",
  "ca_programs_montreal_2026-08-22.jsonl",
  "ca_programs_queens_2026-08-22.jsonl",
  "ca_programs_western_2026-08-22.jsonl",
];

/** Prose disclosing the content came from an archive service. Wins over everything else:
 * however the rest of the attestation reads, an archive-sourced record is archived_capture.
 * (McGill: all 288 records source the Internet Archive's capture of the 2024-2025 eCalendar
 * because the live site is WAF-blocked — honest sourcing, correctly kept out of the live DB.) */
const ARCHIVE_MARKERS = ["wayback", "archive.org", "web.archive", "internet archive"];

/** Prose disclosing the page was NOT read, or that this attestation is qualified in a way a
 * deterministic rule must not paper over. Any hit -> unset, stays blocked.
 * - the first five are the legacy gate's own blocked markers;
 * - "partial verification" is Western's own wording on 2 records whose visible listing could
 *   not confirm the programme-level facts;
 * - the three 404 markers name FETCH-FAILURE disclosures specifically — Western's One Health
 *   pair, whose own dedicated URL "returned HTTP 404 on three retrieval attempts" (and its
 *   sibling's "Same sourcing and 404 caveat"). Deliberately NOT a bare "404" substring:
 *   Western's 10 Classical Studies records mention that a stale program-finder link "now 404s
 *   site-wide" precisely to explain why they AVOIDED it and directly fetched the department's
 *   current live page (HTTP 200) instead — a mention of someone else's broken link is not a
 *   fetch failure of this record's own source;
 * - the rest are generic non-live retrieval routes that must never classify as live. */
const AMBIGUOUS_MARKERS = [
  "retrieval blocked",
  "page unfetched",
  "not fetched",
  "search result only",
  "unfetched",
  "partial verification",
  "returned 404",
  "returned http 404",
  "404 caveat",
  "could not",
  "cached copy",
  "google cache",
];

/** Positive, explicit claims that the source page/endpoint was retrieved live from the origin
 * host. A record must match at least one of these (and none of the markers above) to be
 * classified at all. Each pattern quotes real corpus language:
 * - "retrieved directly from"   — Montréal (679): "Retrieved directly from Université de
 *   Montréal's own official admissions site (admission.umontreal.ca), which returned HTTP 200"
 * - "direct http fetch"         — Queen's (337): "Retrieved by direct HTTP fetch (curl with a
 *   standard desktop-browser User-Agent string) ... HTTP 200"; also Western's departmental
 *   pages: "Retrieved 2026-08-22 by direct HTTP fetch of ..."
 * - "retrieved live from"       — McMaster (432): "Retrieved live from McMaster's official
 *   Acalog academic calendar (academiccalendars.romcmaster.ca)"
 * - "was directly fetched" — Alberta's blocked records, in two real phrasings: "This
 *   program's own dedicated page (...) was directly fetched and its content read/cross-checked
 *   against the index listing" (70 records) and the Medicine & Dentistry shape "This
 *   department's dedicated graduate landing page (...) was directly fetched (2026-08-22) and
 *   its own 'General Information' opening statement read verbatim" (24 records). The negated
 *   form Alberta actually uses for its NOT-individually-fetched records is "was not
 *   individually re-fetched", which does not contain this pattern — and those records pass the
 *   legacy gate and are skipped before classification anyway.
 * - "directly fetched 2026-08-22" — Alberta's 2 Faculté Saint-Jean chapter-page records:
 *   "(...navoid=20807), directly fetched 2026-08-22"
 * - the two Western feed/API patterns — "Retrieved 2026-08-22 from Western's official Program
 *   Finder data feed (welcome.uwo.ca/data/program-finder.json)" and "Retrieved 2026-08-22 via
 *   Western's official graduate program search API (grad.uwo.ca/.../getPrograms.json.cfm)":
 *   the live JSON endpoints Western itself serves; the feed is the record's source and was
 *   fetched live. */
const LIVE_CLAIM_PATTERNS = [
  "retrieved directly from",
  "direct http fetch",
  "retrieved live from",
  "was directly fetched",
  "directly fetched 2026-08-22",
  "retrieved 2026-08-22 from western's official program finder data feed",
  "retrieved 2026-08-22 via western's official graduate program search api",
];

/** Given a live claim, distinguishes browser_render (fetched live in a browser session — WAF/
 * bot-mitigation challenges cleared by normal navigation) from live_fetch (direct HTTP
 * request). Both pass the gate identically; the distinction is recorded for honesty.
 * Real corpus language: McMaster "Fetched via browser after the site's AWS WAF bot-mitigation
 * challenge cleared automatically"; Alberta "the WAF's automatic JS challenge was cleared via
 * normal browser navigation". */
const BROWSER_MARKERS = ["via browser", "browser navigation", "fetched via browser"];

export function classifyAttestation(verificationStatus: string): RetrievalMethod | null {
  const s = verificationStatus.toLowerCase();
  if (ARCHIVE_MARKERS.some((m) => s.includes(m))) return "archived_capture";
  if (AMBIGUOUS_MARKERS.some((m) => s.includes(m))) return null;
  if (!LIVE_CLAIM_PATTERNS.some((p) => s.includes(p))) return null;
  return BROWSER_MARKERS.some((m) => s.includes(m)) ? "browser_render" : "live_fetch";
}

/** Serializes a flat record in the corpus files' own style (`{"k": v, "k2": v2}` — `", "`
 * between entries, `": "` after keys), so an untouched line round-trips byte-identically and
 * a touched line differs only by its one added field. Corpus records are flat (scalars/null
 * only), asserted below. */
function serializeFlat(entries: [string, unknown][]): string {
  const body = entries
    .map(([k, v]) => {
      if (v !== null && typeof v === "object") {
        throw new Error(`Non-flat value under key "${k}" — this corpus is expected to be flat; refusing to serialize.`);
      }
      return `${JSON.stringify(k)}: ${JSON.stringify(v)}`;
    })
    .join(", ");
  return `{${body}}`;
}

interface FileReport {
  file: string;
  total: number;
  legacyPass: number;
  classified: Record<string, number>;
  unsetStillBlocked: number;
  unsetStillBlockedIds: string[];
  alreadyHadField: number;
}

function processFile(path: string, write: boolean): FileReport {
  const original = readFileSync(path, "utf-8");
  const lines = original.split("\n");
  const out: string[] = [];
  const report: FileReport = {
    file: path,
    total: 0,
    legacyPass: 0,
    classified: {},
    unsetStillBlocked: 0,
    unsetStillBlockedIds: [],
    alreadyHadField: 0,
  };

  for (const [i, line] of lines.entries()) {
    if (!line.trim()) {
      out.push(line);
      continue;
    }
    const record = JSON.parse(line) as Record<string, unknown>;
    const entries = Object.entries(record);

    // Round-trip guard: our serializer must reproduce the original line exactly before we are
    // allowed to modify anything. Guarantees the committed diff is only the added field.
    const roundTrip = serializeFlat(entries.filter(([k]) => k !== "__never__"));
    if (roundTrip !== line) {
      throw new Error(`${path}:${i + 1}: round-trip serialization mismatch — refusing to rewrite this file.\n  original: ${line.slice(0, 120)}\n  reserialized: ${roundTrip.slice(0, 120)}`);
    }

    report.total += 1;
    const vs = String(record.verification_status ?? "");
    const id = String(record.research_program_id ?? `<line ${i + 1}>`);

    if (looksPageConfirmed(vs)) {
      // Already passes the legacy gate — out of scope, left byte-identical.
      report.legacyPass += 1;
      out.push(line);
      continue;
    }

    const method = classifyAttestation(vs);

    if ("retrieval_method" in record) {
      // Idempotency: verify a prior run's value against the rules, never silently change it.
      report.alreadyHadField += 1;
      if (record.retrieval_method !== method) {
        throw new Error(`${path}:${i + 1} (${id}): existing retrieval_method "${String(record.retrieval_method)}" disagrees with rule classification "${String(method)}".`);
      }
      if (method !== null) report.classified[method] = (report.classified[method] ?? 0) + 1;
      else {
        report.unsetStillBlocked += 1;
        report.unsetStillBlockedIds.push(id);
      }
      out.push(line);
      continue;
    }

    if (method === null) {
      report.unsetStillBlocked += 1;
      report.unsetStillBlockedIds.push(id);
      out.push(line);
      continue;
    }

    report.classified[method] = (report.classified[method] ?? 0) + 1;
    const vsIndex = entries.findIndex(([k]) => k === "verification_status");
    const insertAt = vsIndex >= 0 ? vsIndex + 1 : entries.length;
    const withField: [string, unknown][] = [...entries.slice(0, insertAt), ["retrieval_method", method], ...entries.slice(insertAt)];
    out.push(serializeFlat(withField));
  }

  if (write) writeFileSync(path, out.join("\n"));
  return report;
}

function main() {
  const write = !process.argv.includes("--check");
  const reports: FileReport[] = [];
  for (const file of FILES) {
    reports.push(processFile(`${CORPUS_DIR}/${file}`, write));
  }

  console.log(write ? "Backfill applied.\n" : "Check mode — no files written.\n");
  console.log("file                                       total  legacy_pass  live_fetch  browser_render  archived_capture  unset(blocked)");
  for (const r of reports) {
    const name = r.file.split("/").pop()!;
    console.log(
      `${name.padEnd(42)} ${String(r.total).padStart(5)}  ${String(r.legacyPass).padStart(11)}  ${String(r.classified["live_fetch"] ?? 0).padStart(10)}  ${String(r.classified["browser_render"] ?? 0).padStart(14)}  ${String(r.classified["archived_capture"] ?? 0).padStart(16)}  ${String(r.unsetStillBlocked).padStart(14)}`
    );
    if (r.unsetStillBlockedIds.length > 0) {
      console.log(`  still blocked (unset): ${r.unsetStillBlockedIds.join(", ")}`);
    }
  }

  const reportPath = `${CORPUS_DIR}/retrieval-method-backfill-report-2026-08-22.json`;
  if (write) {
    writeFileSync(reportPath, JSON.stringify(reports, null, 2) + "\n");
    console.log(`\nMachine-readable report written to ${reportPath}`);
  }
}

main();
