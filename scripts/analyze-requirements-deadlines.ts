#!/usr/bin/env node
// Dry-run classifier for the requirements/deadlines research handoff (data/research/university-requirements/*.jsonl).
// Not yet a writer -- decides and counts only, per the "dry-run, report, wait for go" procedure.
// Deliberately conservative: identifies the subset that is safe to stage into
// university_requirements/university_deadlines TODAY, given the schema's current shape (no
// is_exclusion column, no recurrence_rule column, structured_rule always left null so
// lib/requirements/evaluate.ts's own NO_RULE_RESULT safety net applies to everything ingested
// here regardless).
import { readFileSync, readdirSync } from "node:fs";
import { resolveIdentity, type LocalUniversity } from "../lib/acquisition/identity";
import { sourceAuthority, domainOf } from "../lib/acquisition/source-authority";
import { fetchAllRowsVerified, type PostgrestTarget } from "../lib/acquisition/paginate";
import { normalizeTitle, titleSimilarity } from "../lib/opportunities/dedup";

try {
  process.loadEnvFile(".env.local");
} catch {}

interface RequirementRecord {
  research_requirement_id: string;
  university_name: string | null;
  university_country: string | null;
  university_official_domain?: string | null;
  program_name: string | null;
  category: string;
  requirement_category_db: string;
  requirement_text: string;
  text_fidelity: string;
  applies_to?: string | null;
  scope?: string | null;
  source_url: string;
  source_type: string;
  source_authority_passes_gate: boolean;
  source_authority_note?: string | null;
  retrieved_at: string;
  cycle_year: number | null;
  confidence: string;
  verification_state: string;
  limitations?: string | null;
  researcher_notes?: string | null;
  is_exclusion?: boolean | null;
  test_scale?: string | null;
  scale_ambiguity?: string | null;
  supersedes?: string | null;
}

interface DeadlineRecord {
  research_deadline_id: string;
  university_name: string | null;
  university_country: string | null;
  university_official_domain?: string | null;
  program_name: string | null;
  deadline_type: string;
  deadline_date: string | null;
  deadline_text_verbatim: string;
  deadline_time?: string | null;
  recurrence: string;
  cycle_year: number | null;
  cycle_label?: string | null;
  applies_to?: string | null;
  source_url: string;
  source_type: string;
  source_authority_passes_gate: boolean;
  retrieved_at: string;
  verification_state: string;
  limitations?: string | null;
}

function parseJsonl<T>(path: string): T[] {
  return readFileSync(path, "utf-8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l) as T);
}

// VERIFIED_HISTORICAL never appears on a requirement record in this corpus (requirements
// change rarely enough that the research lane didn't need the state there), but it's real and
// common on deadlines -- a stale past-cycle date, with nothing in the current schema to mark
// it as closed/non-actionable (same shape of gap as is_exclusion). Shared in one set since
// adding it here has zero effect on requirement classification.
const UNSAFE_VERIFICATION_STATES = new Set(["CONFLICTING_EVIDENCE", "NEEDS_REVIEW", "CURRENT_CYCLE_NOT_PUBLISHED", "VERIFIED_HISTORICAL"]);
const UNSAFE_SCALE_AMBIGUITY = new Set(["undated_scale_assumption", "partially_unsatisfiable"]);

async function main() {
  const dir = "data/research/university-requirements";
  const files = readdirSync(dir);
  const reqRecords: RequirementRecord[] = files
    .filter((f) => f.startsWith("requirements_batch"))
    .flatMap((f) => parseJsonl<RequirementRecord>(`${dir}/${f}`));
  const dlRecords: DeadlineRecord[] = files
    .filter((f) => f.startsWith("deadlines_batch"))
    .flatMap((f) => parseJsonl<DeadlineRecord>(`${dir}/${f}`));
  console.log(`Loaded ${reqRecords.length} requirement records, ${dlRecords.length} deadline records.`);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const secretKey = process.env.SUPABASE_SECRET_KEY!;
  const target: PostgrestTarget = { url, key: secretKey };

  const [{ rows: universities }, { rows: aliases }, { rows: externalIds }, { rows: existingReqs }, { rows: existingDls }] = await Promise.all([
    fetchAllRowsVerified<{ id: string; name: string; country: string; canonical_entity_id: string | null; website_url: string | null }>(target, "universities", "id,name,country,canonical_entity_id,website_url", "order=id"),
    fetchAllRowsVerified<{ entity_id: string; alias: string }>(target, "entity_aliases", "entity_id,alias", "order=id"),
    fetchAllRowsVerified<{ entity_id: string; id_system: string; external_id: string }>(target, "entity_external_ids", "entity_id,id_system,external_id", "order=id"),
    fetchAllRowsVerified<{ university_id: string; requirement_type: string; title: string | null; program_id: string | null }>(target, "university_requirements", "university_id,requirement_type,title,program_id", "order=id"),
    fetchAllRowsVerified<{ university_id: string; deadline_type: string; deadline_date: string | null }>(target, "university_deadlines", "university_id,deadline_type,deadline_date", "order=id"),
  ]);
  console.log(`Candidate pool: ${universities.length} universities. Existing: ${existingReqs.length} requirements, ${existingDls.length} deadlines.`);

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

  function resolveUniv(name: string | null, country: string | null): { id: string | null; reason: string | null } {
    if (!name?.trim()) return { id: null, reason: "no university_name (context/reference record, not attached to an institution)" };
    const res = resolveIdentity({ displayName: name, names: [name], countryName: country ?? null }, univLookup);
    if (res.status === "matched") return { id: res.match.universityId, reason: null };
    return { id: null, reason: res.reason };
  }

  // === Requirements ===
  // A record referenced by another record's `supersedes` field is stale by the research
  // lane's own admission — some supersessions are "same correct fact, re-verified" (harmless
  // if kept, just a near-duplicate our own dedup pass would likely catch anyway), but at
  // least one (Boğaziçi's original TOEFL threshold, superseded by the scale-audit's
  // corrected/flagged version) is "wrong fact corrected" — keeping the superseded row would
  // stage exactly the mistake the audit exists to catch. Excluding all of them uniformly
  // rather than trying to distinguish the two cases per-record: the superseding record
  // already independently carries the up-to-date fields (scale_ambiguity etc.), so nothing of
  // value is lost by preferring it.
  const supersededIds = new Set(reqRecords.map((r) => r.supersedes).filter((s): s is string => Boolean(s)));

  const reqBuckets: Record<string, RequirementRecord[]> = {};
  const push = (bucket: string, r: RequirementRecord) => {
    reqBuckets[bucket] = [...(reqBuckets[bucket] ?? []), r];
  };
  const safeReqs: { record: RequirementRecord; universityId: string }[] = [];

  for (const r of reqRecords) {
    const { id: universityId } = resolveUniv(r.university_name, r.university_country);
    if (!universityId) {
      push(`unresolved_university`, r);
      continue;
    }
    if (supersededIds.has(r.research_requirement_id)) {
      push("excluded: superseded by a newer record in this same corpus", r);
      continue;
    }
    if (r.is_exclusion === true) {
      push("excluded: is_exclusion=true (no schema marker, would invert)", r);
      continue;
    }
    if (UNSAFE_VERIFICATION_STATES.has(r.verification_state)) {
      push(`excluded: verification_state=${r.verification_state}`, r);
      continue;
    }
    if (r.scale_ambiguity && UNSAFE_SCALE_AMBIGUITY.has(r.scale_ambiguity)) {
      push(`excluded: scale_ambiguity=${r.scale_ambiguity}`, r);
      continue;
    }
    // Recompute source authority live with the CURRENT sourceAuthority() (today's fix added
    // application-system/test-operator tiers after these records' own precomputed
    // source_authority_passes_gate was written) rather than trusting the stale field.
    const matchedUni = universities.find((u) => u.id === universityId);
    const officialDomains = new Set(matchedUni?.website_url ? [domainOf(matchedUni.website_url)] : []);
    const authority = sourceAuthority("policy", r.source_url, officialDomains);
    if (!authority) {
      push(`excluded: source_authority fails live gate (was ${r.source_authority_passes_gate ? "true" : "false"} at research time) — ${r.source_authority_note ?? "no note"}`, r);
      continue;
    }
    safeReqs.push({ record: r, universityId });
  }

  // Dedup safe requirements against existing live rows + within-batch.
  function normalizeReqTitle(r: RequirementRecord): string {
    return r.researcher_notes && r.text_fidelity !== "verbatim_quoted" ? r.requirement_text : r.requirement_text;
  }
  const acceptedReqs: typeof safeReqs = [];
  const duplicateReqs: typeof safeReqs = [];
  for (const item of safeReqs) {
    const title = normalizeReqTitle(item.record).slice(0, 200);
    const isDupExisting = existingReqs.some(
      (e) => e.university_id === item.universityId && e.requirement_type === item.record.requirement_category_db && e.title && (normalizeTitle(e.title) === normalizeTitle(title) || titleSimilarity(e.title, title) >= 0.6)
    );
    const isDupBatch = acceptedReqs.some(
      (a) => a.universityId === item.universityId && a.record.requirement_category_db === item.record.requirement_category_db && titleSimilarity(normalizeReqTitle(a.record), title) >= 0.6
    );
    if (isDupExisting || isDupBatch) duplicateReqs.push(item);
    else acceptedReqs.push(item);
  }

  console.log("\n=== REQUIREMENTS: outcome breakdown ===");
  for (const [bucket, recs] of Object.entries(reqBuckets).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`${recs.length.toString().padStart(4)}  ${bucket}`);
  }
  console.log(`${acceptedReqs.length.toString().padStart(4)}  SAFE TO STAGE`);
  console.log(`${duplicateReqs.length.toString().padStart(4)}  excluded: duplicate (existing row or within-batch)`);
  console.log(`Total accounted: ${Object.values(reqBuckets).reduce((s, a) => s + a.length, 0) + acceptedReqs.length + duplicateReqs.length} / ${reqRecords.length}`);

  console.log("\n--- unresolved_university breakdown ---");
  const unresByName = new Map<string, number>();
  for (const r of reqBuckets["unresolved_university"] ?? []) {
    const key = `${r.university_name} | ${r.university_country}`;
    unresByName.set(key, (unresByName.get(key) ?? 0) + 1);
  }
  console.log([...unresByName.entries()].sort((a, b) => b[1] - a[1]));

  console.log("\n--- safe-to-stage, by university ---");
  const safeByUni = new Map<string, number>();
  for (const { record } of acceptedReqs) safeByUni.set(record.university_name!, (safeByUni.get(record.university_name!) ?? 0) + 1);
  console.log([...safeByUni.entries()].sort((a, b) => b[1] - a[1]));

  // === Deadlines ===
  const dlBuckets: Record<string, DeadlineRecord[]> = {};
  const pushDl = (bucket: string, r: DeadlineRecord) => {
    dlBuckets[bucket] = [...(dlBuckets[bucket] ?? []), r];
  };
  const safeDls: { record: DeadlineRecord; universityId: string }[] = [];

  for (const r of dlRecords) {
    const { id: universityId } = resolveUniv(r.university_name, r.university_country);
    if (!universityId) {
      pushDl("unresolved_university", r);
      continue;
    }
    if (r.recurrence === "recurring_annual_undated") {
      pushDl("excluded: recurring_annual_undated (no recurrence_rule column yet, deadline_date cannot represent it)", r);
      continue;
    }
    if (r.recurrence === "not_published_centrally") {
      pushDl("excluded: not_published_centrally (nothing to ingest)", r);
      continue;
    }
    if (!r.deadline_date) {
      pushDl("excluded: dated_specific but deadline_date is null (inconsistent record, needs review)", r);
      continue;
    }
    if (UNSAFE_VERIFICATION_STATES.has(r.verification_state)) {
      pushDl(`excluded: verification_state=${r.verification_state}`, r);
      continue;
    }
    const matchedUni = universities.find((u) => u.id === universityId);
    const officialDomains = new Set(matchedUni?.website_url ? [domainOf(matchedUni.website_url)] : []);
    const authority = sourceAuthority("policy", r.source_url, officialDomains);
    if (!authority) {
      pushDl(`excluded: source_authority fails live gate (was ${r.source_authority_passes_gate ? "true" : "false"} at research time)`, r);
      continue;
    }
    safeDls.push({ record: r, universityId });
  }

  const acceptedDls: typeof safeDls = [];
  const duplicateDls: typeof safeDls = [];
  for (const item of safeDls) {
    const isDupExisting = existingDls.some((e) => e.university_id === item.universityId && e.deadline_type === item.record.deadline_type && e.deadline_date === item.record.deadline_date);
    const isDupBatch = acceptedDls.some((a) => a.universityId === item.universityId && a.record.deadline_type === item.record.deadline_type && a.record.deadline_date === item.record.deadline_date);
    if (isDupExisting || isDupBatch) duplicateDls.push(item);
    else acceptedDls.push(item);
  }

  console.log("\n=== DEADLINES: outcome breakdown ===");
  for (const [bucket, recs] of Object.entries(dlBuckets).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`${recs.length.toString().padStart(4)}  ${bucket}`);
  }
  console.log(`${acceptedDls.length.toString().padStart(4)}  SAFE TO STAGE`);
  console.log(`${duplicateDls.length.toString().padStart(4)}  excluded: duplicate (existing row or within-batch)`);
  console.log(`Total accounted: ${Object.values(dlBuckets).reduce((s, a) => s + a.length, 0) + acceptedDls.length + duplicateDls.length} / ${dlRecords.length}`);

  console.log("\n--- safe-to-stage deadlines, by university ---");
  const safeDlByUni = new Map<string, number>();
  for (const { record } of acceptedDls) safeDlByUni.set(record.university_name!, (safeDlByUni.get(record.university_name!) ?? 0) + 1);
  console.log([...safeDlByUni.entries()].sort((a, b) => b[1] - a[1]));
}

main();
