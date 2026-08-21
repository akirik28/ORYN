# The `looksOfficial()` gap: official sources that the ingestion gate rejects

**Status:** research finding, written for an engineering decision. No code changed by this lane.
**Found:** 2026-08-21, during the university requirements/deadlines research batch.
**Requested as a design note by:** the ORYN coordination session, which is routing it to the
engineering lane as a fix and to the founder as a decision.

## The claim in one sentence

`lib/acquisition/source-authority.ts` decides whether a URL may publish a fact, and for the
`policy`, `programs`, `cost` and `opportunities` fact classes it is official-domain-or-nothing —
but its definition of "official" is five suffix tests, and a large share of genuinely official
sources do not match them.

```ts
// lib/acquisition/source-authority.ts:146
export function looksOfficial(domain: string): boolean {
  if (!domain) return false;
  return (
    domain.endsWith(".edu") ||
    domain.includes(".edu.") ||
    domain.includes(".ac.") ||
    domain.includes(".gov.") ||
    domain.endsWith(".gov")
  );
}
```

This is not a hypothetical. Applying that exact predicate to every source domain this research
lane actually fetched:

| Domain | Passes | Institution |
|---|---|---|
| `undergraduate.study.cam.ac.uk` | yes | University of Cambridge |
| `lse.ac.uk` | yes | LSE |
| `imperial.ac.uk` | yes | Imperial College London |
| `study.ed.ac.uk` | yes | University of Edinburgh |
| `gla.ac.uk` | yes | University of Glasgow |
| `ucl.ac.uk` | yes | UCL |
| `intl.bogazici.edu.tr` | yes | Boğaziçi University |
| `tudelft.nl` | **no** | Delft University of Technology |
| `tum.de` | **no** | Technical University of Munich |
| `eur.nl` | **no** | Erasmus University Rotterdam |
| `tcd.ie` | **no** | Trinity College Dublin |
| `mitadmissions.org` | **no** | MIT |

**5 of 12.** Every failure is the institution's own website, fetched directly, publishing its own
admission rules.

## Why this is worse than it looks

**1. It is geographically biased in exactly the wrong direction.** The suffix list encodes the
academic-domain conventions of the US (`.edu`), the UK/Commonwealth (`.ac.uk`), and Turkey
(`.edu.tr`). Continental Europe does not use them. Dutch, German, French, Italian, Swiss, Nordic
and Irish universities sit on plain national domains — `tudelft.nl`, `tum.de`, `eur.nl`,
`tcd.ie`, `ethz.ch`, `sorbonne-universite.fr`, `unibo.it`. ORYN's stated market is "United States,
United Kingdom, Europe, Turkey"; this gate is structurally hostile to the "Europe" third of it.

**2. It fails on official *subdomains* that drop the suffix.** `mitadmissions.org` is MIT's real
admissions site — the canonical source for MIT deadlines and its test-required policy — and it
fails, while `web.mit.edu` would pass. Same institution, same authority, different answer.

**3. It rejects the application systems the founder's own brief names as valid authorities.**

| System | Passes |
|---|---|
| `ucas.com` (UK) | **no** |
| `cao.ie` (Ireland) | **no** |
| `studielink.nl` (Netherlands) | **no** |
| `hochschulstart.de` (Germany) | **no** |
| `uni-assist.de` (Germany) | **no** |
| `commonapp.org` (US) | **no** |
| `parcoursup.fr` (France) | **no** |
| `osym.gov.tr` (Turkey) | yes — *by accident of being `.gov.tr`* |

Seven of eight fail. This directly contradicts migration `0042`, which added
`universities.application_system` and documents its values as "UCAS, Common App, Studielink,
Parcoursup, ÖSYM/YKS, uni-assist, direct" — the schema models these systems as first-class, and
the source-authority layer will not accept a citation from any of them but ÖSYM.

That matters because for several facts the application system **is** the primary authority, not a
secondary copy. The UCAS equal consideration deadline is a UCAS-wide rule that individual
universities restate (sometimes staler than UCAS itself — see the Glasgow "14 January" conflict in
`deadlines_batch2`). Studielink's 15 January numerus fixus date is Dutch statute. Routing around
these to a university's restatement is choosing a *less* authoritative source.

**4. It hits the leadership/community-impact opportunity lane harder still.** The `opportunities`
fact class is official-domain-or-nothing with no registry or third-party tier at all. Youth
leadership organisations, NGOs and municipal youth councils live on `.org`, `.org.tr`, `.com.tr`,
`.com`. Under this gate a perfectly-evidenced record fetched from the organiser's own page is
rejected. Since that lane is Turkey-first and ORYN's counselor currently has almost no
leadership inventory to recommend, the gate would keep it that way.

## What is NOT the answer

Widening `looksOfficial()` — adding `.nl`, `.de`, `.org` — would destroy it. `.org` is where
`studyportals.com`-class aggregators and content farms live; `EXCLUDED_DOMAINS` exists precisely
to keep those out. A suffix test cannot separate "TU Delft" from "a .nl content farm about TU
Delft", because the distinguishing fact is *institutional identity*, not the suffix.

Lowering the evidence bar is also not the answer, and no finding here argues for it. Every record
this lane produced was fetched from the institution's own page; the problem is that the gate
cannot tell.

## What the mechanism already provides

The escape hatch is in the signature and is already the intended design:

```ts
sourceAuthority(factClass, url, officialDomains?: ReadonlySet<string>)
```

with the documented contract that "the caller must have established that domain from an
authoritative identity source (ROR's `links`/`domains`) rather than guessing it, which is why
this is a parameter and not another hardcoded list." Matching is suffix-aware via
`domainMatches`, so `intl.bogazici.edu.tr` under `bogazici.edu.tr` and `phys.ethz.ch` under
`ethz.ch` both work once the parent domain is known.

So the gap is **not** in `sourceAuthority()`. It is that **no caller populates `officialDomains`
for these fact classes**, and research records carry no field from which it could be populated.

## What a fix needs to carry

Three separable pieces, in dependency order:

**A. Institution official-domain provenance.** For each university, the official domain(s),
each with the identity source that established it (ROR record, government registry) and a
retrieval date. This is canonical-entity territory and belongs with the identity lane that owns
`canonical_entities` / `entity_external_ids` — not reinvented per pipeline. ROR already publishes
`links` and `domains` per institution, which is why the existing comment names it. A university
with several legitimate domains (`tudelft.nl` + a separate admissions host, `mit.edu` +
`mitadmissions.org`) needs all of them, so this is one-to-many.

**B. An application-system authority tier.** The systems in migration `0042` are a small, closed,
hand-curated list — the same shape as the existing `OPEN_REGISTRY_DOMAINS` constant, and it
should be added the same way: a `APPLICATION_SYSTEM_DOMAINS` set that is `HIGH` for `policy`
(and deadlines specifically) and `null` for everything else, since UCAS is authoritative about
UCAS deadlines and about nothing else. Curated by hand, reviewed on every addition — explicitly
*not* a suffix rule. A new `sourceType` value (`official_application_system`) would let
provenance survive in the database rather than being flattened into `official_primary`.

**C. Organiser-domain provenance for opportunities.** The same shape as (A) but for organisers,
which have no ROR equivalent. This is the harder one and the leadership lane should decide the
field's shape before it writes 200 records, not after.

## How this lane's records are marked in the meantime

Every research record carries two extra fields so nothing is silently lost and nothing is
silently promoted:

- `source_authority_passes_gate` (boolean) — the result of running the predicate above against
  the record's own `source_url`.
- `source_authority_note` (string, null when it passes) — which specific mechanism the record
  needs before it can be ingested.

27 of the 73 records in batches 1-2 are flagged `false`. They are real, fetched, official-page
evidence that today's gate would reject. They are recorded rather than dropped, and flagged
rather than pretended-through — per the founder's instruction to record UCAS/CAO-class sources
with an explicit marker and not to drop them.

## Open question for the founder

**Is an official application system an acceptable primary source for a deadline?** This lane's
position is yes, and that for cross-institutional deadlines (UCAS equal consideration, Studielink
numerus fixus) it is *more* authoritative than a university's restatement — but it is a product
trust decision, not an engineering one, and it is the decision that unblocks piece (B).
