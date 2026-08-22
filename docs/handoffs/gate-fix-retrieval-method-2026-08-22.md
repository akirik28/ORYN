# GATE-FIX: the evidence gate now routes on `retrieval_method`, not prose

**Lane GATE-FIX, branch `oryn/evidence-gate-retrieval-method`, 2026-08-22. Implements the
founder-approved recommendation (option 2) of
`docs/handoffs/evidence-gate-false-rejections-2026-08-22.md`. Nothing was ingested —
ingestion of the newly-unblocked corpus is a separate lane's package.**

## What changed

### 1. The contract gained a structured field

`retrieval_method` — a closed enum declaring HOW the source page's content was actually
obtained — was added to both research record contracts (`ResearchProgramRecord` in
`lib/programs/ingest.ts`, `ResearchOpportunityRecord` in `lib/opportunities/ingest.ts`) and
both contract docs (`docs/research-handoff-university-programs.md`,
`docs/research-handoff-opportunities.md`):

| value | meaning | gate |
|---|---|---|
| `live_fetch` | retrieved live from the origin host by direct HTTP request (curl/fetch/official JSON feed) | **passes** |
| `browser_render` | retrieved live from the origin host in a browser session (JS-rendered, WAF challenge cleared by normal navigation) | **passes** |
| `archived_capture` | content came from an archive service's capture, not the origin host live | **fails** |
| `search_summary` | only a search result/snippet was seen; the page was never read | **fails** |

The handoff proposed the enum with "the status code alongside"; this implementation ships
the enum only. An `http_status` companion field would have required backfilling a number
many existing attestations don't state — the enum alone carries the entire pass/fail
decision, and status codes remain in the prose attestations where researchers recorded them.

### 2. One gate implementation, shared

`lib/acquisition/retrieval-method.ts` (new) holds the entire policy —
`judgeRetrievalEvidence()` plus the legacy `looksPageConfirmed()` matcher, which previously
existed as two hand-mirrored copies in the programs and opportunities pipelines. Both
pipelines now import from it (and re-export `looksPageConfirmed` for existing consumers).
The handoff located the gate in `lib/acquisition/source-authority.ts`; it actually lived in
`lib/programs/ingest.ts` with a mirror in `lib/opportunities/ingest.ts` — the one factual
correction to the handoff this lane found.

### 3. The backward-compatibility rule (the bar does not drop)

- **A record WITHOUT `retrieval_method`** (the entire pre-existing corpus) is judged by the
  legacy prose matcher with byte-identical semantics. Absence of the field never widens
  anything: Montréal's "Retrieved directly … HTTP 200" attestation still fails without the
  field, exactly as before. Unit-tested in both directions.
- **A record WITH the field must carry a recognized value.** A malformed value
  (`"direct_fetch"`, wrong case, etc.) fails closed and is never forgiven by prose matching.
- **Contradiction guard:** a record declaring `live_fetch`/`browser_render` whose own
  `verification_status` prose discloses a blocked or archived retrieval ("retrieval
  blocked", "Wayback", …) fails as internally inconsistent. The structured field cannot
  smuggle a record past what its own attestation admits. This guard only ever raises the
  bar.
- **New records** (researched after 2026-08-22) are required by the contract docs to
  declare the field.

### 4. Evidence-derived backfill of the blocked Canadian corpus

`scripts/backfill-retrieval-method.ts` classified each blocked record **from its own
attestation text** — deterministic rules quoting real corpus language, committed together
with their output (the modified JSONL + `retrieval-method-backfill-report-2026-08-22.json`),
no hand edits. Only records failing the legacy gate were touched; a per-line round-trip
serialization guard proves the diff is exactly one inserted field per classified line
(independently re-verified: 2,382 changed lines, all pure single-field insertions, all
positioned directly after `verification_status`). The script is idempotent and re-verifies
existing values on re-run.

| file | blocked | classified passing | archived_capture | left unset (stays blocked) |
|---|---:|---:|---:|---:|
| Montréal | 679 | 679 `live_fetch` | — | 0 |
| Queen's | 337 | 337 `live_fetch` | — | 0 |
| McMaster | 432 | 432 `browser_render` | — | 0 |
| Alberta | 96 | 94 `browser_render` + 2 `live_fetch` | — | 0 |
| Western | 553 | 550 `live_fetch` | — | 3 |
| McGill | 288 | 0 | 288 | 0 |
| **total** | **2,385** | **2,094** | **288** | **3** |

The 3 deliberately-unset Western records (the handoff counted them among the 2,097 wrongly
blocked; this lane's per-record review holds them back — quality over volume):

- `PRIO-2026-08-22-f55e3a84` / `PRIO-2026-08-22-51595e4a` (One Health pair): their own
  dedicated URL "returned HTTP 404 on three retrieval attempts — a genuine broken link on
  Western's own site"; facts were substituted from the feed's overview text and a parent
  page.
- `PRIO-2026-08-22-2ab23044` (IMS ModuleID single): the cited link was "not independently
  re-fetched itself since it resolves to the restricted westerncalendar.uwo.ca calendar
  system."

## Dry-run proof (no ingestion — nothing written)

`scripts/ingest-university-programs.ts` in dry-run mode, per file, against the live DB
(read-only), after the backfill:

| file | accepted | duplicate | insufficient_evidence | malformed_source |
|---|---:|---:|---:|---:|
| Montréal (679) | **679** | 0 | 0 | 0 |
| Queen's (337) | **337** | 0 | 0 | 0 |
| Alberta (179) | **96** | 83 | 0 | 0 |
| Western (555) | **545** | 2 | 3 | 5 |
| McMaster (432) | 0 | 0 | 0 | **432** |
| McGill (288) | 0 | 0 | **288** | 0 |

- The 83 Alberta / 2 Western duplicates are the records already ingested on 2026-08-22
  (the handoff's 1,266) — correct idempotency, not a defect.
- **McGill's 288 still do not pass — confirmed.** They now fail as `archived_capture` with
  the honest stated reason instead of by vocabulary accident.
- **Previously-blocked records that now clear the evidence gate: 2,094.** Of those, **1,657
  are accepted end-to-end** (679 + 337 + 96 + 545) and ready for a separate ingestion
  package.

### New finding surfaced by the dry run: 437 records hit the OTHER gate

McMaster's 432 and Western's 5 Huron records now clear the evidence gate but fail
`malformed_source` at the **domain-authority** gate (`sourceAuthority("programs", …)`) —
the separate half of the same problem the original handoff flagged via Dartmouth's 53
("blocked by the *domain* half of the same file for a registrar-contracted catalogue
platform"):

- **McMaster (432):** source host `academiccalendars.romcmaster.ca` — McMaster's official
  Acalog calendar on a registrar-contracted vanity domain (`romcmaster.ca`), not a
  subdomain of the stored `website_url` `mcmaster.ca`, and carrying no academic suffix.
  Verified live: `universities.website_url` for McMaster is `https://www.mcmaster.ca`.
- **Western/Huron (5):** Huron University College's own `huronu.ca` — Western's affiliated
  college on its own domain, not derivable from `uwo.ca`.

This was previously invisible because the evidence gate ran first and masked it. **This
lane deliberately did not widen domain authority** — which domains count as an
institution's own is exactly the kind of evidence-bar decision that goes up the chain, and
it was not in this package's founder-approved scope. Whoever picks it up: the mechanism in
`decideIngestion` already supports per-university official domains via
`UniversityLookupRow.websiteUrl`; a sourced registry of institution-operated auxiliary
domains (Acalog/Modern Campus vanity hosts, affiliated colleges) is the shape of the fix,
not a suffix rule.

## Migration status

**None needed, verified — not assumed.** The contract is JSONL, the gate is TypeScript,
`program_research_queue.raw_payload` (jsonb) captures the whole record including the new
field automatically, and no accepted-row column list changed. Live migration list checked
via Supabase MCP (read-only) against `qtcvcflzxbuagvvwahhu`: applied migrations end at
0056 (`requirement_shape_representability`); 0057–0059 exist in-repo unapplied, owned by
other lanes, untouched here.

## Validation

`npm run lint` clean · `npm run typecheck` clean · `npm run test` 122 files / 1,850 tests
all passing (includes 28 new tests: `__tests__/acquisition/retrieval-method.test.ts` — every
enum value, missing field both directions, malformed values, contradiction guard — plus
end-to-end gate tests in both pipelines' ingest suites) · `npm run build` succeeds.

## A corpus finding worth keeping: Alberta's gate outcomes were inverted

The prose gate didn't merely under-accept Alberta — it **inverted** it. Alberta's 83
records that passed (and were ingested) are the *index-derived* ones, whose attestation
says the programme's own page "was **not** individually re-fetched"; they passed only
because the phrase "independently **verified** content-bearing" appears mid-sentence. Its
96 blocked records are the ones whose page "was **directly fetched** and its content
read/cross-checked". The stronger attestation was blocked and the weaker one passed,
inside one file. No stronger demonstration exists that the gate was matching vocabulary
rather than protecting a standard. (The 83 are left as-is: they pass via the legacy
fallback, and re-litigating already-ingested records was out of scope — but a future
Alberta pass may want to per-page-fetch them.)
