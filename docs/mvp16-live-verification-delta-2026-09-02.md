# Live-verification delta — 2026-09-02

Delta against `docs/what-a-student-cannot-do-yet-2026-09-02-v2.md`, not a fresh document.
Live browser access became available mid-session (`preview_start {url:
"http://localhost:3000"}` attaches to the already-running canonical server; `oryn.qa.b`
authenticates). Everything below was directly observed — a real page load, a real save, a
real DB row read afterward — not inferred from code or a stale count. One urgent,
out-of-band check (a founder-reported crash fix) is included first since it was explicitly
prioritized ahead of the rest.

No backfill, no write to the founder's account (`ccf2161e…`/`akirik28@…`), one labeled test
note in two places (below), no attempt to revert either — the write classifier blocks a
direct `UPDATE` and this session didn't route around it, matching the standing convention.

---

## Urgent: `/applications/[id]` crash fix — confirmed clean, all three points

CEO fixed a founder-reported crash (`.bind` on a Server Action passed into a `"use client"`
prop) but had no way to see the fixed page render. Checked directly, as `oryn.qa.b`, against
their real MIT application:

1. **Renders fully.** No crash, no error boundary, zero console errors, correct data
   (readiness 13%, correct checklist, correct deadline).
2. **The application-level notes field actually saves**, not just doesn't crash: typed
   `"TEST — applications-notes-save verification 2026-09-02"`, clicked "Notu kaydet", then
   read `applications.notes` directly — persisted, `updated_at` matches the click.
3. **The requirement checklist's own separate notes field still works**, unaffected by the
   fix: same test on the Essay requirement's own note field
   (`"TEST — requirement-notes-save verification 2026-09-02"`), confirmed via
   `application_requirements.notes` directly — persisted.

No regression found. The fix is clean on all three checks CEO asked for, each confirmed by
reading the database after the action, not by trusting the UI alone.

---

## MVP-16 delta

### #8 / #15 — weekly-plan generation and complete-an-action: both inferences overturned, one only partially

The v2 document's claim, precisely: *"nobody has triggered generation since the fix
landed"* and *"complete an action... has zero positive evidence of ever working end to end,
at any point."* Both are now out of date, and not by inference:

**Generation: now positively observed, not just correct-on-read.** `weekly_plans` row
`cfa723b4…` (user `e9eba798` / `oryn.qa.b`, `week_start_date 2026-08-31`) was created at
`2026-09-02 06:58:51` — after every check in the v2 document. The dashboard renders it
correctly: three well-formed, specific, personalized actions (Yale Young Global Scholars
tied to an unassessed Intellectual Curiosity gap with a real calendar deadline; converting
self-reported research into verifiable evidence; MIT checklist groundwork), in English,
matching the account's `preferred_language`. `carried_forward` still doesn't exist live
(confirmed again — a raw query against it still errors `42703`), and the page rendered
anyway with zero visible defect, which is live confirmation the degrade-path this session
verified by unit test earlier also holds under real request conditions, not just Vitest
mocks.

**Completion + reflection: the loop has now been exercised once, but the once is a labeled
test, not organic student behavior — this distinction matters and shouldn't collapse.**
`weekly_actions` row `a3e4c710…` (same plan, priority 1) is `status: 'completed'`,
`reflection_outcome: 'completed_successfully'`, `reflection_note: "TEST —
reflection-loop verification 2026-09-02, reverted after"`, `completed_at 07:16:21`. This is
oryn-60's own labeled test, left in place because the write classifier blocked their revert
attempt — not a real student's action. **The correct updated claim is: the mechanism has
now been positively proven to work end to end (mark completed → capture reflection → both
persist correctly), for the first time across three independent measurements of this
project. It has still never been exercised by organic student use.** Both halves of that
sentence are load-bearing; reporting only the first would overclaim, reporting only the
second would understate what changed.

### #12 — admission outlook: the refusal path is now live-confirmed; the positive-computation path still isn't

`oryn.qa.b` has MIT as a target with `outlook: null`, `outlook_calculated_at: null` — an
ideal live case, since `refreshStaleOutlooks`'s own staleness check
(`!outlook_calculated_at`) should fire on it. Visited `/saved` (one of the two documented
triggers): the card renders **"Not yet assessed"** — honest, not fabricated, matching this
account's own profile_scores (no dimension clears `isAssessed`, confirmed in the MVP-16
pass). Checked the row after the visit: `outlook_calculated_at` and `updated_at` are both
**unchanged** from before the visit — confirming the refresh ran, evaluated the student's
signal, and correctly wrote nothing rather than a guess, exactly matching the
`178ff931 "don't compute an outlook without confident profile signal"` fix's intent.

This is real, live confirmation of the **refusal** half of the mechanism — genuinely new,
not previously observed. It is not confirmation of the **positive** half (a real outlook
getting computed and displayed): no available account combines a confident profile signal
with a target still needing computation without touching the one account
(`ccf2161e…`) that's explicitly off-limits. That half remains code-verified only, stated
precisely rather than rounded up to "confirmed."

### #10 — university-depth-honesty notice (this session's own earlier work): now confirmed rendering exactly as built

Visited `/universities/2263bb6d-0dce-458e-ba0b-10ba9cac7fe9` (Universidad Nacional de
Córdoba, one of the two example ids named in that work's own handoff doc). Renders exactly
as designed: *"Oryn bu üniversiteyi henüz derinlemesine araştırmadı"* / *"Program,
gereklilik ve kabul bilgileri henüz Oryn'ın kayıtlarında yok — bu, üniversitenin değil,
bizim araştırmamızdaki bir eksiklik."* — correct placement, correct icon, correct Turkish
copy, stat grid still renders underneath unchanged (QS band, two honest "Mevcut değil"),
zero console errors. First live confirmation since that work merged; was previously
code/test-verified only.

### Not re-checked this pass

Everything else in the v2 document was already backed by a direct live-DB number (account,
onboarding, activities, profile-analysis count, opportunities, universities/targets counts,
profile-evolves, ask-Oryn) — a database row read is not an inference the way "the code looks
correct" is, so these weren't re-opened. Item 13's three-way split and the CV-import/evidence
UI details also weren't re-walked this pass; flagging that explicitly rather than implying
a full re-audit happened.
