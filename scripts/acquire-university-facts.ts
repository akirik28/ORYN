#!/usr/bin/env node
/**
 * Verified university-fact acquisition (Phase 2 of the Cialfo data-gap work).
 *
 * Acquires the identity-class facts the audit identified as thin or missing across the
 * 1,010-university spine — official website, city/country cross-check,
 * cross-registry external ids, research-strength topics — from ROR and OpenAlex: both CC0,
 * both keyless, both carrying a per-record modification date so every fact can be dated
 * rather than assumed current.
 *
 * What this script deliberately does NOT do:
 *   - It does not write to the database. It produces a reviewable, provenance-complete
 *     *staging fixture*; scripts/import-university-facts.ts is what applies one, and that is
 *     where identity resolution and write precedence live. Acquisition and application are
 *     separate so a bad batch can be inspected and thrown away before it touches real rows.
 *   - It does not acquire cost, admissions-policy, or programme facts from these sources.
 *     ROR and OpenAlex publish none of those, and lib/acquisition/source-authority.ts
 *     refuses them for those fact classes rather than relying on this comment.
 *   - It never invents a value. A field the registry does not publish is omitted from the
 *     fixture entirely, not defaulted.
 *
 * Usage:
 *   npm run acquire:universities -- --pilot                     # roster below, writes the pilot fixture
 *   npm run acquire:universities -- --pilot --out path.json     # custom output path
 *   npm run acquire:universities -- --pilot --limit 5           # short run while iterating
 *
 * Deliberately imports nothing under lib/ carrying `import "server-only"` — that guard
 * throws outside Next.js's bundler (same constraint as scripts/check-integrations.ts).
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { searchRorByName, type RorRecord } from "../lib/acquisition/ror";
import { countryFromIso2, nameKey, sameCountry } from "../lib/acquisition/normalize";
import { sourceAuthority } from "../lib/acquisition/source-authority";
import { CADENCE_DAYS, resolveVerificationState } from "../lib/acquisition/verification";
import type { AcquiredFact, AcquisitionFixture, AcquiredUniversity } from "../lib/acquisition/fixture";

export {};

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — this script needs no credentials, so that is fine.
}

const USER_AGENT = "ORYN-data-acquisition/1.0 (+https://github.com/akirik28/ORYN)";
const DEFAULT_OUT = "supabase/fixtures/university-identity-pilot.json";

/**
 * Pilot roster: 30 universities across 23 countries and 6 continents.
 *
 * Chosen for regional spread rather than ranking position, specifically because a pilot that
 * is only US/UK proves nothing about the hard cases — non-Latin scripts (Boğaziçi, 東京大学),
 * diacritics (São Paulo, México), "The" prefixes that ranking tables include inconsistently,
 * and institutions whose official domain carries no academic suffix. Each `name`/`country` is
 * the form we expect our own row to carry; the importer resolves it properly against the
 * live registry and reports UNRESOLVED rather than guessing when it cannot.
 */
const PILOT_ROSTER: { name: string; country: string }[] = [
  { name: "Boğaziçi Üniversitesi", country: "Turkey" },
  { name: "Koç University", country: "Turkey" },
  { name: "University of Amsterdam", country: "Netherlands" },
  { name: "Delft University of Technology", country: "Netherlands" },
  { name: "Technical University of Munich", country: "Germany" },
  { name: "Heidelberg University", country: "Germany" },
  { name: "The University of Edinburgh", country: "United Kingdom" },
  { name: "The University of Manchester", country: "United Kingdom" },
  { name: "ETH Zurich", country: "Switzerland" },
  { name: "Politecnico di Milano", country: "Italy" },
  { name: "Bocconi University", country: "Italy" },
  { name: "Sorbonne University", country: "France" },
  { name: "KTH Royal Institute of Technology", country: "Sweden" },
  { name: "Trinity College Dublin", country: "Ireland" },
  { name: "University of Copenhagen", country: "Denmark" },
  { name: "University of Barcelona", country: "Spain" },
  { name: "University of Toronto", country: "Canada" },
  { name: "McGill University", country: "Canada" },
  { name: "University of Michigan", country: "United States" },
  { name: "Georgia Institute of Technology", country: "United States" },
  { name: "National University of Singapore", country: "Singapore" },
  { name: "The University of Tokyo", country: "Japan" },
  { name: "Seoul National University", country: "South Korea" },
  { name: "The University of Hong Kong", country: "Hong Kong SAR" },
  { name: "The University of Melbourne", country: "Australia" },
  { name: "Universidade de São Paulo", country: "Brazil" },
  { name: "Universidad Nacional Autónoma de México", country: "Mexico" },
  { name: "University of Cape Town", country: "South Africa" },
  { name: "Indian Institute of Technology Delhi", country: "India" },
  { name: "Khalifa University", country: "United Arab Emirates" },
];

interface OpenAlexInstitution {
  topics: { name: string; count: number; field: string | null }[];
  worksCount: number | null;
  updatedDate: string | null;
  homepageUrl: string | null;
  countryCode: string | null;
  openAlexId: string | null;
}

/**
 * OpenAlex, looked up by ROR id rather than by name — the ROR id is an exact key, so this
 * lookup cannot drift onto a different institution the way a second name search could.
 */
async function fetchOpenAlexByRor(rorId: string): Promise<OpenAlexInstitution | null> {
  const url = `https://api.openalex.org/institutions/${encodeURIComponent(rorId)}`;
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } }).catch(() => null);
  if (!response || !response.ok) return null;
  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return null;

  const topics = Array.isArray(body.topics)
    ? (body.topics as Record<string, unknown>[]).slice(0, 5).map((t) => ({
        name: typeof t.display_name === "string" ? t.display_name : "",
        count: typeof t.count === "number" ? t.count : 0,
        field:
          typeof t.field === "object" && t.field !== null && typeof (t.field as Record<string, unknown>).display_name === "string"
            ? ((t.field as Record<string, unknown>).display_name as string)
            : null,
      }))
    : [];

  return {
    topics: topics.filter((t) => t.name !== ""),
    worksCount: typeof body.works_count === "number" ? body.works_count : null,
    updatedDate: typeof body.updated_date === "string" ? body.updated_date : null,
    homepageUrl: typeof body.homepage_url === "string" ? body.homepage_url : null,
    countryCode: typeof body.country_code === "string" ? body.country_code : null,
    openAlexId: typeof body.id === "string" ? body.id : null,
  };
}

/** Year a registry's modification date implies, used as the fact's `sourceYear`. */
function yearOf(isoDate: string | null): number | null {
  if (!isoDate) return null;
  const match = isoDate.match(/^(\d{4})/);
  return match ? Number(match[1]) : null;
}

/**
 * Build the fact list for one university from its registry records.
 *
 * Every fact carries its own source URL, the registry's own modification date as
 * `sourceAsOf`, our retrieval timestamp, an explicit scope, and a verification state
 * *computed* from that provenance — never asserted. A fact whose source is not accepted for
 * its class is dropped here rather than published at a lower confidence.
 */
function factsFor(ror: RorRecord, openAlex: OpenAlexInstitution | null, retrievedAt: string): AcquiredFact[] {
  const facts: AcquiredFact[] = [];
  const rorSourceUrl = ror.id;

  const push = (
    field: string,
    value: string | number,
    opts: {
      sourceUrl: string;
      sourceAsOf: string | null;
      scope: string;
      factClass: "identity" | "research_strength";
      writePolicy: AcquiredFact["writePolicy"];
      notes?: string | null;
    }
  ) => {
    const authority = sourceAuthority(opts.factClass, opts.sourceUrl);
    if (!authority) return; // Source not acceptable for this fact class — drop, never downgrade.
    const outcome = resolveVerificationState({
      authority,
      sourceYear: yearOf(opts.sourceAsOf),
      retrievedAt,
      cadenceDays: CADENCE_DAYS[opts.factClass] ?? 365,
    });
    facts.push({
      field,
      value,
      factClass: opts.factClass,
      writePolicy: opts.writePolicy,
      scope: opts.scope,
      sourceUrl: opts.sourceUrl,
      sourceType: authority.sourceType,
      sourceTier: authority.tier,
      sourceAsOf: opts.sourceAsOf,
      retrievedAt,
      verificationState: outcome,
      notes: opts.notes ?? null,
    });
  };

  if (ror.websiteUrl) {
    // fill_if_null: an existing website_url was set from the institution's own site by
    // earlier hand research. ROR's `links.website` is a curated mirror of the same thing and
    // is occasionally the older form (http://, or a pre-rebrand host), so it is excellent for
    // closing gaps and must not be allowed to overwrite a value we already have.
    push("website_url", ror.websiteUrl, {
      sourceUrl: rorSourceUrl,
      sourceAsOf: ror.lastModified,
      scope: "institution",
      factClass: "identity",
      writePolicy: "fill_if_null",
      notes: ror.domains.length > 0 ? `ROR domains: ${ror.domains.join(", ")}` : null,
    });
  }

  if (ror.city) {
    // cross_check_only: ROR's city comes from geonames and names the administrative locality,
    // which for several real institutions is a suburb or district rather than the city a
    // student would recognise (Cape Town -> "Rondebosch", HKU -> "Pok Fu Lam"). Useful as a
    // disagreement signal, never as a replacement.
    push("city", ror.city, {
      sourceUrl: rorSourceUrl,
      sourceAsOf: ror.lastModified,
      scope: "institution_geonames_locality",
      factClass: "identity",
      writePolicy: "cross_check_only",
      notes: ror.latitude !== null && ror.longitude !== null ? `geonames lat/lng ${ror.latitude},${ror.longitude}` : null,
    });
  }

  // Deliberately NOT acquired from ROR, after inspecting the pilot output:
  //
  // * institution_type — ROR's vocabulary for every university in the roster is just
  //   ["education", "funder"]. That is strictly coarser than what this column already holds
  //   for hand-researched rows ("Public research university"), so importing it would make the
  //   column worse while looking like enrichment. The public/private and research-intensity
  //   distinction ORYN's filters actually need is not in ROR at all.
  // * established_year — no column exists for it, it carries no student value, and it is the
  //   one field where ROR is demonstrably shaky for merged institutions (it states 2010 for
  //   Sorbonne Université, which was formed in 2018).

  if (openAlex?.topics.length && openAlex.openAlexId) {
    // Stored as a compact ranked string rather than five rows: it is one fact ("what this
    // institution actually publishes on"), and its usefulness is the ordering.
    // supersede_by_date is safe here: this is a brand-new metric ORYN has no value for, and
    // OpenAlex recomputes it, so a newer snapshot genuinely supersedes an older one.
    push("research_topics_top5", openAlex.topics.map((t) => t.name).join(" | "), {
      sourceUrl: openAlex.openAlexId,
      sourceAsOf: openAlex.updatedDate,
      scope: "institution_all_time",
      factClass: "research_strength",
      writePolicy: "supersede_by_date",
      notes: `works_count=${openAlex.worksCount ?? "unknown"}; fields: ${[...new Set(openAlex.topics.map((t) => t.field).filter(Boolean))].join(", ")}`,
    });
  }

  return facts;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const isPilot = args.includes("--pilot");
  const outIndex = args.indexOf("--out");
  const outPath = outIndex >= 0 && args[outIndex + 1] ? args[outIndex + 1] : DEFAULT_OUT;
  const limitIndex = args.indexOf("--limit");
  const limit = limitIndex >= 0 && args[limitIndex + 1] ? Number(args[limitIndex + 1]) : Number.POSITIVE_INFINITY;

  if (!isPilot) {
    console.error(
      "This script currently supports --pilot only.\n" +
        "Enumerating the full 1,010-university spine requires SUPABASE_SECRET_KEY (read policies are\n" +
        "authenticated-only), which is not set in this environment. See docs/founder-blocked-backlog.md item 2."
    );
    process.exitCode = 1;
    return;
  }

  const roster = PILOT_ROSTER.slice(0, Number.isFinite(limit) ? limit : undefined);
  const retrievedAt = new Date().toISOString();
  const universities: AcquiredUniversity[] = [];
  const unresolved: { declaredName: string; declaredCountry: string; reason: string }[] = [];

  for (const entry of roster) {
    const search = await searchRorByName(entry.name);
    await sleep(200);

    if (!search || search.items.length === 0) {
      unresolved.push({ declaredName: entry.name, declaredCountry: entry.country, reason: "No ROR record returned for this name." });
      console.log(`UNRESOLVED  ${entry.name} — no ROR hit`);
      continue;
    }

    // Country has to agree before a registry hit is accepted as the same institution. ROR's
    // relevance ranking is good but not authoritative about *which* institution we meant.
    const rorCountryOf = (r: RorRecord) => countryFromIso2(r.countryCode);
    const candidates = search.items.filter((r) => {
      const c = rorCountryOf(r);
      return c !== null && sameCountry(entry.country, c);
    });

    if (candidates.length === 0) {
      const top = search.items[0];
      unresolved.push({
        declaredName: entry.name,
        declaredCountry: entry.country,
        reason: `Top ROR hits are not in ${entry.country} (best: "${top.displayName}" in ${rorCountryOf(top) ?? top.countryCode ?? "unknown"}).`,
      });
      console.log(`UNRESOLVED  ${entry.name} — country mismatch`);
      continue;
    }

    // Prefer an exact name match inside the country; otherwise the top in-country hit, but
    // only when it is unambiguous. Anything else is left unresolved for a human.
    const exact = candidates.filter((r) => r.names.some((n) => nameKey(n.value) === nameKey(entry.name)));
    let chosen: RorRecord | null = null;
    if (exact.length === 1) chosen = exact[0];
    else if (exact.length > 1) {
      unresolved.push({
        declaredName: entry.name,
        declaredCountry: entry.country,
        reason: `${exact.length} ROR records in ${entry.country} carry this exact name (${exact.map((r) => r.id).join(", ")}).`,
      });
      console.log(`UNRESOLVED  ${entry.name} — ambiguous exact match`);
      continue;
    } else if (candidates.length === 1) chosen = candidates[0];
    else {
      unresolved.push({
        declaredName: entry.name,
        declaredCountry: entry.country,
        reason: `No exact name match among ${candidates.length} in-country ROR records; top candidates: ${candidates
          .slice(0, 3)
          .map((r) => `"${r.displayName}" (${r.id})`)
          .join(", ")}.`,
      });
      console.log(`UNRESOLVED  ${entry.name} — no exact name match among ${candidates.length} in-country records`);
      continue;
    }

    if (chosen.status !== "active") {
      unresolved.push({ declaredName: entry.name, declaredCountry: entry.country, reason: `ROR record ${chosen.id} status is "${chosen.status}", not active.` });
      console.log(`UNRESOLVED  ${entry.name} — ROR status ${chosen.status}`);
      continue;
    }

    const openAlex = await fetchOpenAlexByRor(chosen.id);
    await sleep(200);

    const facts = factsFor(chosen, openAlex, retrievedAt);
    universities.push({
      declaredName: entry.name,
      declaredCountry: entry.country,
      rorId: chosen.id,
      rorDisplayName: chosen.displayName,
      rorCountryName: countryFromIso2(chosen.countryCode),
      rorLastModified: chosen.lastModified,
      externalIds: { ror: chosen.id.replace(/^https?:\/\/ror\.org\//, ""), ...chosen.externalIds },
      aliases: [...new Set(chosen.names.map((n) => n.value))],
      acronyms: chosen.acronyms,
      facts,
    });

    console.log(`ok          ${entry.name} -> ${chosen.id} (${facts.length} facts, ids: ${Object.keys(chosen.externalIds).join("/") || "none"})`);
  }

  const fixture: AcquisitionFixture = {
    schemaVersion: 1,
    generatedAt: retrievedAt,
    generator: "scripts/acquire-university-facts.ts --pilot",
    sources: [
      { name: "Research Organization Registry (ROR)", api: "https://api.ror.org/v2/organizations", licence: "CC0", factClasses: ["identity"] },
      { name: "OpenAlex", api: "https://api.openalex.org/institutions", licence: "CC0", factClasses: ["research_strength"] },
    ],
    universities,
    unresolved,
  };

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(fixture, null, 2)}\n`);

  const factCount = universities.reduce((n, u) => n + u.facts.length, 0);
  const byField = new Map<string, number>();
  for (const u of universities) for (const f of u.facts) byField.set(f.field, (byField.get(f.field) ?? 0) + 1);

  console.log(`\nResolved ${universities.length}/${roster.length}; unresolved ${unresolved.length}.`);
  console.log(`${factCount} facts written to ${outPath}`);
  for (const [field, count] of [...byField.entries()].sort()) {
    console.log(`  ${field.padEnd(24)} ${count}/${universities.length}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
