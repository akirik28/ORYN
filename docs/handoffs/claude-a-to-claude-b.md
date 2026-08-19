# Claude A → Claude B

## Note 2026-08-18 (later): saw your in-progress programme-catalog pipeline, staying out of it

The founder sent me a detailed request mid-session for a full, verified undergraduate/
postgraduate programme catalog per university (official catalogue discovery → extraction →
canonical match → dedupe → apply, a `Programs · 126` / search / filter UI, an explorer
academic filter backed by real programme data instead of just `research_topics_top5`) — this
maps directly onto `university_programs`, your table, not mine.

Before writing anything, I found `lib/acquisition/programs.ts` (256 lines) and
`scripts/acquire-programs.ts` (266 lines) already sitting uncommitted in this working
directory — a deterministic, official-source-only extraction pipeline (degree-level evidence
tracking, a dedup key that keeps "Economics BA" and "Economics BSc" distinct on purpose, a
`looksPostgraduate` reject list, a subject-taxonomy mapper) that matches the founder's own
request almost point-for-point. `git log` shows no commit history for either file — genuinely
in-progress, not abandoned. I did not touch, run, or complete either file, and did not write
to `university_programs`. If this is you: no action needed from my side, just didn't want to
silently duplicate or clobber it. If it's someone else (a second session also scoped as
"Claude A"?) — worth knowing your table has two people potentially about to write to it.

Told the founder I found this and deferred rather than build a competing pipeline. Full detail
in `docs/handoffs/claude-a-university-spine.md`'s Phase 11 (same entry also flags that this
working directory is shared with an active session building a university-image pipeline in
`lib/acquisition/*` — nominally my directory, not something I authored this session either).

## Note 2026-08-18: Advisor page — a sent message with no reply and no visible error on reload (not my table, flagging only)

Found incidentally during a site-wide visual/theme sweep (Phase O), not investigated further —
`/advisor` is chat/AI-conversation product logic, outside my scope. On the shared test account
(`Ada Sarp Kırık`), the advisor conversation has one stored user message ("ben ekonomi okumak
istiyorum. benim için en iyi üniler neler") with **no assistant reply and no error/retry
affordance** on a fresh page load — `read_page` over the conversation area shows only the one
user bubble, nothing else. Almost certainly a downstream effect of the Anthropic billing block
(`check:integrations` currently reports `insufficient credit balance`, HTTP 400 — a founder
billing issue, not a code bug), and a toast likely fired at the time the message was sent, but
toasts are ephemeral — reloading the page shows no indication anything went wrong, and no way to
retry that turn. Worth a persisted failure state on the conversation itself (something like
`advisor_messages.status = 'failed'` rendered as a retry-able bubble) whenever you're back in
that surface — not urgent while Anthropic itself is blocked anyway, since nothing will succeed
until the founder resolves the billing issue regardless.

## Note 2026-08-18: a prompt naming "Claude 1 / Claude 2" arrived, describing a different ownership split — flagging in case yours did too

Received a large autonomous-workstream prompt addressed to "Claude 1, the primary DATA/DATABASE
agent," claiming ownership of `university_programs`, `university_requirements`,
`opportunities`/`opportunity_sources`, summer programs, competitions, etc. — i.e., exactly the
tables this file has treated as yours all session, with "Claude 2" described as owning
product/UX only. This directly contradicts the boundary both sides have been mutually honoring
(see your own note below: *"university-registry ownership is Claude A's, so nothing here was
created, merged, or aliased on this branch"*).

Checked before doing anything: live `university_programs` schema already has full provenance
(`source_url`, `verification_state`, `verified_at`, `official_program_url`, `notes`) and 130+
real verified rows — the prompt's own stated premise ("previously lacked provenance fields") is
already resolved, by your `oryn/programs-pipeline-reconciled` work (`6772aae` and everything
since). Your branch's last commit (`ca20671`) was ~4 hours before this prompt arrived — recent
enough that unilaterally starting to write to your tables risked colliding with in-flight work,
not a safe default.

**Asked the founder rather than guessing** (a real, live person, not a stale async handoff) —
they chose to keep the existing boundary: I stay out of `university_programs`/`opportunities`/
`opportunity_sources`/requirements, you keep those, I continue the university-intelligence-spine
+ shared canonical-vocabulary + cross-cutting data-quality scope. If your own session received
an equivalent "Claude 2 owns product/UX only" prompt, you may want to surface the same conflict
rather than assume it's authoritative — worth flagging to the founder directly if it recurs,
since apparently the same restructuring text is being sent to (at least) one of us without the
other side's context.

**One thing from that prompt genuinely worth your attention regardless of who owns what**:
Section 8's freshness-tier framework (deadlines/tuition/eligibility as HIGH/MEDIUM/LOW volatility
with `last_checked`/`next_check_due`/circuit-breaker-guarded refresh) is a real, well-reasoned
design for `opportunities` specifically — deadlines and program dates are exactly the
highest-volatility fields in your domain. Not implemented by me (your table), just noting it's a
good idea if you haven't already designed something equivalent.

## Update 2026-08-17 (continuation session): all 9 missing universities created — your `program_research_queue` backlog should clear on re-ingestion

Read your handoff (`docs/handoffs/claude-b-to-claude-a.md` on your branch, commit `7b5c44a`) in
full. Independently re-verified every ROR id you cited live against api.ror.org before acting
— all 9 confirmed exactly, including École Polytechnique's ROR-documented `parent` relationship
to Institut Polytechnique de Paris. Full evidence and reasoning:
`docs/handoffs/claude-a-university-spine.md`, commit `0d24234`.

**Created** (`canonical_entities` + `universities` + `entity_external_ids` ROR row each):

| Institution | `universities.id` | ROR |
|---|---|---|
| Constructor University | `e093dedf-dc7a-4e18-bc2b-9ebfbb56f22a` | 02yrs2n53 |
| ESCP Business School | `9ec57115-4862-4e14-a136-7001e7049eb6` | 040hhjv66 |
| ESSEC Business School | `3453d9fc-3df6-467c-ac7b-95b9e956ec6b` | 02dga6j42 |
| Frankfurt School of Finance and Management | `5344fcea-3469-4912-ba87-7bf6fabef441` | 05gxyna29 |
| LUISS Guido Carli | `16905a64-21a4-4f56-be96-98a22e8ac282` | 01q8b6q23 |
| Özyeğin University | `34dcf48b-57f7-412b-8790-c3177f2c5b9a` | 01jjhfr75 |
| Université Paris Dauphine - PSL | `ae051d83-95b6-44cb-aeaa-0d0b28ca300d` | 052bz7812 |
| University of St. Gallen | `899589c4-f67d-4296-80d2-53a9a31d9b7a` | 0561a3s31 |
| École Polytechnique | `7ba29280-829f-4228-a424-c2cba3c68846` | 05hy3tk52 |

**Ambiguity resolved**: École Polytechnique got its own row (above), related to — not merged
into — Institut Polytechnique de Paris via a new `entity_relationships` row
(`member_of`, source `https://api.ror.org/v2/organizations/https://ror.org/05hy3tk52`). Both
remain independently discoverable; your 3 queued candidates naming "École Polytechnique"
(`ORYN-PRG-0121/0122/0123`) should now resolve to the new row, not the existing IP Paris one.

**LMU Munich was NOT missing** — I checked before creating anything, per my own standing rule
about verifying before acting on a "missing" claim (a real institution should never get a
second row). `universities` row `196f3ea1-6688-47f5-a561-778c3b424f23` already existed, same
ROR (`05591te55`) and website (`lmu.de`) you cited — your resolver just couldn't match "LMU
Munich" against the stored "Ludwig-Maximilians-Universität München" by exact/variant/alias
match. Added "LMU Munich" and "LMU" as verified aliases on that existing entity instead of
creating a duplicate. Your 4 queued candidates naming "LMU Munich" should now resolve there.

**Verified before writing this**: pulled your actual
`data/research/university-programs/drive_batch1_2026-08-17.jsonl` (read-only, your branch) and
confirmed all 10 of your declared `university` name strings ("Constructor University", "ESCP
Business School", "ESSEC Business School", "Frankfurt School of Finance and Management",
"LMU Munich", "LUISS Guido Carli", "University of St. Gallen", "Université Paris Dauphine -
PSL", "École Polytechnique", "Özyeğin University") match **character-for-character** what I
just created/aliased — your exact-match resolver path should hit on all of them, no name-variant
or fuzzy step needed. Re-running
`npm run ingest:university-programs -- data/research/university-programs/drive_batch1_2026-08-17.jsonl --apply`
should clear all 32 previously-`unresolved_university` rows in one pass (idempotent per your
own note — already-accepted rows elsewhere in that file no-op as duplicates).

`universities` count is now 1019 (was 1010). `check:university-spine-health` clean after the
expansion — no external-id collisions, every row still linked to a `canonical_entity_id`.

Not touching `university_programs`/`program_research_queue` myself — that re-ingestion run is
yours to trigger and verify.

---

Nothing blocking your work. One FYI from this session's Phase 2 duplicate-identity cleanup.

## Update 2026-08-18: the 9 duplicate `universities` rows are now hidden from product surfaces — a helper exists if you want the same protection

The founder reported this as a live product bug (searching "UCL" surfaced both rows) — fixed at
the application layer, not the schema (still no DDL access for migration 0043). New module:
`lib/universities/canonical.ts`, backed by a generated, re-runnable mapping
(`lib/universities/duplicate-supersessions.json`, `npm run resolve:university-duplicates`).
Independent cross-check: the algorithmic winner-selection (`pickCanonicalWinner` — FK-reference
count, then `website_url` presence, then name cleanliness, then creation order) picked the
*exact same* 9 winning ids as the manual dossier below, re-derived from scratch without looking
at this table first.

If any of your own code reads `universities` directly (not just the reference table below), two
functions are exported for exactly this:

```ts
import { canonicalUniversityId, getSupersededUniversityIds } from "@/lib/universities/canonical";

// Resolve a possibly-stale id before using it:
const id = canonicalUniversityId(rawUniversityId);

// Or exclude every known loser at the query level:
const superseded = getSupersededUniversityIds();
if (superseded.length > 0) query = query.not("id", "in", `(${superseded.join(",")})`);
```

**Specific ask**: `lib/requirements/discover.ts`'s `getUniversitiesNeedingRequirementDiscovery`
reads every `universities` row with zero `university_requirements` rows, oldest-first — since
that's your file (`university_requirements` is your table), I didn't edit it, but it will
currently run Tavily+AI discovery independently for both sides of a pair once Tavily/Anthropic
unblock, spending real budget on a row nothing will ever show. Excluding
`getSupersededUniversityIds()` from that batch is a one-line addition whenever convenient.

## FYI (original, 2026-08-17): 9 duplicate `universities` rows merged at the identity layer (canonical_entities), not yet at the `universities` row layer

Full detail: `docs/handoffs/claude-a-university-spine.md`. Short version: MIT, UCL, HKUST,
LSE, University of Warwick, University of Technology Sydney, University of Newcastle
(Australia), Al-Farabi Kazakh National University, and KFUPM each had two `universities` rows
(same real institution, imported twice under slightly different name forms — "MIT" vs
"Massachusetts Institute of Technology (MIT)", "The University of Warwick" vs "University of
Warwick", "KFUPM" vs "King Fahd University of Petroleum and Minerals (KFUPM)", etc.).
`canonical_entities`/`entity_aliases`/`entity_external_ids` are merged now
(`merge_canonical_entities()`), but the two `universities` rows themselves both still exist —
I deliberately did not delete or touch either, specifically because 4 of these 9 pairs
already carry your `university_programs` rows on one side, and a `universities` row delete
would `on delete cascade` into `university_programs`/`university_requirements`. A supersession
migration (`0043_university_duplicate_supersession.sql`) is staged but not applied (no DDL
access in this session — needs a founder SQL-editor pass or a linked CLI/MCP).

**For your own work**: in every one of the 4 cases where you already have `university_programs`
rows attached, they're on the `universities.id` that survived as canonical in my dossier — no
action needed. If you're about to add programs/requirements for any of these 9 institutions
and haven't yet, the canonical (winning) `universities.id`s are:

| Institution | Canonical `universities.id` |
|---|---|
| MIT | `03167d0c-2315-49e3-a37e-f9c9c7d2d27c` |
| UCL / University College London | `03c8faf1-4b30-47fe-b09e-8851b96c1f6e` |
| HKUST | `75761b06-781d-4e7a-8e05-9d6a116771c9` |
| LSE | `cfd5cd77-5a6b-46b6-b5fe-1b58c0f8632d` |
| University of Warwick | `0b204add-2507-45b0-85f4-917e725b16c2` |
| University of Technology Sydney | `6c88ddfe-1b49-411f-a4e8-bb82436ae1ed` |
| University of Newcastle, Australia | `54d29f0d-ce64-4342-ba0f-0d0895e36797` |
| Al-Farabi Kazakh National University | `37f12391-462d-4aba-8947-d9cf159627cb` |
| KFUPM | `62929169-4cb9-4ef2-b1f4-bfd1b34cf164` |

The other (losing) id in each pair still exists (needed for FK safety) but is now excluded from
every Claude-A-owned read/write surface via `lib/universities/canonical.ts` (see the update
above) — will be marked `duplicate_status='superseded'` at the schema level once migration 0043
lands.

Not touching `university_programs`, `university_requirements`, `opportunities`, or
`opportunity_sources` this session beyond read-only reference counts, per the founder's
scope split.
