# Legal copy vs. product, five named areas — 2 real gaps, 2 clean, 1 cosmetic

**Gap list only, as requested — no rewrite of `lib/legal/content.ts`'s public prose.** The
one code change in this pass is to `LAWYER_FLAGS` itself: one new entry
(`aiModelDegradationDisclosure`) and one addition to the existing `aiUsageAnonymization`
entry, recording a newly-confirmed fact. Nothing in `legalCopyEn`/`legalCopyTr` — the Terms,
Privacy Notice, or KVKK notice text a student actually reads — was touched. Every claim below
was checked against the live source (`lib/legal/content.ts`, `lib/legal/age-policy.ts`,
`lib/ai/limits/budget.ts`, `lib/profile/evidence-status-presentation.ts`,
`features/notifications/categories.ts`, `app/(app)/settings/actions.ts`, and the actual i18n
strings in `messages/en.json`), not assumed from memory of building it earlier tonight.

## Summary

| # | Area | Result | Action |
|---|---|---|---|
| 1 | Age floor / `/confirm-age` | **No gap** | none |
| 2 | Evidence status display | **No material gap** (one cosmetic note) | none |
| 3 | AI spend-cap degradation disclosure | **Real gap — disclosure silence** | `LAWYER_FLAGS.aiModelDegradationDisclosure` (added) |
| 4 | Four notification categories | **No gap** | none |
| 5 | `ai_usage` survives deletion, anonymized | **Real gap — copy overclaims** | Addition to `LAWYER_FLAGS.aiUsageAnonymization` (existing entry) |

---

## 1. Age floor and the `/confirm-age` interstitial — no gap

Checked `lib/legal/age-policy.ts` (`MINIMUM_SIGNUP_AGE_YEARS = 14`), its live call site in
`app/(onboarding)/onboarding/actions.ts:106` (`completeOnboarding` still rejects a new signup
below 14), and all three places the copy states an age range:

- Privacy Notice `minors`: "Oryn is designed for students aged 14–18..."
- Terms `eligibility`: "Oryn is built for students aged 14–18..."
- KVKK notice `minors`: "Oryn is intended for students aged 14–18..."

All three already say 14, in both languages, matching the enforced floor exactly. All three
already hedge the guardian-approval gap honestly ("A guardian approval step is not yet built
into the product; the signup form marks the place it will occupy" / "this section describes
our intent rather than a settled rule") — that hedge is still accurate; nothing has been
silently upgraded to a settled rule since it was written.

**One piece of color, not a gap:** `/confirm-age` (`app/(confirm-age)/confirm-age/actions.ts`)
is not a second signup gate — it's a birth-year *backfill* for accounts that completed
onboarding before the field was required. Its own header is explicit that it **deliberately
does not block or remove an account** when the backfilled year reveals an age below 14; it
only calls `logEvent(userId, "birth_year_backfill_below_minimum_age", ...)` for founder/legal
follow-up. So there are two different postures depending on how an under-14 student is
discovered — refused at signup, but not removed if discovered later — and the copy's existing
"describes our intent rather than a settled rule" hedge already covers that honestly without
needing to spell out the mechanism. Not asking for a copy change; naming it in case it's useful
context for whoever eventually resolves `LAWYER_FLAGS.minorConsent`.

## 2. Evidence status display — no material gap, one wording nitpick

Checked `lib/profile/evidence-status-presentation.ts`, its two call sites
(`features/profile/journey-timeline.tsx`, `features/profile/achievement-section.tsx`), the
actual rendered strings in `messages/en.json` (`documents.statusNotice`:
*"Uploading a file marks this item \"Evidence added\" — it's self-reported until independently
verified, and only visible to you."*), and whether the `connections` feature exposes evidence
status to a second user (`grep` across `app/(app)/connections/` and `features/connections/`
for `evidence_status` — zero hits).

The Terms' `your-content` promise — *"attaching a file is not the same as independent
verification — the product will not describe it as verified"* — holds exactly. `verified` and
`verification_rejected` are both still unreachable in the live product (nothing sets either
state yet, per that file's own comment), so nothing can be mislabeled today, and the in-product
copy (`statusNotice` above) is already careful never to claim otherwise.

**Cosmetic-only note:** the Terms sentence "Oryn labels an achievement as self-reported until
evidence is attached" reads most naturally as a visible tag, but the actual UI renders **no
badge at all** for the self-reported (default) state — deliberately, per the presentation
module's own comment ("Silence is the one presentation that cannot be misread as a deficiency
notice"). The underlying policy promise is unaffected either way — this is a precision
suggestion, not a correction of something false, and I'm not treating it as a gap worth a
`LAWYER_FLAGS` entry or a flagged rewrite.

## 3. AI spend-cap silent model degradation — real gap, added to `LAWYER_FLAGS`

Confirmed live in `lib/ai/limits/budget.ts`: once a student's month-to-date AI spend reaches a
**$0.50 soft target** (not a hard wall — the founder's explicit, documented choice, precisely
because "a student who hits a wall mid-question doesn't come back"), every subsequent AI call
that month silently uses a cheaper model (Haiku 4.5 by default) instead of the configured
ceiling model, across every AI feature (`selectModelForUser` is called from the advisor,
weekly plan, CV import, research generator, essay outlines, and more).

This is genuinely disclosed **in-product**, which matters to how serious the gap is:

- Proactively, before a student sends anything: `MonthlyUsageMeter` shows *"Replies are using
  a lighter model this month. Resets {date}."*
- Reactively, on the affected message itself: the advisor chat tags a degraded reply
  *"Lighter model"* with detail *"This reply used a lighter model — this month's advisor
  budget is in use."*

But **nothing in the Terms of Use (`ai-output`) or the Privacy Notice (`ai`) mentions this
mechanism at all**, in either language — a student reading those documents before ever opening
the advisor has no way to learn that response depth/quality can vary with usage. This isn't a
false statement to correct (nothing currently claims uniform model quality), it's a silence
about a real, recurring behavior — which is exactly the "needs the lawyer/founder" category
rather than a sentence to fix myself.

I checked whether Task 1's jurisdictional research bears on this directly — it doesn't cleanly:
DSA Art. 3(r) and Turkey's new Art. 25/A (Ticari Reklam Yönetmeliği, effective 1 Aug 2026) both
key their disclosure duty off **paid or targeted advertising**, and model-tier selection driven
by a cost cap isn't advertising. No specific clause requires this disclosure — which is exactly
why this is recorded as an open question (`LAWYER_FLAGS.aiModelDegradationDisclosure`, new)
rather than resolved either way. The question as recorded: is the existing in-app notice
sufficient, or does the Terms/Privacy need a sentence naming the mechanism generally, without
necessarily publishing the $0.50/$1.00 figures themselves?

## 4. Four notification categories — no gap, actually checked

Checked `features/notifications/categories.ts`,
`docs/handoffs/notification-categories-audit-2026-09-01.md`, and every `createNotification(`
call site. Current state: `weekly_plan` and `deadline` had writers already; `new_opportunity`
was built in the Sep-01 pass; `university_data_changed` got its writer afterward (commit
`afa33a57`, once the freshness-detection pipeline existed); `profile_update` still has none;
`system` never did and is recommended for removal; `connection`/`message` are pre-existing
social-feature categories outside Phase 24's original five.

None of this touches the legal copy because **the legal copy never mentions notification
categories, counts, or behavior anywhere** — not in Privacy, Terms, or the KVKK notice, in
either language. The closest text, Privacy's `what-we-collect` bullet ("Usage: which product
events occurred and when...") is generic enough to stay accurate regardless of how many
categories exist or how many have writers. Recording this as checked rather than silently
skipped, since it was one of the five named areas.

## 5. `ai_usage` survives deletion, anonymized — real gap, copy overclaims

Confirmed still current in `app/(app)/settings/actions.ts`: `ai_usage.user_id` is `on delete
set null` (migration `0013_ops.sql`), not cascade — the one exception among 42 live tables
referencing `profiles(id)`. This exact fact is already recorded as an open legal question in
`LAWYER_FLAGS.aiUsageAnonymization` (added earlier tonight, Task 2) — so the underlying
uncertainty isn't new. What's new is that **the public-facing copy already asserts more than
the engineering-facing flag admits is settled**, in both languages:

- Terms `ending`: *"Deletion is permanent."* — unqualified.
- Privacy `your-rights`: deleting your account "**permanently remove[s]** your account and the
  data attached to it." — unqualified.
- KVKK `exercising`: "...permanently delete your account, from Settings." — unqualified.
- KVKK `rights` (Article 11 list): "Request erasure or destruction of your data..." — general,
  no exception noted.

None of the four carries any hedge for the one row type that is retained (anonymized) rather
than deleted. This is a factual-accuracy gap, not a legal-judgment one — the *sentence* is more
absolute than the *mechanism* it describes, independent of how the open legal question
eventually resolves. I've appended this finding to the existing `aiUsageAnonymization` flag
rather than opening a new one (same underlying question, new evidence), and left the actual
sentence-level fix — a short hedge in four spots, EN and TR — undone, per "gap list, not a
rewrite." It reads like a low-risk, mechanical edit once someone signs off on doing it now
rather than waiting for the anonymization-vs-deletion question to resolve fully.

## What I did not touch

- No edit to `legalCopyEn` or `legalCopyTr` — every Terms/Privacy/KVKK sentence quoted above is
  reproduced verbatim from the current file, not rewritten.
- No new legal commitment asserted anywhere, including in the `LAWYER_FLAGS` additions — both
  are records of a discovered fact (a mechanism, a copy/mechanism mismatch), phrased as open
  questions, matching the voice of the existing eight entries.
- Did not re-derive the other three `LAWYER_FLAGS` entries not touched by tonight's 40 packages
  (`legalBasis`, `internationalTransfer`, `liability`, `turkishLegalReview`,
  `kvkkLanguage`, `minorConsent`, `retention`) — nothing in this pass's five named areas bore on
  them, and re-litigating unrelated flags wasn't the assignment.

---

## ✅ 2026-09-05 audit — closed

`ai_usage` surviving deletion (anonymized) while Terms/Privacy/KVKK claimed deletion is
unqualified-"permanent" → **Closed** — commit `1d421074` (2026-09-02), "fix(legal): stop
overclaiming account deletion is unqualified". Verified via `git merge-base --is-ancestor
1d421074 origin/main`.
