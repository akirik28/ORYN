# What Ultra actually gives — a verified inventory, read from code

**For oryn-ab's `/settings/plan` rebuild. Source of truth for content; ab owns the surface.**
Written 2026-09-03, triggered by the founder's *"bu kısım çok çok kötü"* on the current page.
Every fact below traces to a file and line, not to the current page's own copy or to what
either of us assumed Ultra includes — the current page predates most of what's actually shipped,
and one whole section (özelleşme) is a same-day spec with zero code behind it yet. Checked
against `origin/main`@`e19dde33`.

## Lead with this: Ultra is not currently purchasable — confirmed live

`messages/tr.json:167` (the plan page's own current copy, unchanged as of this pass):

> *"Ultra 399,99 TL/ay olacak, ilk hafta ücretsiz. Henüz satın alınamıyor — ilgilendiğini
> bildir, açıldığında sana haber verelim."*

Not purchasable today. There's an interest/waitlist button ("İlgileniyorum"), not a checkout
flow. **Whatever this page becomes, it's currently selling access to a waitlist, not a plan** —
worth deciding explicitly whether the redesign leads with that framing or keeps burying it in a
line at the bottom, rather than defaulting to whichever the new layout happens to produce. This
doesn't block writing an accurate feature list (the founder can flip this the moment he's ready
to open signups, and the list should be correct when he does), but it changes what tone the page
should take today.

## A. Real, shipped, server-enforced differences

Each of these exists in code right now, checked directly, not inferred from a doc.

### A1. Monthly AI allowance — 472,300 vs. 236,150 tokens (exactly 2×)

`lib/ai/token-limits.ts:26,61-64` — `MONTHLY_AI_TOKEN_LIMIT.ultra = 472_300`,
`.standard = 236_150`. Derived from `HISTORICAL_USE_LIMIT` (100 vs. 50 "uses") ×
`TOKENS_PER_USE_REFERENCE` (4,723, the real measured advisor_chat average). This is the number
that should appear on the page as a token balance — it's what the usage meter already shows the
student. **Don't also show the underlying dollar figures below as a separate row** — they're the
backend mechanism this token number is the honest user-facing translation of; showing both would
read as two features when it's one.

*(Backend only, for ab's own reference, not a page row): `lib/ai/limits/budget.ts:48-49` —
`MONTHLY_BUDGET_TARGET_USD` $0.50 vs. $1.00, `MONTHLY_BUDGET_CEILING_USD` $1.00 vs. $2.00, both
exactly 2×. This is what a heavy month costs the product, not what the student sees.)*

### A2. Longer replies, per message — 8,192 vs. 4,096 max output tokens

`lib/ai/advisor-chat.ts:116` — `maxTokens: params.planTier === "ultra" ? 8192 : 4096`.
Live-benchmarked, not a blind doubling of A1: the code comment (lines 97-113) records a real
failure — 4096 truncated mid-answer on a "give me everything" request; 8192 completed cleanly.

**This is a different axis from A1, not the same fact twice.** A1 is how much a student can use
across a whole month before the account itself degrades to a cheaper model. A2 is how long any
single reply is allowed to run, this cap applies the moment a message is sent, independent of
monthly usage. A student could exhaust A1's whole monthly allowance and never personally notice
A2's ceiling if their questions are short — they're genuinely separate experiences, not a
"monthly vs. per-message restatement" of one thing. Worth two rows, or one row that names both
numbers rather than the current page's vaguer "longer, more detailed answers" phrasing.

### A3. "Thorough" response mode — Ultra-only

Already on the page (`replyDepth`, `messages/tr.json:152-155`) and already correctly described
as real by `lib/tier/comparison.ts`'s own header (lines 29-37, from the 2026-09-02 pass that
caught and reverted a *fabricated* AI-allowance split — worth knowing this file has form for
catching its own overclaims, not just accepting mine). `features/advisor/response-mode-slider.tsx`
gates the Thorough option to Ultra; `THOROUGH_INSTRUCTION` is appended server-side in
`generateAdvisorReply`, not decorative.

**Distinct from A2.** A3 is a *mode* only Ultra can select at all (Fast/Balanced are open to
everyone). A2 is the *length ceiling* that applies underneath whichever mode is active. A Standard
student never sees A3 as an option; every student's replies, in any mode, are capped by A2.

### A4. Visual theme

Already on the page (`visualTheme`, `messages/tr.json:147-150`) — animated flame gradient in the
sidebar, the usage meter's burning fill, the advisor slider's flowing Ultra mode. Taking ab's own
recent build of these as verified rather than re-deriving; nothing in this pass contradicts it.

## B. Deliberately identical — not a limitation, already on the page

**These two rows already exist and are already correctly marked `sameByDesign`
(`lib/tier/comparison.ts:69-81`) — the risk isn't that they're wrong, it's that a card layout
might drop the distinction a table row currently carries.**

- **Weekly plan priorities: capped at 3 for both tiers.** `messages/tr.json:157-159`'s own copy
  already states why: *"bilinçli olarak küçük tutuluyor, böylece tavsiye seyrelmeden net kalıyor"*
  (deliberately kept small so the advice stays clear instead of diluting). This is Phase 6/38's
  own "prioritize, don't pile on" principle, not a quota.
- **Research project ideas: capped at 3 per generation for both tiers.** Same shape,
  `messages/tr.json:161-163`, tied to Phase 13.1's own warning against generating
  impressive-sounding, unachievable projects.

**If the new card layout can't render "same on purpose" as clearly as the current table does,
that's a real design constraint worth raising with ab directly — dropping these two silently
would quietly turn two intentional, explained non-limitations into two apparent gaps.**

## C. Not built — spec only, do not present as available

`docs/ozellesme-spec-2026-09-03.md` is dated today, framed explicitly as *founder decisions to be
implemented* ("Kurucunun 3 Eylül 2026 tarihli kararları... Uygulama sırasında bir şey burada
yazandan farklı çıkarsa, önce burayı düzelt"). **Checked directly — none of it exists in code
yet, for either tier:**

- No custom/persistent advisor instruction field anywhere (`grep`ed for `instruction` across
  `lib/advisor/`, `lib/counselor/`, `types/database.ts` — the only hits are unrelated
  `language_of_instruction`/`languages_of_instruction` curriculum fields). The spec's own table
  presents "500 characters" as if it's Standard's current baseline and "2,000" as Ultra's
  upgrade — **it isn't a baseline today; the whole feature is unbuilt for both tiers**, not an
  existing Standard feature waiting on a tier-gated limit increase. Worth getting this framing
  right even in an internal doc, since it's an easy thing to misread later.
- No "unlimited sessions" concept, no session cap constant, no locked-new-session-button
  mechanism found anywhere in `lib/` or `features/`.
- No 24-hour idle-summarization/purge mechanism, no `MAX_HISTORY_TURNS` constant, found anywhere
  searched. The spec describes this in present tense as if it's already how the product behaves
  today (*"Bir sohbete 24 saat dokunulmazsa: özetlenir..."*) — that read did not hold up against
  the actual code; treat it as the planned behavior, not confirmed current behavior, until it
  ships.
- Section 4 of the spec (personality/focus selection, cross-session memory) is explicitly listed
  in the spec's own text as **"sonra gelecek, şimdi değil"** (later, not now) — lower priority
  than the rest of the spec, which is itself unbuilt.

**None of this belongs on a comparison page today.** If the redesign wants to gesture at "more
coming to Ultra," that's a defensible framing — but as a forward-looking note, explicitly marked
as not-yet-available, never as a present-tense feature claim. Selling an unbuilt feature is worse
than an ugly table.

## For ab: what I'd actually put on the page, pending your call on shape

Real, shippable-today rows: A1 (token allowance, the number the meter already tracks), A2+A3
either combined into one well-worded "longer, more capable replies" row or kept as two if the
per-message-vs-monthly distinction is worth a student's attention, A4 (visual theme, unchanged
from today). Keep B's two rows, ideally with enough of their existing "on purpose" framing intact
that a card layout doesn't accidentally read as two things Ultra forgot to include. Leave C out
entirely, or handle it the way the page already handles "not yet open" — a clearly separate,
clearly-forward-looking note, not a comparison-table row sitting next to real, present-tense
claims.

## What I didn't check

Whether `features/advisor/response-mode-slider.tsx`'s own UI copy for A3 matches
`messages/tr.json`'s claim precisely — took the existing comparison row's own accuracy on faith
given ab's team built and verified it directly. The exact current wording of every other
`/settings/plan` string beyond the four comparison rows and the two lines quoted above — this
pass read what was needed to answer the assignment, not the whole page. Whether any other surface
in the app (onboarding, the advisor UI itself) already makes an Ultra claim this inventory would
also apply to — out of scope for a plan-page-focused pass.
