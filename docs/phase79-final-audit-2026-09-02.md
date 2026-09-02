# Phase 79 — the final audit — 2026-09-02

This is a judgement document, not a checklist. Every claim below is grounded in something
specific — a live page, a real reply, a real database row, or a specific commit from
tonight — cited by name so it can be checked, not taken on trust. Method: walked the live
product against commit `509faf7d` (main, as of this pass) as `oryn.qa.b`, a real onboarded
account with a real profile, a real target university, a real application, and real
advisor/weekly-plan history — not a synthetic empty account, so what follows is what an
actual returning student sees, not a first-load demo state. Cross-referenced against
everything this session found and fixed tonight across scoring, admissions, universities,
opportunities, and the prompt layer.

Two findings below were significant enough to flag to CEO immediately, ahead of this
document, per this session's own standing practice for time-sensitive findings. Both are
included here for completeness, not repeated at the same length.

---

## Product — does Oryn clearly answer "what should I do next?"

**Yes, when the mechanism fires — but the full loop it depends on has never been proven
with a real, returning student.**

The live dashboard answers the question directly and well. `oryn.qa.b`'s "Bu haftaki
odağın" (This week's focus) shows exactly three actions, each citing a specific, real fact
about this account: *"Intellectual Curiosity has no assessed evidence yet, and this is a
concrete deadline already on your calendar (Jan 6, 2027)"*; *"Research is currently
unassessed because there's no evidence attached to your one research entry"*; *"Seven MIT
checklist items are unfinished with a hard deadline five weeks out."* Three, not twenty —
Phase 7's own requirement, held. The framing line above them — *"Your real gap isn't more
activities — it's that your one research claim and one activity have no ver[ification]"*
— states an actual priority judgement, not a generic nudge.

The gap: this session's own MVP-16 work (re-measured three times tonight) found that
**"complete an action" has zero positive evidence of ever working end to end through
organic student use, at any point in this project's history.** The one instance of the
full loop firing — mark completed, capture a reflection, both persist — was a labeled peer
test (`"TEST — reflection-loop verification 2026-09-02, reverted after"`), not a real
student. The mechanism that answers *"what's next"* is well-built and, per tonight's
weekly-plan fix, now generates correctly even under the exact conditions that used to
break it — but nothing in this project's live data shows the loop this answer is supposed
to sustain (act → reflect → priorities adjust) actually closing once, for anyone real. A
founder reading "the dashboard tells you what to do next" should also read: **it has never
been watched working past the first action.**

## UX — can a first-time 16-year-old understand this without instruction?

**The design itself: yes. Two live defects found in this pass would genuinely confuse or
alarm a first-time reader, independent of instruction.**

The visual language holds to AGENTS.md's own brief — calm, generous whitespace, no
gamification, no rainbow dashboard, confirmed directly across every screen walked
(dashboard, advisor, opportunities, universities, documents). Copy is short and direct
("Yolculuğuna başla" / "Start your journey," not "Initiate your profile-building
workflow"). Turkish throughout what was walked reads as native phrasing, not
word-for-word translation — matches this session's own citation-sweep and i18n-lane work
tonight. The evidence-upload disclosure on `/documents` states the non-verification rule
in plain language, unprompted, in the exact place a student would need it: *"Uploading a
document sets evidence status to Evidence added. This does NOT automatically become
Verified — verification is a separate process."*

But two things found live in this pass are UX failures a first-time reader would hit
directly, not edge cases: the Counselor Core "why this" reasons literally read *"Academic
— insufficient data (0/100)"* — a 16-year-old has no reason to read that as anything but a
score of zero, which is the opposite of what "insufficient data" is supposed to mean (see
Trust, below — same root cause). And an opportunity's own description reading *"...has
been blocked across 5 tool attempts this session"* mid-paragraph reads as the product
being broken, not as a research note — nothing about better onboarding or instruction
would prevent a first-time reader from being confused or losing confidence at either
point; both are genuinely wrong content, not a legibility gap.

## AI — are recommendations actually personalised?

**Yes, demonstrated concretely, not asserted.**

Read a real, existing advisor reply on this account (not a fresh call — the conversation
already existed) to the question *"Should I start a new entrepreneurship club?"*:

> *"Before answering yes/no: your profile currently shows zero activities, zero projects,
> zero awards, and no time budget set. Every dimension is 0/100 with low confidence — not
> because you're weak, but because nothing has been logged yet... Starting a new
> extracurricular was already flagged as something to avoid for now. I don't know what
> changed since then — did you consider it and pass, or has your situation shifted?"*

This is Phase 39's differentiating feature — "avoid for now," with a stated reason —
working live, and it goes further: the model is referencing its **own prior
recommendation** to this same student and asking what changed, rather than repeating
generic advice or contradicting itself. That's real state carried across turns, not a
one-shot response. The weekly plan (above) independently demonstrates the same
personalization pattern with different facts. This session's own age-calibration work
(merged tonight, 24 tests) adds graduation-year-based pacing framing to the same shared
prompt path both surfaces read from.

Worth being precise about the boundary of this claim: personalization is real and
demonstrated for **profile facts, deadlines, and stated priorities**. It is not yet the
full richness Phase 12 describes for opportunity matching specifically — an earlier audit
tonight found only 3 of the spec's 7 match dimensions are actually computed. "Personalised"
is a true claim; "personalised across every dimension the spec describes" is not yet.

## Data — can important claims be traced to sources?

**Yes for factual university/opportunity data, confirmed live with a real source badge —
but this pass found the write side of that same guarantee actively failing for at least
one field.**

MIT's detail page (a real, `data_status: 'fresh'` row) shows a campus photo with a real
Wikimedia Commons attribution and source link, a QS #1 ranking linking to
topuniversities.com, and (on a source-badge-bearing statistic) a "checked N days ago, high
confidence" line — Phase 36's `SourceBadge` requirement, held, live. The admission-outlook
panel on the same page shows honest unknowns by name ("Compositions," "Reference letters,"
"This admission cycle's applicant pool") rather than a fabricated confidence — Phase 16.2's
mandatory explanation, present.

The failure: the finding flagged separately to CEO tonight. At least 3 of 421 live
opportunities have a data-acquisition pass's own working notes — dated, first-person,
referencing "an earlier pass in this session" and literal column names
(`country_eligibility_confirmed_open`, `selectivity_tier`) — concatenated directly into
the student-facing `description` field, confirmed rendering on the live detail page. This
is not a missing source; it's the **wrong kind of content in a real field**, and it means
the traceability guarantee this section otherwise confirms does not hold uniformly across
every write path that touches these tables.

## Trust — does the app avoid fake admissions precision and invented opportunities?

**The posture is right and holds under direct inspection everywhere it was checked live
tonight. It is not yet something a founder can trust by default, because live, currently-
visible violations of that same posture exist today, found by three unrelated code paths
in one night — a pattern, not an isolated bug.**

**What held, checked live, not assumed:**
- Admission outlook refused to fabricate a percentage for `oryn.qa.b` against **both** a
  thin university (Universidad Nacional de Córdoba, this session's own depth-honesty
  work) **and** a maximally well-researched one (MIT, QS #1, fresh data) — same honest
  "Henüz değerlendirilmedi" (Not yet assessed) either way, because the gate is the
  student's own signal confidence, not the institution's data depth. Two independent
  confirmations in one pass that this gate isn't accidentally keyed to the wrong thing.
- The dashboard's own dimension sidebar never shows a number — "Sınırlı kanıt" (Limited
  evidence) / "Henüz yok" (Not yet), never a score — confirmed live, same account,
  same session, the SAME dimensions the Counselor Core page (below) gets wrong two clicks
  away.
- Peer benchmarking (this session's own fix, merged tonight) now correctly excludes
  `not_assessed` scores from both sides of a comparison and refuses any sample under 100 —
  `oryn.qa.b`'s own mostly-unassessed profile is exactly the account that would have
  broken this before the fix.
- AI usage is disclosed proactively, unprompted, in the header on every page: *"299
  danışman mesajı kaldı. 1 Eki tarihinde yenilenir."* (299 advisor messages left, renews
  Oct 1) — a real number, not hidden until a limit is hit.
- Evidence upload states the non-verification rule in the same breath as the upload
  button, not buried in a settings page or FAQ.

**What is live and wrong right now, found across three unrelated code paths tonight:**
1. `lib/counselor/copy.ts`'s `gapWhyLine` interpolates `(${score}/100)` unconditionally
   for every severity, including `insufficient_data` — so *"Academic — insufficient data
   (0/100)"* is the actual, systemic, live text on every Counselor Core card for this
   account. This is the identical failure `lib/scoring/signal.ts`'s own design (a few
   files away, correctly avoided on the dashboard sidebar seen minutes earlier in the same
   walkthrough) exists specifically to prevent.
2. At least 3 of 421 opportunities have internal research-process notes live in their
   student-facing description (flagged to CEO separately, in full, ahead of this
   document).
3. Not new tonight, but still true as of this pass and worth restating in one place: the
   founder's own account has a real, currently-live stale weekly plan showing a raw
   `Career_exploration` dimension key and English text despite a `tr` locale preference —
   both root causes fixed in code 32+ hours before the stored plan, and per CEO's own
   instruction this specific instance is being deliberately kept as a live example rather
   than regenerated. That is a reasonable choice for a demo, but it means the mechanism
   this depends on (bucket 3, "only heals if someone pays for Regenerate or the week
   rolls over") has a real, currently-visible failure mode sitting on a real account today,
   not a hypothetical one.
4. The `reason-codes-coverage` fix (*"559 of 724 now say why"*) was confirmed correct in
   code earlier tonight but not reflected in any live `opportunity_match` row as of that
   check — every row's `calculated_at` predated the fix. Whether this has since
   self-healed via other sessions' page visits was not re-checked this pass; naming it
   here rather than assuming either way.

**The pattern, which is the actual finding**: three of the four items above are raw
internal values or process artifacts reaching a student through three genuinely different
code paths (a hand-built reason-string function, a data-acquisition pipeline's own
write, and a prompt-context assembler) built by different work on different nights. Each
one, found so far, was found by a person actually reading the rendered output, not by a
test or a lint rule — this session's own `raw-enum-leak-fixes` package explicitly names
this as its own pattern ("five prompt-side sites... exactly the split another lane found
tonight") and fixed five known instances, and this pass found a sixth and seventh in
different systems entirely (Counselor Core's severity labels, opportunity descriptions)
that weren't part of that sweep. **There is no mechanism today that would catch the next
one before a student sees it.** That is the honest state of Trust: the design principle is
correct and, everywhere it has been implemented and checked, held. The enforcement of it
is currently manual and incomplete, which is a different claim from "broken," and a
weaker one than a founder deciding to deploy needs to hear as "ready."

---

## Critical issues, named for the founder — not fixed in this pass, per Phase 79's own instruction

1. **`gapWhyLine` shows a raw score for `insufficient_data` severity**
   (`lib/counselor/copy.ts:59-64`) — live, systemic, every Counselor Core card. Small,
   scoped fix (omit the `(${score}/100)` clause for that one severity), but flagged not
   fixed here.
2. **Internal research notes in live opportunity descriptions** — flagged to CEO in full
   separately. At least 3 of 421 confirmed; scope past the regex used tonight not fully
   swept.
3. **No systemic guard against raw-value leaks reaching a student** — this is the
   structural issue underneath both of the above and the five instances
   `raw-enum-leak-fixes` already closed tonight. Worth a deliberate decision (a test that
   scans every enum-typed field fed into a prompt or stored as free text for
   label-wrapping, or equivalent) rather than continuing to find instances one at a time.
4. **The act → reflect → priorities-adjust loop has never been observed with a real
   student** — not broken, unproven. Relevant to any claim that the dashboard's "what's
   next" answer is a *proven* loop rather than a well-built, freshly-fixed one.
5. **Opportunity match personalization covers 3 of the spec's 7 dimensions** (prior
   audit, unchanged as of this pass) — real and demonstrated, not yet complete against
   Phase 12's own description.
6. **The founder's own stale weekly plan is a live, real instance of a still-open failure
   mode** (bucket 3: pay-to-heal only) — kept deliberately as a demo per CEO's own
   instruction, named here so it isn't mistaken for resolved.

## Overall

Product, AI, and Data are each genuinely strong where this pass checked them, with
specific, live evidence behind every claim above — not a generic pass. UX holds for
design and copy but was directly undercut twice in this one walkthrough by content bugs,
not instruction gaps. **Trust is the one perspective this audit cannot call ready**: the
principles are right and hold under direct inspection everywhere they've been
implemented, but this session alone found live violations of those same principles in
three unrelated code paths tonight, on top of the five already found and fixed — and
nothing yet stops an eighth. A founder deciding whether to deploy should read this as:
the product is close, the design is sound, and the specific thing this whole build was
most insistent about — never fabricate, never let a raw value reach a student — is not
yet something that holds by construction. It holds by people looking, tonight, one
instance at a time.
