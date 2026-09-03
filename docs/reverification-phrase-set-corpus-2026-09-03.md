# Deriving the re-verification phrase set from real pages, not intuition

**Date:** 2026-09-03. **Author lane:** this session. **Assigned by CEO** after dry run #1
(design doc §10, run for real) found the design's own §5.1 literal phrase set produced zero
P1 outcomes across 20 real, successfully-fetched pages — a measured-high liveness-silent
rate, directly hitting Assumption A12. Explicit instruction: "derive the phrase set from
real pages instead of from intuition... pull a larger sample, deliberately spread across
categories and countries rather than whatever the priority ranking surfaces first... report
both directions... if the corpus says phrase matching can't be made reliable, that's a
finding."

## What was pulled and why

Priority-ranked due-set sampling (what the production job actually uses) skews toward a
narrow slice — `open`/`upcoming`, no deadline, highest-exposure rows, which is exactly right
for the job's own purpose but wrong for *this* purpose: deriving vocabulary needs to see
what a representative cross-section of real pages actually says, not just the highest-risk
ones.

Instead: a stratified sample, up to 5 rows per `category` (all 12 present categories:
`summer_program`, `competition`, `research`, `internship`, `scholarship`, `student_program`,
`online_program`, `volunteering`, `entrepreneurship`, `fellowship`, `conference`,
`academic_program`), random within category, `status='active'` with a real URL. 53 rows
selected, 49 fetched successfully via the same, already-tested `runFetchLadder` the
production job uses — no new fetch logic written for this. Spans 6 `cycle_status` values
(unverified/closed/date_not_announced/upcoming/open/historical — the full live distribution
except the empty `discontinued` bucket) and countries including the US, UK, Germany,
Netherlands, France, Türkiye, and several international/no-country rows.

Read in full, by hand — every one of the 49 fetched pages' content, not a sample of a
sample.

## What real pages actually say

Three findings, each traceable to specific rows:

**1. Word order and tense, not just missing vocabulary, is the dominant failure mode.** Not
one real "closed" example in the corpus matched the literal string `"applications now
closed"` verbatim. What real pages actually wrote: *"Registration for the 2026 Global Essay
Prize **is now closed**"* (JLI), *"The 2026 ASSIP Application **is now closed**"* (ASSIP),
*"The 2025 Project Award application **is now closed**"* (Girl Up), *"SIP 2026 **Has
Officially Concluded**"* (Science Internship Program). Every one differs from the hardcoded
phrase only in word order or tense — a literal-string list would need combinatorial variants
to cover ground a handful of short, tolerant patterns covers directly.

**2. Real vocabulary the original list never anticipated.** *"Apply Now"* is an extremely
common call-to-action (Wharton M&TSI, LaunchX, Case Western, UWC, UNO, Pioneer, Columbia NYC
Commuter Summer) that the original opening set (`"applications open"` / `"apply by"` /
`"deadline:"`) never matched at all. Also observed: *"APPLICATIONS FOR 2026 **ARE NOW
OPENED**!"* (Özyeğin, caps + past-participle), *"DELEGATE CALLS FOR ISTANBUL **ARE OPEN
NOW**"* (EYP Türkiye, "open" before "now" — the opposite order from Özyeğin), *"**Registration
open** for Summer 2026"* (Wall Street 101), *"The 2027 ... application **is available**
here!"* (Coca-Cola Scholars).

**3. `"check back"` is confirmed, a third time, as a false-positive source — never a
legitimate standalone trigger.** Dry run #1 already found it firing 2/2 times on unrelated
blog/photo-gallery "check back for updates" text. Comparing old vs. new classification on
this corpus found a *third* instance in the process: Boston University Tanglewood Institute's
"Season announcements. Alums in the news. Program updates. **Check back regularly** for
more!" — again nothing to do with application status. Its one genuinely legitimate observed
use, Interlochen Review's *"currently **not open for submissions**. **Check back** in
January, 2027"*, is still caught by a more specific pattern (`"not open for submissions"`)
that doesn't need the bare trigger at all.

## Two things measured, deliberately not fixed here

**A meaningful share of the sample carries no English signal at all.** Five Turkish-market
rows (İBB Genç Gönüllü Programı, GençBizzTech, Genç UPSHIFT, Gençlik Merkezleri, The Duke of
Edinburgh's Award — Türkiye) are entirely in Turkish. An English-only phrase matcher
structurally cannot classify these regardless of how the English list is tuned — this is not
a vocabulary gap the same fix closes, it's a different kind of gap. Given AGENTS.md's own
day-one Turkey market commitment and this codebase's own EN/TR bilingual discipline
elsewhere, this is worth a founder-level decision (a parallel Turkish phrase set, reviewed by
a Turkish speaker — not this session's own guess) rather than a quiet English-only expansion
that leaves the gap unnamed.

**A genuine false-positive trap exists and argues for staying conservative.** Columbia's own
course-browsing page contains, verbatim, `"Format - Any - Online In Person **Status - Any -
Open Closed**"` — a filter *control*, not a fact about any specific opportunity. A naive
expansion to bare, unanchored `"open"` / `"closed"` word matches would have caught this (and
likely many similar filter-UI patterns across program-browsing sites) as a false confirmation.
Every pattern added here stays anchored to an application/registration noun or an explicit
CTA phrase for exactly this reason — verified directly: neither `findOpeningPhrases` nor
`findClosurePhrases` fires on the Columbia filter text (see
`__tests__/opportunities/reverification/classify.test.ts`'s own test for this).

## The change

`lib/opportunities/reverification/classify.ts` — the original four closure phrases and three
opening phrases are unchanged (none were shown to cause a false positive); `"check back"` is
removed as a standalone closure trigger; eight new regex patterns are added (five opening,
three closure), each documented in the file with the specific real page that motivated it.
Implementation moved from pure substring matching to short, anchored regexes specifically
*because* word order was the dominant failure mode — a literal-string list cannot express
"open" and "now" in either order without an explosion of variants.

## Measured result — both directions, as asked

**A: classify-level, on the full 46-row sample that passed content guards under both phrase
sets** (same corpus, re-classified twice — old logic reconstructed verbatim from the
pre-this-session commit, new logic is the actual shipped code):

| | liveness-silent | agrees (would be P1) | disagreement (→ adjudication) |
|---|---|---|---|
| Old (design doc §5.1, as first built) | 39 (85%) | 4 | 3 |
| New (this pass) | 31 (67%) | 12 | 3 |

9 rows flipped from silent to classified; 1 flipped the other way (Tanglewood's "check back"
— see above, the intended fix, not a regression). **All 9 newly-classified rows were checked
by hand against their real page content**: 8 are unambiguous, verifiable-correct
confirmations (e.g. Coca-Cola's matched excerpt states the exact deadline already on file,
"September 30, 2026" against a stored deadline of `2026-09-30`); the 9th (LaunchX — an "Apply
Now" nav link against a stored `closed` status with a future-looking deadline) is a
genuinely ambiguous case correctly routed to LLM adjudication rather than either
auto-confirmed or left silent. **Zero false positives found in this sample.**

**B: an official re-run of dry run #1's exact same 20-row population, through the real
production pipeline** (`runReverificationPass`, `dryRun: true`, identical `max_rows`/
`budget_ms`), for a clean before/after on the number CEO already has:

| | p1_confirmed | p1_changed | p2_unreadable | transport_error | `source_verified_at` writes |
|---|---|---|---|---|---|
| Dry run #1 (old phrase set) | 0 | 0 | 16 (80%) | 2 | 0 |
| Dry run #2 (new phrase set) | 8 | 1 | 9 (45%) | 2 | 9 |

Corroboration reproduced identically (2/2 transport failures falsified by a healthy Wayback
capture, same two rows both times — nothing about corroboration changed in this pass, so
this is a consistency check, not a new measurement). One disagreement reached adjudication
and was confirmed changed — checked by hand: USC Pre-College's page reads *"Applications for
the 2026 Summer Programs are **now closed**"* against a stored state implying open — the
exact Stanford Anesthesia shape this whole job exists to catch, correctly identified,
correctly *not applied* (demotion stays off; `wouldProposeDemotion: 1`, nothing written).

## What this does and doesn't settle

This is a real, measured improvement, not a guess dressed as one — but it is not "solved."
On the broader 46-row stratified sample, **67% of successfully-fetched rows are still
liveness-silent even after this pass.** Design doc Assumption A12 asked whether the rate is
high enough that §7.6 (liveness-silent handling) is the job's primary value rather than a
safeguard — on this evidence, still yes: phrase matching, even meaningfully improved, closes
part of the gap, not most of it. A wider list tuned further against this same 49-row sample
would likely show more improvement on paper without necessarily generalizing — the honest
limit here is sample size (46-49 rows) and a single reading pass by one person, not
exhaustive coverage of how real pages phrase things globally.

**Not decided here, deliberately:** whether to invest further in phrase-set breadth, build a
non-English (starting with Turkish) parallel vocabulary, or accept §7.6 as the job's
primary mechanism and treat phrase confirmation as a bonus for the subset of pages where it
works. That's the founder-level call design doc §12 and A12 both flagged as open, and this
document's job was to bring real evidence to it, not make it.

## Gates

`npm run typecheck` / `npm run lint` — both green. Full suite green, 10 new tests directly
exercising every new pattern against the real page text that motivated it, plus the Columbia
filter-UI negative case. Both dry runs referenced above made real Tavily/browser-UA/Wayback/
Anthropic calls and wrote nothing (`dryRun: true` throughout) — see
`lib/opportunities/reverification/run-job.ts`'s own dry-run guarantee and its automated
proof test.

---

## Addendum, 2026-09-03: Turkish patterns, and a bigger finding underneath them

**Assigned by CEO** as the direct follow-on to "not decided here, deliberately" above: "Five
pages is too thin to derive from, so fetch more... read them, find the patterns the language
actually uses, and mind that Turkish is agglutinative, so a 'tolerant pattern' there means
something different than it does in English." Same discipline as the English pass: read the
real corpus by hand before writing a pattern, measure both directions, say so if the honest
answer is "this needs a different mechanism."

**Leading with the more important result first:** the Turkish patterns themselves are a
modest, real improvement (below). What they surfaced in the process — a structural gap in
`classifyAgainstStoredState` that silently blocks classification for `unverified`/
`date_not_announced` rows *regardless of language* — is the bigger finding of this pass, and
is not Turkish-specific at all. Both are reported here because the Turkish measurement can't
be read honestly without separating them.

### What was pulled

The entire Turkish-market population in the live corpus, not a further subsample of it:
`country IN ('Turkey', 'Türkiye')` OR a `.tr`/`.com.tr`/`.gov.tr`/`.edu.tr` official URL. 21
rows, 20 fetched with real content (one, İTÜ Tasarım Atölyesi, returned none — recorded, not
substituted). Read in full, by hand, same as the English 49.

### What real pages actually say

Three constructions, each traceable to specific rows, none a translation of the English list:

- **"son başvuru" / "son kayıt"** ("final application" / "final registration" — functions as
  a deadline label, like English `"deadline:"`): Sabancı University (*"Son Başvuru: 1 Ağustos
  2026"*), İTÜ Lise Yaz Okulu (*"SON KAYIT: 16 TEMMUZ"*), Istanbul Bilgi's FAQ (*"Son başvuru
  tarihi 12 Haziran 2025"*) — three independent pages, near-identical phrasing.
- **"şimdi başvur" / "hemen başvur"** ("apply now" / "apply immediately" — two different real
  words for "now," not one word's suffix variants): ODTÜ/METU (*"Şimdi Başvur"*), Sabancı and
  GençBizzTech (both *"Hemen Başvur"*).
- **"kayıtlar(ımız) kapandı"** ("[our] registrations have closed"): Bilkent University Summer
  Camp (*"Kayıtlarımız kapandı."*) — the only closure example the sample contained, so the
  only one coded, on the same don't-guess discipline as English's "check back" removal above.
- **"kayıtlar başladı"** ("registrations started" — an opening signal): İTÜ Lise Yaz Okulu
  (*"Kayıtlar Başladı!"*) — sitting on a page whose own *"SON KAYIT: 16 TEMMUZ"* deadline had
  already passed by fetch time, against a row stored `closed`. Correctly a disagreement for
  adjudication, not an auto-confirmed reopening — stale marketing copy left up past its own
  deadline. GençBizzTech's *"Hemen Başvur"* nav link, sitting beside content entirely about an
  already-concluded programme, is the same shape again.

**Why this is a different kind of derivation than the English one, not a translation of it:**
English's failure mode was word *order* ("now open" vs "open now") — a handful of patterns
covers every order because English marks tense with separate words. Turkish marks the same
distinctions with *suffixes on a shared root* ("kapan-dı" = closed, "kapan-mıştır" = has
closed [formal], "kapa-lı" = closed [adjective] — one concept, three endings, the third not
even sharing the "kapan-" substring). A pattern tolerant of Turkish inflection the way the
English ones are tolerant of word order would need to match on the bare root — and Turkish
roots are short enough for that to be actively dangerous: "aç" (root of "to open," 2
characters) is a substring of "açıklama" (explanation), "açı" (angle), "açlık" (hunger), none
of which say anything about an opportunity's status. English has nothing this short and this
ambiguous among the roots this file matches on. The response: every Turkish pattern is a
specific, whole-phrase, directly-observed construction, never a bare root — narrower coverage
than a fluent speaker could derive, traded deliberately for not guessing at a conjugation
this pass never actually saw.

**Bug this discipline caught, not avoided:** the first version of the closure pattern used
`kayıtlar\w*\s+kapandı`, intending `\w*` to tolerate the observed possessive suffix
("kayıtlar**ımız** kapandı"). It never matched — not in testing, not against the live page it
was written for. JavaScript's `\w` is ASCII-only; it does not match "ı" (U+0131, dotless
i), so `\w*` could not cross the suffix at all. Caught by writing a test against the literal
cited sentence, not by manual review, which had accepted the pattern as correct — see
`verify-turkish-matches.ts`'s output before the fix, `closureMatches: []` for Bilkent despite
the exact cited text being present. Fixed by matching the one observed suffix literally
(`kayıtlar(?:ımız)?\s+kapandı`) instead of a general word-character class — which is also a
more faithful implementation of the original stated intent ("tolerates *the* possessive
suffix... since *that specific inflection* was directly observed") than the buggy generic
version was.

**Honest, explicit gaps**, on the same don't-guess discipline: "başvuru(lar) kapandı /
kapanmıştır" (this corpus's one closure example used "kayıt," never "başvuru," as the closing
noun), "açıldı"/"açık" as opening signals (never observed cleanly separated from the
short-root risk above), and any formal/evidential mood ("-mıştır") variant of any of these.
21 pages is also a smaller sample than English's 49 — proportionally less evidence per
pattern. This is real Turkish-language capability applied by this session, not independent
native-speaker review — given AGENTS.md's own day-one Turkey-market commitment, that review
is worth getting before leaning on this further.

### The bigger finding: `unverified`/`date_not_announced` never reached a verdict, in any language

`classifyAgainstStoredState`'s branching computed `stateImpliesOpen` (open/upcoming) and
`stateImpliesClosed` (closed/historical/discontinued), then only ever produced `"agrees"` or
`"disagreement"` when one of those two was true. Migration 0041's `cycle_status` check
constraint has **seven** values, not five — `unverified` and `date_not_announced` satisfy
neither bucket, so *any* row stored in either state fell through to `liveness_silent`
unconditionally, no matter what the page said. Two consequences, not one: no
`source_verified_at` write (expected — nothing was confirmed), but also no disagreement
routed to adjudication even when the deterministic pass found an explicit, unambiguous
signal. The gap silently capped the single largest bucket in the corpus — `unverified`, 86
rows, larger than every other bucket combined per design doc §4.2 — at zero classification,
regardless of phrase-set quality. §0's own opening paragraph names exactly this population as
the reason the job exists.

Found by noticing an aggregate that didn't add up: the first Turkish comparison run showed
`old.agrees === new.agrees` (2 and 2) even though three new opening patterns had just been
added and Sabancı's page contains an unambiguous *"Son Başvuru: 1 Ağustos 2026"* +
*"Hemen Başvur"* pair. Sabancı is stored `unverified`. Direct inspection of
`classifyAgainstStoredState` confirmed the fall-through; a diagnostic script
(`verify-turkish-matches.ts`) confirmed it was live on real rows, not a theoretical gap.

**Fixed** by adding a third, exhaustive bucket — `stateIsUnknown` (`unverified` /
`date_not_announced`) — routed to `"disagreement"`, never `"agrees"`: there is no existing
claim for a page to *confirm* when the stored state is "not yet known," so `"agrees"` is the
wrong word for that outcome. Routing to disagreement costs nothing extra in risk or new code
paths — `adjudicateDisagreement`'s prompt already takes `storedCycleStatus` as an opaque
string (*"Oryn's stored cycle status: unverified"* is a perfectly answerable question for the
model), and every downstream consumer of a disagreement verdict (the `p1_changed`/
`p4_contradicted` split, the demotion-eligibility check) already treats the prior stored
value as opaque, never assumes it was specifically "open" or "closed." This reuses the same
careful, already-tested gate a real open-vs-closed contradiction goes through — it does not
open a new, less-scrutinized write path for a bucket that previously wrote nothing at all.

**Confirmed language-agnostic, not a Turkish artifact**, by isolating the state-machine
change alone (phrase-finding held fixed) against the *English* 49-row corpus: 5 more rows
flip from silent to disagreement — Interlochen Review (*"not open for submissions"*, stored
`unverified`), UCSB Research Mentorship (*"APPLY NOW"*, stored `unverified`), Girl Up Project
Awards (*"application is now closed"*, stored `date_not_announced`), BRI Student Fellowship
(*"Applications Open October"*, stored `date_not_announced`), and EYP Türkiye (*"ARE OPEN
NOW"* — an English match, on a Turkish-market row also present in the English stratified
sample). Zero rows regressed (silent→classified only, no classified→silent) in either corpus.

### Measured result — both directions, decomposed by fix (Turkish corpus, 20 rows with content)

| | liveness-silent | agrees (P1) | disagreement (→ adjudication) |
|---|---|---|---|
| Old (English patterns, pre-existing state-machine gap) | 16 | 2 | 0 |
| + Turkish patterns only (state-machine gap still present) | 14 | 2 | 2 |
| + state-machine fix only (on top of the above) | 9 | 3 | 6 |

Final: **7 of 20 rows flip from silent to classified, zero regressions.** Decomposed by
cause: the Turkish patterns alone account for 3 of the 7 (Bilkent → `agrees`; İTÜ Lise Yaz
Okulu and GençBizzTech → `disagreement`, both against stored `closed`); the state-machine fix
accounts for the other 4 (ODTÜ, Sabancı, Istanbul Bilgi, EYP Türkiye — all previously
`unverified`/`date_not_announced`). On the English 49-row corpus, the state-machine fix alone
accounts for 5 more (above) — the combined, cross-corpus, language-agnostic effect of that one
fix is 8 distinct rows (EYP Türkiye counted once, present in both samples).

**Every flip checked by hand against its real excerpt.** A pattern worth naming: most of the
newly-surfaced excerpts carry a **stale date** — Sabancı's *"1 Ağustos 2026"* and Istanbul
Bilgi's *"12 Haziran 2025"* are both already past relative to today (2026-09-03); ODTÜ's
*"30 Haziran - 11 Temmuz 2025"* and EYP Türkiye's *"2026-05-25"* likewise. This is
reassuring, not concerning: it's exactly the shape `adjudicateDisagreement`'s prompt is
built to catch (*"the excerpt could plausibly describe a past cycle rather than the
current one"*), and it argues these rows were correctly routed to the careful path rather
than being auto-confirmed as currently open. No official pipeline-level dry run (real
Tavily/Anthropic calls) was run against this specific population this pass — the classify-level
verification above, plus the pre-existing dry-run #2 that already exercised the identical
`disagreement → adjudicateDisagreement → p1_changed/p4_contradicted` code path end-to-end on
different rows, was judged sufficient given the change here is fully contained to
`classifyAgainstStoredState`'s pure branching logic, confirmed by direct inspection to touch
nothing downstream. Stated as a judgment call, not a settled fact.

### Answering the question actually asked: does Turkish need a different mechanism?

No — not for the constructions this corpus contained. Regex phrase-matching found real,
correct Turkish signal (3 of the 7 flips), the same mechanism English uses. What Turkish
*did* need, beyond more patterns, was attention to encoding: `\w` silently not matching
Turkish letters is a trap English never exposed, and a linguist's "tolerant pattern" instinct
(match the root, accept any suffix) is actively dangerous here in a way it isn't in English,
given how short and ambiguous Turkish roots are. Both are addressed above by staying
narrower and more literal than the English pass needed to be, not by a different mechanism.

The state-machine gap this pass found is real and large, but it is not a Turkish-mechanism
question either — it would have capped the English corpus's `unverified`/`date_not_announced`
rows exactly the same way, and did, once isolated and checked.

### Gates

`npm run typecheck` / `npm run lint` — both green. Full suite green (5469 tests, 348 files).
14 new tests: 5 for the Turkish patterns (each citing the real page that motivated it, plus a
short-root negative case), 4 for the `stateIsUnknown` branch (both directions — a phrase match
now reaching disagreement, and the no-match case still correctly falling to liveness_silent),
matching this file's own citation discipline throughout.
