# The third defect — sized, and it's small, and it's the same import

Follow-on to [[null-organization-dedup-defect-2026-09-02.md]]: oryn-f5 found `official_url`
pointing at a third-party review blog (Young Founders Lab → a Ladder Internships blog post
reviewing it, not the program's own site). `official_url` is what the product shows a student as
"View source" (Phase 71) and what every downstream re-verification step trusts as the authority
— a wrong one poisons both. Assigned: size this mechanically, judge each candidate rather than
trust the heuristic, and report. **Read-only. No writes.**

## Method, and where it had to be corrected mid-check

Checked domain-vs-name match two ways, since the catalogue splits cleanly into two populations
that need different methods:

**224 rows with `organization` populated**: compared the `official_url`'s domain against
significant words in *both* `organization` and `title`, plus an acronym check (HMMT, PROMYS,
IMO-style branded-competition domains are extremely common and don't share text with the
organization field, only sometimes with the title). **First pass, organization-only, flagged 37
candidates. Adding the title check cut that to 8.** Every one of the remaining 8 resolved to a
legitimate compressed name or abbreviation on inspection (`councilforeconed.org` = "Council for
Econ Ed" joined; `edu.rsc.org` = Royal Society of Chemistry's own education subdomain;
`intaward.org.tr` = "International Award" + Turkish TLD) — **live-verified the three genuinely
ambiguous ones** (`bspee.wordpress.com`, `tisdc.org`, `theblackstonereview.org`) rather than
guess: all three are the program's own dedicated site, one hosted on free WordPress
infrastructure because it's a small volunteer-run essay competition, not a red flag on its own.
**Zero confirmed defects among the 224.**

**197 rows with `organization` null**: cannot be checked against organization at all — the exact
gap named going into this task. Checked against `title` instead, plus an explicit pattern list
for review/blog/aggregator/social-platform signals in the URL itself, **built from what
[[opportunity-research-staging-2026-09-02.md]] and this pass actually found**, not guessed in
advance (`-review`, `-blog`, `summerschoolsineurope.eu`-style directory domains, social/forum
platforms). This surfaced 2 immediately (explicit signal) and 14 more via the title/domain
mismatch check.

**A bug in my own domain-parser, caught before it produced a false finding**: the first pass used
Python's `.lstrip("www.")` to strip a URL's `www.` prefix — which strips *characters*, not the
literal prefix, and ate the leading "w" of `woodstockschool.in` too. This flagged Woodstock
School as a broken/typo'd URL. **Checked live before reporting it**: the URL is
`woodstockschool.in/summer/`, exactly correct, no typo — the corruption was entirely in my own
script. Ran a full regression check afterward: 8 of 421 rows had a domain corrupted by this same
bug, but Woodstock is the only one whose *verdict* changed — the other 7 all end in `.edu`/
`.ac.uk`-style suffixes, which the official-domain check matches on the ending, not the start, so
the bug never affected them. Fixed and reconfirmed before finalizing anything below.

## What's actually confirmed, and how small it really is

**5 confirmed third-party-source defects, all live-verified, none guessed from the heuristic
alone:**

| Row | `official_url` points to | Verified as | Status |
|---|---|---|---|
| Young Founders Lab (YFL) | `ladderinternships.com/.../our-review` — a competitor's blog reviewing the program | Confirmed third-party (oryn-f5's original find) | `under_review` |
| The Pioneer Academics Research Program | `pioneeracademics.com/news/is-...-worth-it-review-...` | The program's **own** domain, but its own marketing testimonial page, not the program page — a milder version of the same defect, already found and documented on 2026-09-01 ([[project_drive_corpus_truncated_import]]) | `disabled` |
| University of Maastricht, Netherlands | `summerschoolsineurope.eu` | A third-party program directory — the **same domain** also stored for a second, different row below, confirming it's a directory site, not any one program's own | **`active`** |
| Summer Programs in the Netherlands - 2025 | `summerschoolsineurope.eu` | Same directory, second confirmed instance | `disabled` |
| Winchester College - Discover Summer Program | `biltur.com` | A Turkish study-abroad **agency's** marketing page ("Danışmanlık ve kayıt hizmetlerimiz ücretsizdir" — "our consulting and registration services are free," "Tek Yetkili" — "Sole Authorized [Agent]") reselling a UK program operator's ("Discovery Summer") offering at the school — two removes from the actual source | **`active`** |

**All 5 share the identical `source` string and land in the same 90-second window on
2026-08-18** as the null-organization defect — confirmed directly, not inferred from timing
alone. **This isn't two overlapping defects; it's one bulk import with two symptoms.** The same
low-rigor pass that dropped `organization` also, for at least these 5 rows, recorded the first
plausible-looking URL rather than the program's own official page.

**2 of the 5 are live right now** (Maastricht, Winchester) — a real student could click "View
source" on either today and land on a third party. The other 3 are already contained
(`under_review`/`disabled`), including one (Pioneer Academics) already found and written up
before this task started, independently confirming the same import via a different symptom.

## The rest of the null-organization population — sized, not exhaustively verified

14 more rows had no textual relationship between `official_url`'s domain and the title, with no
explicit third-party signal in the URL. Judged rather than left as one bucket:

- **9 resolve cleanly on inspection** without a live check: known real program-operator domains
  (Veritas AI's own `veritasai.com` for an AI essay contest; Immerse Education's own domain for a
  scholarship they run; a Perimeter Institute outreach domain for a physics summer school it
  hosts; a Swiss university's constituent-school domain, same pattern as the codebase's own
  `phys.ethz.ch`-under-`ethz.ch` precedent) or a clean abbreviation (`env-olympiad.com` for the
  International Environmental Olympiad).
- **1 live-verified**: `joinprequel.com` (BETA Camp) is Prequel's own operating site, confirmed
  by loading the page — a real, if marketing-heavy, program operator, not a third party.
- **1 is a different, already-known defect wearing this one's shape**: "RSI (Research Science
  Institute) at MIT" resolves to `cee.org` — the Center for Excellence in Education's genuine own
  domain (independently re-confirmed here: a *different*, organization-populated row for the same
  real program correctly lists `organization: "Center for Excellence in Education, in partnership
  with MIT"` and the identical domain). **The defect on this specific row is its title, not its
  `official_url`** — exactly the RSI/MIT case oryn-a7 named from a different angle. Two separate
  live rows for what is very likely one real program, one with accurate provenance and a clean
  title, one with null organization and a misleading one.
- **3 not individually live-verified** (iPERC, HEIA-FR, Trinity College Dublin's title reading
  "London, Ireland" — a geography error, unrelated to this check) — plausible on inspection, not
  chased further given the confirmed-defect count was already well-established and the marginal
  value of confirming three more low-confidence rows was low against the time cost.

## The size verdict

**Total confirmed: 5 of 421 (1.2%).** Including the unconfirmed-but-plausible tail, at most
~19 of 421 (4.5%) — and even that upper bound assumes every remaining candidate is bad, which
live-checking has already shown is not how these skew (most resolve legitimate). **This is
squarely in "read them all" territory, not "the heuristic is too blunt" territory** — the
opposite conclusion from the null-organization defect, which affected 47% of the catalogue and
needed a structural fix. This one needed judgment applied to a short list, which is what
happened.

**The overlap oryn-a7 named is total, not partial, for every confirmed case so far**: 5 of 5
confirmed defects are also null-organization rows from the identical import. The 224
organization-populated rows — the population that includes every later, more rigorous research
pass (`s5a`/`s5b`/`s6`/`s7` and the rest) — produced zero confirmed `official_url` defects after
real judgment was applied. **The defect is not spread across the catalogue; it is confined to
one bulk import that also produced the organization gap**, which is a smaller, more contained
problem than it could have been, and useful to know precisely rather than assume it might be
everywhere.

## Recommendation

1. **Maastricht and Winchester are live today and worth a founder-approved fix or disable now**,
   independent of the larger backfill/candidate sequence — these are the two rows with actual
   current user exposure, not staged research awaiting a decision.
2. **The other 3 confirmed rows are already contained** (`under_review`/`disabled`) — no urgency,
   but worth carrying the same correction if/when that import's other defects are cleaned up.
3. **No new tooling gap here**, unlike the organization defect — this doesn't need a code fix,
   because nothing in the current ingest pipeline (`decideIngestion()` or `discover.ts`, post
   this task's earlier fix) accepts a record without checking `official_url` resolves to an
   authoritative domain via `sourceAuthority()`. The exposure is historical, from before that
   gate existed in its current form, not ongoing.
4. **The RSI/MIT title issue is a separate, smaller finding, not part of this defect class** —
   flagged for whoever owns title-accuracy review, not fixed here.

## What this did not do

No writes — nothing disabled, corrected, or updated. No live check of the 3 lowest-priority
unconfirmed candidates (iPERC, HEIA-FR, Trinity title). No attempt to build a permanent
allowlist or automate this check into the ingest pipeline — the confirmed population is small
enough that a one-time list, not new infrastructure, is the right scope for what was found.
