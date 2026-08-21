# source-authority — application-system/test-operator tiers, report

Branch `oryn/source-authority`, forked from `main@8ace449`.

**Full gate clean**: lint 0, typecheck 0, **test 1185/1185** (1167 + 18 new, 0 failures), build
succeeds (all 37 routes).

## What this fixes, and on what basis

**Application systems — implemented exactly as recorded.** Read the full decision record before
writing any code: `docs/research/university-requirements/source-authority-gap.md` on the unmerged
branch `oryn/university-requirements-research` (not on `main` — confirmed via `git show
origin/oryn/university-requirements-research:...`, not guessed). Its bottom section, "RESOLVED —
coordination session DECISION 1, 2026-08-21," is real and specific: application systems are HIGH
for the platform-wide facts they themselves operate (deadlines, equal-consideration dates,
eligibility/access rules, fee structures), never for an institution-specific fact even when the
system displays it — vindicated by a live conflict the same research pass found (Glasgow's own
page said "14 January," a stale prior-cycle date; UCAS's own 2027-cycle page says 13 January
2027 — the operator's original was right, the university's copy was stale).

Added `APPLICATION_SYSTEM_DOMAINS` (`lib/acquisition/source-authority.ts`): `ucas.com`, `cao.ie`,
`studielink.nl`, `hochschulstart.de`, `uni-assist.de`, `commonapp.org`, `parcoursup.fr` — every
one of them named either in migration `0042`'s `application_system` column comment or directly in
the source doc's own fetched-domain table. HIGH for `policy` only, `null` for every other fact
class. New `sourceType: "official_application_system"` so this provenance survives in the
database distinctly from `official_primary`, as the doc itself proposed. ÖSYM deliberately not
added — it already resolves via `looksOfficial()`'s `.gov.tr` match, which is a strictly broader
grant than this tier would give it.

**Test operators — NOT part of that recorded decision, flagged as my own extension by analogy.**
No dedicated research pass measured ETS/Cambridge English/College Board against the gate the way
the requirements lane did for institutions and application systems. I added `TEST_OPERATOR_DOMAINS`
(`ets.org`, `cambridgeenglish.org`, `collegeboard.org`) under the identical HIGH-for-`policy`-only
rule, on direct structural analogy ("operator of a system" vs. "operator of a test" is the same
shape of claim) — each domain independently confirmed live before being added (not assumed from
training data): `ets.org` fetched directly (its TOEFL page); `cambridgeenglish.org` fetched
directly, footer-confirmed as Cambridge University Press & Assessment; `collegeboard.org` already
directly fetched by the requirements lane's own AP research
(`data/research/academic-systems/secondary-systems-v1.json`, on the same unmerged branch). This is
called out in-code as a documented assumption, not an equally-sourced fact — worth a second look
before being treated as equally final.

**One suffix addition: `.go.jp`.** A third lane's finding, relayed by the coordination session,
that `jst.go.jp` (Japan Science and Technology Agency) fails. Verified live before adding
(JPRS restricts second-level `.go.jp` registration to government bodies and government-affiliated
corporations — not open registration, so it's safe as a suffix rule on the same basis `.gov`/
`.gov.tr` already are, unlike `.org`/`.nl`/`.de`). No systematic audit of every country's
restricted-government-TLD convention was attempted — this is the one verified, specifically-
reported case, not a claim of completeness.

## What this does NOT fix, and why — checked against real callers, not assumed

The coordination session initially described this as a uniform "four independent lanes" failure,
then **self-corrected** after the opportunities lane ran the actual code rather than reasoning
about it: `lib/opportunities/ingest.ts:152-153` already passes the record's own `official_url`
domain as `officialDomains`, so a record whose `official_url` and `source_url` agree on domain —
including `europa.eu`, `ibb.istanbul`, `rotary.org` — already clears the gate. **I did not touch
the `opportunities` fact class**, per that correction, and independently confirmed the cited lines
myself before relying on it.

I was asked to check, before writing new architecture, whether the remaining (`policy`/
`programs`) callers pass `officialDomains` at all or call `sourceAuthority()` bare. Checked, not
assumed:

- `scripts/acquire-admissions-facts.ts:210` — **not bare**. Passes `new Set([domain])` where
  `domain = extractDomain(uni.website_url)`. For an institution on a single plain domain
  (`tudelft.nl`, `tum.de`, `eur.nl`, `tcd.ie` are each one domain, not a second/separate one), this
  already threads the right value through **if `website_url` is populated correctly for that row**
  — meaning the remaining gap for these four is most likely a **data** question (is `website_url`
  set?), not a code gap, in this specific script. I did not query the live database to confirm
  `website_url` is actually populated for these four institutions — that's a fast, cheap check
  someone with DB access should run before assuming this is closed.
- `lib/programs/ingest.ts:150` and `scripts/acquire-programs.ts:414` — also **not bare**, both
  thread `universities.website_url` through the same way, for the `programs` fact class. Same
  conclusion applies there.
- `mitadmissions.org` is a **structurally different** case, not just a data gap: it is a second,
  separate domain from MIT's `website_url` (`mit.edu`). A single-column `website_url` cannot hold
  both. `scripts/acquire-admissions-facts.ts` additionally scopes its Tavily search to the single
  `website_url` domain, so it would never even surface `mitadmissions.org` as a search candidate
  in the first place — a compounding limitation of that specific script, separate from the gate
  itself. This is the genuine one-to-many institution-domain-provenance problem the source doc's
  piece (A) names and explicitly scopes to "canonical-entity territory... belongs with the
  identity lane that owns `canonical_entities`/`entity_external_ids`" — I did not build this, since
  I'd be guessing at a data model another lane already owns.
- `youth.europa.eu` (the third lane's other finding) — the leadership lane's own README already
  recommended treating `europa.eu` as an institutional domain added to `officialDomains` outright,
  the same mechanism as the case above, not a new curated tier (unlike application systems, the EU
  institutions are properly modeled as *being* the institution, not a third-party operator
  authoritative about someone else's process). I did not hardcode it myself: I don't know which
  specific caller produced this failure or what fact class was involved, and guessing at the wiring
  without that context risks doing it in the wrong place. Flagging rather than guessing.

## Files changed

- `lib/acquisition/source-authority.ts` — `APPLICATION_SYSTEM_DOMAINS`, `TEST_OPERATOR_DOMAINS`,
  two new `sourceType` values, `.go.jp` added to `looksOfficial()`, `sourceAuthority()`'s overload
  split adjusted (the narrow overload now also excludes `policy`, since that's the only fact class
  that can produce the two new sourceTypes — kept `scripts/acquire-university-facts.ts`'s existing
  narrower guarantee intact rather than loosening it).
- `__tests__/acquisition/source-authority.test.ts` — 18 new tests: application-system tier
  (accept/refuse-elsewhere/ÖSYM-unaffected/the UCAS case), test-operator tier
  (accept/subdomain-matching/refuse-elsewhere), one cross-list substring-safety check, two
  `.go.jp` cases including a regression guard for a mid-string-match bug caught and fixed before
  it shipped (an early draft used `.includes(".go.jp")`, which `evil.go.jp.attacker.example` would
  have falsely passed; fixed to `.endsWith()` before committing).
- This file.
