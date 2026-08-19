#!/usr/bin/env node
/**
 * Explicit, auditable strategic expansion of the university spine (spec Phase 2/Priority 6,
 * University Intelligence Spine) — never an invisible side effect of program ingestion.
 *
 * Source: docs/handoffs/claude-b-to-claude-a.md (the parallel programs/opportunities
 * workstream's `program_research_queue` `unresolved_university` backlog — 9 institutions with
 * zero name/alias match anywhere in the 1,010-row spine, plus one identity ambiguity). Every
 * ROR id below was independently re-verified live against https://api.ror.org on 2026-08-17
 * by this script's author before being trusted — not copied blind from the handoff.
 *
 * One entry (LMU Munich) turned out NOT to be missing: `canonical_entities`/`universities`
 * already carry it (id `196f3ea1-6688-47f5-a561-778c3b424f23`, same ROR, same website Claude
 * B cited) — the program-pipeline's resolver just couldn't match "LMU Munich" against the
 * stored "Ludwig-Maximilians-Universität München" by exact/variant/alias matching. That is
 * an alias gap, not a missing institution, and is fixed here as an alias addition, not a new
 * row — creating a second row for an institution that already exists would be exactly the
 * kind of accidental duplicate this whole workstream has spent the session cleaning up.
 *
 * Each new institution gets: a `canonical_entities` row (verification_state='source_verified'
 * — ROR is an authoritative registry, not the institution itself, same rule the rest of
 * lib/acquisition/* already uses), a `universities` row linked to it, and an
 * `entity_external_ids` ROR row. École Polytechnique additionally gets an
 * `entity_relationships` row recording it as `member_of` Institut Polytechnique de Paris
 * (matching ROR's own parent/child relationship field) rather than being merged into that
 * existing row — they are legally and administratively distinct institutions per ROR and
 * Wikidata, each with its own admissions/degree-granting history.
 *
 * Usage:
 *   npm run expand:university-spine                 # --plan (default): show what would happen
 *   npm run expand:university-spine -- --apply        # write
 */

import { dbNormalizedName } from "../lib/acquisition/normalize";

export {};

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables.
}

interface NewInstitution {
  label: string;
  name: string;
  country: string;
  city: string;
  officialUrl: string;
  rorId: string;
  reason: string;
  relationship?: { type: string; parentUniversityName: string; sourceUrl: string; notes: string };
}

/** Every ROR id here was fetched live (either by name search landing this exact id as the
 * top hit, or — for St. Gallen, whose common English name doesn't rank well in ROR's own
 * text search — by direct id lookup) on 2026-08-17, cross-checked against Claude B's
 * independently-run citations in docs/handoffs/claude-b-to-claude-a.md. Agreement between
 * two independently-run lookups (Claude B's original research pass, this script's
 * re-verification) is itself corroborating evidence, not just a repeated claim. */
const NEW_INSTITUTIONS: NewInstitution[] = [
  {
    label: "Constructor University",
    name: "Constructor University",
    country: "Germany",
    city: "Bremen",
    officialUrl: "https://constructor.university",
    rorId: "02yrs2n53",
    reason:
      "ROR live-verified 2026-08-17 (top hit for 'Constructor University', names ['CU','CUB']). Formerly Jacobs University Bremen / International University Bremen — NOT aliased to the existing 'Universität Bremen' row (a large, unrelated public university in the same city; distinct ROR ids).",
  },
  {
    label: "ESCP Business School",
    name: "ESCP Business School",
    country: "France",
    city: "Paris",
    officialUrl: "https://escp.eu",
    rorId: "040hhjv66",
    reason: "ROR live-verified 2026-08-17 (top hit, names ['ESCP Business School','École Supérieure de Commerce de Paris']).",
  },
  {
    label: "ESSEC Business School",
    name: "ESSEC Business School",
    country: "France",
    city: "Cergy",
    officialUrl: "https://www.essec.edu",
    rorId: "02dga6j42",
    reason: "ROR live-verified 2026-08-17 (top hit for 'ESSEC Business School', names ['ESSEC','ESSEC Business School']).",
  },
  {
    label: "Frankfurt School of Finance and Management",
    name: "Frankfurt School of Finance and Management",
    country: "Germany",
    city: "Frankfurt am Main",
    officialUrl: "https://www.frankfurt-school.de",
    rorId: "05gxyna29",
    reason: "ROR live-verified 2026-08-17 (top hit, names ['Frankfurt School of Finance & Management','HFB']).",
  },
  {
    label: "LUISS Guido Carli",
    name: "LUISS Guido Carli",
    country: "Italy",
    city: "Rome",
    officialUrl: "https://www.luiss.edu",
    rorId: "01q8b6q23",
    reason: "ROR live-verified 2026-08-17 (top hit, names ['LUISS','LUISS Guido Carli']).",
  },
  {
    label: "Özyeğin University",
    name: "Özyeğin University",
    country: "Turkey",
    city: "Istanbul",
    officialUrl: "https://www.ozyegin.edu.tr",
    rorId: "01jjhfr75",
    reason: "ROR live-verified 2026-08-17 (top hit for 'Ozyegin University', names ['Özyeğin University','Özyeğin Üniversitesi']).",
  },
  {
    label: "Université Paris Dauphine - PSL",
    name: "Université Paris Dauphine - PSL",
    country: "France",
    city: "Paris",
    officialUrl: "https://dauphine.psl.eu",
    rorId: "052bz7812",
    reason:
      "ROR live-verified 2026-08-17 (top hit for 'Universite Paris Dauphine', names ['Paris Dauphine University','University Paris Dauphine-PSL']). No existing 'PSL'/'Paris Sciences' row in the registry — clean missing-institution case, not a consortium ambiguity.",
  },
  {
    label: "University of St. Gallen",
    name: "University of St. Gallen",
    country: "Switzerland",
    city: "St. Gallen",
    officialUrl: "https://www.unisg.ch",
    rorId: "0561a3s31",
    reason:
      "ROR live-verified 2026-08-17 by direct id lookup (name search for 'University of St. Gallen' ranks the Abbey Library and a hospital above it in the same city — a real ROR text-search limitation, not ambiguity about which id is correct). Names: ['HSG','University of St.Gallen','Universität St.Gallen',...].",
  },
  {
    label: "École Polytechnique",
    name: "École Polytechnique",
    country: "France",
    city: "Palaiseau",
    officialUrl: "https://www.polytechnique.edu",
    rorId: "05hy3tk52",
    reason:
      "ROR live-verified 2026-08-17 (top hit, names [\"l'X\",'École Polytechnique']). Distinct ROR id from Institut Polytechnique de Paris (042tfbd02, already in the registry) — ROR's own relationships field marks IP Paris as École Polytechnique's PARENT (the 2019 consortium structure), confirming these are related-but-distinct legal institutions, not one renamed.",
    relationship: {
      type: "member_of",
      parentUniversityName: "Institut Polytechnique de Paris",
      sourceUrl: "https://api.ror.org/v2/organizations/https://ror.org/05hy3tk52",
      notes:
        "ROR relationships field: École Polytechnique (05hy3tk52) has Institut Polytechnique de Paris (042tfbd02) as type=parent. Modeled as member_of rather than merging: each retains its own legal identity, admissions process, and (for École Polytechnique specifically) a 220-year-older institutional history predating the 2019 federation.",
    },
  },
];

interface AliasFix {
  label: string;
  existingEntityId: string;
  aliases: { alias: string; aliasType: "abbreviation" | "common" }[];
  reason: string;
}
const ALIAS_FIXES: AliasFix[] = [
  {
    label: "LMU Munich (already exists — alias gap, not a missing institution)",
    existingEntityId: "acaa7e82-9f23-493c-b2cd-6f796d55363b",
    aliases: [
      { alias: "LMU Munich", aliasType: "common" },
      { alias: "LMU", aliasType: "abbreviation" },
    ],
    reason:
      "universities row 196f3ea1-6688-47f5-a561-778c3b424f23 already exists (website lmu.de matches Claude B's citation exactly, ROR 05591te55 matches exactly). The program-pipeline's resolver couldn't match \"LMU Munich\" against the stored \"Ludwig-Maximilians-Universität München\" — fixed the designed way (add the alias), not by creating a duplicate row.",
  },
  {
    label: "Al-Farabi Kazakh National University — alias gap found during the product-visible-duplicates fix",
    existingEntityId: "07c13be2-3ce3-4ad0-8326-9f7f458a07ef",
    aliases: [{ alias: "Farabi University", aliasType: "common" }],
    reason:
      "This entity has TWO live universities rows (a known, already-merged-at-entity-level duplicate pair — see lib/universities/canonical.ts). The losing row's own declared name is \"Farabi University (former Al - Farabi Kazakh National University)\"; now that the losing row is excluded from search/browse results, its name needs to survive as a searchable alias of the winning row (\"Al-Farabi Kazakh National University\") instead, or a student searching that form finds nothing. Had zero aliases before this fix.",
  },
  {
    label: "University of Warwick — alias gap found during the product-visible-duplicates fix",
    existingEntityId: "f1d72d7c-98ae-43a1-908f-9b8cc209cd3a",
    aliases: [{ alias: "The University of Warwick", aliasType: "common" }],
    reason:
      "Same mechanism as Al-Farabi above: the losing row's name (\"The University of Warwick\") needs to survive as an alias of the winner (\"University of Warwick\") now that the losing row is excluded from results. Had zero aliases before this fix.",
  },
];

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY — see API_SETUP.md. Nothing was read.");
    process.exitCode = 1;
    return;
  }
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  console.log(`${apply ? "APPLY" : "PLAN"} — ${NEW_INSTITUTIONS.length} new institution(s), ${ALIAS_FIXES.length} alias fix(es)\n`);

  for (const inst of NEW_INSTITUTIONS) {
    // Idempotency / safety: refuse if this exact ROR id is already in the registry (under
    // any entity), or if a universities row already exists with the same normalized
    // name+country — either would mean this "missing" institution isn't actually missing,
    // exactly the LMU Munich lesson.
    const [existingRor, existingUni] = await Promise.all([
      admin.from("entity_external_ids").select("entity_id").eq("id_system", "ROR").eq("external_id", inst.rorId).maybeSingle(),
      admin.from("universities").select("id").ilike("name", inst.name).eq("country", inst.country).maybeSingle(),
    ]);
    if (existingRor.data) {
      console.log(`SKIP  ${inst.label}: ROR ${inst.rorId} already registered to entity ${existingRor.data.entity_id}.`);
      continue;
    }
    if (existingUni.data) {
      console.log(`SKIP  ${inst.label}: a universities row already matches "${inst.name}" in ${inst.country} (${existingUni.data.id}).`);
      continue;
    }

    console.log(`${apply ? "CREATE" : "WOULD CREATE"}  ${inst.label} — ${inst.city}, ${inst.country} — ROR ${inst.rorId}`);
    console.log(`  reason: ${inst.reason}`);
    if (inst.relationship) console.log(`  relationship: ${inst.relationship.type} -> ${inst.relationship.parentUniversityName}`);

    if (!apply) continue;

    const normalizedName = dbNormalizedName(inst.name);
    const { data: entity, error: entityError } = await admin
      .from("canonical_entities")
      .insert({
        entity_type: "university",
        canonical_name: inst.name,
        display_name: inst.name,
        normalized_name: normalizedName,
        city: inst.city,
        official_url: inst.officialUrl,
        canonicality_rule: "required",
        verification_state: "source_verified",
        data_status: "fresh",
        source_priority: 10,
        metadata: { created_via: "expand-university-spine", source: "docs/handoffs/claude-b-to-claude-a.md", ror_id: inst.rorId },
        last_verified_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (entityError || !entity) {
      console.error(`  FAILED canonical_entities insert: ${entityError?.message}`);
      continue;
    }

    const { data: uniRow, error: uniError } = await admin
      .from("universities")
      .insert({
        name: inst.name,
        country: inst.country,
        city: inst.city,
        website_url: inst.officialUrl,
        canonical_entity_id: entity.id,
        data_confidence: "high",
        data_status: "fresh",
        last_checked_at: new Date().toISOString(),
        last_changed_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (uniError || !uniRow) {
      console.error(`  FAILED universities insert: ${uniError?.message}`);
      continue;
    }

    const { error: extIdError } = await admin.from("entity_external_ids").insert({
      entity_id: entity.id,
      id_system: "ROR",
      external_id: inst.rorId,
      source_url: `https://ror.org/${inst.rorId}`,
      verification_state: "source_verified",
      verified_at: new Date().toISOString(),
    });
    if (extIdError) console.error(`  FAILED entity_external_ids insert: ${extIdError.message}`);

    if (inst.relationship) {
      const { data: parentUni } = await admin.from("universities").select("canonical_entity_id").ilike("name", `%${inst.relationship.parentUniversityName}%`).maybeSingle();
      if (parentUni?.canonical_entity_id) {
        const { error: relError } = await admin.from("entity_relationships").insert({
          subject_entity_id: entity.id,
          relationship_type: inst.relationship.type,
          object_entity_id: parentUni.canonical_entity_id,
          source_url: inst.relationship.sourceUrl,
          verification_state: "source_verified",
          notes: inst.relationship.notes,
        });
        if (relError) console.error(`  FAILED entity_relationships insert: ${relError.message}`);
        else console.log(`  relationship recorded: ${inst.relationship.type} -> canonical_entity ${parentUni.canonical_entity_id}`);
      } else {
        console.error(`  WARNING: could not find "${inst.relationship.parentUniversityName}" to link the relationship to — relationship NOT recorded.`);
      }
    }

    console.log(`  created: canonical_entities=${entity.id} universities=${uniRow.id}`);
  }

  console.log("");
  for (const fix of ALIAS_FIXES) {
    console.log(`${apply ? "FIX" : "WOULD FIX"}  ${fix.label}`);
    console.log(`  reason: ${fix.reason}`);
    if (!apply) continue;
    for (const alias of fix.aliases) {
      const { error } = await admin
        .from("entity_aliases")
        .upsert(
          { entity_id: fix.existingEntityId, alias: alias.alias, normalized_alias: dbNormalizedName(alias.alias), alias_type: alias.aliasType, verified: true },
          { onConflict: "entity_id,normalized_alias", ignoreDuplicates: true }
        );
      if (error) console.error(`  FAILED alias "${alias.alias}": ${error.message}`);
      else console.log(`  alias added: "${alias.alias}"`);
    }
  }

  if (!apply) console.log("\nDry run — nothing written. Re-run with --apply.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
