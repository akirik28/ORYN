# Link-health sweep: source_url and official_url across the active catalog — 2026-09-03

CEO's brief, following the thin-category pass where 2 of 4 candidates failed on unreachable
organiser domains and one (TeensGive.org) had its domain reassigned to a commercial
essay-writing service: measure how much of the *existing* catalogue rests on a link that no
longer works, or no longer belongs to the organisation credited. Measurement only — nothing
disabled, nothing written. Started with `active` (282 rows, 366 distinct `official_url`/
`source_url` values), per the instruction that those are what a student can reach today.

**Headline: zero instances of the dangerous shape (a redirect to an unrelated organisation)
in the active catalog.** 232 of 282 rows (82%) are unambiguously healthy. The remaining 50
split into three categories that need different responses, detailed below — most of them
need no action at all.

## Method — reuse, not rebuild

Read `lib/opportunities/reverification/` first, per the standing instruction. Reused two
pieces of it directly rather than writing new fetch logic:

- **`fetchRung2BrowserUA` / `fetchRung3FollowRedirect`** (`fetch-ladder.ts`) — a direct fetch
  with a realistic browser User-Agent (`redirect: "manual"`, so a 3xx is captured as its own
  outcome rather than silently followed), then a full follow of any redirect found. This is
  the exact mechanism that caught `ukmt.org.uk`'s redirect in the design doc's own measurement
  and, in this pass, TeensGive's domain reassignment.
- **`passesContentFloor` / `passesPageIdentity`** (`classify.ts`) — deterministic (no AI call)
  checks for "did we actually get real content" and "does the content mention this
  opportunity's title or organisation at all." This is `checkContentGuards`'s first two
  guards, used directly for the "loads but no longer describes the programme" question.

**One deliberate scoping cut, disclosed rather than hidden**: rung 1 (`fetchRung1Tavily`) was
*not* used for this sweep. Tavily's `extract` is a paid, rate-limited API; this is a one-time
366-URL measurement answering a link-health question, not a content-extraction-completeness
question, and running the full paid ladder on every row wasn't a cost this specific ask
justified. The consequence is disclosed, not silent: a URL that fails the free fetch here is
reported as *"unreadable via free fetch, not escalated to Tavily,"* never upgraded to a
confident "dead." Rung-4 (PDF extraction) was also out of scope, exactly as it already is for
b9's own reverification job — a documented gap, not an oversight, and one that explains two
of this sweep's own findings below.

The sweep script is `scripts/opportunity-link-health-sweep.ts` — reads a JSON export of
`(id, title, organization, official_url, source_url)`, fetches each distinct URL once
(`official_url === source_url` for the large majority of rows, so this halves the real
request count), classifies each row, writes a JSON report. No database access, no writes,
nothing else touched.

## Results

| Classification | Count | Meaning |
|---|---|---|
| `healthy` | 232 | At least one of the row's URLs loaded, passed the content-floor and identity guards |
| `dead` | 24 | Neither URL produced readable content via the free fetch — see sub-breakdown below, most of these are not actually dead |
| `redirect_same_org` | 22 | The URL redirects, but to the same registrable domain — a path restructure, harmless |
| `redirect_different_org` | **0** | The dangerous shape — none found in the active catalog |
| `content_mismatch` | 4 | Loaded, but failed the content-floor or identity guard — see below, all four trace to known gaps, not genuine drift |

### The dangerous category: confirmed empty

Zero rows redirect to a registrable domain different from the one on file. TeensGive's shape
— a domain that changed hands entirely, now serving unrelated commercial content while every
aggregator still cites it as live — does not currently exist among the 282 active
`official_url`/`source_url` values. This is the direct answer to the question this sweep was
commissioned to answer, and it's a clean one.

### `dead` (24) — sub-classified by what actually happened, not lumped together

| Sub-case | Count | What it means | Action |
|---|---|---|---|
| HTTP 403 | 17 | Bot-blocked to a plain fetch — the same wall this session hit all night on si.edu, aynrand.org, and others. **Very likely still alive**; would need rung 1 (Tavily) or a real browser to confirm. Spot-checked two independently: `maa.org` (AMC-AIME) 403'd identically via a completely different fetch tool; `battlecode.org`'s domain (Battle Code MIT, "fetch failed" below) is confirmed alive and current via web search even though the specific page didn't load this pass. | Not urgent; a Tavily-inclusive follow-up would resolve most of these in one pass |
| HTTP 404 | 2 | **Genuinely stale paths on live domains** — see below, the closest thing to a real, actionable finding | Worth a targeted URL fix, low effort |
| HTTP 429 | 1 | Rate-limited (Rotary Interact Club) — this session independently hit the same 429 on rotary.org during interactive research earlier tonight. Transient, not dead. | None — retry later |
| 301 then 403 | 1 | Redirect chased successfully (rung 2), destination bot-walled (rung 3) — NYT's own domain, not a different one | None |
| Transport failure ("fetch failed", no HTTP status at all) | 3 | The one sub-case genuinely worth individual attention — no status means the connection itself didn't complete (DNS, TLS, or a real outage) | Named individually below |

**The two genuine 404s**, both explainable by the same pattern — a dated, single-cycle
document that was taken down after its cycle ended, not a domain problem:
- **Hong Kong Baptist University (HKBU)** — `official_url` is
  `.../HKBU_Summer_Programmes_2024-ProgDescription.pdf`, a 2024-dated PDF. The year is
  literally in the filename.
- **İTÜ Tasarım Atölyesi (itüTA)** — `official_url` is `.../2024/05/02/itu-tasarim-atolyesi-
  ituta-2024/`, a dated 2024 blog post for a specific past edition.

**The three transport failures**, named individually per the brief:
- **Battle Code MIT** (`battlecode.org/about.html`) — domain confirmed alive and current via
  independent web search (MIT's Battlecode competition is real and actively running its 2026
  edition per search results), so this reads as a transient failure on this specific pass or
  a moved page, not a dead organisation.
- **Northwestern University** (`my.ctd.northwestern.edu/myctd/s/course-offerings`) — a
  Salesforce-community-style subdomain (`my.ctd...`); these often block non-browser clients
  more aggressively than a plain 403, which can present as a connection failure rather than a
  clean status code.
- **İstanbul Kent Konseyi Gençlik Meclisi** (`istanbulkentkonseyi.org.tr/genclik-meclisi/`) —
  not independently cross-checked this pass; flagged for a direct look rather than assumed
  either way.

### `content_mismatch` (4) — all four trace to known gaps, not genuine drift

This is the category the brief called "the dangerous one... probably rare" for a different
reason than the redirect case — a page that loads fine but has quietly started describing
something else. **Reading all four individually, none of them are that.** Every one is
explained by a limitation already disclosed above:

- **NYU Precollege Program** (2 URLs) — both `content_too_short`. NYU's admissions pages are
  client-side-rendered; a plain fetch gets the page shell before JavaScript populates it, not
  a fetch of a page saying something wrong. This is precisely why rung 1 (Tavily, skipped
  here) exists in the real reverification job.
- **iGEM High School Competition** — same shape, `content_too_short` on a JS-rendered page.
- **International Olympiad in Informatics (IOI)** — one URL (`stats.ioinformatics.org/
  countries/TUR`) is a data-table stats page with little surrounding prose, `content_too_short`
  by the guard's word-count floor rather than by being wrong. The other
  (`ioinformatics.org/files/regulations21.pdf`) is a **PDF** — `identity_mismatch` here is
  rung 4's documented gap surfacing exactly as designed: a PDF byte stream isn't readable
  text to a plain-text guard, so it correctly falls through as unusable rather than being
  silently misread.
- **Sabancı University Nanotechnology Winter School** — same PDF-gap shape as IOI.

**Net finding: zero confirmed instances of a page that loads with real, readable content
describing something other than the claimed programme.** The four flagged rows are an
artifact of this pass's own disclosed scoping (no JS rendering, no PDF extraction), not a
finding about the catalogue.

### `redirect_same_org` (22) — spot-checked, confirmed harmless

A sample, all clearly path restructures on the organisation's own domain: Cornell Precollege
(`/precollege/residential` → `/pc-prog-residential/`), CyberPatriot
(`/competition/competition-overview` → `/competition-overview/`), Cambridge's Downing
College (a page merged into a broader "International Specialist Programme" page — same
institution, same registrable domain), the European Youth Event (added a `/en` locale
segment), FIRST Global Challenge (`/fgc/faq/` → `/faq/`). None of the 22 warrant action; this
is what a healthy, actively-maintained site doing normal path cleanup looks like.

## What this doesn't answer, on purpose

- **Non-`active` rows** (139 more: expired, disabled, under_review) weren't swept this pass —
  the brief said start with active, since those are reachable by a student today. A student
  can't reach a `disabled` or `expired` row regardless of its link health, so the same
  urgency doesn't apply, but the same measurement could be repeated there.
- **The 17 bot-blocked (403) rows** are reported as "probably fine, unconfirmed" rather than
  resolved either way. A Tavily-inclusive re-run of just those 17 (a small, bounded, disclosed
  follow-up cost) would very likely resolve most of them to `healthy` in one pass.
- **This is a link-health measurement, not a fact-verification pass** — a URL can be perfectly
  alive and correctly identified and still describe a stale deadline or a changed cost. That
  question belongs to b9's reverification job proper, which this sweep deliberately did not
  invoke (no adjudication calls, no lease claims, no writes).

## Coordination note for b9

This sweep's `content_mismatch` findings independently reproduce two gaps already documented
in `lib/opportunities/reverification/fetch-ladder.ts`'s own comments (the JS-rendering rung-1
rationale and the rung-4 PDF gap) — not new information for that lane, but a second,
independent measurement landing on the same two gaps from a different angle. Sharing in case
it's useful corroboration for whatever's next in that job's own rollout.
