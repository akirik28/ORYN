#!/usr/bin/env node
// Targeted eyeball-verification: print every record the classifier marked SAFE for the
// universities/categories the source docs specifically flagged as dangerous (Glasgow,
// Boğaziçi, Edinburgh TOEFL/English-proficiency), plus every record with is_exclusion=true or
// a non-null scale_ambiguity, so each can be manually confirmed excluded for the right reason
// rather than trusting bucket counts alone.
import { readFileSync, readdirSync } from "node:fs";
import { resolveIdentity, type LocalUniversity } from "../lib/acquisition/identity";
import { sourceAuthority, domainOf } from "../lib/acquisition/source-authority";
import { fetchAllRowsVerified, type PostgrestTarget } from "../lib/acquisition/paginate";

try {
  process.loadEnvFile(".env.local");
} catch {}

interface RequirementRecord {
  research_requirement_id: string;
  university_name: string | null;
  university_country: string | null;
  category: string;
  requirement_category_db: string;
  requirement_text: string;
  source_url: string;
  verification_state: string;
  is_exclusion?: boolean | null;
  scale_ambiguity?: string | null;
  limitations?: string | null;
  supersedes?: string | null;
}

function parseJsonl<T>(path: string): T[] {
  return readFileSync(path, "utf-8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l) as T);
}

const UNSAFE_VERIFICATION_STATES = new Set(["CONFLICTING_EVIDENCE", "NEEDS_REVIEW", "CURRENT_CYCLE_NOT_PUBLISHED"]);
const UNSAFE_SCALE_AMBIGUITY = new Set(["undated_scale_assumption", "partially_unsatisfiable"]);

async function main() {
  const dir = "data/research/university-requirements";
  const files = readdirSync(dir);
  const reqRecords: RequirementRecord[] = files.filter((f) => f.startsWith("requirements_batch")).flatMap((f) => parseJsonl<RequirementRecord>(`${dir}/${f}`));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const secretKey = process.env.SUPABASE_SECRET_KEY!;
  const target: PostgrestTarget = { url, key: secretKey };
  const [{ rows: universities }, { rows: aliases }, { rows: externalIds }] = await Promise.all([
    fetchAllRowsVerified<{ id: string; name: string; country: string; canonical_entity_id: string | null; website_url: string | null }>(target, "universities", "id,name,country,canonical_entity_id,website_url", "order=id"),
    fetchAllRowsVerified<{ entity_id: string; alias: string }>(target, "entity_aliases", "entity_id,alias", "order=id"),
    fetchAllRowsVerified<{ entity_id: string; id_system: string; external_id: string }>(target, "entity_external_ids", "entity_id,id_system,external_id", "order=id"),
  ]);
  const aliasesByEntity = new Map<string, string[]>();
  for (const a of aliases) aliasesByEntity.set(a.entity_id, [...(aliasesByEntity.get(a.entity_id) ?? []), a.alias]);
  const externalIdsByEntity = new Map<string, Record<string, string>>();
  for (const e of externalIds) {
    const ex = externalIdsByEntity.get(e.entity_id) ?? {};
    ex[e.id_system] = e.external_id;
    externalIdsByEntity.set(e.entity_id, ex);
  }
  const univLookup: (LocalUniversity & { websiteUrl?: string | null })[] = universities.map((u) => ({
    id: u.id,
    name: u.name,
    country: u.country,
    aliases: u.canonical_entity_id ? aliasesByEntity.get(u.canonical_entity_id) : undefined,
    externalIds: u.canonical_entity_id ? externalIdsByEntity.get(u.canonical_entity_id) : undefined,
    websiteUrl: u.website_url,
  }));

  const supersededIds = new Set(reqRecords.map((r) => r.supersedes).filter((s): s is string => Boolean(s)));

  function classify(r: RequirementRecord): string {
    if (!r.university_name?.trim()) return "unresolved (no university_name)";
    const res = resolveIdentity({ displayName: r.university_name, names: [r.university_name], countryName: r.university_country ?? null }, univLookup);
    if (res.status !== "matched") return `unresolved (${res.reason})`;
    if (supersededIds.has(r.research_requirement_id)) return "EXCLUDED: superseded by a newer record";
    if (r.is_exclusion === true) return "EXCLUDED: is_exclusion=true";
    if (UNSAFE_VERIFICATION_STATES.has(r.verification_state)) return `EXCLUDED: verification_state=${r.verification_state}`;
    if (r.scale_ambiguity && UNSAFE_SCALE_AMBIGUITY.has(r.scale_ambiguity)) return `EXCLUDED: scale_ambiguity=${r.scale_ambiguity}`;
    const matchedUni = universities.find((u) => u.id === res.match.universityId);
    const officialDomains = new Set(matchedUni?.website_url ? [domainOf(matchedUni.website_url)] : []);
    if (!sourceAuthority("policy", r.source_url, officialDomains)) return "EXCLUDED: source_authority fails live gate";
    return "SAFE";
  }

  console.log("=== Every English-proficiency/language record for Glasgow, Boğaziçi, Edinburgh (the doc's own flagged cases) ===");
  for (const r of reqRecords) {
    const isFlaggedUni = ["glasgow", "boğaziçi", "bogazici", "edinburgh"].some((n) => r.university_name?.toLowerCase().includes(n));
    const isLangCategory = r.category === "language" || r.requirement_category_db === "english_proficiency" || r.requirement_category_db === "language_proficiency";
    if (isFlaggedUni && isLangCategory) {
      const verdict = classify(r);
      console.log(`[${verdict}] ${r.university_name} — "${r.requirement_text}" (id=${r.research_requirement_id}, verification_state=${r.verification_state}, scale_ambiguity=${r.scale_ambiguity ?? "n/a"})`);
      if (r.limitations) console.log(`    limitations: ${r.limitations}`);
    }
  }

  console.log("\n=== Every is_exclusion=true record ===");
  for (const r of reqRecords) {
    if (r.is_exclusion === true) {
      console.log(`[${classify(r)}] ${r.university_name ?? "(no name)"} | ${r.university_country} — "${r.requirement_text.slice(0, 100)}..." (id=${r.research_requirement_id})`);
    }
  }

  console.log("\n=== Every non-null scale_ambiguity record ===");
  for (const r of reqRecords) {
    if (r.scale_ambiguity) {
      console.log(`[${classify(r)}] ${r.university_name ?? "(no name)"} — scale_ambiguity=${r.scale_ambiguity} — "${r.requirement_text}" (id=${r.research_requirement_id})`);
    }
  }

  console.log("\n=== Sanity check: any SAFE record whose requirement_text mentions TOEFL? ===");
  for (const r of reqRecords) {
    if (r.requirement_text?.toLowerCase().includes("toefl") && classify(r) === "SAFE") {
      console.log(`UNEXPECTED SAFE TOEFL RECORD: ${r.university_name} — "${r.requirement_text}" (id=${r.research_requirement_id})`);
    }
  }
  console.log("(if nothing printed above this line, no TOEFL record was classified safe)");
}

main();
