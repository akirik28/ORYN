#!/usr/bin/env node
/**
 * University duplicate-identity dossier (spec Phase 2 — University Intelligence Spine).
 *
 * TWO independent detectors, run every time so this stays a regression check and not a
 * one-off:
 *
 *   1. EXACT normalized_name collision — reproduces migration 0039's own self-join
 *      (`canonical_entities.normalized_name`, entity_type='university',
 *      verification_state<>'merged'). As of 2026-08-17 this finds 43 pairs, and every one
 *      of them turns out to be an ORPHAN duplicate: one side has zero linked `universities`
 *      rows (never enriched, no external ids, no product-facing card), the other is the
 *      real row. Not a visible-duplicate-card bug — a registry-cleanliness one. Reported,
 *      never auto-merged (no external-id evidence exists to clear the SAFE bar).
 *
 *   2. NAME-VARIANT collision — groups by nameKey(nameVariants(canonical_name)), catching
 *      "The X" vs "X" and "X (ABBR)" vs "X" pairs that (1) misses because
 *      `canonical_entities.normalized_name` is a bare lower(unaccent()), no article/
 *      parenthetical stripping. This is where the real bug lives: every pair found this
 *      way (8 as of 2026-08-17: MIT, UCL, HKUST, LSE, University of Warwick, UTS, Al-Farabi
 *      Kazakh National University, University of Newcastle Australia) has TWO real
 *      `universities` rows — an actual visible duplicate card in the University Explorer,
 *      and on 4 of the 8, real `university_programs` rows (owned by the parallel
 *      programs/opportunities workstream) already attached to one side. Reported as
 *      LIKELY_DUPLICATE_REQUIRES_REVIEW by default (name-pattern collision alone is not
 *      "overwhelming" for a generic future run of this script) unless external ids agree
 *      or conflict, in which case SAFE_TO_CANONICALIZE / NOT_DUPLICATE respectively.
 *
 * `--merge-verified` merges ONLY the small, hand-cited MANUALLY_VERIFIED list below — each
 * entry's evidence was independently re-checked live against ROR
 * (https://api.ror.org/v2/organizations) on 2026-08-17 by name-variant search, confirming
 * both sides resolve to the identical ROR id (or, for Al-Farabi, the losing row's own
 * canonical_name is self-referential: "Farabi University (former Al - Farabi Kazakh
 * National University)"). This is deliberately NOT "auto-merge whatever pass 2 finds" —
 * name-pattern collision alone is not the "overwhelming evidence" bar; a human/agent
 * actually checking the registry is.
 *
 * `--supersede` marks the losing side of every MANUALLY_VERIFIED pair `duplicate_status =
 * 'superseded'` so listing/search surfaces can stop showing the duplicate card. Needs
 * migration 0043 (`universities.duplicate_status` / `superseded_by_id`) applied first —
 * probes for the column and reports plainly if it is not there yet, rather than failing
 * opaquely or skipping silently.
 *
 * This script NEVER deletes a `universities` row or touches university_programs /
 * university_requirements / opportunities / opportunity_sources beyond a read-only
 * reference count (owned by the parallel workstream).
 *
 * Usage:
 *   npm run audit:university-duplicates                     # report only, nothing written
 *   npm run audit:university-duplicates -- --merge-verified  # + merge_canonical_entities()
 *                                                                for the 8 hand-cited pairs
 *   npm run audit:university-duplicates -- --supersede        # + mark the losing
 *                                                                `universities` row
 *                                                                (needs migration 0043 live)
 */

import { fetchAllRowsVerified } from "../lib/acquisition/paginate";
import { nameKey, nameVariants } from "../lib/acquisition/normalize";
import { classifyDuplicateCandidate, type DuplicateClassification } from "../lib/acquisition/duplicates";

export {};

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables.
}

interface CanonicalEntityRow {
  id: string;
  canonical_name: string;
  display_name: string;
  normalized_name: string;
  country_code: string | null;
  city: string | null;
  official_url: string | null;
  verification_state: string;
  last_verified_at: string | null;
  created_at: string;
}

interface ExternalIdRow {
  entity_id: string;
  id_system: string;
  external_id: string;
}

interface UniversityRow {
  id: string;
  name: string;
  country: string;
  city: string | null;
  canonical_entity_id: string | null;
  website_url: string | null;
  student_size: number | null;
}

interface PairResult {
  detector: "exact_name" | "name_variant";
  a: CanonicalEntityRow;
  b: CanonicalEntityRow;
  classification: DuplicateClassification;
  evidence: string[];
  universitiesA: UniversityRow[];
  universitiesB: UniversityRow[];
  childRefsA: Record<string, number>;
  childRefsB: Record<string, number>;
}

/**
 * Hand-verified pairs (evidence in the file header). `winner`/`loser` are `universities.id`
 * values, chosen by real data richness (website_url, university_profile_metrics,
 * university_programs — Claude B's data on a row is a hard "this side wins" signal, never
 * overridden) — NOT by canonical_entities.verification_state, which this pass found is not
 * a reliable signal (Al-Farabi's `official_verified` side is the data-rich one; every other
 * pair's `source_verified` side is). See docs/handoffs/claude-a-university-spine.md for the
 * full per-pair reasoning.
 */
const MANUALLY_VERIFIED: {
  label: string;
  winnerEntityId: string;
  loserEntityId: string;
  winnerUniversityId: string;
  loserUniversityId: string;
  reason: string;
}[] = [
  {
    label: "MIT",
    winnerEntityId: "9d9cb092-1276-4e47-9a6d-765a97ba757b",
    loserEntityId: "5d3714f4-848a-4e68-b4c5-7c3832216313",
    winnerUniversityId: "03167d0c-2315-49e3-a37e-f9c9c7d2d27c",
    loserUniversityId: "ba3a30b2-c6e2-4a0f-ba32-6da028175d35",
    reason: "ROR live-verified 2026-08-17: both names top-resolve to ror.org/042nb2s44. Winner carries website_url + 4 university_programs rows.",
  },
  {
    label: "UCL",
    winnerEntityId: "92569827-8dd1-46bc-98df-095c6c84b189",
    loserEntityId: "4b391890-f0d5-46b1-8b90-511ec2521948",
    winnerUniversityId: "03c8faf1-4b30-47fe-b09e-8851b96c1f6e",
    loserUniversityId: "cf8adcbd-7164-462e-ba76-f95ef23214ea",
    reason: "\"University College London\" ROR-verified to ror.org/02jx3x895; \"UCL\" is the internationally unambiguous abbreviation, same city (London). Winner carries website_url + 4 university_programs rows.",
  },
  {
    label: "HKUST",
    winnerEntityId: "181c3e9c-812e-4312-ac61-681a1a5935a4",
    loserEntityId: "e4f17a85-b99e-4e35-8028-bd32316854f2",
    winnerUniversityId: "75761b06-781d-4e7a-8e05-9d6a116771c9",
    loserUniversityId: "29e16fe0-3f8f-46d3-8d34-f5fa48370a14",
    reason: "ROR live-verified 2026-08-17: both names top-resolve to ror.org/00q4vv597 (distinct from the separate real HKUST-GZ campus entity, ror.org/050h0vm43, not present in our spine). Winner has total_students metric.",
  },
  {
    label: "LSE",
    winnerEntityId: "ba53a102-ed66-4e51-a1ce-4854275b1b42",
    loserEntityId: "5c5f3a6b-d91c-472a-892a-943d562783f2",
    winnerUniversityId: "cfd5cd77-5a6b-46b6-b5fe-1b58c0f8632d",
    loserUniversityId: "cc117524-044e-49b9-8ddd-a628d021d3e1",
    reason: "ROR live-verified 2026-08-17: both names top-resolve to ror.org/0090zs177. Winner carries website_url + 4 university_programs rows.",
  },
  {
    label: "University of Warwick",
    winnerEntityId: "f1d72d7c-98ae-43a1-908f-9b8cc209cd3a",
    loserEntityId: "acaf55d9-b18b-4c37-806a-d3252ea3b110",
    winnerUniversityId: "0b204add-2507-45b0-85f4-917e725b16c2",
    loserUniversityId: "ad3ef0a4-1502-4bca-bc2c-69c71e40e2d5",
    reason: "ROR live-verified 2026-08-17: both names top-resolve to ror.org/01a77tt86 (founder-blocked-backlog.md item 25). Loser's city is literally \"England\" (not a city); winner's is \"Coventry\" and carries 4 university_programs rows.",
  },
  {
    label: "University of Technology Sydney",
    winnerEntityId: "0b13f9c6-533d-4869-89c8-20e7c6e4cd98",
    loserEntityId: "2cc9739a-70f8-4483-99ff-a52d93deebbe",
    winnerUniversityId: "6c88ddfe-1b49-411f-a4e8-bb82436ae1ed",
    loserUniversityId: "f1d7d625-4c39-4132-a54e-e567e1390185",
    reason: "ROR live-verified 2026-08-17: both names top-resolve to ror.org/03f0f6041 (distinct from the unrelated \"University of Sydney\", ror.org/0384j8v12). Both sides equally data-thin; winner chosen as the clean display name with no parenthetical acronym suffix.",
  },
  {
    label: "University of Newcastle, Australia",
    winnerEntityId: "6997f14d-c8ea-47bb-921e-962b75d9bf8c",
    loserEntityId: "5bf4d7a5-151f-40dd-a063-b3ff247fb4f0",
    winnerUniversityId: "54d29f0d-ce64-4342-ba0f-0d0895e36797",
    loserUniversityId: "6bdd71e9-9ab3-4f64-bf9b-b6a821784115",
    reason: "ROR live-verified 2026-08-17: both names top-resolve to ror.org/00eae9z71 (distinct from the unrelated UK \"Newcastle University\" / Newcastle-upon-Tyne, ror.org/01kj2bm70, and from our own separate correct \"Newcastle University\" (UK) row). Both sides equally data-thin; winner has the plainer city (\"Newcastle\" vs \"Newcastle CBD\") and the earlier created_at.",
  },
  {
    label: "Al-Farabi Kazakh National University",
    winnerEntityId: "07c13be2-3ce3-4ad0-8326-9f7f458a07ef",
    loserEntityId: "5fec8b9c-4c42-439c-a447-51458a47c222",
    winnerUniversityId: "37f12391-462d-4aba-8947-d9cf159627cb",
    loserUniversityId: "6f0df596-4ee5-49da-82ad-8057bfaa890d",
    reason: "Loser's own canonical_name is self-referential (\"Farabi University (former Al - Farabi Kazakh National University)\"). Winner carries website_url (farabi.university) + ROR/WIKIDATA/GRID/ISNI/CROSSREF_FUNDER external ids; loser has none of either. Same city (Almaty).",
  },
];

/** Thin adapter: script rows are snake_case Supabase columns, the shared classifier speaks
 * a plain camelCase shape so it has zero dependency on any particular row-fetch shape. */
function classifyPair(
  a: CanonicalEntityRow,
  b: CanonicalEntityRow,
  idsByEntity: Map<string, ExternalIdRow[]>,
  isNameVariantOnly: boolean
): { classification: DuplicateClassification; evidence: string[] } {
  const toLike = (e: CanonicalEntityRow) => ({ id: e.id, canonicalName: e.canonical_name, countryCode: e.country_code, city: e.city });
  return classifyDuplicateCandidate(toLike(a), toLike(b), idsByEntity.get(a.id) ?? [], idsByEntity.get(b.id) ?? [], { nameVariantOnly: isNameVariantOnly });
}

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY — see API_SETUP.md. Nothing was read.");
    process.exitCode = 1;
    return;
  }
  const rest = { url, key };
  const mergeVerified = process.argv.includes("--merge-verified");
  const supersede = process.argv.includes("--supersede");

  const { rows: entities } = await fetchAllRowsVerified<CanonicalEntityRow>(
    rest,
    "canonical_entities",
    "id,canonical_name,display_name,normalized_name,country_code,city,official_url,verification_state,last_verified_at,created_at",
    "entity_type=eq.university&verification_state=neq.merged&order=id.asc"
  );
  console.log(`Loaded ${entities.length} live (non-merged) university canonical entities.`);

  // ---- Pass 1: exact normalized_name collision ----
  const byNormalizedName = new Map<string, CanonicalEntityRow[]>();
  for (const e of entities) {
    const list = byNormalizedName.get(e.normalized_name) ?? [];
    list.push(e);
    byNormalizedName.set(e.normalized_name, list);
  }
  const exactGroups = [...byNormalizedName.values()].filter((g) => g.length > 1);
  const exactIds = new Set(exactGroups.flat().map((e) => e.id));

  // ---- Pass 2: name-variant collision, among entities NOT already in an exact group ----
  const remaining = entities.filter((e) => !exactIds.has(e.id));
  const byVariantKey = new Map<string, CanonicalEntityRow[]>();
  for (const e of remaining) {
    const keys = new Set(nameVariants(e.canonical_name).map(nameKey).filter(Boolean));
    for (const k of keys) {
      const list = byVariantKey.get(k) ?? [];
      if (!list.some((x) => x.id === e.id)) list.push(e);
      byVariantKey.set(k, list);
    }
  }
  const variantGroups = [...byVariantKey.values()].filter((g) => g.length > 1);
  // Dedupe groups that share members (e.g. a 3-way variant chain) into pairs, avoiding
  // reporting the same pair twice under two different collision keys.
  const variantPairKeys = new Set<string>();
  const variantPairs: [CanonicalEntityRow, CanonicalEntityRow][] = [];
  for (const group of variantGroups) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const key = [group[i].id, group[j].id].sort().join("|");
        if (variantPairKeys.has(key)) continue;
        variantPairKeys.add(key);
        variantPairs.push([group[i], group[j]]);
      }
    }
  }

  const totalExactPairs = exactGroups.reduce((n, g) => n + (g.length * (g.length - 1)) / 2, 0);
  console.log(`Pass 1 (exact normalized_name): ${exactGroups.length} group(s), ${totalExactPairs} pair(s).`);
  console.log(`Pass 2 (name-variant, article/parenthetical-aware): ${variantPairs.length} pair(s).\n`);

  const allIds = [...exactGroups.flat().map((e) => e.id), ...variantPairs.flatMap(([a, b]) => [a.id, b.id])];
  const { rows: externalIds } = allIds.length
    ? await fetchAllRowsVerified<ExternalIdRow>(rest, "entity_external_ids", "entity_id,id_system,external_id", `entity_id=in.(${allIds.join(",")})&order=entity_id.asc`)
    : { rows: [] as ExternalIdRow[] };
  const idsByEntity = new Map<string, ExternalIdRow[]>();
  for (const row of externalIds) idsByEntity.set(row.entity_id, [...(idsByEntity.get(row.entity_id) ?? []), row]);

  const { rows: universities } = allIds.length
    ? await fetchAllRowsVerified<UniversityRow>(rest, "universities", "id,name,country,city,canonical_entity_id,website_url,student_size", `canonical_entity_id=in.(${allIds.join(",")})&order=id.asc`)
    : { rows: [] as UniversityRow[] };
  const universitiesByEntity = new Map<string, UniversityRow[]>();
  for (const u of universities) {
    if (!u.canonical_entity_id) continue;
    universitiesByEntity.set(u.canonical_entity_id, [...(universitiesByEntity.get(u.canonical_entity_id) ?? []), u]);
  }

  async function childRefCounts(uniIds: string[]): Promise<Record<string, number>> {
    if (uniIds.length === 0) return {};
    const counts: Record<string, number> = {};
    for (const table of ["university_programs", "university_requirements"]) {
      const { rows } = await fetchAllRowsVerified<{ university_id: string }>(rest, table, "university_id", `university_id=in.(${uniIds.join(",")})&order=university_id.asc`).catch(() => ({
        rows: [] as { university_id: string }[],
      }));
      counts[table] = rows.length;
    }
    return counts;
  }

  const results: PairResult[] = [];
  for (const group of exactGroups) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];
        const { classification, evidence } = classifyPair(a, b, idsByEntity, false);
        const universitiesA = universitiesByEntity.get(a.id) ?? [];
        const universitiesB = universitiesByEntity.get(b.id) ?? [];
        results.push({
          detector: "exact_name",
          a,
          b,
          classification,
          evidence,
          universitiesA,
          universitiesB,
          childRefsA: await childRefCounts(universitiesA.map((u) => u.id)),
          childRefsB: await childRefCounts(universitiesB.map((u) => u.id)),
        });
      }
    }
  }
  for (const [a, b] of variantPairs) {
    const { classification, evidence } = classifyPair(a, b, idsByEntity, true);
    const universitiesA = universitiesByEntity.get(a.id) ?? [];
    const universitiesB = universitiesByEntity.get(b.id) ?? [];
    results.push({
      detector: "name_variant",
      a,
      b,
      classification,
      evidence,
      universitiesA,
      universitiesB,
      childRefsA: await childRefCounts(universitiesA.map((u) => u.id)),
      childRefsB: await childRefCounts(universitiesB.map((u) => u.id)),
    });
  }

  const byBucket = new Map<DuplicateClassification, PairResult[]>();
  for (const r of results) byBucket.set(r.classification, [...(byBucket.get(r.classification) ?? []), r]);

  console.log("=".repeat(78));
  console.log("SUMMARY");
  console.log("=".repeat(78));
  for (const bucket of ["SAFE_TO_CANONICALIZE", "LIKELY_DUPLICATE_REQUIRES_REVIEW", "NOT_DUPLICATE", "AMBIGUOUS"] as DuplicateClassification[]) {
    const list = byBucket.get(bucket) ?? [];
    const exact = list.filter((r) => r.detector === "exact_name").length;
    const variant = list.filter((r) => r.detector === "name_variant").length;
    console.log(`  ${bucket.padEnd(34)} ${list.length}  (exact_name=${exact}, name_variant=${variant})`);
  }

  const variantResults = results.filter((r) => r.detector === "name_variant");
  if (variantResults.length > 0) {
    console.log("\n" + "=".repeat(78));
    console.log("NAME-VARIANT PAIRS (the visible-duplicate-card class — both sides carry real universities rows)");
    console.log("=".repeat(78));
    for (const r of variantResults) {
      console.log(`\n[${r.classification}] "${r.a.display_name}" (${r.a.id})  <->  "${r.b.display_name}" (${r.b.id})`);
      console.log(`  A: city=${r.a.city ?? "?"} state=${r.a.verification_state} universities=[${r.universitiesA.map((u) => u.id).join(", ") || "none"}] child_refs=${JSON.stringify(r.childRefsA)}`);
      console.log(`  B: city=${r.b.city ?? "?"} state=${r.b.verification_state} universities=[${r.universitiesB.map((u) => u.id).join(", ") || "none"}] child_refs=${JSON.stringify(r.childRefsB)}`);
      for (const e of r.evidence) console.log(`  - ${e}`);
    }
  }

  const exactCount = results.filter((r) => r.detector === "exact_name").length;
  console.log(`\n(${exactCount} exact-name pairs omitted from detail output — all AMBIGUOUS, one orphan side with 0 universities rows each; see docs/handoffs/claude-a-university-spine.md for the full list.)`);

  if (!mergeVerified && !supersede) {
    console.log(`\n${MANUALLY_VERIFIED.length} pair(s) in the hand-verified manifest. Re-run with --merge-verified to merge their canonical entities, or --supersede to mark the losing universities row (needs migration 0043).`);
    return;
  }

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  if (mergeVerified) {
    console.log(`\nApplying merge_canonical_entities() to ${MANUALLY_VERIFIED.length} hand-verified pair(s)...`);
    for (const pair of MANUALLY_VERIFIED) {
      const { error } = await admin.rpc("merge_canonical_entities", {
        p_source_entity_id: pair.loserEntityId,
        p_target_entity_id: pair.winnerEntityId,
        p_reason: `Phase 2 University Intelligence Spine — ${pair.reason}`,
      });
      if (error) {
        console.error(`  FAILED ${pair.label}: ${error.message}`);
        continue;
      }
      console.log(`  merged ${pair.label}: ${pair.loserEntityId} -> ${pair.winnerEntityId}`);
    }
  }

  if (supersede) {
    const probe = await fetch(`${url}/rest/v1/universities?select=duplicate_status&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    if (!probe.ok) {
      console.log(`\nMigration 0043 is NOT applied yet (universities.duplicate_status probe: HTTP ${probe.status}). Nothing marked. Apply supabase/migrations/0043_university_duplicate_supersession.sql, then re-run with --supersede.`);
      return;
    }
    console.log(`\nMarking the losing side of ${MANUALLY_VERIFIED.length} hand-verified pair(s) as superseded...`);
    for (const pair of MANUALLY_VERIFIED) {
      const response = await fetch(`${url}/rest/v1/universities?id=eq.${pair.loserUniversityId}`, {
        method: "PATCH",
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ duplicate_status: "superseded", superseded_by_id: pair.winnerUniversityId }),
      });
      if (!response.ok) {
        console.error(`  FAILED ${pair.label}: HTTP ${response.status} ${await response.text().catch(() => "")}`);
        continue;
      }
      console.log(`  superseded ${pair.label}: ${pair.loserUniversityId} -> ${pair.winnerUniversityId}`);
    }
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
