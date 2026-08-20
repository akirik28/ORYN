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
  /** Null for an orphan-pair merge (loser canonical_entities row has zero linked universities
   * rows to begin with — see the 2026-08-18 batch below) — there is nothing to supersede, so
   * `--supersede` skips these correctly rather than failing on a missing id. */
  loserUniversityId: string | null;
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
  {
    label: "KFUPM",
    winnerEntityId: "46257b9f-eeb1-4833-9cf6-cd19107197d5",
    loserEntityId: "384a248a-65d7-458f-a321-e5296af10596",
    winnerUniversityId: "62929169-4cb9-4ef2-b1f4-bfd1b34cf164",
    loserUniversityId: "0e01bc5d-0e1e-4e35-a629-2befec4e3cb3",
    reason:
      "Found via the Phase 5 rankings audit, not the name-collision detectors above: both universities.id rows independently claim QS 2027 rank_display \"63\" (no tie marker) in the SAME city (Dhahran) — the same institution counted twice, not a genuine QS tie. \"KFUPM\" doesn't share a normalized_name OR a nameVariants() key with the full name (same reason UCL needed manual search: a bare acronym vs a full name are lexically unrelated), so neither pass 1 nor pass 2 above found it. ROR live-verified 2026-08-17: https://api.ror.org/v2/organizations?query=King%20Fahd%20University%20of%20Petroleum%20and%20Minerals top hit ror.org/03yez3163 lists BOTH \"KFUPM\" and \"King Fahd University of Petroleum and Minerals\" as names on the SAME record. Winner carries website_url (kfupm.edu.sa); loser has neither website nor external ids. Note: founder-blocked-backlog.md item 25 named this pair; an earlier pass this session searched canonical_entities for \"king fahd\"/\"petroleum\" (substring), found only the winner, and wrongly concluded no duplicate existed — the loser's canonical_name is literally just \"KFUPM\", which doesn't contain either substring. Same search-gap class as UCL, just not re-applied here the first time.",
  },
  // ---- 2026-08-18 batch: Pass 2 orphan pairs (lower-confidence tier, Priority 9 revisit) ----
  // Every pair below is a pure Unicode-encoding-variant collision (e.g. "Universite" vs
  // "Université") where ONE side has zero linked `universities` rows — never product-visible,
  // not the UCL-class bug, just registry cleanliness. Each name was independently ROR-verified
  // (searchRorByName, single confident active match, correct country) before being added here;
  // none were auto-authorized by classifyDuplicateCandidate() alone. loserUniversityId is null
  // for all of them: there is no universities row on the losing side to supersede.
  {
    label: 'Università di Padova',
    winnerEntityId: '0117c4a8-6ca7-49ea-920f-16fd9ca7e07a',
    loserEntityId: 'ed84bcf0-8e57-4470-a1f7-8bca38dc6caa',
    winnerUniversityId: '3c231660-070e-427a-ac07-f8a860df0fde',
    loserUniversityId: null,
    reason:
      'ROR live-verified 2026-08-18: top-resolves uniquely to https://ror.org/00240q980 ("University of Padua", IT, active). Loser is a pure Unicode-encoding-variant canonical_entities row with zero linked universities rows (never enriched) — no data-loss risk from the merge.',
  },
  {
    label: 'Rheinische Friedrich-Wilhelms-Universität Bonn',
    winnerEntityId: '054145b0-fb69-4b05-81c3-4ebbea264e61',
    loserEntityId: 'aa675909-6b63-4eb5-9e00-e7ccdd83d677',
    winnerUniversityId: '099646dd-ffc5-4742-aeb1-cc77c69344eb',
    loserUniversityId: null,
    reason:
      'ROR live-verified 2026-08-18: top-resolves uniquely to https://ror.org/041nas322 ("University of Bonn", DE, active). Loser is a pure Unicode-encoding-variant canonical_entities row with zero linked universities rows (never enriched) — no data-loss risk from the merge.',
  },
  {
    label: 'Tecnológico de Monterrey',
    winnerEntityId: '6950f1ef-8229-4d48-8276-64e4dce49190',
    loserEntityId: '13125953-ddf6-4488-8df1-b76a3f4a7cfa',
    winnerUniversityId: 'a21cd657-1964-46c0-9718-79dacf08400a',
    loserUniversityId: null,
    reason:
      'ROR live-verified 2026-08-18: top-resolves uniquely to https://ror.org/03ayjn504 ("Tecnológico de Monterrey", MX, active). Loser is a pure Unicode-encoding-variant canonical_entities row with zero linked universities rows (never enriched) — no data-loss risk from the merge.',
  },
  {
    label: 'Ludwig-Maximilians-Universität München',
    winnerEntityId: 'acaa7e82-9f23-493c-b2cd-6f796d55363b',
    loserEntityId: '1a44da7a-f4cf-4ed0-a643-5a5044d2fa08',
    winnerUniversityId: '196f3ea1-6688-47f5-a561-778c3b424f23',
    loserUniversityId: null,
    reason:
      'ROR live-verified 2026-08-18: top-resolves uniquely to https://ror.org/05591te55 ("Ludwig-Maximilians-Universität München", DE, active). Loser is a pure Unicode-encoding-variant canonical_entities row with zero linked universities rows (never enriched) — no data-loss risk from the merge.',
  },
  {
    label: 'Pontificia Universidad Católica de Chile',
    winnerEntityId: '1dcda5e8-994a-445f-bfba-55b51f446453',
    loserEntityId: '36b31466-c5f4-4b43-94b3-f6f6a4b064ed',
    winnerUniversityId: 'f142977d-c4d5-4451-8b12-840a7061f7be',
    loserUniversityId: null,
    reason:
      'ROR live-verified 2026-08-18: top-resolves uniquely to https://ror.org/04teye511 ("Pontificia Universidad Católica de Chile", CL, active). Loser is a pure Unicode-encoding-variant canonical_entities row with zero linked universities rows (never enriched) — no data-loss risk from the merge.',
  },
  {
    label: 'Université catholique de Louvain',
    winnerEntityId: 'ca901071-5303-4fad-ba6e-b29bb8d33fb2',
    loserEntityId: '1f9c225d-cbe6-49fb-8eeb-de168d94c4fc',
    winnerUniversityId: '1407bb65-8bc1-412a-ba89-5f4a581b38df',
    loserUniversityId: null,
    reason:
      'ROR live-verified 2026-08-18: top-resolves uniquely to https://ror.org/02495e989 ("UCLouvain", BE, active). Loser is a pure Unicode-encoding-variant canonical_entities row with zero linked universities rows (never enriched) — no data-loss risk from the merge.',
  },
  {
    label: 'Université Paris 1 Panthéon-Sorbonne',
    winnerEntityId: '5d8c838a-eba8-461a-9ef6-78d68b4dcb14',
    loserEntityId: '215694db-b692-40e0-b295-57d4e1f6fa96',
    winnerUniversityId: '310f397e-bf9e-41b6-ad15-5c66593f5395',
    loserUniversityId: null,
    reason:
      'ROR live-verified 2026-08-18: top-resolves uniquely to https://ror.org/002t25c44 ("Université Paris 1 Panthéon-Sorbonne", FR, active). Loser is a pure Unicode-encoding-variant canonical_entities row with zero linked universities rows (never enriched) — no data-loss risk from the merge.',
  },
  {
    label: 'Friedrich-Alexander-Universität Erlangen-Nürnberg',
    winnerEntityId: '22dfc61a-1aa8-4714-9e50-5d7616986a68',
    loserEntityId: '94d28bc5-7455-4666-9c0b-50f3c2cef53b',
    winnerUniversityId: '49d066e3-52e6-4372-95ce-24212ecd96bb',
    loserUniversityId: null,
    reason:
      'ROR live-verified 2026-08-18: top-resolves uniquely to https://ror.org/00f7hpc57 ("Friedrich-Alexander-Universität Erlangen-Nürnberg", DE, active). Loser is a pure Unicode-encoding-variant canonical_entities row with zero linked universities rows (never enriched) — no data-loss risk from the merge.',
  },
  {
    label: 'Technische Universität Wien',
    winnerEntityId: '59707410-98a8-43da-a218-451cb0e24d40',
    loserEntityId: '27cda26b-7ead-42f6-8b0a-6238535a2990',
    winnerUniversityId: 'e239a049-634f-4c02-9756-86078f2b6c58',
    loserUniversityId: null,
    reason:
      'ROR live-verified 2026-08-18: top-resolves uniquely to https://ror.org/04d836q62 ("TU Wien", AT, active). Loser is a pure Unicode-encoding-variant canonical_entities row with zero linked universities rows (never enriched) — no data-loss risk from the merge.',
  },
  {
    label: 'Universität Hamburg',
    winnerEntityId: '2a77ff73-2b95-421c-b534-425d1fa95d03',
    loserEntityId: '9a7b3262-2a8b-4ff9-930f-bab1fffaba28',
    winnerUniversityId: 'bb9fc142-370a-4ba3-869b-936e203a89fd',
    loserUniversityId: null,
    reason:
      'ROR live-verified 2026-08-18: top-resolves uniquely to https://ror.org/00g30e956 ("Universität Hamburg", DE, active). Loser is a pure Unicode-encoding-variant canonical_entities row with zero linked universities rows (never enriched) — no data-loss risk from the merge.',
  },
  {
    label: 'Université de Montréal',
    winnerEntityId: '2cc37315-d860-4fd9-8c19-c30ed9b0d10c',
    loserEntityId: 'b9a23d64-4823-410b-aaa1-55b03c425118',
    winnerUniversityId: '5c116aba-9932-401d-b2e8-1879500cfb51',
    loserUniversityId: null,
    reason:
      'ROR live-verified 2026-08-18: top-resolves uniquely to https://ror.org/0161xgx34 ("Université de Montréal", CA, active). Loser is a pure Unicode-encoding-variant canonical_entities row with zero linked universities rows (never enriched) — no data-loss risk from the merge.',
  },
  {
    label: 'Technische Universität Dresden',
    winnerEntityId: '2eb696b9-0518-40f6-8cd0-d433315e7f44',
    loserEntityId: 'd2b78c57-728a-4b69-8eab-70928e05f0e4',
    winnerUniversityId: '9b957f10-d9d0-4a64-b28e-601bd6cc8a61',
    loserUniversityId: null,
    reason:
      'ROR live-verified 2026-08-18: top-resolves uniquely to https://ror.org/042aqky30 ("Technische Universität Dresden", DE, active). Loser is a pure Unicode-encoding-variant canonical_entities row with zero linked universities rows (never enriched) — no data-loss risk from the merge.',
  },
  {
    label: 'Universitat Autònoma de Barcelona',
    winnerEntityId: '735c08c7-a32c-4c2c-b502-f2d3a2186b6d',
    loserEntityId: '30885d05-fd24-4f74-8bc5-ff269f8efd5c',
    winnerUniversityId: 'fb7243be-4a54-411a-94ae-04261dec71b9',
    loserUniversityId: null,
    reason:
      'ROR live-verified 2026-08-18: top-resolves uniquely to https://ror.org/052g8jq94 ("Universitat Autònoma de Barcelona", ES, active). Loser is a pure Unicode-encoding-variant canonical_entities row with zero linked universities rows (never enriched) — no data-loss risk from the merge.',
  },
  {
    label: 'Boğaziçi University',
    winnerEntityId: '31aaadf6-c81a-4782-a336-064a1f56a914',
    loserEntityId: '751ea344-2906-425e-9494-a5f9d19f5ecc',
    winnerUniversityId: '5df0803b-98e5-4484-9798-c59dddcddb84',
    loserUniversityId: null,
    reason:
      'ROR live-verified 2026-08-18: top-resolves uniquely to https://ror.org/03z9tma90 ("Boğaziçi University", TR, active). Loser is a pure Unicode-encoding-variant canonical_entities row with zero linked universities rows (never enriched) — no data-loss risk from the merge.',
  },
  {
    label: 'Université Paris-Saclay',
    winnerEntityId: '674efb18-0ef8-4b9e-9b5a-d22c7f515778',
    loserEntityId: '37c64850-9f4c-435c-8b82-b2e8da119b9e',
    winnerUniversityId: 'd1f0faea-c787-47cc-85a2-648bcee6e63d',
    loserUniversityId: null,
    reason:
      'ROR live-verified 2026-08-18: top-resolves uniquely to https://ror.org/03xjwb503 ("Université Paris-Saclay", FR, active). Loser is a pure Unicode-encoding-variant canonical_entities row with zero linked universities rows (never enriched) — no data-loss risk from the merge.',
  },
  {
    label: 'Universite libre de Bruxelles',
    winnerEntityId: '7291a334-983c-4aec-bb3b-5a44fdf236ef',
    loserEntityId: '38f58033-08fa-4f43-a4ab-baede0969d4e',
    winnerUniversityId: 'f74ab3bd-97a0-4d65-91bd-973cc6a7f4de',
    loserUniversityId: null,
    reason:
      'ROR live-verified 2026-08-18: top-resolves uniquely to https://ror.org/01r9htc13 ("Université Libre de Bruxelles", BE, active). Loser is a pure Unicode-encoding-variant canonical_entities row with zero linked universities rows (never enriched) — no data-loss risk from the merge.',
  },
  {
    label: 'Alma Mater Studiorum - Università di Bologna',
    winnerEntityId: '408e2804-cee5-4608-9da4-7d12afa3ee5b',
    loserEntityId: 'a487b667-5944-4630-a377-518014632f31',
    winnerUniversityId: '3acf2e36-46ab-4bbb-a379-8323789f5f8f',
    loserUniversityId: null,
    reason:
      'ROR live-verified 2026-08-18: top-resolves uniquely to https://ror.org/01111rn36 ("University of Bologna", IT, active). Loser is a pure Unicode-encoding-variant canonical_entities row with zero linked universities rows (never enriched) — no data-loss risk from the merge.',
  },
  {
    label: 'École Normale Supérieure de Lyon',
    winnerEntityId: '42d6d2f7-8d6a-45a7-91ee-a7f32f5f914b',
    loserEntityId: '4de1389d-d989-4dd1-8b84-f1b6d97553d0',
    winnerUniversityId: '2b729fee-39f8-4530-99d7-a4adcf300d21',
    loserUniversityId: null,
    reason:
      'ROR live-verified 2026-08-18: top-resolves uniquely to https://ror.org/04zmssz18 ("École Normale Supérieure de Lyon", FR, active). Loser is a pure Unicode-encoding-variant canonical_entities row with zero linked universities rows (never enriched) — no data-loss risk from the merge.',
  },
  {
    label: 'Eberhard Karls Universität Tübingen',
    winnerEntityId: '436d4180-6c84-4d32-9fb6-035f33482947',
    loserEntityId: 'e1a2109b-bc3e-4a8a-8638-73a3e1e647c4',
    winnerUniversityId: 'f1d89d6d-ef0c-4ba6-83cf-29efeb9f9723',
    loserUniversityId: null,
    reason:
      'ROR live-verified 2026-08-18: top-resolves uniquely to https://ror.org/03a1kwz48 ("University of Tübingen", DE, active). Loser is a pure Unicode-encoding-variant canonical_entities row with zero linked universities rows (never enriched) — no data-loss risk from the merge.',
  },
  {
    label: 'Technische Universität Berlin',
    winnerEntityId: '4c2d3edf-f2a0-440a-9df2-da68063e7028',
    loserEntityId: 'f0744b9b-d403-41b5-923e-978424889070',
    winnerUniversityId: '4627fa0c-24f7-427a-9371-555142aab3ce',
    loserUniversityId: null,
    reason:
      'ROR live-verified 2026-08-18: top-resolves uniquely to https://ror.org/03v4gjf40 ("Technische Universität Berlin", DE, active). Loser is a pure Unicode-encoding-variant canonical_entities row with zero linked universities rows (never enriched) — no data-loss risk from the merge.',
  },
  {
    label: 'Koç University',
    winnerEntityId: 'dd2ef768-3196-42c2-b22f-842aeb4899e8',
    loserEntityId: '713a3f78-c1be-4ac2-b2a9-8a9ffa020403',
    winnerUniversityId: '6e66c4e7-9d04-4262-8d33-27df6ca04c7d',
    loserUniversityId: null,
    reason:
      'ROR live-verified 2026-08-18: top-resolves uniquely to https://ror.org/00jzwgz36 ("Koç University", TR, active). Loser is a pure Unicode-encoding-variant canonical_entities row with zero linked universities rows (never enriched) — no data-loss risk from the merge.',
  },
  {
    label: 'Universidad Autónoma de Madrid',
    winnerEntityId: '85893220-e293-4709-a836-9998d7d9eea8',
    loserEntityId: '73a621e5-f14c-4c40-a914-9f3ef3ec3486',
    winnerUniversityId: 'ad25a8be-7282-48b9-a80f-004f4807482a',
    loserUniversityId: null,
    reason:
      'ROR live-verified 2026-08-18: top-resolves uniquely to https://ror.org/01cby8j38 ("Universidad Autónoma de Madrid", ES, active). Loser is a pure Unicode-encoding-variant canonical_entities row with zero linked universities rows (never enriched) — no data-loss risk from the merge.',
  },
  {
    label: 'EPFL – École polytechnique fédérale de Lausanne',
    winnerEntityId: '7a4021cc-618d-4aef-b683-1a5b6f09de84',
    loserEntityId: 'afe22b01-902a-4463-8f26-3e3e6606eb11',
    winnerUniversityId: '846029e2-39bd-40f1-8c00-bc263edbaaca',
    loserUniversityId: null,
    reason:
      'ROR live-verified 2026-08-18: top-resolves uniquely to https://ror.org/02s376052 ("École Polytechnique Fédérale de Lausanne", CH, active). Loser is a pure Unicode-encoding-variant canonical_entities row with zero linked universities rows (never enriched) — no data-loss risk from the merge.',
  },
  {
    label: 'Universidade de São Paulo',
    winnerEntityId: '7a8d1db7-77fa-4849-95ac-9ec63be6e0b0',
    loserEntityId: 'b6ed4ebb-3256-4800-8dfb-cd27e5e32f0c',
    winnerUniversityId: '5731030f-fe57-48c4-b4ab-2f64595ca088',
    loserUniversityId: null,
    reason:
      'ROR live-verified 2026-08-18: top-resolves uniquely to https://ror.org/036rp1748 ("Universidade de São Paulo", BR, active). Loser is a pure Unicode-encoding-variant canonical_entities row with zero linked universities rows (never enriched) — no data-loss risk from the merge.',
  },
  {
    label: 'Humboldt-Universität zu Berlin',
    winnerEntityId: '89bf2564-590f-4fb8-90f0-a2c5479103c4',
    loserEntityId: '9cb88d6b-1d80-413a-bfb2-99b956c36fae',
    winnerUniversityId: '84925a17-9a73-43a0-982c-2a9b846a545d',
    loserUniversityId: null,
    reason:
      'ROR live-verified 2026-08-18: top-resolves uniquely to https://ror.org/01hcx6992 ("Humboldt-Universität zu Berlin", DE, active). Loser is a pure Unicode-encoding-variant canonical_entities row with zero linked universities rows (never enriched) — no data-loss risk from the merge.',
  },
  {
    label: 'Universidad Nacional Autónoma de México',
    winnerEntityId: 'dfeeae86-0584-46de-a513-d88908d3c81f',
    loserEntityId: '92c34c0a-7009-4c5e-b123-b726b8a145bb',
    winnerUniversityId: 'bd8f606a-3bc2-4075-bb21-26869b494733',
    loserUniversityId: null,
    reason:
      'ROR live-verified 2026-08-18: top-resolves uniquely to https://ror.org/01tmp8f25 ("Universidad Nacional Autónoma de México", MX, active). Loser is a pure Unicode-encoding-variant canonical_entities row with zero linked universities rows (never enriched) — no data-loss risk from the merge.',
  },
  {
    label: 'Universität Heidelberg',
    winnerEntityId: 'ede64132-e8b1-4acf-a746-5b00d24720e2',
    loserEntityId: 'b984bc89-aef9-4ddc-af61-5ef7e794c333',
    winnerUniversityId: '700cae63-1c38-40fe-b682-88374c47a75d',
    loserUniversityId: null,
    reason:
      'ROR live-verified 2026-08-18: top-resolves uniquely to https://ror.org/038t36y30 ("Heidelberg University", DE, active). Loser is a pure Unicode-encoding-variant canonical_entities row with zero linked universities rows (never enriched) — no data-loss risk from the merge.',
  },
  {
    label: 'Université PSL',
    winnerEntityId: 'c6d07213-3c82-41a7-8861-2ba4eb28f2ad',
    loserEntityId: 'eb1ed612-126d-43b7-8fb4-92e336c8e1fc',
    winnerUniversityId: '42f43a53-b072-4734-8c22-6499b1254b04',
    loserUniversityId: null,
    reason:
      'ROR live-verified 2026-08-18: top-resolves uniquely to https://ror.org/013cjyk83 ("Université Paris Sciences et Lettres", FR, active). Loser is a pure Unicode-encoding-variant canonical_entities row with zero linked universities rows (never enriched) — no data-loss risk from the merge.',
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
      // merge_canonical_entities is safe to call twice (the source row is tombstoned, not
      // deleted, so a repeat call just re-runs no-op updates) but would add a redundant
      // canonical_entity_merges audit row every time — skip already-merged pairs so re-running
      // this script after adding a new manifest entry doesn't churn the audit trail.
      const alreadyMerged = await admin.from("canonical_entities").select("verification_state").eq("id", pair.loserEntityId).maybeSingle();
      if (alreadyMerged.data?.verification_state === "merged") {
        console.log(`  skip ${pair.label}: already merged.`);
        continue;
      }
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
      if (pair.loserUniversityId === null) {
        console.log(`  skip ${pair.label}: orphan pair, no losing universities row to supersede.`);
        continue;
      }
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
