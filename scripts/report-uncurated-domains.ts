#!/usr/bin/env node
/**
 * Surfaces `malformed_source` research-queue rows whose actual cited source domain isn't
 * covered by any accepted authority yet — a review candidate list, not a decision-maker.
 *
 * Every research record also carries its own claim about which domain is official for its
 * institution (`university_official_domain`), and the pipeline never reads it — see the Gate
 * F domain-authority write-up (docs/handoffs/requirement-domain-authority-2026-09-01.md) for
 * the full reasoning on why that field is never auto-trusted here. This script exists
 * *because* of that refusal, not despite it: trusting the field to silently unblock records
 * is the wrong fix, but a human still has to find the candidates somehow, and re-deriving
 * "which domains are worth checking" by hand each time doesn't scale past the four
 * universities found by hand so far.
 *
 * **Checks the actual `source_url`'s own domain, not `university_official_domain`.** Those
 * two usually agree (MIT: both mitadmissions.org; UvA: both auc.nl) but are not guaranteed
 * to — found live while building this: Harvard's own real queue rows cite `questbridge.org`
 * (a third-party application/match system) while self-reporting `university_official_domain`
 * as the unrelated, already-fine `harvard.edu`. An earlier version of this script checked the
 * claimed field directly and silently reported zero candidates because of it — `harvard.edu`
 * trivially passes on its own `.edu` suffix, so the actual failing domain never got tested at
 * all. Checking `source_url` is what the real pipeline does, so it's what this checks too;
 * the claimed field is read only as *context* in the report output, flagged when it disagrees
 * with the real domain (which is itself worth knowing — LMU's own records do this: claim
 * `lmu.de`, actually cite `uni-muenchen.de`).
 *
 * So this reads both fields, but only ever to ASK A QUESTION, never to ANSWER one: for each
 * distinct (university, actual domain) pair among the rejected rows, it asks the real,
 * already-gated `sourceAuthority()` — with the university's actual `officialDomainsFor()`
 * already applied — whether that domain would pass today. If yes, it's not a candidate (the
 * gap is already curated or was never real). If no, it's printed: a name, a domain, a count,
 * and one example URL — exactly enough for a human to go verify it the way MIT, LMU, and UvA
 * were verified (live fetch, cross-linked from the primary domain, or an equivalent check),
 * never enough to promote it on the strength of the report alone.
 *
 * Read-only. Touches nothing — no queue row, no `ADDITIONAL_OFFICIAL_DOMAINS` entry, no
 * `university_requirements`/`university_deadlines` row. Adding a verified domain (to
 * `ADDITIONAL_OFFICIAL_DOMAINS` for an institution's own secondary domain, or
 * `APPLICATION_SYSTEM_DOMAINS` for a platform-wide application/matching system — see that
 * constant's own doc comment for the distinction) stays a hand-edit in
 * lib/acquisition/source-authority.ts, same as every entry added so far.
 *
 * Usage:
 *   npm run report:uncurated-domains
 */
import { domainOf, officialDomainsFor, sourceAuthority } from "../lib/acquisition/source-authority";
import { fetchAllRowsVerified, type PostgrestTarget } from "../lib/acquisition/paginate";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables (CI, hosting platform).
}

interface QueueRow {
  raw_payload: {
    university_name?: string | null;
    university_official_domain?: string | null;
    source_url?: string;
    source_authority_note?: string | null;
  };
}
interface UniversityRow {
  id: string;
  name: string;
  website_url: string | null;
}

interface Candidate {
  university: string;
  domain: string;
  count: number;
  exampleUrl: string;
  exampleNote: string | null;
  /** Set when `university_official_domain` names a *different* domain than the one that
   * actually failed. Read for context only — see this file's own top comment for why it is
   * never the domain that gets checked or reported as the candidate itself. */
  claimedDomainDisagrees: string | null;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY — see API_SETUP.md. Nothing was read.");
    process.exitCode = 1;
    return;
  }
  const target: PostgrestTarget = { url, key: secretKey };

  const [{ rows: reqRows }, { rows: dlRows }, { rows: universities }] = await Promise.all([
    fetchAllRowsVerified<QueueRow>(target, "requirement_research_queue", "raw_payload", "outcome=eq.malformed_source&order=id"),
    fetchAllRowsVerified<QueueRow>(target, "deadline_research_queue", "raw_payload", "outcome=eq.malformed_source&order=id"),
    fetchAllRowsVerified<UniversityRow>(target, "universities", "id,name,website_url", "order=id"),
  ]);
  const allRows = [...reqRows, ...dlRows];
  console.log(`Read ${reqRows.length} malformed_source requirement row(s) + ${dlRows.length} malformed_source deadline row(s) = ${allRows.length} total. ${universities.length} universities loaded for lookup.\n`);

  // Best-effort exact-name match against the live table — good enough for "which real
  // website_url does this institution already have," not a substitute for the alias-aware
  // resolveIdentity() the real ingest scripts use, since a miss here only means this report
  // treats the institution as having no website_url yet (more candidates surfaced, not fewer
  // — the safer direction for a report that must never hide a real gap by under-matching).
  const universityByName = new Map(universities.map((u) => [u.name, u]));

  const noUrlAtAll: Record<string, number> = {};
  const candidatesByKey = new Map<string, Candidate>();

  for (const row of allRows) {
    const { university_name, university_official_domain, source_url, source_authority_note } = row.raw_payload;
    if (!source_url) {
      const key = university_name ?? "(no university_name either)";
      noUrlAtAll[key] = (noUrlAtAll[key] ?? 0) + 1;
      continue;
    }
    const domain = domainOf(source_url);
    if (!domain) continue;

    const matched = university_name ? universityByName.get(university_name) : undefined;
    const officialDomains = officialDomainsFor({ name: matched?.name ?? university_name, websiteUrl: matched?.website_url });

    // The real gate, exactly as the pipeline runs it — not a re-implementation of domain
    // matching. If this already resolves, the gap is already curated (or was never real),
    // and it is not a candidate.
    const alreadyPasses = sourceAuthority("policy", source_url, officialDomains) !== null;
    if (alreadyPasses) continue;

    const claimed = university_official_domain?.trim().toLowerCase() || null;
    const claimedDomainDisagrees = claimed && claimed !== domain ? claimed : null;

    const key = `${university_name ?? "?"} ${domain}`;
    const existing = candidatesByKey.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      candidatesByKey.set(key, {
        university: university_name ?? "(unknown university)",
        domain,
        count: 1,
        exampleUrl: source_url,
        exampleNote: source_authority_note ?? null,
        claimedDomainDisagrees,
      });
    }
  }

  const candidates = [...candidatesByKey.values()].sort((a, b) => b.count - a.count || a.university.localeCompare(b.university));

  console.log("=".repeat(78));
  console.log("REVIEW CANDIDATES — not verified, not applied. Go check each one before curating it.");
  console.log("=".repeat(78));
  if (candidates.length === 0) {
    console.log("\nNone. Every malformed_source row's actual source domain either already passes\nthe gate or has no source_url to check.");
  }
  for (const c of candidates) {
    console.log(`\n${c.university}`);
    console.log(`  domain: ${c.domain}  (${c.count} row${c.count === 1 ? "" : "s"})`);
    if (c.claimedDomainDisagrees) {
      console.log(`  NOTE: the record itself claims university_official_domain="${c.claimedDomainDisagrees}" — disagrees with the domain actually cited. Worth understanding why before trusting either.`);
    }
    console.log(`  example: ${c.exampleUrl}`);
    if (c.exampleNote) console.log(`  research note: ${c.exampleNote}`);
  }

  const noUrlEntries = Object.entries(noUrlAtAll).sort(([, a], [, b]) => b - a);
  if (noUrlEntries.length > 0) {
    console.log(`\n${"-".repeat(78)}`);
    console.log(`${noUrlEntries.reduce((sum, [, n]) => sum + n, 0)} malformed_source row(s) have no source_url at all — not a domain-curation candidate, listed for visibility only:`);
    for (const [name, n] of noUrlEntries) console.log(`  ${name}: ${n}`);
  }

  console.log(`\n${"=".repeat(78)}`);
  console.log(
    `${candidates.length} candidate domain(s) across ${new Set(candidates.map((c) => c.university)).size} universities. Verify each one live before adding it to ADDITIONAL_OFFICIAL_DOMAINS (or APPLICATION_SYSTEM_DOMAINS, for a platform-wide system) in lib/acquisition/source-authority.ts.`
  );
}

main().catch((err: unknown) => {
  console.error(`\nReport failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
