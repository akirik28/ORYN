#!/usr/bin/env node
/**
 * Corpus-wide audit for the dedup-key convention-drift blind spot — RES-V1 package V1-2
 * (assigned by ORYN-BASORG, 2026-08-22), generalizing a live near-miss:
 *
 * RES-I1 dry-ran `acquire-programs-batch2` and got 106 accepted / 195 duplicate overall —
 * a clean-looking run. Glasgow's own line was 101 net-new / 0 duplicate, anomalous against
 * every other university in the same batch, so BASORG opened the data before assigning the
 * apply. Glasgow's 101 "new" records are actually 69 duplicates: the live rows carry
 * `degree_type` NULL and code-stripped names ("Chemistry"), the research file carries
 * `degree_type` populated and code-suffixed names ("Chemistry [BSc]") — two independent
 * naming-convention drifts between whatever pass populated the live rows and this research
 * batch. Neither drift is wrong on its own. The *composite* dedup key
 * (lib/programs/ingest.ts `programDedupKey`) requires every component to match exactly, so
 * the two drifts compound into a silent miss on 69 of 101 rows. Applying the batch as
 * dry-run reported it would have taken Glasgow from 101 to 202 rows with 69 programmes
 * listed twice.
 *
 * This script checks the rest of the not-yet-ingested research corpus for the same shape:
 * for every record whose `research_program_id` has never been attempted (absent from
 * `program_research_queue`), if the record's `official_program_url` exact-matches a live
 * row at the SAME university — URL is the one required, always-populated, substantive
 * component; see `programDedupKey`'s own header on why URL was folded into the composite
 * key rather than trusted alone (a standalone URL-only check was tried and was wrong 53 of
 * 54 times) — but the record's own STRICT dedup key does not match any live key (i.e. the
 * real ingestion pipeline would currently treat it as new), check whether the mismatch is
 * explained ENTIRELY by cosmetic drift:
 *
 *   - name: matches after stripping exactly the OUTERMOST trailing bracket/paren group (a
 *     degree-code annotation) and normalizing. Calibrated directly against Glasgow's known
 *     69/101 split to get this right: stripping ALL trailing groups recursively
 *     over-strips genuine qualifiers ("Education with Teaching Qualification (Primary)"
 *     loses "(Primary)", a real distinguishing fact, not a degree code) — stripping only
 *     the single outermost group reproduces 68 of Glasgow's 69 cleanly, with the 69th
 *     ("Environmental Science & Sustainability (Dumfries campus) [BSc]") correctly falling
 *     to the lower-confidence tier below rather than being silently forced to match.
 *   - degree_type: equal, OR either side null (BASORG's named cosmetic axis).
 *   - language_of_instruction: equal, OR either side null. This is an EXTENSION beyond
 *     BASORG's named "name convention, degree_type presence" axes, found empirically
 *     during calibration: Glasgow's live rows are 100% populated "English", the research
 *     file's are 100% null for the SAME 69 rows — holding this field to exact equality
 *     reproduces ZERO of the known 69 duplicates, so null-vs-populated cannot be read as a
 *     real language-track distinction in this batch. Reported as its own toggle
 *     (`--strict-language`) so the with/without-tolerance counts are both visible rather
 *     than one silently assumed.
 *
 * `degree_level` is held to EXACT match throughout — never treated as cosmetic (a
 * Bachelor's and a taught Master's sharing a URL are genuinely different programmes; this
 * mirrors the composite key's own treatment of degree_level as load-bearing).
 *
 * Output is a REVIEW QUEUE, never a resolution — org rule 10, never fuzzy-merge entities.
 * This script performs NO writes, proposes NO dedup-key change, and does not import or
 * modify anything in lib/programs/ingest.ts's decision path. It reuses that module's own
 * `resolveUniversity`/`programDedupKey`/`normalizeProgramName` so "would the real pipeline
 * currently call this a duplicate" is answered by the actual production logic, not a
 * reimplementation that could quietly drift from it.
 *
 * Confidence tiers per flagged record:
 *   - high:   same university + same official_program_url + name matches after single-
 *             group-strip + degree_level exact + degree_type/language null-tolerant
 *   - medium: same university + same official_program_url + degree_level exact, but the
 *             name does NOT match even after stripping (Glasgow's Dumfries case) — still
 *             worth a human look, not auto-classified as a clean duplicate
 *
 * Usage:
 *   npm run audit:dedup-convention-drift                          # whole corpus
 *   npm run audit:dedup-convention-drift -- --file=<path.jsonl>    # one file
 *   npm run audit:dedup-convention-drift -- --strict-language      # exclude the language extension, BASORG's original two axes only
 */

import { readFileSync, writeFileSync } from "node:fs";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { fetchAllRowsVerified, type PostgrestTarget } from "../lib/acquisition/paginate";
import { excludeSupersededUniversities, loadSupersessionMapViaRest } from "../lib/universities/canonical";
import { resolveUniversity, programDedupKey, type ResearchProgramRecord, type UniversityLookupRow } from "../lib/programs/ingest";
import { normalizeProgramName } from "../lib/programs/normalize";

export {};

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables.
}

const RESEARCH_DIR = join(process.cwd(), "data/research/university-programs");

interface LiveProgramRow {
  id: string;
  university_id: string;
  name: string;
  degree_level: string | null;
  degree_type: string | null;
  language_of_instruction: string | null;
  official_program_url: string;
}

interface UniversityRow {
  id: string;
  name: string;
  country: string;
  canonical_entity_id: string | null;
  website_url: string | null;
}
interface AliasRow {
  entity_id: string;
  alias: string;
}
interface ExternalIdRow {
  entity_id: string;
  id_system: string;
  external_id: string;
}

async function loadUniversityCandidates(target: PostgrestTarget): Promise<UniversityLookupRow[]> {
  const [{ rows: universities }, { rows: aliases }, { rows: externalIds }] = await Promise.all([
    fetchAllRowsVerified<UniversityRow>(target, "universities", "id,name,country,canonical_entity_id,website_url", "order=id"),
    fetchAllRowsVerified<AliasRow>(target, "entity_aliases", "entity_id,alias", "order=id"),
    fetchAllRowsVerified<ExternalIdRow>(target, "entity_external_ids", "entity_id,id_system,external_id", "order=id"),
  ]);
  const aliasesByEntity = new Map<string, string[]>();
  for (const a of aliases) aliasesByEntity.set(a.entity_id, [...(aliasesByEntity.get(a.entity_id) ?? []), a.alias]);
  const externalIdsByEntity = new Map<string, Record<string, string>>();
  for (const e of externalIds) {
    const existing = externalIdsByEntity.get(e.entity_id) ?? {};
    existing[e.id_system] = e.external_id;
    externalIdsByEntity.set(e.entity_id, existing);
  }
  const supersessionMap = await loadSupersessionMapViaRest(target);
  return excludeSupersededUniversities(
    supersessionMap,
    universities.map((u) => ({
      id: u.id,
      name: u.name,
      country: u.country,
      aliases: u.canonical_entity_id ? aliasesByEntity.get(u.canonical_entity_id) : undefined,
      externalIds: u.canonical_entity_id ? externalIdsByEntity.get(u.canonical_entity_id) : undefined,
      websiteUrl: u.website_url,
    }))
  );
}

/** Strip exactly the OUTERMOST trailing bracket/paren group (a degree-code annotation),
 * tolerating one level of nesting inside it (e.g. "[BSc/MA/MA(SocSci)]"). Deliberately
 * strips only ONE group, not all trailing groups recursively — see the file header for why
 * (over-stripping loses genuine qualifiers like "(Primary)"). */
function stripOutermostTrailingCodeGroup(name: string): string {
  const s = name.trim();
  const bracketMatch = /\s*\[[^[\]]*(?:\([^()]*\)[^[\]]*)*\]\s*$/.exec(s);
  if (bracketMatch) return s.slice(0, bracketMatch.index).trim();
  const parenMatch = /\s*\([^()]*\)\s*$/.exec(s);
  if (parenMatch) return s.slice(0, parenMatch.index).trim();
  return s;
}

function nullTolerantEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return true; // cosmetic: missing data on either side, not a real disagreement
  return a === b;
}

interface Finding {
  file: string;
  research_program_id: string;
  university_name: string;
  university_id: string;
  record_name: string;
  live_program_id: string;
  live_name: string;
  official_program_url: string;
  confidence: "high" | "medium";
  reason: string;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const fileArg = args.find((a) => a.startsWith("--file="))?.split("=")[1];
  const strictLanguage = args.includes("--strict-language");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY — see API_SETUP.md. Nothing was read.");
    process.exitCode = 1;
    return;
  }
  const target: PostgrestTarget = { url, key };

  console.log("Loading university pool (identity resolution)...");
  const universities = await loadUniversityCandidates(target);
  console.log(`  ${universities.length} universities.`);

  console.log("Loading live university_programs (full table)...");
  const { rows: liveProgramsRaw } = await fetchAllRowsVerified<LiveProgramRow>(
    target,
    "university_programs",
    "id,university_id,name,degree_level,degree_type,language_of_instruction,official_program_url",
    "order=id"
  );
  console.log(`  ${liveProgramsRaw.length} live program rows.`);

  const liveByUniversityAndUrl = new Map<string, LiveProgramRow[]>();
  const strictLiveKeys = new Set<string>();
  for (const p of liveProgramsRaw) {
    const urlKey = `${p.university_id}|${p.official_program_url}`;
    if (!liveByUniversityAndUrl.has(urlKey)) liveByUniversityAndUrl.set(urlKey, []);
    liveByUniversityAndUrl.get(urlKey)!.push(p);
    strictLiveKeys.add(programDedupKey(p.university_id, normalizeProgramName(p.name), p.degree_level, p.language_of_instruction, p.official_program_url, p.degree_type));
  }

  console.log("Loading program_research_queue (attempted-record set)...");
  const { rows: queueRows } = await fetchAllRowsVerified<{ research_program_id: string | null }>(
    target,
    "program_research_queue",
    "research_program_id",
    "order=id"
  );
  const attempted = new Set(queueRows.map((r) => r.research_program_id).filter((id): id is string => id !== null));
  console.log(`  ${attempted.size} distinct research_program_ids already attempted.`);

  const files = fileArg ? [fileArg] : readdirSync(RESEARCH_DIR).filter((f) => f.endsWith(".jsonl")).map((f) => join(RESEARCH_DIR, f));

  const findings: Finding[] = [];
  const perFile = new Map<string, { total: number; alreadyAttempted: number; unresolvedUniversity: number; strictNew: number; noUrlMatch: number; high: number; medium: number }>();

  for (const filePath of files) {
    const fileName = filePath.split("/").pop()!;
    const stats = { total: 0, alreadyAttempted: 0, unresolvedUniversity: 0, strictNew: 0, noUrlMatch: 0, high: 0, medium: 0 };
    perFile.set(fileName, stats);

    const lines = readFileSync(filePath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let record: ResearchProgramRecord;
      try {
        record = JSON.parse(trimmed) as ResearchProgramRecord;
      } catch {
        continue; // malformed lines are RES-V1's contract-pass concern elsewhere, not this audit's
      }
      stats.total++;
      if (attempted.has(record.research_program_id)) {
        stats.alreadyAttempted++;
        continue; // already ingested/attempted — not this audit's scope
      }
      if (!record.official_program_url) continue;

      const { universityId } = resolveUniversity(record, universities);
      if (!universityId) {
        stats.unresolvedUniversity++;
        continue;
      }

      const normalizedName = normalizeProgramName(record.program_name);
      const strictKey = programDedupKey(universityId, normalizedName, record.degree_level ?? null, record.language_of_instruction ?? null, record.official_program_url, record.degree_type ?? null);
      if (strictLiveKeys.has(strictKey)) continue; // real pipeline already treats this as a duplicate — not a blind spot

      stats.strictNew++;
      const liveCandidates = liveByUniversityAndUrl.get(`${universityId}|${record.official_program_url}`);
      if (!liveCandidates || liveCandidates.length === 0) {
        stats.noUrlMatch++;
        continue; // no live row shares this URL at this university — genuinely novel by this audit's definition, out of scope (research adjudication, not verification)
      }

      // A URL can be shared by many distinct live programmes (a catalogue-listing page —
      // documented precedent: Manchester/Wisconsin/METU/~45 others, per programDedupKey's
      // own header on why a standalone URL check was rejected). Comparing against a single
      // arbitrarily-picked same-URL row produced a real false lead during development
      // (Radboud: a record for "Economics and Business Economics" [Dutch track] got
      // compared against an unrelated "Notarial Law" row that happened to share the
      // catalogue URL). A first fix — search all same-URL rows, keep the best — still
      // produced garbage on a listing-page university: with no name-similarity requirement
      // for "medium," it matched "Arts and Culture Studies" against "Computing Science" and
      // "Psychology" against "Computing Science" purely because they passed the same
      // degree_level/type/language filter among 49 candidates with no name relationship at
      // all. Fix: "same URL" alone is only meaningful evidence when the URL is NOT a shared
      // listing page. When >1 live row shares this URL, require an actual name match after
      // stripping (high tier only) — a same-URL-but-no-name-match "medium" finding there is
      // indistinguishable from noise, confirmed by the false leads above. When exactly 1
      // live row shares the URL (the normal, per-programme-URL case — e.g. Glasgow), the
      // existing high/medium split still applies, since a lone same-URL candidate with a
      // near-miss name (Glasgow's one "Dumfries campus" case) is genuinely worth a look.
      const strippedName = normalizeProgramName(stripOutermostTrailingCodeGroup(record.program_name ?? ""));
      const isListingPageUrl = liveCandidates.length > 1;
      let best: { row: LiveProgramRow; confidence: "high" | "medium" } | null = null;
      for (const liveMatch of liveCandidates) {
        const degreeLevelExact = (record.degree_level ?? "") === (liveMatch.degree_level ?? "");
        if (!degreeLevelExact) continue; // degree_level differing is substantive, never cosmetic

        const degreeTypeCosmetic = nullTolerantEqual(record.degree_type, liveMatch.degree_type);
        const languageCosmetic = strictLanguage
          ? (record.language_of_instruction ?? "") === (liveMatch.language_of_instruction ?? "")
          : nullTolerantEqual(record.language_of_instruction, liveMatch.language_of_instruction);
        if (!degreeTypeCosmetic || !languageCosmetic) continue; // a real, populated disagreement — not cosmetic

        const liveNameNormalized = normalizeProgramName(liveMatch.name);
        const nameMatchesAfterStrip = strippedName === liveNameNormalized;
        if (isListingPageUrl && !nameMatchesAfterStrip) continue; // no name signal + shared listing URL = not evidence of anything
        const confidence: "high" | "medium" = nameMatchesAfterStrip ? "high" : "medium";
        if (!best || (confidence === "high" && best.confidence === "medium")) best = { row: liveMatch, confidence };
      }
      if (!best) continue; // no live row sharing this URL is even cosmetically-consistent — a real mismatch (like Radboud's Dutch/English tracks), correctly not flagged

      if (best.confidence === "high") stats.high++;
      else stats.medium++;

      const sharedUrlNote = liveCandidates.length > 1 ? ` (this URL is shared by ${liveCandidates.length} live rows — catalogue-listing-page pattern; flagged only because the name matched exactly after stripping)` : "";
      findings.push({
        file: fileName,
        research_program_id: record.research_program_id,
        university_name: record.university_name,
        university_id: universityId,
        record_name: record.program_name,
        live_program_id: best.row.id,
        live_name: best.row.name,
        official_program_url: record.official_program_url,
        confidence: best.confidence,
        reason:
          (best.confidence === "high"
            ? "same URL, name matches after stripping one trailing degree-code group, degree_level exact, degree_type/language cosmetic-only"
            : "same URL, degree_level exact, degree_type/language cosmetic-only, but name does not match even after stripping — needs closer look") + sharedUrlNote,
      });
    }
  }

  console.log("\n=== Per-file summary (files with at least one finding, or non-trivial uningested volume) ===");
  for (const [fileName, s] of perFile) {
    if (s.high + s.medium === 0 && s.total - s.alreadyAttempted === 0) continue;
    console.log(
      `${fileName}: ${s.total} records, ${s.alreadyAttempted} already attempted, ${s.total - s.alreadyAttempted - s.unresolvedUniversity} uningested+resolved, ${s.strictNew} would strict-key-miss as "new", ${s.high} HIGH + ${s.medium} MEDIUM convention-drift findings, ${s.noUrlMatch} no-URL-match (out of scope)`
    );
  }

  const byUniversity = new Map<string, Finding[]>();
  for (const f of findings) {
    if (!byUniversity.has(f.university_name)) byUniversity.set(f.university_name, []);
    byUniversity.get(f.university_name)!.push(f);
  }
  console.log(`\n=== Per-university totals (${byUniversity.size} universities affected) ===`);
  for (const [uni, fs] of [...byUniversity.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const high = fs.filter((f) => f.confidence === "high").length;
    const medium = fs.filter((f) => f.confidence === "medium").length;
    console.log(`  ${uni}: ${fs.length} review candidates (${high} high, ${medium} medium)`);
  }

  console.log(`\n=== TOTAL: ${findings.length} review candidates across ${byUniversity.size} universities (${findings.filter((f) => f.confidence === "high").length} high, ${findings.filter((f) => f.confidence === "medium").length} medium) ===`);
  console.log("This is a REVIEW QUEUE, not a resolution. No merges, no writes, no dedup-key changes performed.");

  const reportPath = "/tmp/audit-dedup-convention-drift-report.json";
  writeFileSync(reportPath, JSON.stringify({ generatedAt: new Date().toISOString(), strictLanguage, perFile: Object.fromEntries(perFile), findings }, null, 2));
  console.log(`\nFull findings written to ${reportPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
