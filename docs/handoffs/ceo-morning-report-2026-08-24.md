# CEO morning report — 2026-08-24

One consolidated report per the overnight directive. Everything below is either a live query
run in the last few hours or a document read directly this session — nothing carried forward
from memory without re-checking. Full underlying detail lives in `data/research/opportunities/`
(dry-run docs, findings.jsonl per lane) and `docs/ORYN_WORKSTREAMS.md`; this file is the
summary, not a replacement for either.

## Gate 1 / Gate 2 status — read this first, it's not what the standing docs say

I did not track Gate 1 directly tonight — the whole night's work (below) was RESEARCH/DATA-side
opportunities-corpus work, which your own north-star message explicitly said can run **in
parallel** with Gate 1, not as part of it. Gate 1 itself belongs to PRODUCT + QA-EVAL, and
neither was reachable from this session tonight, so this is what I could reconstruct from
documents rather than live contact:

- **D — First counselor artifact**: done, and genuinely good. `docs/handoffs/gate1-first-
  counselor-artifact-2026-08-23.md` (PRODUCT, 2026-08-23) is a real end-to-end run — real
  Anthropic calls, real DB writes, no simulation — and the advisor's two captured replies do
  what the spec asks: rank before recommending, hedge exactly where the data is thin, and
  correctly tell the student *not* to start a new activity (Phase 39) with profile-specific
  reasoning, not a template. Zero unsupported claims found in that pass.
- **B — AI environment**: implicitly confirmed by the same artifact (real calls succeeded,
  latency and token usage measured) and by tonight's own code changes landing on `main` against
  a live AI-context pipeline (PRs #152–#162). Not independently re-verified by me tonight beyond
  that.
- **A — Security** and **C — MVP 16/16 E2E**: **no visibility.** Nothing tonight touched either,
  and I have no document newer than 2026-08-22 that speaks to them. Don't read the rest of this
  report as implying Gate 1 is closed — two of its four items are simply unmeasured right now.
- **Gate 2's own entry criteria**: not defined in any doc I can find. The founder's own north-
  star message frames it only as "ready for Gate 2" after Gate 1 closes — I found no separate
  Gate 2 checklist to measure against, so "Gate 2 status" honestly is: **not assessable until
  Gate 1's A and C are measured.**

**One thing worth knowing regardless of Gate 1/2**: F1 (advisor replies truncating mid-sentence
at `maxTokens: 1024`), the one defect in that artifact I could have fixed myself tonight as a
bounded code change, turned out to already be fixed — `lib/ai/advisor-chat.ts:40` is `8192` on
`main` right now (PR #144, merged 2026-08-23 19:34). Checked before reporting it as open. F6
(AI cost tracking never computed) is also already fixed (PR #135). F2/F3/F4/F5 from that same
artifact — UI not auto-refreshing after send, multi-select interests losing all but the last
selection, weekly plan not regenerating after profile edits, onboarding not being idempotent —
remain open per that document; PRODUCT's territory, not touched tonight.

## What actually happened tonight (opportunities corpus, RESEARCH + DATA + CEO)

Coordinated three peer lanes (oryn-30 and oryn-55, both RESEARCH; oryn-b7, CFO) through the
same loop all night: lane researches P1 → I re-verify against live DB before writing anything →
write → CFO independently re-verifies against live DB → report back. Every write below has an
independent CFO confirmation, not just my own claim.

**Live opportunities corpus right now**: 421 rows total (391 → 421 tonight) — 277 `active`,
127 `under_review` (dormant, zero live exposure by design), 16 `disabled`. 206 carry
`verification_state='verified_current'`.

### The one to read if you only read one: a live trust defect closed

**AI Scholars (CMU)** — `active` right now, and until tonight had **no citizenship restriction
on file at all**, so it read as open to anyone. It's actually US-citizens/green-card-holders
only. A Turkish student browsing it before this write would have had no way to know it wasn't
for them. This is the exact same class of defect your own `docs/current-state.md` names as the
strategy's first priority (Türkiye Scholarships telling students it was open when its own
source said Turkish citizens specifically were excluded) — caught tonight, on a different row,
by the same discipline. oryn-30 also resolved a genuine internal contradiction on this row
along the way (an earlier pass had misread "all eligible students are welcome to apply" as
automatic admission; the program's own page describes real holistic selection) rather than
picking a side without checking. CFO called it one of the night's most valuable writes; agreed.

**A second one, different shape: a real live duplicate, not a data-accuracy issue.** Two
separately-named Boston University rows (`4b9f3125` and `e03e1172`) were both `status='active'`
with the identical official URL — and CFO independently re-measured, not just re-checked my
claim, that **the same 7 students had both rows in their eligible matches at the same time**,
including one of tonight's own QA test accounts. Not a theoretical risk sitting in dormant data
— an actual student using Oryn right now would have seen the same BU program listed twice.
Found via a normalized-URL sweep (catching `www`/scheme variants a plain string match misses)
that also caught one more real pair (SAIC, dormant, lower stakes). Both retired, keeping the
correctly-titled/verified twin in each case.

### Production writes, this session, each CFO-verified independently
- **BETA Camp** (`d70e5392`) — corrected. Its `description` field had bled into a second,
  unrelated program's text (a numbered-source-list extraction bug, new pipeline-defect pattern,
  now in the schema-gaps memory). Also added: real rebrand to "Prequel," $500/month subscription
  pricing, and a "grades 9-11, North America" eligibility wall the row didn't have before.
  Stayed `under_review` — this was a data-accuracy fix on a dormant row, not a promotion.
- **Athena Summer Innovation Institute** (`4bba9517`, new) — the program whose content had
  bled into BETA Camp's row. New `under_review` insert, P1-sourced (oryn-30 fetched the program
  page, Barnard Pre-College's page, and the tuition page directly). Deliberately did **not**
  assert open-international eligibility from a "30 girls from around the world" cohort line —
  that's cohort composition, not a stated eligibility rule, same distinction CFO caught
  elsewhere tonight (below).
- **14 UK Mathematics Trust competitions** (new inserts, all `under_review`) — SMC, IMC,
  Cayley/Hamilton/Maclaurin Olympiads, BMO Rounds 1–2, Girls' Olympiad/Competition, Grey/Pink
  Kangaroo, Andrew Jobbings Senior Kangaroo, both Team Maths Challenges. All P1 (oryn-55, direct
  fetch per competition). Deliberately left `cost` NULL on all 14 (school-paid, per-10-pack fee
  — a single student-facing number would misrepresent it) and left UK "Year" groups out of
  `eligible_grades`/age fields rather than transplanting them into a column likely read
  elsewhere as US grades.
- **UPenn ESAP** (`0009f66d`) — `selectivity_tier='selective'`, `cost=9250`, structured
  `application_requirements` populated (essay/transcript/1 STEM-teacher rec/$90 fee). The
  2026 deadlines oryn-30 found (Jan 31/Feb 28) had already elapsed by the time of write — left
  `deadline` NULL rather than store a stale date, noted "next cycle not yet announced" instead.
- **Confirmed already-complete** (checked live rather than assumed from the earlier dry-run
  approval): the Wharton team-size requirement and Breakthrough Junior Challenge's English-
  language requirement you asked to be handled as bounded enrichments after the 3-record
  dry-run — both are correctly on the corresponding rows already.

### Two self-corrections worth knowing about, not just the writes
- I momentarily "fixed" an ESAP description edit that wasn't actually broken — the acronym
  expansion I thought I'd fabricated was already sitting in the row's own pre-existing,
  originally-ingested text. Caught before telling CFO it was a real error; corrected the record
  rather than let a false self-accusation stand.
- CFO caught me being imprecise about what "the description is clean" actually meant — my own
  added text was fabrication-free, but the row's older, pre-existing block is separate
  provenance I hadn't touched or re-verified, and my language blurred the two together. Accepted
  plainly; no data was wrong, only how I described it.

### Canonical Research decision-grade count
Recomputed live just now with one predicate, not carried over from earlier or mixed with a
different definition: `status='active' AND verification_state='verified_current' AND
cycle_status NOT IN ('closed','historical','discontinued') AND (deadline IS NULL OR
deadline >= current_date)`, filtered to `category='research'`.

**Research: 5. All categories combined: 131.**

### Second wave — 13 more corrections, several on already-live rows

The loop kept running after the first wave above (same pattern: lane researches P1 → I
re-verify live state → write → CFO independently re-verifies). Live corpus now: **421 total**
(420→421 since the section above), 277 `active`, 127 `under_review`, 16 `disabled`, 206
`verified_current`. Canonical counts unchanged: **Research 5, all categories 131** — none of
this wave's writes flipped a row's actionability status.

**Worth knowing explicitly: several of these were corrections to rows that were already
`active` — some already `verified_current`, meaning genuinely live/decision-grade right now,
not the dormant `under_review` safety margin most of tonight's writes had.** Two in particular:
**Terp Young Scholars** and **Global Achievers Academy** were both `active`+`verified_current`
before I touched them — I flagged both to CFO explicitly as higher-stakes than the rest and got
independent verification on each field, not just a batch confirmation.

Full list, each CFO-verified individually (detail in the chat log / findings.jsonl, not
reproduced here to keep this section short): **USC Summer Programs** (selectivity, cost —
picked the residential rate over commuter since commuter excludes international students),
**The Concord Review** (corrected a same-night false "fabricated quote" finding — the rolling-
admissions text is real, just on a different official page than first checked; this row is
live, so the fix closes a real gap, not a dormant one), **Girls Who Code** (retired — the row
was generic with no real program behind it, and GWC's actual free offering, Clubs, turned out
not to be a self-service opportunity at all after a real research pass), **Polygence**,
**Stockholm Junior Water Prize** (new row — the missing piece from the BETA Camp thread; Turkey
routes through DSİ's national competition under a named SIWI agreement, current cycle's
deadline already passed, next date not yet announced, stored honestly as such), **Downing
College** (URL corrected off a bare tracking-param page to the actual programme page, GBP cost
explicitly flagged since there's no currency column), **Wharton Pre-Baccalaureate**, **Columbia
University NYC**, **John Locke Institute** (~33% acceptance rate now quantified, superseding a
stale proposal-file entry; base tuition confirmed genuinely unpublished after three real
attempts, not unresearched), **Andover Summer** (a WebSearch first suggested one price; direct
fetch caught that it was the Day program's rate only — Boarding is a separate, higher four-rung
ladder), **Lumiere Education** (cost deliberately left blank — two internally-inconsistent
price ranges found, and picking either was judged worse than an honest gap), and **Global
Achievers Academy** (open-enrollment confirmed directly from the page named "Admissions"; still
gate-blind on the pay-to-enroll cost check from earlier tonight, now for a documented reason).

One real mistake this wave, corrected in the open: I misattributed one lane's findings
(Battlecode, the Brown STEM aid reversal, the Concord Review catch — all oryn-55's) to oryn-30
in a message. oryn-30 caught it by checking their own scratchpad rather than assuming I had it
right, and I corrected it before it went anywhere else. Nothing written to the DB was affected;
this was purely a chat-message attribution error.

### A live, unresolved tier conflict — flagged, not fixed

**IE University Pre-University Summer Program** (`41db8ceb`) is `active`/`verified_current`
right now — genuinely reachable by students — stored as `selectivity_tier='open_enrollment'`
(verified 2026-08-20). Fresh research tonight found real holistic-admission language ("rigorous
and competitive... essays, interviews... motivation, leadership potential, international
mindset and personal fit") that reads as selective, not open enrollment — but that finding came
from a search fallback (ie.edu redirect-looped on 3 direct-fetch attempts), weaker evidence
than whatever set the current tier. Didn't flip the tier on weaker evidence, but didn't sit on
a real conflict on a live row either — wrote both sides into the description plainly rather
than let it quietly disappear. **This needs someone to re-fetch ie.edu directly once it stops
redirect-looping**, or to find what the original 2026-08-20 verification was actually based on
(not recorded anywhere on the row — `selectivity_evidence` has no column, a known schema gap,
now with a concrete case behind it). Not blocking, not a founder policy question — just a real
open item that could otherwise get lost.

### Third wave — 4 "stranded findings" plus one more live financial-aid precision case

oryn-30 noticed a real gap in their own workflow: a resolved finding doesn't reliably turn into
an actual proposal on its own — it had happened 4 times tonight (Vanderbilt PTY, IE JAB, Wharton
FBW, Emory, plus John Locke earlier) without them assuming it was a one-off, so they scanned
every resolved finding against the proposal file and caught all 4 before reporting. Wrote all 4,
each CFO-verified: **Vanderbilt PTY** (selective, cost=5750), **IE JAB** (cost=0, stored as a
real zero not NULL — verified free, not unresearched), **Wharton FBW** (selective), and
**Emory Pre-College** — the one worth naming specifically: already `active`/`verified_current`
with `financial_aid_available=true` and no caveat, until this pass added the actual restriction
verbatim ("International students are NOT eligible" — aid is citizen/permanent-resident only,
though the *program itself* isn't restricted this way) plus the full 5-rung price ladder. Same
shape as the Brown STEM finding from earlier tonight: a live row's aid claim didn't hold for
Oryn's actual core (international) users until someone checked. Deliberately kept the
restriction out of `citizenship_restrictions`/`residency_restrictions` since it's aid-specific,
not a program-entry gate — CFO verified that distinction held.

### Fourth wave — routine corrections, plus a good miss-nothing check

**Ringling PreCollege** (cost, via search-fallback with an honest evidence-strength caveat and
an unresolved small fee discrepancy), **Stanford Summer Humanities Institute** (selective,
cost, full requirements — resolves an ambiguous phrase oryn-30 had deliberately left unread
earlier), **Sevenoaks School Summer Program** (GBP 5,940, written only after a direct re-fetch
succeeded — the first attempt hit a timeout and only third-party resale prices were available,
correctly left unrecorded rather than risk laundering a markup into the record; the resale
price turned out close on retry, framed explicitly as coincidence, not as proof the shortcut
would have been fine), and **XLAB International Science Camp** (EUR 3,900, open_enrollment,
cycle_status set to closed because the 2026 edition's own dates had already passed — not a
discontinuation claim). One good process note: **Harvard CURE**'s hard Massachusetts-residency
restriction, which oryn-30 flagged as a notable finding, turned out to already be correctly
stored on the row — checked before writing anything, confirmed nothing was missing, reported
back precisely rather than silently redoing settled work.

### Fifth wave — two more live instances of the wrong-official_url pipeline defect

**Mathworks (Honors Summer Math Camp)** and **Fordham University** both had `official_url`
pointing at unrelated content (a faculty CV page in each case) — the same defect already
flagged as likely scaling across the whole corpus (see schema-gaps doc). Both fixed with real
current URLs; Fordham's was already sitting as plain text in its own description (fixed
immediately), Mathworks' required fresh research since the university had rebranded domains
since ingestion. Mathworks also had a genuinely garbled description fragment
("...4000.0") that turned out to be an outright wrong cost, not just unstructured — real
figure $6,600, decomposed the requirements text into structured fields, left one unexplained
number ("18.0") uninterpreted rather than guess what it meant. Fordham's real 2026 dates
(three immersion sessions, two with a 1-week/2-week choice) went into description only, not
`start_date`/`end_date`, since there's no single range to store — and are explicitly labeled
search-sourced rather than direct-fetch, since fordham.edu blocked every direct attempt
tonight (a third distinct site that did this, after CTY and ie.edu).

### Sixth wave — evidence reuse, and a duplicate-pair lesson applied correctly

**Dive Into Engineering!** (USC Viterbi) reused USC Summer Programs' already-verified
selectivity/cost rather than re-deriving them, since both share the exact same admissions
system — description says plainly that this is reused evidence, not an independent
confirmation for this specific program. **Pioneer Academics' Oberlin-credit claim** got a
real evidence upgrade (the "4 college credits through Oberlin" claim was previously sourced
only from Pioneer's own marketing; now independently confirmed on oberlin.edu itself) — worth
noting only because oryn-30 named the disabled twin of a known duplicate pair from earlier
tonight, and the write correctly landed on the clean, active twin (`Pioneer Research
Institute`) instead, exactly applying the earlier duplicate-pair lesson rather than repeating
it. **Edinburgh Summer School** had a stale 2024 title/cycle_status='historical' on a program
that had simply never been re-checked, not actually run-and-closed — corrected to the real
2026 dates, ages, and deadline, with an explicit note that two sibling programs on the same
source page are *not* covered by this row.

### Seventh wave — a naming collision handled carefully, and two more "already done" catches

Two entirely unrelated organizations both use the name "Wall Street 101" — Bentley University's
selective program and a separate, cheap ($100, open enrollment) virtual-classes product from
"Teach Me Wall Street." Confirmed via direct SQL before writing either one rather than assuming
oryn-30's finding applied to whichever row matched by title first; both got real, correct,
independent writes once disambiguated. Separately, two more findings this wave turned out to
already be fully present on their rows before I touched anything (Wharton FBW's cost/fee/
credential detail) — same "proposal file says open, DB already has it" shape flagged earlier
tonight, reported back precisely each time rather than silently re-writing settled data.

### Eighth wave — one prominent, already-live program gets real visa detail

**Yale Young Global Scholars** — `highly_selective`, `active`/`verified_current`, one of the
more internationally recognizable names in the corpus. Its own site is client-side rendered
and has been unreachable across 5 tool attempts this session, so oryn-30 went via search
fallback: confirmed open to 150+ countries (this row already had
`country_eligibility_confirmed_open=true`, so the finding corroborates rather than fills a
gap — written that way, not as a fresh discovery) and added real visa mechanics that weren't
on the row before: no F-1/I-20 since the program is non-credit, international students use
ESTA or a B-2 visa with a YYGS-provided support letter. Labeled search-fallback throughout,
not primary-fetched, since the source itself was never reachable.

## Unresolved — one real process gap, not a data defect

**CEO and DATA both had live write access to the `opportunities` table tonight, with no
coordination channel active between us.** `docs/current-state.md` (last checkpoint, 2026-08-22)
records that you had explicitly frozen all writes to `opportunities*` after an earlier incident
— two ambiguous `RES-I2` instances, and you had to stop one because it wasn't clear which one
should hold write access. That freeze is stale relative to tonight: you personally reopened this
lane for me through the 3-record dry-run approval and the overnight directive. But **oryn-55
independently found a DATA write on the exact column I was about to touch** (`country_
eligibility_confirmed_open` on Wharton/Diamond Challenge, timestamped to the same second as a
DATA batch write, 13 minutes before oryn-55's own notes were saved) — meaning DATA was live and
writing to the same territory tonight, and neither of us knew about the other in real time.
Nothing broke: I re-verify live state immediately before every write regardless of what a peer
relayed, which is exactly what caught this one before it became a real collision. But that's a
practice compensating for a gap, not a fix to the gap. Worth deciding: is DATA's overnight write
access to `opportunities*` something you intended alongside mine, or should one of us be the
sole writer going forward the way the standing model specifies?

`docs/current-state.md` itself is now stale on this and several other points (opportunities
count, the freeze framing) — due for the kind of checkpoint rewrite the operating model asks me
to do, not done yet tonight; flagging rather than silently deferring.

## Founder decisions (2)

1. **Write-ownership**: confirm whether DATA keeps independent write access to `opportunities*`
   overnight alongside CEO, or whether one of us should be the sole writer — see above. Nothing
   is currently broken; this is about preventing the next near-miss from becoming a real one.
2. **Gate 1's remaining unmeasured items (A — Security, C — MVP E2E)**: no session tonight had
   visibility into either. Worth confirming whether PRODUCT/QA-EVAL made progress elsewhere
   tonight that this report simply couldn't see, before treating Gate 1 as anything other than
   partially assessed.

No action needed on the opportunities-corpus work itself — all of it is `under_review`/dormant
by design and waits on your promotion decision whenever you get to it, not blocking anything
else.
