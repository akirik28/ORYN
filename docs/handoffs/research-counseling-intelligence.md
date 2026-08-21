# Handoff — Counseling Intelligence Research

**If you want the substantive findings, not session mechanics: read the peer branch's
`15-executive-summary.md` first** (`oryn/counseling-intelligence-research-013956` —
`git show oryn/counseling-intelligence-research-013956:docs/research/counseling-intelligence/15-executive-summary.md`
if you're on this branch and haven't checked that one out). It accurately covers **both** branches'
work in one page — what's validated, the single highest-leverage finding (admissions systems vary
by country, and this whole package's reasoning skews US-centric by default), and what's genuinely
unresolved. This file below is the session-mechanics/resumption-state complement to that, not a
replacement for it.

**Read this first if resuming this session cold** for the mechanics specifically. This file is the
live resumption state for the `oryn/counseling-intelligence-research` branch/mandate. Update it at
every checkpoint.

## Corrected topology (this update supersedes the "session 7" narrative below — kept, not deleted, for the record)

**Everything under this heading was written and verified directly by the session whose commits are
listed here — not inferred, not assumed.** A prior version of this file (preserved unedited further
down, under "Superseded narrative") described a confusing "3+ session" situation including an
unreachable "session 7" (socket `71534`) supposedly authoring `03-recommendation-timing.md` and
`06-major-family-evidence/01`–`05`. **That attribution was mistaken. This session authored those
files directly** — verifiable by `git log`, e.g. `b20cdee` ("counseling-intelligence 03"), `4238e40`
("major-family-evidence 01-03"), `abd5b7a` ("04-05"), `da0c18a` ("06-07"), `cfa27fb` ("08-09"),
`ddccdee` ("07"), `8ae4f97` ("08"), plus later commits fixing cross-reference drift (`0d6aa1c`) and
adding country notes (`4998cd9`, `08f0e17`). The most likely explanation, based on this branch's own
`git log` (run `git log --oneline` yourself rather than trusting this paragraph): **this branch is
being used as a shared scratch branch by at least one entirely unrelated mandate tonight** —
interleaved `docs: canonical-entity-intelligence *` commits (university/entity-deduplication
research, nothing to do with counseling) appear throughout this branch's history alongside this
package's own commits. Whoever wrote the "session 7" narrative was very likely that other,
unrelated session, observing this session's commits land on a branch they didn't expect to share,
without a cross-session-message channel to this session to just ask. **This session has direct,
working cross-session contact with exactly one peer**: socket `uds:/tmp/cc-socks/70081.sock`,
correctly identified in the superseded narrative below as "session 1" — that identification and the
agreed split with them (next section) are accurate and load-bearing; the "session 7"/"three-way
inconsistent agreement" framing around them is not something this session recognizes or can
confirm, and should not be trusted without independent re-verification.

## The real, working split (established directly with socket 70081, both sides confirmed)

- **This session** (main checkout of `oryn/counseling-intelligence-research`, not a worktree):
  `03-recommendation-timing.md`, `06-major-family-evidence/00-family-taxonomy.md` +
  families `01`-`09` (computing, math/stats, physical sciences, life sciences, engineering
  ME/CE/AE/EE, biomedical engineering, economics/finance, business/entrepreneurship, environmental
  science/sustainability), `07-explainability-framework.md`, `08-unsafe-inference-rules.md`
  (consolidated across both branches by reading the peer's branch directly via `git show` —
  read-only, never edited their branch), `14-field-opportunity-mapping.md`. Machine-readable:
  this branch's `data/research/counseling-intelligence/rules.json`/`sources.json` (this branch's
  own pre-existing foundational files, `RULE-COUNSEL-001`-`033`+`901`-`902`/`SRC-001`-`007`,
  written by the peer session before it forked away) now also contain this session's later
  contribution merged in directly (`RULE-COUNSEL-200`-`230`, 66 rules total; `S-<NAME>`-prefixed
  sources, 52 total) — originally built and renumbered in separate `rules-session2.json`/
  `sources-session2.json` shards, merged into the canonical files and then deleted once the merge
  was verified complete.
- **Peer session** (socket `70081`, forked to its own worktree/branch
  `oryn/counseling-intelligence-research-013956` at commit `51b1978`, to escape the shared-checkout
  file-corruption problem both sessions hit early on — see "What actually happened" below):
  `00-overview.md`, `01-development-taxonomy.md`, `02-opportunity-development-mapping.md`,
  `04-profile-gap-framework.md`, `05-redundancy-saturation.md`, `06-major-family-evidence/`
  families `10`-`17` (medicine, psychology, political science/IR/policy, law, sociology/history/
  philosophy, literature/journalism/communication, architecture/design, visual/media arts),
  `09-persona-testing.md`, `10-open-questions.md`, plus two documents beyond the original 10-doc
  plan: `11-geography-admissions-systems.md` and `12-activity-progression-pathways.md` (the latter
  two live **only on their branch**, not this one — see `00-overview.md`'s own note on this).
- **Family taxonomy** (`06-major-family-evidence/00-family-taxonomy.md`, this session's file):
  the shared family list and exact filenames both sides use, agreed before either side started
  writing family docs, so neither side invented an incompatible grouping independently. Grew from
  17 to **18** after both sides finished their original assignments — this session found Education
  & Teaching missing entirely (only glancing mentions in two of the peer's docs, no dedicated
  treatment anywhere), added it as family `18` with its own filename
  (`18-education-teaching.md`), confirmed with the peer before writing it (no conflict).

## What actually happened (chronological, for anyone reconstructing this cold)

1. This session started from the branch's first commit (`148a2d6`, scaffold + `00-overview.md`,
   already present when this session began — apparently written by the peer session moments
   earlier, though this session did not learn that until later).
2. This session wrote its own `01`/`02` drafts, committed as `3bbedb3`. Between this session's read
   and write, the peer session had independently written a *better*, schema-grounded version of the
   same two files (commit `51b1978` for `01`) — a genuine race in a shared, non-worktree checkout.
   This session's write silently overwrote the peer's uncommitted `01`/`02` work on disk (nothing
   lost — both versions exist permanently in git history).
3. The peer session messaged this session directly (first use of the cross-session channel),
   confirming the collision and proposing to fork to an isolated worktree. Both sessions agreed the
   real fix was dividing the actual document set (not just isolating filesystems so both sides
   redo everything) — the split in the section above.
4. Both sessions executed their halves independently, checking in periodically over the
   cross-session channel (not via this file, which is why earlier versions of this file went stale
   between real checkpoints — **prefer live cross-session messages over this file's own "last
   updated" claims if both are available**).
5. A major substantive finding, first surfaced by the peer session's persona-testing pass and
   independently verified by this session via direct ÖSYM/YKS and UCAS sourcing: most of this
   package's admissions-signaling reasoning assumes US-style holistic review and does not transfer
   to Turkey's exam-score-dominated YKS placement system, or fully to the UK's super-curricular-
   weighted UCAS system. Written up in this session's `03-recommendation-timing.md` §6
   (`RULE-COUNSEL-228`, originally minted as `062` — see item 6 below) and the peer's
   `11-geography-admissions-systems.md`/`10-open-questions.md`. **Treat this as the single
   highest-priority open item for any future continuation of this research** — both sessions
   independently converged on that assessment.
6. A confirmed **rule-ID collision, since resolved on this session's side**: both sessions
   independently minted `RULE-COUNSEL-034` through roughly `059`+ for entirely different content
   (this session's docs `03`/`06`-families/`07`/`08` vs. the peer's `04`/`05`/`09`/`10`+). **By
   mutual agreement (direct cross-session messages)**, this session renumbered its entire
   `034`-`064` range to `200`-`230` — a block with headroom the peer session committed not to
   reach through normal sequential minting — leaving the peer's own `034`+ sequence untouched. Every
   in-document cross-reference on this session's side was updated to match (verified via a
   whitespace-tolerant regex sweep, since several references had been split across a markdown line
   wrap in a way a naive find-replace missed on the first attempt — worth remembering if anyone
   else attempts a similar renumbering). `RULE-COUNSEL-001`-`033` (plus a `901`-`902`
   reconciliation pair) belong to this branch's own pre-existing `rules.json`, written by the peer
   session before it forked away — those numbers never collided with anything. **Remaining work**:
   merge this session's now-clean `200`-`230` range into that pre-existing `rules.json`/
   `sources.json` (same branch, no cross-branch merge needed for this part), and separately merge
   the result with the peer branch's own, larger, independently-numbered registry.
7. Both sessions independently concluded the peer's branch (`-013956`) is the better final-
   integration target (clean history, no interleaved unrelated commits) — the peer offered to
   cherry-pick this session's scoped commits over. **Not yet done as of this checkpoint** — flagged
   for whoever does the actual integration, human or session.

## Mandate

Overnight, autonomous research task: design a semantic evidence taxonomy for ORYN's student
profiles (activity types, roles, recognition levels, output types, time/duration semantics,
evidence/provenance states, context model, unsafe-inference rules, major/career-family evidence)
so the counselor engine reasons about what a student has *actually done*, not a pile of text
fields. Docs-only — no schema, migration, or `lib/counselor/**` changes. Timeboxed to
2026-08-21 11:00 Europe/Istanbul. Full mandate text lives in this session's own first user turn;
the operative plan is `docs/research/counseling-intelligence/00-overview.md`.

## Scope boundary (do not cross)

Only write to: `docs/research/counseling-intelligence/**`, `data/research/counseling-intelligence/**`,
this file, and this session's own row in `docs/ORYN_WORKSTREAMS.md`. Never touch `lib/counselor/**`,
any migration, or production Supabase.

## Current, verified progress table (this session's view — re-check `git log --oneline` on both
branches before trusting any table, including this one, past this checkpoint's timestamp)

| Doc | Status | Branch |
|---|---|---|
| `00-overview.md` | Done | peer's original commit, edited by this session for accuracy (family count, branch attribution) |
| `01-development-taxonomy.md` | Done, schema-grounded | peer branch (`-013956`) |
| `02-opportunity-development-mapping.md` | Done, 4-axis evidence-state model | peer branch |
| `03-recommendation-timing.md` | Done, including the YKS/UCAS geography caveat (§6) | this branch |
| `04-profile-gap-framework.md` | Done | peer branch |
| `05-redundancy-saturation.md` | Done, tier-aware redundancy model | peer branch |
| `06-major-family-evidence/00-family-taxonomy.md` | Done, shared taxonomy — a living, growing list (17 originally, more added by both sessions since; check that file's §3 table for the current count rather than trusting a number here) | this branch |
| `06-major-family-evidence/01`-`09` | Done (computing, math/stats, physical sciences, life sciences, engineering, biomedical eng, econ/finance, business/entrepreneurship, environmental science) — all with UK/EU/Turkey country notes | this branch |
| `06-major-family-evidence/10`-`17` | Done (medicine, psychology, poli-sci/IR/policy, law, sociology/history/philosophy, literature/journalism/comms, architecture/design, visual/media arts) | peer branch |
| `06-major-family-evidence/18-education-teaching.md` | Done — added after both sides finished their original 17; genuinely missing from both, three-country (US/UK/Turkey) licensure comparison | this branch |
| `07-explainability-framework.md` | Done | this branch |
| `08-unsafe-inference-rules.md` | Done, consolidated across both branches (this session's rules now renumbered 200-230, originally 034-064; cross-references to peer's 001-031) | this branch |
| `09-persona-testing.md` | Done | peer branch |
| `10-open-questions.md` | Done | peer branch |
| `11-geography-admissions-systems.md` | Done, extends the YKS/UCAS finding to France/Germany/Netherlands/Italy/Switzerland/Canada | peer branch only |
| `12-activity-progression-pathways.md` | Done | peer branch only |
| `13-implementation-readiness.md` | Done, prioritized punch list synthesizing docs 00-12 | peer branch only |
| `14-field-opportunity-mapping.md` | Done, answers mission deliverable #5 directly | this branch only |
| `15-executive-summary.md` | Done — **read this one first if you read only one document from the whole package.** Accurately covers both branches' work, including this branch's own findings (spot-checked, correctly attributed) | peer branch only |
| `16-worked-example-full-chain.md` | Done — traces the mission's own stated end-state ("You appear interested in X... here is a real opportunity") through one concrete Turkey/YKS/CS persona, citing only content already established elsewhere in the package | this branch only |
| `06-major-family-evidence/19-social-work.md` | Done (peer session — distinct from psychology's clinical focus and generic `community_impact` volunteering) | peer branch only |
| `06-major-family-evidence/20-performing-arts-music.md` | Done (this session — music/theater/dance, missing from family 17's "Visual & Media Arts") | this branch only |
| `data/research/counseling-intelligence/major-family-taxonomy.json` | Done — a structured index over all 20 family docs (both branches, read directly) answering mission deliverable #11 more literally than rules.json/sources.json alone: onboarding interests, skills, career families, licensure/country coverage, interdisciplinary links, key rule IDs, per family. Index only, points back to each family's own `source_doc` | this branch only |
| `data/research/counseling-intelligence/rules.json` / `sources.json` on **this branch** | **Now genuinely unified for this branch's own contribution**: 78 rules (`001`-`033` foundational + `901`-`902` reconciliation, both pre-existing/peer-written before their fork, plus this session's `200`-`242`, merged in and renumbered — note `200`-`242` is not fully contiguous as owned-by-this-session; a few numbers in that range were minted and later corrected inline, see each rule's own text) / 62 sources (`SRC-001`-`007` foundational + this session's `S-<NAME>`-prefixed sources). The former `rules-session2.json`/`sources-session2.json` shards were deleted once this merge was verified — their content lives in the canonical files now. **Still not merged with the peer branch's own separate, larger `rules.json`/`sources.json`** on `-013956` (their own independent `034`-`109`+ range, 109 rules/54 sources as of their last reported checkpoint) — that cross-branch merge is the one integration step genuinely not done yet. |

## Working conventions established (both sessions converged on these independently or by agreement)

- **Source discipline**: 5-tier priority (official admissions guidance → official program pages →
  official education authorities → reputable counseling orgs → high-quality empirical research).
  Blogs/listicles are discovery-only, never cited as evidentiary basis. Every non-trivial claim
  gets a `confidence` and, where relevant, a `limitations` note. This session independently
  fact-checked its own O*NET/BLS/IBO citations against a peer re-verification pass (all held up
  precisely) — the discipline appears to be working as intended, not just self-reported.
- **Rule numbering**: `RULE-COUNSEL-###`, minted once per rule, cross-referenced by number
  thereafter. **Originally collided across branches in the 034-059+ range — this session's side is
  now renumbered to 200-230 (see item 6 above); the peer branch's own 034-086+ sequence is
  untouched and does not collide with this session's numbers anymore. Still not one unified
  registry** — do not treat either branch's `rules.json` as globally complete until integration.
- **Binding design decision**: reuse the existing 9-value `ProfileDimension` as the only top-level
  taxonomy — no proposed 10th dimension anywhere in either branch's output. New distinctions become
  sub-facets within an existing dimension.
- **Country-variance discipline** (this session, extended from the mission brief): every family
  doc's professional/licensure claims and career-outcome statistics are tagged with the specific
  country they describe (primarily US BLS/O*NET, supplemented with UK National Careers Service,
  EU ESCO, and Turkey-specific sources where found) — never presented as globally universal.

## Next action for whoever resumes either branch

**Cross-branch integration has not happened yet; same-branch consolidation is now done.** The
peer's branch (`oryn/counseling-intelligence-research-013956`) is the agreed target for the former.
Concretely, what's left: (1) cherry-pick or merge this branch's `03`, `06-major-family-
evidence/00`+`01`-`09`, `07`, `08`, `14`, `16`, and `major-family-taxonomy.json` commits onto the
peer branch; (2) ~~resolve the `RULE-COUNSEL-034`-`059`+ collision~~ — **done**: renumbered to
`200`-`242`; the peer's own `034`-`109`+ sequence is untouched and no longer collides; (3) ~~merge
this session's `200`-`230` rules/sources into this branch's own pre-existing `rules.json`/
`sources.json`~~ — **done, and kept current**: this branch's `rules.json`/`sources.json` now
genuinely contain both this branch's original foundational rules/sources (peer-authored, pre-fork)
and this session's later contribution, 78 rules/62 sources total as of this checkpoint (both
branches' counts have kept climbing since — re-check each branch's own file before trusting either
number past this timestamp); **still needed**: merge THAT combined file into the peer branch's own
separate, larger `rules.json`/`sources.json` (109 rules/54 sources as of their last reported
checkpoint); (4) resolve this branch's own unrelated interleaved `canonical-entity-intelligence`
commits (a different mandate, apparently from a third concurrent session actively running in this
same shared checkout as of this update — do not pull those into the peer branch's integration by
accident); (5) treat the YKS/UCAS/geography-conditional-admissions finding as the top-priority
substantive item for any further research, ahead of adding more major-family depth — now further
sharpened by the YKS-OBP finding (`RULE-COUNSEL-242` this branch / `RULE-COUNSEL-109` peer branch:
YKS placement's one non-exam channel is itself grades-only and capped small, so the core
exam-dominance finding is confirmed rather than complicated).

---

## Appendix: superseded narrative (preserved verbatim for the historical record — inaccurate in
## places, see the corrected topology at the top of this file; kept rather than deleted because
## whoever actually wrote this clearly spent real effort observing this branch and deserves their
## observations on record, not silently erased, even where this session's own git-log verification
## found the attribution wrong)

> **Concurrent-session note (added by a second session sharing this working directory, checked in
> without disturbing the progress table below — please don't re-sequence this note away):** this
> mandate is being executed by more than one session at once against the same checkout — confirmed
> directly (not assumed) by `git log` showing two independent, differently-authored commits for
> `01-development-taxonomy.md` inside a five-minute window, plus this file and `02-*` already
> existing, fully written, with `RULE-COUNSEL-` numbering through `033`, the first time this second
> session went looking. To avoid a third rewrite-war on the same files: **this session is treating
> `00-02` as owned by whichever session got there first** ... minting new rules starting at
> `RULE-COUNSEL-034` to avoid colliding with the existing sequence.
>
> **Update — this is genuinely a 3+ session situation, not 2.** `oryn/counseling-intelligence-research`
> (this branch) has commits from at least two different sessions past the point above: `01`/`02`
> finalized + `rules.json`/`sources.json` from the session writing this note, **and**
> `03-recommendation-timing.md` + `06-major-family-evidence/01`–`05` with `RULE-COUNSEL-034`–`044`+
> from a *different* session (self-identified over cross-session messaging as socket `71534`,
> referred to here as "session 7" — never directly contacted by this session; observed only through
> commits landing on this shared branch). **[This session's own correction, added later: the
> "session 7" commits described here — `03-recommendation-timing.md`, `06-major-family-evidence/01`-
> `05` — are this session's own work, per `git log`. This branch also independently carries unrelated
> `docs/research/canonical-entity-intelligence/**` commits from a genuinely different mandate; the
> "session 7" attribution most likely originated from whoever was running that unrelated mandate,
> observing this session's commits without a cross-session channel to just ask who authored them.]**
>
> A third session (socket `70081`, "session 1" in this note) independently produced its own
> `01-development-taxonomy.md` at commit `51b1978` before moving to an isolated worktree/branch,
> `oryn/counseling-intelligence-research-013956`. Session 1 had, separately, already agreed a
> "00–10 split" with session 7 that this session was not party to — inconsistent with this note's
> own agreement with session 1. **[This session's correction: no such three-way agreement is
> recognized by this session. The real, working split with socket 70081 is documented at the top of
> this file and has held up through both sessions' full completion of their halves.]**
>
> Explicit, mutual decision (this session and session 1): do not attempt live cross-session
> numbering reconciliation — each sequence is internally consistent within its own branch/commits
> but not globally unique across branches. Reconciling this is real work explicitly deferred to a
> future integration pass.
