# Analysis — does `url_repair_*` target the Canada URL-identity collisions? (RES-V1, package V1-10)

**Lane:** RES-V1 · **Analyzed:** 2026-08-22 · **Posture: report only.** No merges, no URL
edits, no dedup-key proposals, no live writes — every step below is a read-only Supabase
query or a read of committed research files. This feeds a founder decision (whether to
build the `url_repair` UPDATE-by-id path); it does not make that decision.

## The question

RES-I1's `url_repair_*` population — 12 files, 1,437 records, each keyed by an existing
`program_id`, each correcting a defective `official_program_url` — is unappliable today
(the UPDATE-by-id path doesn't exist; building it is the founder's call). Separately,
Canada's live corpus has severe URL-identity failures at three universities. **Do the
1,437 corrections target the same rows as the collisions?** If yes, building the path
repairs ~424 Canadian programme records' identity key, not just tidies metadata — a much
stronger case for the effort. If no, the collisions are a separate, still-unscoped defect.

## Answer: **No overlap. 0 of 1,437.**

Checked at the ID level against live data — not against either population's own
self-reported labels, which could in principle be stale or wrong.

## Method

**1. Reproduced the collision figures independently**, not taken from the report. Queried
`university_programs` live, grouped by `(university_id, official_program_url)`, per
Canadian university:

| University | Programmes | Distinct URLs | Programmes − Distinct URLs |
|---|---|---|---|
| Western University | 547 | 316 | **231** |
| University of Toronto | 635 | 475 | **160** |
| University of Alberta | 179 | 146 | **33** |
| Université de Montréal | 679 | 679 | 0 |
| University of British Columbia | 546 | 546 | 0 |
| Queen's University at Kingston | 337 | 337 | 0 |
| University of Waterloo | 107 | 107 | 0 |

Matches exactly, all seven universities, using "programmes minus distinct URLs" as the
collision metric — confirms that framing is what the cited figures mean, not assumed.

**2. Read `url_repair_*`'s own committed files directly** — all 12, 1,437 records total
(exact match). Every record carries its own `university_name`: **Bilkent, Boğaziçi,
Bristol, Durham, Hacettepe, Koç, Manchester, Özyeğin, Southampton, St Andrews, TU Dublin,
Wisconsin-Madison — 12 distinct universities, zero Canadian institutions among them.**
This alone is a strong signal, but a self-reported field could in principle be wrong, so
it wasn't treated as sufficient on its own.

**3. Checked live, not self-reported, what university each of the 1,437 target
`program_id`s actually resolves to.** Queried `university_programs` directly for all 1,437
ids (chunked REST reads, the same pattern this lane's own validator uses for live
reconciliation): **1,437 of 1,437 exist live**, resolving to **exactly 12 distinct
`university_id` values** — confirming the file-level university count independently, at
the row level, not the label level. **0 belong to Western. 0 belong to Toronto. 0 belong
to Alberta.**

## What this means

**The 1,437 `url_repair` corrections and the 424 Canadian collision rows (231 + 160 + 33)
are two entirely separate defect populations, not one problem seen from two angles.**
Building the UPDATE-by-id path would apply RES-I1's 1,437 corrections and would not, even
incidentally, touch a single one of the Western/Toronto/Alberta collision rows. Whatever
value that path has, it is not "also fixes the Canada identity problem" — that case does
not hold.

**The 424 collision rows remain a real, separate, currently unscoped defect.** Nobody has
yet corrected them, and nothing already queued (`url_repair` or otherwise, as far as this
package checked) will. If Path A is built for `url_repair`'s own sake, the Canada
collisions still need their own scoping and their own fix — a different, not-yet-started
piece of work.

**On the caveat given with this assignment** — that "verified as pointing at the right
page" (RES-V2's 0 Type A/0 Type B result) is a different question from "resolves the
collision," and a correction could be right and still leave two programmes sharing a URL
— kept in mind throughout, but moot for this specific answer: there is no overlap for
that distinction to apply to. It would matter if a future population were proposed
*against* the Canada rows specifically; noting it here so the distinction isn't lost for
whoever scopes that separate work.

## Scope: what this covers, and what it does not

**Covered:** whether `url_repair`'s 1,437 target ids intersect the Canada collision rows,
checked at the ID level against live data (§ above). Independent reproduction of the
231/160/33 collision figures.

**NOT covered — explicitly out of this package's question:**
- **The root cause of the Canada collisions themselves** — e.g., whether
  `grad.uwo.ca/admissions/programs/index.cfm` is genuinely a shared listing page for all
  160 Western rows (as reported) was not independently re-verified here; this package
  answered the overlap question, not the underlying-cause question.
- **Whether any *other* already-queued research or correction population targets the
  Canada collision rows** — only `url_repair_*` was checked, because that was the named
  candidate. A different population targeting these rows was not searched for.
- **Any actual fix, merge, or URL correction** — explicitly out of scope by the
  assignment's own terms. This is a report for the founder's Path A decision, not a
  remediation.
