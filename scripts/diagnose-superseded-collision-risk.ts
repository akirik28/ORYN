#!/usr/bin/env node
/**
 * Read-only scan: for every superseded university, does a research record naming its
 * canonical replacement (the normal case) collide ambiguously against BOTH the canonical row
 * and its own superseded duplicate under the real resolveIdentity() used by
 * lib/requirements/ingest.ts and lib/deadlines/ingest.ts — the same defect class found for
 * Warwick in the top-5 package (loadUniversityCandidates doesn't filter duplicate_status).
 * No writes.
 */
import { resolveIdentity, type LocalUniversity, type ExternalIdentity } from "../lib/acquisition/identity";
import { fetchAllRowsVerified, type PostgrestTarget } from "../lib/acquisition/paginate";

try {
  process.loadEnvFile(".env.local");
} catch {}

const PAIRS: { supersededId: string; supersededName: string; canonicalId: string; canonicalName: string; country: string }[] = [
  { supersededId: "6bdd71e9-9ab3-4f64-bf9b-b6a821784115", supersededName: "The University of Newcastle, Australia (UON)", canonicalId: "54d29f0d-ce64-4342-ba0f-0d0895e36797", canonicalName: "The University of Newcastle, Australia", country: "Australia" },
  { supersededId: "f1d7d625-4c39-4132-a54e-e567e1390185", supersededName: "The University of Technology Sydney (UTS)", canonicalId: "6c88ddfe-1b49-411f-a4e8-bb82436ae1ed", canonicalName: "University of Technology Sydney", country: "Australia" },
  { supersededId: "29e16fe0-3f8f-46d3-8d34-f5fa48370a14", supersededName: "The Hong Kong University of Science and Technology (HKUST)", canonicalId: "75761b06-781d-4e7a-8e05-9d6a116771c9", canonicalName: "The Hong Kong University of Science and Technology", country: "Hong Kong SAR" },
  { supersededId: "6f0df596-4ee5-49da-82ad-8057bfaa890d", supersededName: "Farabi University (former Al - Farabi Kazakh National University)", canonicalId: "37f12391-462d-4aba-8947-d9cf159627cb", canonicalName: "Al-Farabi Kazakh National University", country: "Kazakhstan" },
  { supersededId: "0e01bc5d-0e1e-4e35-a629-2befec4e3cb3", supersededName: "KFUPM", canonicalId: "62929169-4cb9-4ef2-b1f4-bfd1b34cf164", canonicalName: "King Fahd University of Petroleum and Minerals (KFUPM)", country: "Saudi Arabia" },
  { supersededId: "cc117524-044e-49b9-8ddd-a628d021d3e1", supersededName: "The London School of Economics and Political Science (LSE)", canonicalId: "cfd5cd77-5a6b-46b6-b5fe-1b58c0f8632d", canonicalName: "London School of Economics and Political Science", country: "United Kingdom" },
  { supersededId: "ad3ef0a4-1502-4bca-bc2c-69c71e40e2d5", supersededName: "The University of Warwick", canonicalId: "0b204add-2507-45b0-85f4-917e725b16c2", canonicalName: "University of Warwick", country: "United Kingdom" },
  { supersededId: "cf8adcbd-7164-462e-ba76-f95ef23214ea", supersededName: "UCL", canonicalId: "03c8faf1-4b30-47fe-b09e-8851b96c1f6e", canonicalName: "University College London", country: "United Kingdom" },
  { supersededId: "ba3a30b2-c6e2-4a0f-ba32-6da028175d35", supersededName: "Massachusetts Institute of Technology (MIT)", canonicalId: "03167d0c-2315-49e3-a37e-f9c9c7d2d27c", canonicalName: "Massachusetts Institute of Technology", country: "United States" },
];

async function main() {
  const target: PostgrestTarget = { url: process.env.NEXT_PUBLIC_SUPABASE_URL!, key: process.env.SUPABASE_SECRET_KEY! };
  const { rows: universities } = await fetchAllRowsVerified<{ id: string; name: string; country: string }>(target, "universities", "id,name,country", "order=id");
  const candidates: LocalUniversity[] = universities.map((u) => ({ id: u.id, name: u.name, country: u.country }));

  for (const pair of PAIRS) {
    const countryCandidates = candidates.filter((c) => c.country === pair.country);
    const external: ExternalIdentity = { displayName: pair.canonicalName, names: [pair.canonicalName], countryName: pair.country };
    const result = resolveIdentity(external, countryCandidates);
    const collides = result.status === "unresolved" && result.reason.includes("Multiple local universities");
    console.log(`${pair.canonicalName} (canonical ${pair.canonicalId.slice(0,8)}, superseded ${pair.supersededId.slice(0,8)}) -> ${result.status}${result.status === "unresolved" ? " :: " + result.reason : " :: " + (result as { match: { universityId: string } }).match.universityId}`);
    console.log(`    COLLIDES WITH SUPERSEDED DUPLICATE: ${collides ? "YES" : "no"}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
