# Verification verdict — RES-R1's rebuilt UWA (RES-V1, package V1-8)

**Verifier lane:** RES-V1 (contract / schema / ID / taxonomy / sourcing-compliance — NOT source truth)
**Verified:** 2026-08-22 · **Branch:** `origin/oryn/res-r1-au-programmes` @ `d1f235a`
· **Tool:** `scripts/validate-research-records.ts --lane=au-r1`
**Subject:** `au_programs_uwa_2026-08-22.jsonl` — **107 records**, RES-R1's full clean rebuild
after two rounds of self-caught classification bugs left the original 217-record population
silently wrong (289 → 107; 182 of the true 289-record population were genuinely postgraduate,
mislabeled undergraduate — ~63%, not the ~30% first estimated). Verified alongside the other
three AU-R1 universities already certified (UNSW 217, Sydney 149, Monash 178) — **corpus now
651 records, all four re-checked together**, not UWA in isolation. Nothing here is live or
scheduled for ingestion; researcher files **not modified**, live DB **not written**. Read-only
throughout, including the primary-source checks in §5 (direct HTTP fetches to public,
already-crawled URLs — no account creation, no form submission, no write of any kind).

## Overall verdict: **PASS on everything this package's charter asked for — plus one real,
unresolved sourcing-compliance question outside that charter, requiring a policy ruling, not
a data defect**

Contract, ID discipline, duplicate-URL, the three self-reported defect classes, and
cross-university taxonomy consistency are all independently confirmed clean on UWA's 107
records — not taken from RES-R1's own report. §5 is the one finding that isn't a clean PASS:
found while verifying `verification_status`'s fetch method (routine practice, not a directed
check), all 107 records' stored URLs sit under a robots.txt-disallowed path prefix that
immediately 301-redirects to fully-permitted content serving the identical page — structurally
very different from the CyberPatriot total-block case BASORG ruled on today (a compliant path
to the same content exists and is directly reachable), but still a real question about whether
the *original fetch requests* were compliant, and about which URL form belongs in
`official_program_url`/`source_url`. Not this verifier's call to rule on; flagged with full
mechanism so BASORG/founder can.

---

## 1. Contract validation — PASS (0 defects)

107/107 records parse, all 23 required fields present (the same 23-field schema as
UNSW/Sydney, `atar` additive like Monash — `allowKeysetVariation` correctly treats this as
documented variation, not drift, across all 651 records combined).

## 2. ID discipline — PASS (0 defects)

107/107 unique `research_program_id` (`AU-R1-uwa-NNN`). Corpus-wide collision check against
`AU-R1-` (all four universities' prefixes together, scoped per RULE-CORPUS-ID-001): zero real
collisions.

## 3. Zero duplicate `official_program_url` — verified independently, corpus-wide

Checked directly: 0 duplicate URLs within UWA's 107, and 0 across the full 651-record corpus
(UNSW+Sydney+Monash+UWA together, via the `au-r1` lane's `customLiveChecks`, which builds one
URL→record map across every record passed to it). The one named duplicate case in RES-R1's
own account — "Bachelor of Human Sciences (Pharmaceutical Health) and Doctor of Pharmacy,"
reachable via two sitemap slugs that both redirect to the same canonical page — checked
directly: appears **exactly once** in the final file (`AU-R1-uwa-038`), consistent with "found
and removed," not assumed from the count alone.

## 4. The three named defect classes — independently verified against the file, not the report

RES-R1's rebuild claimed zero of the three defects that made the original 289-record file
wrong. Checked each directly against the actual 107 records (not the commit message's claim):

| defect class | RES-R1's claim | independently verified |
|---|---|---|
| `degree_level: null` present | zero | **0/107 — confirmed** |
| "Graduate Diploma"/"Graduate Certificate" title present at all | zero | **0/107 — confirmed** (no such title exists anywhere in the file) |
| standalone "Master of X"/"Doctor of X" (no "Bachelor" in title) present | zero | **0/107 — confirmed** |
| `MJD-` course code leaked into a kept record | (not explicitly claimed, checked anyway) | **0/107** — searched every record's full JSON text, not just `degree_type`, for the literal string `MJD-` |

`degree_level` distribution matches the commit message's claimed breakdown exactly: 67 plain
Bachelor, 25 integrated-master's, 13 Honours, 2 Associate Degree = 107.

## 5. Sourcing-compliance finding: all 107 stored URLs sit behind a disallowed prefix that redirects to allowed content

**Found while checking `verification_status`'s fetch-method claim** ("Retrieved live via direct
HTTP fetch (curl, UA=ClaudeBot)... HTTP 200. `www.uwa.edu.au/robots.txt` confirmed permissive
before crawling") — routine practice for this lane, the same discipline that caught DLOPP
P1's robots.txt claims and Ashoka's live-value drift. This one didn't confirm cleanly.

**The mechanism, verified step by step, not asserted:**

1. Every one of UWA's 107 `official_program_url`/`source_url` values is a `/sitecore/content/
   uwafs/home/courses/<slug>` path — checked across all 107, not sampled (100% match, one
   distinct path prefix).
2. `www.uwa.edu.au/robots.txt`, fetched directly and read in full (71 lines, not just the
   `User-agent: *` block's first few `Disallow` lines): `Disallow: /sitecore` and
   `Disallow: /Sitecore` are both present, grouped with clearly-administrative paths (`/xsl/`,
   `/Theme/`, `/upload/`, `/App_Data/`, `/App_config/`, `/sitecore_files/`). No `Allow:`
   override for `/sitecore/content` or any sub-path exists anywhere in the file. Under the
   standard Robots Exclusion Protocol (prefix match), this disallows every URL this whole file
   uses as its source.
3. **But the disallowed URL is not where the content actually lives.** `curl -I` (headers
   only, no redirect-following) against the stored URL returns a clean, permanent
   `HTTP/2 301` with `location: https://www.uwa.edu.au/study/courses/<same-slug>` — checked on
   3 independently-sampled records (`AU-R1-uwa-001`, plus two more pulled from the middle and
   end of the file), same pattern every time, same Cloudflare-fronted server.
4. `/study/courses/*` is **not disallowed anywhere in robots.txt** — confirmed by reading the
   complete file, not just checking the one path. Fetching `/study/courses/<slug>` directly
   (no `/sitecore/` hop at all) returns the identical page, confirmed by content match.
5. `README.md`'s own discovery-method prose says the catalogue was "filtered to 422 URLs under
   `/study/courses/*`" — but the sitemap this package's own documented discovery path leads to
   (`/study/-/media/sitemaps/sitemap-future-students.xml`, fetched directly and read: 637KB,
   2,760 `<loc>` entries, 424 matching `/home/courses/*`) lists the `/sitecore/content/...`
   form as its literal `<loc>` values, not `/study/courses/*`. The README's own description and
   what the sitemap actually contains don't match — the redirect in step 3 is presumably how
   RES-R1's process (and this check) ever reached `/study/courses/*` content at all.

**Why this is not the CyberPatriot situation, and why it still isn't nothing.** CyberPatriot
was `Disallow: /` — a total block with no compliant path to the content at all. UWA has one
specific disallowed prefix among many allowed ones, and the content is fully, directly,
compliantly reachable at a different URL that serves identically — nothing about *this
content* requires touching a disallowed path. But `verification_status`'s own claim
("HTTP 200... robots.txt confirmed permissive") describes the *destination* status, not the
*request path* — and the request path, as stored, is the disallowed one. Two separate
questions follow, neither this verifier's to resolve: (a) did the actual fetch requests during
extraction request the `/sitecore/...` form first (as the sitemap literally lists), making
each one a technical robots.txt non-compliance regardless of the server's redirect — or did
the tooling already know and request the `/study/courses/...` form directly, with only the
*stored* URL field carrying the pre-redirect value; (b) regardless of (a), should
`official_program_url`/`source_url` be corrected to the canonical `/study/courses/...` form
before this data is used — the one a student clicking "View source" should actually land on,
and the one that doesn't require reasoning about a disallowed-path redirect to defend.

**Scope check — confirmed UWA-specific, not shared:** spot-checked one real stored URL's
domain from each of the other three universities' files against that domain's own
`robots.txt`. UNSW (`handbook.unsw.edu.au`) and Monash (`handbook.monash.edu`): no `Disallow`
lines matching their URL pattern at all. Sydney (`www.sydney.edu.au`): several `Disallow`
lines exist but none match the `/courses/courses/uc/...` pattern this file's URLs use. This is
a UWA/Sitecore-platform-specific configuration artifact, not a corpus-wide pattern.

## 6. Taxonomy consistency against the other three universities — PASS, 0 findings, using the V1-7-extracted check

Ran `findTaxonomyConsistencyGaps` (extracted and unit-tested in package V1-7, the exact
mechanism that found V1-4's real Sydney gap) against all 651 records together, not UWA alone —
this is inherently a cross-university check. **Zero findings.** UWA's own method (title-token,
same family as Sydney's) explicitly builds in the two fixes Sydney's V1-4 gap required:
`graduate diploma`/`graduate certificate` excluded before the plain-diploma branch can fire,
and `master`/`doctor` alone (without an accompanying `bachelor`) is never sufficient for any
inclusion branch — confirmed directly against the actual 107 records in §4, not just read as a
stated intention in the README.

## 7. `field_provenance` and null discipline — PASS

`degree_level`: 107/107 `explicit_title_token` (matches the documented method exactly — no
AQF-code field exists on this platform, same basis as Sydney). `international_eligible`: 31/107
`regulatory_inference` (CRICOS-code presence, same basis as UNSW/Monash), the remainder
correctly null with no `field_provenance` entry for it (the null-fence: a null value must carry
no provenance entry, since there's nothing to attribute a basis to). Zero values outside the
4-item closed vocabulary. `degree_type`/`faculty_or_school`/`campus` are null on all 107 by the
platform's own structural limits (no clean abbreviation field, no faculty/campus exposed on
individual degree pages) — documented as a platform fact in the README, not silently absent;
checked that this null pattern is uniform (not a mix of "genuinely absent" and "should have
been found"), consistent with UNSW's `degree_type`/Monash's `post_nominals` precedent of
letting platform-real absence be null rather than manufacturing a value.

## 8. The reconciliation math — does not match the file/README; flagged, not adjudicated

Asked to confirm "108 in scope + 106 MJD + 202 title-excluded + 6 fetch failures = 422, and
108 → 107 after removing one duplicate" against the file rather than the report. **It doesn't
match what's actually documented, on one term specifically:**

- RES-R1's README states, identically and stably across both the round-1 and round-2
  (current) revisions, in three separate places: **"UWA publishes 175 major/specialisation
  pages under `/study/courses/` alongside 247 degree programmes"** — 175 MJD, not 106. No
  occurrence of "106" or "202" appears anywhere in the README or in either round's commit
  message (`ff7e1e2`, `d1f235a`) — checked both directly, not assumed absent.
- If MJD is genuinely 175 (as documented, not as relayed), the remaining 247 must decompose as
  108 (in scope) + title-excluded + fetch-failures = 247, i.e. **139**, not 202+6=208 — a
  69-record gap, which is not incidentally the exact size of the 175-vs-106 gap either (175−106
  = 69). That arithmetic symmetry is suggestive of a transcription slip somewhere in the chain
  from RES-R1's working notes to what reached me, but I'm not treating "the numbers could be
  made to reconcile this way" as proof — the same caution BASORG named about their own earlier
  reconciliation applies here too.
- **Light independent check, not a full re-derivation**: fetched the actual sitemap
  (2,760 total `<loc>` entries, 424 under `/home/courses/*` — within 2 of the documented 422,
  plausibly same-day live drift or a filter-boundary difference, not investigated further) and
  fetched an evenly-spread sample of 20 of those 424 course pages directly, reading each one's
  actual `Course Code` card (the README's own stated authoritative signal — not the URL slug,
  which the README itself says is only a spot-check heuristic). Result: **6 MJD, 11 non-MJD
  with a real code, 3 with no Course Code card at all** (this third bucket — genuine degree
  pages structurally lacking the card, round 1's original blind spot — isn't accounted for as
  its own term in either candidate reconciliation, which may mean the true accounting has more
  than 4 buckets). 6/20 = 30% MJD; at n=20 the margin on that proportion is wide enough
  (roughly 10–50% at 95% confidence) to be statistically consistent with *either* 175/422
  (41%) or 106/422 (25%) — **not decisive** — but the point estimate sits closer to 106 than to
  175.
- **Disposition**: I'm not resolving this. The README's 175 is the only figure actually
  committed to the corpus; BASORG's relayed 106/202/6 isn't, and my own sample leans toward
  106 without confirming it. Recommend checking against RES-R1's original working notes/script
  output (if still available) rather than either document winning by default. **This does not
  affect confidence in the 107-record file itself** — §4's defect-class checks were run
  directly against the delivered records, not derived from this reconciliation, and are clean
  regardless of which intermediate count is correct.

## 9. Scope: what this verdict covers, and what it does not

**Covered:** contract (§1); ID discipline, corpus-wide, `AU-R1-`-scoped (§2); duplicate
`official_program_url`, corpus-wide across all 651 records (§3); all three named defect
classes plus an unprompted `MJD-`-leakage check, verified against the actual file (§4);
fetch-method/robots.txt compliance of the stored source URLs (§5 — found a real, unresolved
question); cross-university taxonomy consistency via the V1-7-extracted check, run against the
full 651-record corpus (§6); `field_provenance`/null discipline (§7); the requested
422-population reconciliation, checked against the file and found not to match what was
relayed (§8).

**NOT covered — open, not confirmed-absent:**
- **Source truth** for any individual record's `duration`/`ATAR`/CRICOS/title facts — not
  re-verified here, this package's scope was classification correctness and sourcing
  mechanics, not per-field fact-checking.
- **Whether §5's compliance question extends to how RES-R1's *other* platforms were fetched**
  — spot-checked UNSW/Sydney/Monash's `robots.txt` against their own URL patterns (§5) and
  found no equivalent issue on those three specifically, but did not re-audit their full fetch
  methodology beyond that spot check.
- **§8's true MJD/title-excluded/fetch-failure split** — flagged with real evidence on both
  sides, deliberately not adjudicated to a specific number.
- **Adelaide University** — not yet extracted by RES-R1; nothing to verify. If Adelaide's
  extraction reuses UWA's sitemap-to-URL discovery pattern, §5's finding is worth checking
  again there specifically before that batch is called complete, since Adelaide is also
  Sitecore-adjacent per the README's own description.
- **Whether `/sitecore` was disallowed at the time RES-R1 actually fetched** (hours before this
  check ran) — `robots.txt` is itself live, mutable content; checked as of 2026-08-22, matching
  this package's `researched_at` dates, but not proven identical to what existed at the exact
  fetch timestamps.

## 10. The tool — no changes this package

`--lane=au-r1` was reused exactly as V1-7 left it (`findTaxonomyConsistencyGaps` extracted and
unit-tested there is what ran in §6). No new engine work was needed for this package — the
existing `customLiveChecks` escape hatch already covers a fourth university within the same
lane without modification, which is the generalization it was built for in V1-4.

```bash
npm run validate:research -- --lane=au-r1 data/research/university-programs/au_programs_unsw_2026-08-22.jsonl data/research/university-programs/au_programs_sydney_2026-08-22.jsonl data/research/university-programs/au_programs_monash_2026-08-22.jsonl data/research/university-programs/au_programs_uwa_2026-08-22.jsonl
```
