# RES-R2 — Opportunity deadlines & cycle status (Package 3: remaining categories)

**Lane:** RES-R2 (research org, per `docs/ORYN-ORG-STRUCTURE.md`) · **Branch:** `oryn/res-r2-remaining-categories` · **ID prefix:** `DLOPP-P3-`
**Started:** 2026-08-22 · Research output only — no live-DB writes. Ingestion belongs to RES-I2 after RES-V1/V2 verification.

## Scope (package 3, final package for this brief)

Current-cycle application deadlines + cycle status for all live `opportunities` rows with
`verification_state='verified_current'` outside package 1's five categories and package 2's
`summer_program` — **27 rows** across volunteering (6), entrepreneurship (6), conference (2),
student_program (7), online_program (6). `academic_program` carries zero `verified_current`
rows (all 3 rows in that category are `unverified`), so it contributes nothing to this
package's scope despite being named in the brief. Live-measured 2026-08-22 at both package
open and close: 27 both times, exact match.

## Record contract

Same contract as packages 1 and 2, reused verbatim — see
`docs/research/opportunities-deadlines/README.md` for the full field list.

## RULE-FETCH-003: the defer-list gates the fetch (new this package, mandated)

Package 2 surfaced a real process failure: a domain confirmed as a genuine robots.txt policy
block during the package-wide pre-check still got fetched later while assembling a batch,
twice, because the pre-check list was informing after-the-fact review rather than gating the
fetch call itself. ORYN-BASORG converted this into a standing rule: **the defer-list is
checked programmatically before every content fetch; the check gates the call, it does not
inform a review.**

Applied mechanically this package: the robots.txt pre-check (28 domains, one sequential pass,
before any content fetch) produced a 3-domain blocked-domain file
(`schoolhouse.world`, `teachmewallstreet.com`, `ulo.stanford.edu` — all confirmed by direct
read of an explicit, standalone `ClaudeBot`/`anthropic-ai` `Disallow: /` group). Before
drafting a single `WebFetch` call, every row's domain was checked against that file
programmatically, producing a fixed dispatch plan: 24 rows to fetch, 3 gated out. The 3 gated
rows were written directly as `deferred` records with `fetch_method: not_fetched` — no
`WebFetch` call was ever issued for them, and there was nothing to discard because nothing was
fetched. This is qualitatively different from package 2's after-the-fact discards.

## Outcome distribution (27 records across 2 batches)

| batch | rows | contents |
|---|---|---|
| `dlopp_p3_batch1.jsonl` | 14 | volunteering (6) + entrepreneurship (6) + conference (2, first 2 of 2) |
| `dlopp_p3_batch2.jsonl` | 13 | student_program (7) + online_program (6) |

- **nothing_published: 15** — the dominant outcome this package, and mostly structural rather
  than a research gap: several categories here are inherently rolling/no-central-deadline by
  design (Alpha Leo Club, Rotary Interact Club — join a local chapter any time; Coursera — a
  course marketplace; JA Company Programme, Young Enterprise — delivered per participating
  school/country with no pan-organizational deadline; Erasmus+ Youth Exchanges — deadlines set
  per National Agency, not centrally).
- **dated_current_cycle: 4** — a notably higher share than packages 1-2, and genuinely
  actionable this time (not stale-page artifacts): Habitat Derneği's Train-the-Trainer
  Program (2026-08-26, **4 days** from retrieval), Diamond Challenge (2027-01-14, ~5 months
  out), THIMUN The Hague (2026-09-25, ~1 month out), Inspirit AI Scholars (2026-09-01, ~10
  days out).
- **closed_historical: 4** — Girl Up Global Teen Advisor Board (exact match, 2026-08-01),
  GençBizzTech (Turkey Finals already held), LaunchX (form closed), UK Youth Parliament
  (local-authority elections for the current term completed — a genuine status upgrade from
  `db_state`'s prior `date_not_announced`).
- **deferred: 4** — 3 genuine robots.txt policy blocks (gated before fetch, per above) plus 1
  new, distinct shape: **Genç UPSHIFT** returned HTTP 522 (Cloudflare origin-unreachable) on
  two independent attempts, and its own robots.txt pre-check also failed at the connection
  level — this reads as genuine site unavailability, not bot detection or policy, and is not
  one of RULE-FETCH-001's three shapes. Not routed around (no cache/mirror substitution);
  flagged for a later retry rather than treated as permanent.
- **confidence high / medium / low: 17 / 8 / 2.**
- **conflicts recorded: 0** — genuinely zero this package, not a rounding artifact. Worth
  stating plainly rather than manufacturing a narrative: this package's official pages were,
  on the whole, thinner on deadline detail (many `nothing_published` outcomes) but more
  internally consistent where they did state a date.

## RULE-FETCH-001 shape-2 recoveries this package (tooling 403s, not policy blocks)

Three rows hit an ambiguous or outright-403 signal and were recovered via a real rendered
browser rather than deferred outright, following the same diagnostic discipline as packages
1-2's close-out:

- **Alpha Leo Club** (`www.lionsclubs.org`) — WebFetch 403 and the domain's own robots.txt
  also 403'd on pre-check (file unreadable, no direct evidence either way). Recovered clean
  via `browser_render`.
- **Girl Up Global Teen Advisor Board** and **Girl Up Club** (`girlup.org` /
  `clubs.girlup.org`) — this domain was already independently confirmed clean for Claude
  agents during package 1's close-out (`DLOPP-RCHECK-03`); the 403 here is a known, already-
  diagnosed tooling artifact, not re-treated as a fresh ambiguous signal.
- **İstanbul Kent Konseyi Gençlik Meclisi** — a distinct failure mode: WebFetch returned
  "unable to verify the first certificate" (a TLS handshake issue), not a 403 or a robots.txt
  signal. Recovered via `browser_render`, which used a different fetch path and didn't hit
  the same certificate problem. Certificate verification was never bypassed — a different,
  working path was used instead.

## Not in this package

None — this closes out the RES-R2 brief's full scope order (five package-1 categories,
`summer_program`, and the six remaining categories). Any further deadline research on
`opportunities` would be a re-check-cadence pass (see below), not new scope.

## A note for whoever plans the next research cycle

Both RES-V2 (independently) and this lane's own package 2 finding point at the same
conclusion: most defects and stale states found in this whole 188-row exercise (74 + 87 + 27)
were not research errors — they were correct-when-written facts that the calendar moved past.
A one-time deadline sweep has a shelf life measured in weeks, not the lifetime of the
`verified_current` flag. That is a re-check-cadence problem for whoever owns
`opportunities` data freshness, not something this package's scope can resolve on its own.
