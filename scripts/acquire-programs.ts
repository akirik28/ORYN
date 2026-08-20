#!/usr/bin/env node
/**
 * Verified undergraduate programme acquisition (Phase C).
 *
 * `university_programs` has been 0 rows for this product's entire history and is its largest
 * structural gap. This script closes it from official university catalogues only.
 *
 * Hard constraints, all deliberate:
 *   - **No language model.** Extraction is deterministic: a per-university link pattern that a
 *     human verified against that specific official catalogue, plus explicit degree tokens.
 *     No Anthropic call happens anywhere in this path.
 *   - **Official domain only.** A programme URL that is not on the institution's own domain is
 *     rejected, not downgraded. The domain is checked against `universities.website_url`, which
 *     itself came from the ROR-verified identity pass.
 *   - **Level is evidenced, never assumed.** A programme is recorded as undergraduate only when
 *     its name carries an explicit degree token, or the catalogue section is itself the
 *     official bachelors/undergraduate index. The evidence is stored per programme.
 *   - **Nothing is guessed.** A catalogue that is JS-gated, blocked, or restructured yields zero
 *     programmes and a recorded blocker — never a partial guess.
 *
 * Tavily is deliberately not used here either: the catalogue URLs are verified constants, so
 * discovery adds nothing but a dependency. If it is used later it is for navigation only —
 * search results are never evidence.
 *
 * Usage:
 *   npm run acquire:programs                    # all configured universities
 *   npm run acquire:programs -- --only Delft    # substring filter while iterating
 *   npm run acquire:programs -- --out path.json
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { extractPrograms, subjectCategoryOf, type CatalogueRule, type ExtractedProgram } from "../lib/acquisition/programs";
import { sourceAuthority } from "../lib/acquisition/source-authority";
import { CADENCE_DAYS, resolveVerificationState } from "../lib/acquisition/verification";
import { fetchAllRowsVerified } from "../lib/acquisition/paginate";
import { nameKey } from "../lib/acquisition/normalize";

export {};

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — this script needs the DB to resolve university ids, so it will report that.
}

const USER_AGENT = "ORYN-data-acquisition/1.0 (+https://github.com/akirik28/ORYN)";
const DEFAULT_OUT = "supabase/fixtures/university-programs-pilot.json";

interface CatalogueConfig {
  /** Must match `universities.name` in the live spine (compared via nameKey). */
  universityName: string;
  country: string;
  /** Official catalogue index page. Verified by hand to be the undergraduate programme index. */
  catalogueUrl: string;
  rule: CatalogueRule;
}

/**
 * Verified catalogue configurations.
 *
 * Each entry was checked by fetching the page and confirming that the pattern selects real
 * programme pages and nothing else. Geographic spread is a requirement, not a nicety — a
 * programme pilot that is only US/UK proves nothing about the catalogue shapes elsewhere.
 */
const CATALOGUES: CatalogueConfig[] = [
  {
    universityName: "Delft University of Technology",
    country: "Netherlands",
    catalogueUrl: "https://www.tudelft.nl/en/education/programmes/bachelors",
    rule: { hrefPattern: "/onderwijs/opleidingen/bachelors/[a-z0-9-]+/", sectionIsUndergraduate: true },
  },
  {
    universityName: "Trinity College Dublin, The University of Dublin",
    country: "Ireland",
    catalogueUrl: "https://www.tcd.ie/courses/undergraduate/a-z-of-ug-courses/",
    rule: { hrefPattern: "/courses/undergraduate/[a-z0-9-]{4,}", excludePatterns: ["a-z-of-ug-courses"], sectionIsUndergraduate: true },
  },
];

interface ProgramFact {
  officialName: string;
  officialUrl: string;
  degreeToken: string | null;
  degreeLevel: "bachelor";
  degreeLevelEvidence: string;
  subjectCategory: string | null;
  key: string;
  sourceUrl: string;
  sourceType: string;
  sourceTier: "HIGH" | "MEDIUM";
  retrievedAt: string;
  verificationState: string;
}

interface ProgramUniversityEntry {
  universityId: string;
  universityName: string;
  country: string;
  officialWebsite: string;
  catalogueUrl: string;
  programCount: number;
  programs: ProgramFact[];
}

interface Blocker {
  universityName: string;
  country: string;
  catalogueUrl: string;
  reason: string;
}

async function fetchHtml(url: string): Promise<{ ok: true; html: string } | { ok: false; reason: string }> {
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "text/html" }, redirect: "follow" }).catch(
    (e: unknown) => ({ ok: false, status: 0, statusText: e instanceof Error ? e.message : "network error" }) as unknown as Response
  );
  if (!response || !("status" in response)) return { ok: false, reason: "no response" };
  if (!response.ok) return { ok: false, reason: `HTTP ${response.status}` };
  const html = await response.text().catch(() => "");
  if (html.length < 2000) return { ok: false, reason: `page too small (${html.length} bytes) — likely JS-gated or a redirect stub` };
  return { ok: true, html };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const outIndex = args.indexOf("--out");
  const outPath = outIndex >= 0 && args[outIndex + 1] ? args[outIndex + 1] : DEFAULT_OUT;
  const onlyIndex = args.indexOf("--only");
  const only = onlyIndex >= 0 ? args[onlyIndex + 1]?.toLowerCase() : null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error("Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY to resolve university ids (see docs/founder-blocked-backlog.md item 2).");
    process.exitCode = 1;
    return;
  }

  const { rows: universities } = await fetchAllRowsVerified<{ id: string; name: string; country: string; website_url: string | null }>(
    { url, key },
    "universities",
    "id,name,country,website_url",
    "order=id.asc"
  );
  const byName = new Map(universities.map((u) => [nameKey(u.name), u]));

  const retrievedAt = new Date().toISOString();
  const entries: ProgramUniversityEntry[] = [];
  const blockers: Blocker[] = [];

  const selected = only ? CATALOGUES.filter((c) => c.universityName.toLowerCase().includes(only)) : CATALOGUES;

  for (const config of selected) {
    const uni = byName.get(nameKey(config.universityName));
    if (!uni) {
      blockers.push({ ...config, reason: `No university row matches "${config.universityName}" — cannot attach programmes to an unknown identity.` });
      console.log(`UNRESOLVED  ${config.universityName} — no matching university row`);
      continue;
    }
    if (!uni.website_url) {
      blockers.push({ ...config, reason: "University row has no verified official website, so a catalogue domain cannot be confirmed as official." });
      console.log(`BLOCKED     ${config.universityName} — no official website on record`);
      continue;
    }

    const fetched = await fetchHtml(config.catalogueUrl);
    await sleep(500);
    if (!fetched.ok) {
      blockers.push({ ...config, reason: `Catalogue fetch failed: ${fetched.reason}` });
      console.log(`BLOCKED     ${config.universityName} — ${fetched.reason}`);
      continue;
    }

    const extracted: ExtractedProgram[] = extractPrograms(fetched.html, {
      pageUrl: config.catalogueUrl,
      officialWebsite: uni.website_url,
      universityId: uni.id,
      rule: config.rule,
    });

    if (extracted.length === 0) {
      blockers.push({ ...config, reason: "Catalogue fetched but the verified link pattern matched no programme pages — pattern likely stale after a site change." });
      console.log(`BLOCKED     ${config.universityName} — 0 programmes matched`);
      continue;
    }

    // The catalogue is on the institution's own domain, so it is official_primary for
    // programme facts. sourceAuthority is asked rather than assumed, and the institution's own
    // verified domain is supplied so a non-academic TLD (ethz.ch, tum.de) still qualifies.
    const officialDomains = new Set([new URL(uni.website_url).hostname.toLowerCase().replace(/^www\./, "")]);
    const authority = sourceAuthority("programs", config.catalogueUrl, officialDomains);
    if (!authority) {
      blockers.push({ ...config, reason: `Catalogue URL is not an accepted source for programme facts (${config.catalogueUrl}).` });
      console.log(`BLOCKED     ${config.universityName} — catalogue domain not accepted as official`);
      continue;
    }

    const verificationState = resolveVerificationState({
      authority,
      sourceYear: null,
      retrievedAt,
      cadenceDays: CADENCE_DAYS.programs,
    });

    const programs: ProgramFact[] = extracted.map((p) => ({
      officialName: p.officialName,
      officialUrl: p.officialUrl,
      degreeToken: p.degreeToken,
      degreeLevel: "bachelor",
      degreeLevelEvidence: p.degreeLevelEvidence,
      subjectCategory: subjectCategoryOf(p.officialName),
      key: p.key,
      sourceUrl: config.catalogueUrl,
      sourceType: authority.sourceType,
      sourceTier: authority.tier,
      retrievedAt,
      verificationState,
    }));

    entries.push({
      universityId: uni.id,
      universityName: uni.name,
      country: uni.country,
      officialWebsite: uni.website_url,
      catalogueUrl: config.catalogueUrl,
      programCount: programs.length,
      programs,
    });
    console.log(`ok          ${uni.name} — ${programs.length} programmes`);
  }

  const total = entries.reduce((n, e) => n + e.programCount, 0);
  const allKeys = entries.flatMap((e) => e.programs.map((p) => p.key));
  const duplicateKeys = allKeys.length - new Set(allKeys).size;

  const fixture = {
    schemaVersion: 1 as const,
    generatedAt: retrievedAt,
    generator: "scripts/acquire-programs.ts",
    extraction: "deterministic HTML link extraction against verified per-university catalogue patterns; no language model involved",
    universities: entries,
    blockers,
  };

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(fixture, null, 2)}\n`);

  console.log(`\nUniversities with programmes: ${entries.length}/${selected.length}`);
  console.log(`Programmes extracted:         ${total}`);
  console.log(`Duplicate keys:               ${duplicateKeys}`);
  console.log(`Countries:                    ${new Set(entries.map((e) => e.country)).size}`);
  console.log(`Blockers:                     ${blockers.length}`);
  for (const b of blockers) console.log(`  - ${b.universityName}: ${b.reason}`);
  const bySubject = new Map<string, number>();
  for (const e of entries) for (const p of e.programs) bySubject.set(p.subjectCategory ?? "(unmapped)", (bySubject.get(p.subjectCategory ?? "(unmapped)") ?? 0) + 1);
  console.log(`\nBy subject category:`);
  for (const [s, n] of [...bySubject.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${s.padEnd(20)} ${n}`);
  console.log(`\nWritten to ${outPath}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
