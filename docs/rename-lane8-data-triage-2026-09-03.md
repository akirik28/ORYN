# Lane 8 — `data/`'s split, and why the rename group is empty

CEO's brief: `data/` is 267 files, her count 3,397 "oryn" occurrences — split it into dated
record (untouched) and living reference (renamed), and an empty living-reference group is a
complete, correct answer if that's what the evidence says. **It is.** Every file in `data/`
is historical record. Nothing was renamed.

## The count, re-measured

Case-insensitive `oryn` across `data/`: **267 files, 4,235 occurrences** (my count, `grep -rio`
— counts every substring match, including inside compound tokens like `ORYN-PRG-` or
`oryn_public`, not deduplicated per line). Different from the cited 3,397, almost certainly a
narrower method on that count (whole-word only, or excluding structural tokens) — noted rather
than silently adopted, same as the locale-freeze report's own correction earlier tonight. Not
material to the conclusion below either way: both counts describe the same 267 files, and the
split doesn't turn on the exact number.

Split by subdirectory:

| Directory | Files | Files w/ oryn | Occurrences |
|---|---|---|---|
| `data/research/` | 720 | 256 | 4,116 |
| `data/morning/` | 11 | 10 | 118 |
| `data/audit/` | 3 | 1 | 1 |

(734 files total in `data/` — 267 of them contain "oryn," matching your file count exactly.)

## `data/morning/` and `data/audit/` — the easy 119

All 11 files in `morning/` are dated 2026-09-03 one-time SQL packages and their instruction
docs (`00-OKU-BENI.md` through `08-isim-degisikligi-veri-2026-09-03.sql`). You named 07/08 as
live-in-use specifically; by your own framing one step up ("the morning packages, 00 through
08... these are history") the rest of the set is the same kind of object, not a different one
— 00-06 are already-executed record of what ran, same reason as 07/08, just not also
mid-paste tonight. All 3 files in `audit/` are timestamped backups and a dated defect-audit
doc — audit trail by the directory's own name. Nothing here was a close call.

## `data/research/` — the 720-file question, answered by one test applied directly

Your own distinction — "the product or a future session reads it *going forward*" — has a
direct test: **does any code outside `data/` actually read these files, or only cite them?**
Ran it against everywhere code lives: `lib/`, `app/`, `scripts/`, `supabase/migrations/`,
`supabase/functions/`, `package.json`. Found 45 references. **Every single one is a comment
citing where a number or a schema decision originally came from — never an import, a
`readFileSync`, or a `require`.** Sample: `lib/acquisition/source-authority.ts:113` — *"own
AP research, data/research/academic-systems/secondary-systems-v1.json"* — a citation, not a
dependency. Same shape in all 45, including inside applied migrations
(`supabase/migrations/0108_academic_tier.sql:5` cites `data/research/sql-dry-runs/...` in a
comment). **Nothing reads `data/research/` going forward. The product reads the database.**
This was consumed once, by a person or a session, to write the code or the migration that now
carries its conclusions — which is exactly what "research output" means.

**The bulk of the 720 files confirm this by naming convention alone**: 534 of 720 are
`.jsonl`, almost all batch/wave-numbered and dated in the filename itself
(`requirements_batch6_sabanci_2026-08-21.jsonl`, `s3_photos_agent_a_2026-08-26.jsonl`,
`thincat_batch4_2026-08-21.jsonl`) — staged ingestion input, already loaded, same category as
`data/morning/`'s SQL packages just organized by subject instead of by date.

## The genuine judgment call — six files without a date in the name

A handful of files break the "dated filename" pattern: `academic-systems/secondary-systems-
v1.json`, `admissions-systems/admissions-systems-v1.json`, `opportunity-eligibility/
opportunity-eligibility-v1.json`, `opportunity-dimension-tagging/tags.json`, `turkish-exams/
exams.json`, `requirements-audit/findings.json` — plus the `canonical-entities/` and
`counseling-intelligence/` families. These are the ones actually worth arguing, not assuming.

Read them directly rather than trusting the "v1" naming to mean "actively maintained."
Content reads like: *"ORYN should treat any 1-5 description of the CURRENT lise-level... as
Madde 69"* (`secondary-systems-v1.json`), *"ORYN must not state a CEFR level or skills split"*
(`exams.json`), *"ORYN needs a per-Bundesland G8/G9 flag"* (`opportunity-eligibility-
v1.json`). **This is real product-name usage, in prose — the closest thing in `data/` to a
plausible rename candidate.** Argued against, on two grounds:

**First, register.** Every sentence is a conclusion or a caveat from a specific research/
tagging pass — "must not," "was checked against," "should treat" — not how-to documentation a
future session opens to learn the current state of something. `requirements-audit/
findings.json` makes this explicit in its own text: *"checked against two Drive product
documents (ORYN — Product & MVP Decision Register...)"* — a dated cross-reference exercise,
not a maintained reference. No file in this group has a `v2`; "v1" here reads as "first and
only version," not "versioned because it gets revised." Same kind of object as the dated
`docs/` corpus you've already ruled untouchable — a record of what a research pass concluded
— just without a date token in this particular filename.

**Second, and more concretely: even these "cleanest" files are not clean.** Checked how much
of `data/`'s content is forbidden-pattern material regardless of directory:
**`ORYN-PRG-` identifiers: 246 occurrences. Agent-codename fields (`"oryn-4d"` style
`owner_agent`/`owner_server` values): 334, across 12 files. Branch-name citations
(`oryn/research-branch-name` style): 409.** `registry/claims_S7.jsonl` alone — 287 of its 287
"oryn" hits are `"owner_agent": "oryn-4d"` fields, not product-name mentions at all. Even
inside `counseling-intelligence/rules.canonical-proposal.json`, genuine product-name prose
sits next to *"the peer branch's (oryn/counseling-intelligence-research-013956) equivalent"* —
a git branch name, forbidden, four words away from a legitimate rename candidate in the same
file. A rename here isn't a directory-level decision or even a file-level one; it would need
occurrence-by-occurrence disambiguation inside files that mix all three categories freely.
That's a fundamentally different, much larger task than this lane — and for zero product
benefit, since nothing reads any of it going forward regardless of which occurrences are
which.

## The split, stated plainly

**Historical record: all 720 files in `data/research/`, all 11 in `data/morning/`, all 3 in
`data/audit/`.**
**Living reference: none.**
**Renamed: nothing.** All ~4,235 occurrences (or your 3,397, depending on method) are
historical record. This is the complete answer, not a shortcut to one.

## What this pass did not do

Did not touch any file in `data/`. Did not attempt an occurrence-level rename inside the six
judgment-call files even as an option — argued why that would be a separate, larger task
rather than sizing it. Did not re-verify the 3,397 figure's own methodology since it wasn't
needed to reach the conclusion. Did not check `scripts/*.ts` (outside `data/`, out of this
lane's scope) beyond confirming what they cite — if any of those ingestion scripts are
themselves in scope for another lane's rename, that's a separate question this doc doesn't
answer.
