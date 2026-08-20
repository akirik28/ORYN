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
 *
 * Output and how it reaches the database:
 *
 * This script only extracts and writes files — it never touches `university_programs`
 * itself. Two files are written: the raw fixture (`--out`, full extraction detail incl.
 * blockers, for audit) and a `.jsonl` batch in the exact
 * docs/research-handoff-university-programs.md contract (`ResearchProgramRecord`) next to
 * it. That JSONL is applied the same way any researched batch is — through the existing,
 * already-tested ingestion path, not a second write path:
 *
 *   npm run ingest:university-programs -- <the .jsonl path> --apply
 *
 * That command performs identity resolution, source-authority checking, and dedup against
 * live `university_programs`, and writes a `program_research_queue` audit row for every
 * outcome (not just accepted ones) — all logic this script deliberately does not duplicate.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { extractPrograms, subjectCategoryOf, type CatalogueRule, type ExtractedProgram } from "../lib/acquisition/programs";
import { sourceAuthority } from "../lib/acquisition/source-authority";
import { CADENCE_DAYS, resolveVerificationState } from "../lib/acquisition/verification";
import { fetchAllRowsVerified } from "../lib/acquisition/paginate";
import { nameKey } from "../lib/acquisition/normalize";
import type { ResearchProgramRecord } from "../lib/programs/ingest";

export {};

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — this script needs the DB to resolve university ids, so it will report that.
}

const USER_AGENT = "ORYN-data-acquisition/1.0 (+https://github.com/akirik28/ORYN)";
const DEFAULT_OUT = "supabase/fixtures/university-programs-pilot.json";
const DEFAULT_JSONL_OUT = "data/research/university-programs/acquire-programs-batch.jsonl";

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
    rule: {
      hrefPattern: "/courses/undergraduate/[a-z0-9-]{4,}",
      // "a-z-of-ug-courses" is the index page itself; "your-trinity-pathways"/"your-trinity-education"
      // are informational nav pages under the same URL prefix, not named degree programmes — found
      // live: without these, the pattern matched them as bachelor's programmes on page-context alone.
      excludePatterns: ["a-z-of-ug-courses", "your-trinity-pathways", "your-trinity-education"],
      sectionIsUndergraduate: true,
    },
  },
  {
    // Batch 2 (2026-08-20). Same verification discipline as the pilot pair above: each catalogue
    // below was fetched and its full matched-programme list eyeballed by hand before being
    // trusted (see data/research/university-programs/acquire-programs-batch2_2026-08-20.jsonl and
    // the session's commit history for the specifics). Several other candidate universities from
    // the same research pass were tried and dropped rather than forced through a messy rule:
    // University of Toronto (catalogue fragmented across multiple separate faculty calendars, no
    // single clean index), University of Melbourne / University of Sydney / UNSW Sydney / National
    // University of Singapore (bot-protected or JS-rendered course search, no static programme
    // links in the fetched HTML), University of Manchester / King's College London / University
    // of Bristol / University of Queensland (JS-driven course-finder widgets), McGill University
    // (blocked the fetch outright), Universiti Malaya / Tsinghua University / Waseda University
    // (no single-page catalogue with a clean, verifiable link pattern).
    universityName: "The University of Edinburgh",
    country: "United Kingdom",
    catalogueUrl: "https://study.ed.ac.uk/programmes/undergraduate-a-z",
    rule: { hrefPattern: "/programmes/undergraduate/[0-9]+-[a-z0-9-]+", sectionIsUndergraduate: true },
  },
  {
    universityName: "University of Waterloo",
    country: "Canada",
    catalogueUrl: "https://uwaterloo.ca/future-students/programs",
    rule: {
      // Negative lookahead on "business" specifically (not excludePatterns' plain substring
      // match): "/programs/business" is a hub page ("Business programs"), but
      // "/programs/business-administration-...-double-degree" (two real programmes) share that
      // exact prefix, so a substring exclude would have silently dropped both real programmes
      // along with the hub — found live.
      hrefPattern: "/future-students/programs/(?!business$)[a-z0-9-]{4,}",
      // "themes"/"by-faculty" are alternate browse views of the same page, not programme pages;
      // "minors"/"environmental-degrees"/"exchange-programs" are hub/CTA pages ("Minors and
      // specializations", "Environmental programs", "Study abroad") that the same A-Z-shaped
      // hrefPattern otherwise matches as if they were named degree programmes — found live.
      // "bachelor-of-arts"/"bachelor-of-science" are purely descriptive ("A Bachelor of Arts
      // (BA) is a university degree that focuses on...") with no admission-plan language and no
      // apply instruction — found live, confirmed by direct fetch, and excluded. Contrast kept
      // deliberately: "physical-sciences" etc. are NOT excluded, since Waterloo's own page for
      // those says "Apply to Physical Sciences and choose one of these eight majors" — a real
      // first-year admission plan a student genuinely applies to, not a hub page, even though it
      // also leads to choosing a major — also confirmed by direct fetch before deciding to keep it.
      excludePatterns: [
        "/programs/themes",
        "/programs/by-faculty",
        "/programs/minors",
        "/programs/environmental-degrees",
        "/programs/exchange-programs",
        "/programs/bachelor-of-arts",
        "/programs/bachelor-of-science",
      ],
      sectionIsUndergraduate: true,
    },
  },
  {
    universityName: "University of Glasgow",
    country: "United Kingdom",
    catalogueUrl: "https://www.gla.ac.uk/undergraduate/degrees/",
    rule: { hrefPattern: "/undergraduate/degrees/[a-z0-9-]{3,}/", sectionIsUndergraduate: true },
  },
  {
    // Batch 3 (2026-08-20). First entries in China/India/Australia/Japan/Korea/Spain/Malaysia/
    // Russia/Saudi Arabia/Taiwan's zero-coverage bracket — every candidate below was fetched raw
    // (not through a browser) and its matched-link list eyeballed by hand before being trusted,
    // same discipline as batches 1-2. Far more candidates were tried and dropped than kept, and
    // the failure shapes were new ones this pipeline hadn't hit before, worth recording precisely
    // so a future pass doesn't re-attempt them blind:
    //   - Card-grid catalogues where the programme's own name lives in a sibling heading/paragraph
    //     next to the link rather than inside the anchor's own text — Australian National
    //     University's "all-programs-and-courses" page (h4 title beside a bare "Course details"
    //     link) and University of Navarra's "studies/degrees" page (title/category/duration/campus
    //     all concatenated inside one anchor). extractPrograms() reads only the anchor's own text,
    //     by design (see this file's header on that constraint), so both would need a materially
    //     different extraction shape to support rather than a same-shape hrefPattern/exclude tweak.
    //   - Client-rendered SPA shells that return real HTML over curl but populate the actual
    //     programme list after hydration — HSE University's Vue app (`bachelor/language/en`; only
    //     9 incidental links in the raw response against a claimed 40+ programmes).
    //   - Nav-only / mega-menu pages with no per-programme link at all, just links to colleges or
    //     department subdomains a student would still have to browse individually — Universiti
    //     Kebangsaan Malaysia ("undergraduate-programmes"), King Fahd University of Petroleum and
    //     Minerals ("admissions/majors"), Yonsei University's Global One-Stop Center
    //     ("gosc/academics/undergraduate"), Zhejiang University's International Campus bachelor
    //     list (a CMS-mangled URL with only nav links, no programme entries), National Taiwan
    //     University's "academics_list" (a directory of college subdomains, not degree names),
    //     IIT Delhi's academics.iitd.ac.in (WordPress content pages, not a programme index),
    //     Prince Sultan University and Effat University (each splits its catalogue per-college
    //     with no unified index page).
    //   - Client-rendered with no server fallback at all — Universidad Autónoma de Madrid's
    //     "todos-grados" page (nav chrome only, zero degree links in the raw response).
    //   - Bot-protected — Universitat de Barcelona ("oferta_formativa/graus", HTTP 403 to a
    //     declared, honest User-Agent).
    //   - Unreachable/renamed — Alfaisal University's "academics/undergraduate-programs" (404) and
    //     Australian National University's htaccess-redirect guess before the real
    //     study.anu.edu.au URL was found (also dropped for the card-grid reason above once found).
    universityName: "Universiti Sains Malaysia (USM)",
    country: "Malaysia",
    catalogueUrl: "https://admission.usm.my/index.php/undergraduate/undergraduate-international",
    rule: {
      hrefPattern: "undergraduate-international\\?view=article&id=[0-9]+&catid=[0-9]+",
      // USM's site is Joomla-run: every real URL, including every genuine programme page,
      // starts with the "/index.php" front controller. DEFAULT_EXCLUDES' "/index" (meant for
      // generic index/landing pages) would otherwise reject all 62 of them — found live.
      disableDefaultExcludes: ["/index"],
      sectionIsUndergraduate: true,
    },
  },
  {
    universityName: "IE University",
    country: "Spain",
    // Page's own <title> is "Undergraduate Degrees | IE University" — the official undergraduate
    // index, not a general programmes page that happens to include bachelor's degrees.
    catalogueUrl: "https://www.ie.edu/university/studies/academic-programs/",
    rule: {
      hrefPattern: "academic-programs/bachelor-[a-z-]+/",
      sectionIsUndergraduate: true,
    },
  },
  {
    // Batch 4 (2026-08-21). Continuing the same China/India/Australia/Japan/Korea/Russia/Saudi
    // Arabia/Taiwan zero-coverage push (Malaysia and Spain were closed out by batch 3 above).
    // Sixteen candidates were fetched raw and inspected by hand this round; NTU Singapore below
    // is the only one that survived — every other candidate is recorded here, by failure shape,
    // so a future pass doesn't re-attempt any of them blind. None of batch 1-3's already-tried
    // list (see the batch-3 comment above) was re-attempted.
    //   - Bot-protected, confirmed with both the declared acquisition User-Agent AND a standard
    //     browser User-Agent (so this is not a UA-sniffing issue a nicer header would fix) —
    //     McMaster University's Acalog calendar (academiccalendars.romcmaster.ca, AWS WAF
    //     `x-amzn-waf-action: challenge`, HTTP 202 with an empty body to both UAs), University of
    //     Alberta (ualberta.ca/en/undergraduate-programs, CloudFront HTTP 403; its Acalog calendar
    //     at calendar.ualberta.ca hit the identical AWS WAF challenge as McMaster), Monash
    //     University (monash.edu/study/courses/find-a-course, HTTP 403), and National University
    //     of Singapore re-checked at a different, cleaner-looking URL than the batch-2 attempt
    //     (nus.edu.sg/oam/undergraduate-programmes — still Incapsula-protected, `noindex,nofollow`
    //     shell with only an `_Incapsula_Resource` challenge script, same as before).
    //   - JS-driven course-finder/degree-finder widgets, same failure shape as Melbourne/Sydney/
    //     UNSW/Queensland from batch 2 — University of British Columbia (you.ubc.ca/programs/,
    //     1.3MB response but only 126 anchors, all nav/footer chrome, zero programme links),
    //     University of Auckland (find-a-study-option.html, a "Filter by programme type" tab
    //     widget with no per-programme links in the raw response), University of Adelaide
    //     (degree-finder/subjectsearch, nav-only, the tool's own results are client-rendered).
    //   - Client-rendered SPA shell returning almost no markup over curl, same shape as HSE
    //     University from batch 3 — Peking University's international-admission undergraduate page
    //     (isd.pku.edu.cn/en/undergraduate_program.php; raw response is an empty `<html><head>
    //     </head><body></body></html>`).
    //   - New failure shape this batch: the official programme list published as a downloadable
    //     PDF or spreadsheet attachment rather than as HTML links — Shanghai Jiao Tong
    //     University's international-undergraduate page links out to a PDF ("List of 2026 SJTU
    //     Undergraduate Program in Chinese for International Students") instead of listing named
    //     programmes as anchors; Fudan University's "Undergraduate" section is a news/announcement
    //     feed whose only two real entries are a PDF-linked article and an .xlsx attachment, not a
    //     catalogue of programme pages.
    //   - New failure shape this batch: a card-grid where even the department/programme name is
    //     plain text next to the link, not inside it — closely related to (but distinct from) the
    //     ANU/Navarra card-grid shape from batch 3, which at least put a title in a sibling
    //     element; Seoul National University's undergraduate colleges page renders every
    //     department name as `<p class="text">Dept. of X</p>` with no enclosing `<a>` at all — only
    //     the parent *college* (not department) is a link, so there is no per-programme anchor to
    //     extract in the first place, not even a mislabeled one.
    //   - Directory of department subdomains, not degree names — same shape as IIT Delhi from
    //     batch 3 — IIT Bombay's "Bachelors' Programmes" page (acad.iitb.ac.in/admissions/
    //     bachelors) links each subject to that department's own homepage (e.g. che.iitb.ac.in,
    //     cse.iitb.ac.in), not to a named "X B.Tech" programme page.
    //   - Nav-only, no majors list at all — KAIST's admission-information page
    //     (kaist.ac.kr/en/html/admission/0201.html; entirely site chrome, no department/major
    //     content) and Korea University (oia.korea.ac.kr's admission pages 404 or redirect to
    //     `about:blank` without a session).
    //   - Broken/misconfigured page, not merely blocked — University of Delhi's course-listing
    //     page (du.ac.in/du/index.php?page=courses-offered) returns a ~1KB stub whose only content
    //     is a JS redirect to a private IP address (192.168.1.1), not a real 403/404 or a
    //     JS-rendered SPA — most likely a stale reverse-proxy or geo-routing artifact on DU's own
    //     infrastructure. Recorded as broken rather than retried, since there is no clean page
    //     behind it to target differently.
    universityName: "Nanyang Technological University, Singapore (NTU Singapore)",
    country: "Singapore",
    // Page lists both the university's overall "Degree Programmes" and links out to graduate/
    // other-faculty pages, but every genuine undergraduate entry's own URL carries the literal
    // path segment "/education/undergraduate-programme/" (singular "programme", NTU's own
    // taxonomy term) — confirmed live: none of the 55+ matched links name a master's, PhD, MBA,
    // or diploma award, and the segment itself is what sectionIsUndergraduate below asserts as
    // evidence, the same "the URL path itself carries the degree-level claim" design already used
    // for Delft and IE University above. Deliberately narrow: this excludes real undergraduate
    // pages hosted under other faculty subpaths (e.g. .../mae/admissions/undergraduate-programmes/
    // detail/... for Robotics, or the Nanyang Business School's shared single-major/double-major
    // hub pages) rather than risk a looser pattern pulling in minors or search-filter links.
    catalogueUrl: "https://www.ntu.edu.sg/education/degree-programmes",
    rule: {
      hrefPattern: "/education/undergraduate-programme/[a-z0-9()-]+",
      // One link in the live page points at wcms-prod-admin.ntu.edu.sg instead of the public
      // www.ntu.edu.sg — confirmed by direct fetch to be a non-public CMS staging host (HTTP 403
      // to the declared acquisition User-Agent), evidently a content-authoring mistake left in the
      // published page. Same institution domain (so sameInstitutionDomain wouldn't catch it) but
      // not a URL a real visitor can land on, so it is excluded explicitly rather than stored as a
      // broken official_program_url.
      excludePatterns: ["wcms-prod-admin"],
      sectionIsUndergraduate: true,
    },
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
  const jsonlOutIndex = args.indexOf("--jsonl-out");
  const jsonlOutPath = jsonlOutIndex >= 0 && args[jsonlOutIndex + 1] ? args[jsonlOutIndex + 1] : DEFAULT_JSONL_OUT;
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

  // Convert into the existing research-handoff contract rather than inventing a second
  // write path — see the file header. Degree level here is asserted only because
  // ProgramFact.degreeLevelEvidence is non-"none" (extractPrograms() already enforced
  // that), so verification_status can honestly say "Verified" without overclaiming.
  const jsonlRecords: ResearchProgramRecord[] = entries.flatMap((entry, entryIndex) =>
    entry.programs.map((p, programIndex) => ({
      research_program_id: `ACQ-PRG-${retrievedAt.slice(0, 10)}-${entryIndex}-${programIndex}`,
      university_name: entry.universityName,
      university_country: entry.country,
      university_official_domain: new URL(entry.officialWebsite).hostname.replace(/^www\./, ""),
      program_name: p.officialName,
      // Every existing university_programs row (all 198 as of 2026-08-20) uses the descriptive
      // string "Bachelor / first-cycle", not the internal "bachelor" token ExtractedProgram
      // carries — mapped here so this pipeline's rows dedup-key and read identically to the
      // research-handoff path's rows rather than silently forking the convention.
      degree_level: p.degreeLevel === "bachelor" ? "Bachelor / first-cycle" : null,
      degree_type: p.degreeToken,
      subject_hint: p.subjectCategory,
      official_program_url: p.officialUrl,
      source_url: p.sourceUrl,
      source_type: p.sourceType,
      verification_status: `Verified - official catalogue page fetched and parsed (degree evidence: ${p.degreeLevelEvidence})`,
      researched_at: p.retrievedAt,
      researcher_notes: `Deterministic extraction, scripts/acquire-programs.ts, catalogue ${entry.catalogueUrl}.`,
    }))
  );
  mkdirSync(dirname(jsonlOutPath), { recursive: true });
  writeFileSync(jsonlOutPath, jsonlRecords.map((r) => JSON.stringify(r)).join("\n") + (jsonlRecords.length > 0 ? "\n" : ""));

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
  console.log(`\nWritten fixture to ${outPath}`);
  console.log(`Written research-handoff batch to ${jsonlOutPath}`);
  console.log(`\nTo apply: npm run ingest:university-programs -- ${jsonlOutPath} --apply`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
