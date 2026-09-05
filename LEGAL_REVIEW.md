# Legal review packet

**Status: draft. Nothing in this repository has been reviewed by a lawyer.**

This document is the handoff to outside counsel. It says what Oryn actually does with
student data, where the three draft policy documents live, and which decisions engineering
deliberately did not make.

Drafted 2026-08-31, revised 2026-08-31 (Turkish translation added). Source of truth for all
policy text is `lib/legal/content.ts` — a single module holding every word of the legal
surface, in both languages. This file summarises it for review; if the two ever disagree,
the module is what ships.

---

## 1. What exists

| Surface | Route / file | State |
| --- | --- | --- |
| Privacy Notice | `/privacy` | Draft, English + Turkish |
| Terms of Use | `/terms` | Draft, English + Turkish |
| KVKK Disclosure Notice | `/kvkk` | Draft, English + Turkish — see §1a on the translation's own review status |
| Site footer with policy links | `features/legal/site-footer.tsx` | Live on the policy pages, both languages; landing page (`app/page.tsx`) footer fixed to English — see that file's comment |
| Signup consent surface | `app/(auth)/_components/signup-consent.tsx` | Live, enforced server-side, both languages |
| Data processor inventory | `DATA_PROCESSORS_EN`/`DATA_PROCESSORS_TR` in `lib/legal/content.ts` (via `getDataProcessors(locale)`), rendered in `/privacy` and `/kvkk` | Verified against the code; EN/TR fact parity (which processors, `personalData`, `verifiedIn`) enforced by test |

Every document renders a standing "Draft — awaiting legal review" banner, in whichever
language the visitor is reading. It is driven by one constant,
`LEGAL_REVIEW_STATUS.approved`, currently `false`, shared by both languages. Flipping it
removes the banner from all three documents, in both languages, at once, and a test
requires that flipping it is accompanied by a reviewer name and a sign-off date.

### 1a. How the Turkish translation was produced, and what still needs review

`legalCopyTr` in `lib/legal/content.ts` is a complete, structural mirror of `legalCopyEn`
— same documents, same section ids and order, same bullet/paragraph counts, same
unresolved placeholders, same hedges (Article 9's transfer mechanism, for instance, is
left unnamed in Turkish exactly as in English, not translated into a guessed term). A test
(`__tests__/legal/consent.test.ts`, "EN/TR structural parity") enforces the structure match
and separately asserts every translatable string actually differs from its English source
(nothing silently left untranslated).

It was translated by engineering, using KVKK's own settled statutory vocabulary — *veri
sorumlusu* (data controller), *veri işleyen* (data processor), *açık rıza* (explicit
consent), *aydınlatma yükümlülüğü* (Article 10 disclosure obligation), *ilgili kişi* (data
subject, in the Article 11 rights list) — **not by a Turkish-qualified lawyer or a
professional legal translator.** That is a real, separate open item: see `turkishLegalReview`
in §3 below. Locale selection (`getLegalCopy(locale)`) follows the same pattern
`lib/i18n/date.ts`'s `formatRelativeTime` already established — a Server Component resolves
the locale via `resolveLocale()`, a Client Component via `useLocale()`, and both hand it
to pure, synchronous selector functions — coordinated with, and approved by, the i18n
lane before implementation (added zero keys to `messages/en.json`/`messages/tr.json`,
which that lane had flagged as a live collision point).

Company identity — registered name, address, contact email, VERBİS registration, governing
law — is **not invented anywhere, in either language**. Each renders as a visibly unresolved
placeholder chip (`features/legal/unconfirmed.tsx`), itself now translated (the chip's
"not yet supplied, pending X" framing is Turkish on the Turkish pages, not left in English).
These fields must be supplied before publication.

---

## 2. Data processor inventory

Each line below was read out of the code on 2026-08-31, not inferred from what the service
is generally for. The distinction mattered: two integrations send less than their name
suggests. English shown; the Turkish array (`DATA_PROCESSORS_TR`) carries the same facts —
same ids, same `personalData`, same `verifiedIn` — with the prose fields translated, and a
test enforces that the facts can't drift apart between the two.

### Supabase — *receives personal data*
- **Role:** database, authentication, file storage. System of record.
- **Receives:** everything the student enters or uploads — credentials, profile, achievements,
  grades and test scores, uploaded CVs and evidence files, advisor conversations, usage events.
- **Location:** AWS `eu-central-1`, Frankfurt, Germany. *Verified 2026-08-31 against the
  Supabase account: all projects in the organisation are in `eu-central-1`.*
- **Retention:** until the student deletes the item or the account. No automatic limit.
- **Verify in:** `lib/supabase/`, `supabase/migrations/0015_storage_buckets.sql`

### Anthropic (Claude API) — *receives personal data*
- **Role:** the model behind profile analysis, the advisor, weekly plans, and CV import.
- **Receives:** a compact profile summary — display name, graduation year, curriculum,
  country, weekly time budget, dimension scores, **the student's school name** (folded
  into the same sentence as curriculum/country), and — for activities, projects,
  research, awards, education records, courses, test scores, certifications, volunteering
  experiences, work experiences, and goals — the *titles* (education records and courses
  also carry a GPA or grade value; goals also carry a category) — plus a list of the
  student's stated interests, and the student's advisor messages. On CV import, the
  **entire uploaded document** is sent.
- **CORRECTED 2026-09-05, found auditing this section, not by a later code change being
  reflected back here — the claims below were true when this document was drafted and
  became false three days later.** This entry previously read: *"a compact profile
  summary — display name, graduation year, curriculum, country, weekly time budget,
  dimension scores, and the titles of activities, projects, research, awards and goals —
  plus the student's advisor messages. **The student's school name is not sent.**"*
  Verified against `lib/ai/student-context.ts`'s own git history: that was accurate on
  2026-08-31 (this document's drafting date) — the code's own comment on the school-name
  field states plainly it was "fetched into context since the assembler's first version,
  never rendered." It stopped being accurate on **2026-09-03** (commit `0833bd54`, *"advisor
  context surfaces six already-fetched categories it was dropping"*), which deliberately
  added school name, education records (with GPA), courses, test scores, certifications,
  volunteering experiences, work experiences, interests, and a goal's category to what
  reaches the model — framed in that commit's own message as closing an unintentional gap,
  not as a new decision to send more. This section was not updated when that commit landed;
  a lawyer reading the old text would have been told a materially narrower data flow
  (five categories, titles only, no GPA or test scores, no school name) than what the
  product has actually sent for the last two days. Left the original wording quoted above
  rather than silently removed, per this document's own practice elsewhere (§6.1) of
  distinguishing what was true at drafting time from what is true now.
- **Location:** Anthropic infrastructure, outside the EU/EEA.
- **Retention:** governed by Anthropic's API terms. **Not asserted here — counsel to confirm
  against the current data processing addendum.**
- **Verify in:** `lib/ai/student-context.ts`, `lib/ai/cv-extraction.ts`, `lib/ai/anthropic-provider.ts`

### Tavily — *no personal data*
- **Role:** web search for discovering and refreshing opportunity and university pages.
- **Receives:** search terms only, and they never describe a student. Discovery builds one
  shared global catalogue rather than searching on any individual's behalf.
- **Verify in:** `lib/providers/tavily.ts`, `lib/opportunities/discover.ts`, `lib/requirements/discover.ts`

### OpenAlex — *no personal data*
- **Role:** open academic database, used to ground research-project suggestions in real literature.
- **Receives:** subject keywords from the student's selected field and interests, e.g.
  "economics youth employment". No name, email, or account identifier is attached.
- **Note:** an optional `mailto` parameter carries an *operational* contact address for
  OpenAlex's polite pool — it is Oryn's address, never the student's.
- **Verify in:** `lib/providers/openalex.ts`, `lib/ai/research-generator.ts`

### U.S. College Scorecard — *no personal data*
- **Role:** official U.S. Department of Education dataset for university statistics.
- **Receives:** university identifiers only.
- **Verify in:** `lib/providers/college-scorecard.ts`

**No third-party analytics or advertising trackers.** Product events are written to Oryn's
own `product_events` table (`lib/analytics/log.ts`). The AI usage log stores token counts and
a feature name — **not prompt content** (`supabase/migrations/0013_ops.sql`).

---

## 3. Open questions for counsel

These are mirrored in `LAWYER_FLAGS` in `lib/legal/content.ts`. Each pairs the question with
what the product does *today*, so advice is given against reality rather than intent.

1. **KVKK notice language — RESOLVED for text.** Must it be published in Turkish before
   Türkiye launch, and does an English version satisfy the Article 10 obligation meanwhile?
   *Today:* all three documents now have a complete Turkish translation, selected
   automatically from the visitor's resolved locale — no manual step, no separate deploy.
   Still open: whether counsel wants the Turkish text reviewed independently of the English
   source (see the new item 7 below) — a translation error is its own kind of error even
   once the source text is approved.

2. **Legal basis.** Which KVKK Art. 5 / GDPR Art. 6 basis covers each purpose — specifically
   whether AI profile analysis rests on contract necessity or needs separate explicit consent?
   *Today:* signup captures one combined acceptance of the Terms and acknowledgement of the
   Privacy Notice. Purposes are not separately consented.

3. **International transfer.** What instrument covers the transfer to Anthropic outside the
   EU/EEA, and which KVKK Art. 9 mechanism (as amended 2024) applies to Turkish users?
   *Today:* the database is in Frankfurt, but advisor context and uploaded CVs go to Anthropic
   outside the EU/EEA. No transfer instrument is recorded in the repository.

4. **Minors.** Age of self-consent per market, the required guardian-consent mechanism below
   it, and whether a verifiable method is needed or notice suffices.
   *Today:* birth year is collected in onboarding, *after* signup, so at signup the product
   cannot yet know whether the user is a minor. No guardian consent mechanism exists. The
   signup form reserves the place for it and states plainly that it is not yet collected.

5. **Retention.** What period should apply per data category, and to abandoned accounts?
   *Today:* no automated retention limit. Data persists until deleted. Deletion and full
   export both work.

6. **Liability, disclaimers, governing law, forum.** Not drafted — the Terms state the
   product's limits in plain language, in both languages, but contain no liability clause
   in either.

7. **Turkish translation review (new).** `legalCopyTr` was produced by engineering using
   standard KVKK statutory vocabulary, not by a Turkish-qualified lawyer or a professional
   legal translator. Does it need independent review before publication, separately from
   the English source review?
   *Today:* structurally mirrors the English exactly (test-enforced — see §1a). The
   Article 11 rights list is translated from the standard, widely-published paraphrase of
   the statutory list, not quoted from the law verbatim.

8. **Opportunity image re-hosting (new).** Is an organizer publishing an `og:image` meta
   tag on their own official page a sufficient basis to download, re-encode, and re-host
   that image on Oryn's own infrastructure — or does the product need explicit organizer
   permission, an editorial-use argument, or to stop re-hosting third-party images
   altogether?
   *Today:* `scripts/acquire-opportunity-images.ts` has re-hosted 65 opportunity images
   this way (full analysis in `docs/opportunity-image-licensing.md`). No organizer has
   granted an explicit licence; the claim rests on inferring intent from the meta tag, not
   on a stated permission. Every re-hosted image records the exact source page and
   retrieval date, and states plainly that no licence is declared and the depiction is not
   independently verified — that documents provenance, it does not clear rights. No
   takedown mechanism exists yet; removal today is a manual database query and a
   storage-object delete.

9. **AI usage anonymization on deletion (new — corrects a gap in this list, not in the
   underlying decision).** `ai_usage.user_id` is `on delete set null` (migration
   `0013_ops.sql`), not cascade — the one exception among 41 otherwise-cascading owner
   tables at the time of `DATA_RIGHTS_AUDIT.md`'s Part 1. Is anonymizing the row (nulling
   `user_id`, keeping `feature`/`provider`/`model`/token counts/`cost`) sufficient to
   satisfy an erasure right, or must the row be deleted outright?
   *Today:* `logAIUsage()` (`lib/ai/usage.ts`) never writes prompt or response text to this
   table, only aggregate metering columns — what survives an account deletion is usage
   totals with no remaining identifier and no qualitative content. Engineering's own
   (non-lawyer) read is that this is a legitimate anonymization, distinct from a retained
   personal-data record — but that is reasoning, not a decision. This flag existed in
   `LAWYER_FLAGS` (`lib/legal/content.ts`) before this revision; it was missing from this
   numbered list specifically, which is what the next item's own discovery caught.

10. **AI model degradation disclosure (new — same correction).** `selectModelForUser()`
    (`lib/ai/limits/budget.ts`) silently switches every AI feature to a cheaper model once
    a student's month-to-date spend crosses a soft threshold. Is the existing in-product
    notice (a usage-meter note, plus a per-reply "lighter model" tag) sufficient
    disclosure, or does the Terms/Privacy text need to name the mechanism generally?
    *Today:* disclosed in-app in both surfaces named above, in both languages
    (`messages/en.json`/`messages/tr.json`); neither the Terms' AI-output section nor the
    Privacy Notice's AI section mentions it in either language. Not a false statement to
    correct — a silence about a real, recurring behavior. Also pre-existed in
    `LAWYER_FLAGS`, also missing from this list until now.

11. **Feedback report content and account deletion (new).** On account deletion, does
    anonymizing a `feedback_reports` row (nulling `user_id`, keeping the free-text
    `message`) satisfy an erasure right, or must the row be deleted outright — and does a
    student have any way to review or remove a report they already sent, short of deleting
    their whole account?
    *Today:* `feedback_reports.user_id` is `on delete set null` (migration 0113, proposed,
    not yet applied), the same mechanism as `ai_usage` in item 9 above — but the content is
    not comparable. `ai_usage` retains seven metering columns and no prose; `message` is
    free text a student wrote in their own words, which can incidentally name people,
    schools, or situations (*"my counselor Ahmet at [school] keeps..."*) that stay
    identifiable even once `user_id` is null. See §7 for the full analysis, including why
    this is currently cheap to change and will not stay that way. Separately: no UI lets a
    student view, edit, or delete a report after sending it — a select-own RLS policy
    exists (added so the report can be included in the account data export,
    `lib/export/tables.ts`), but nothing today reads through it for the student's own
    benefit. The only lever a student has over a report they regret sending is deleting
    their entire account, which — per the question above — may not even remove it.

---

## 4. What is actually implemented

Claims a reviewer can rely on, each verified in code:

- **Account deletion** — `deleteMyAccount()` in `app/(app)/settings/actions.ts`. Permanent.
- **Full data export** — `app/api/export-data/route.ts`. Every table holding the student's
  data, RLS-scoped through the normal request client, never the admin client.
- **Row Level Security** on user-owned tables — enforced in the database, not only in
  application code (`supabase/migrations/0014_row_level_security.sql`).
- **Private file storage** — `evidence` and `cv-uploads` buckets are non-public, scoped per
  account, reachable only via short-lived signed URLs (`supabase/migrations/0015_storage_buckets.sql`).
- **Server-side credentials only** — no external API key is exposed to the browser.
- **Consent is enforced server-side.** The signup checkbox is validated in `SignUpSchema`;
  stripping the client-side `required` attribute and submitting still fails. Verified in a
  browser against a production build on 2026-08-31, in both English and Turkish (the
  server-side rejection message localizes too — `app/(auth)/actions.ts`'s `signUp()`
  overrides the schema's static English fallback with the locale-resolved one), and
  covered by `__tests__/legal/consent.test.ts`.
- **Consent is recorded.** On successful signup, `terms_accepted_at`, `terms_version` and
  `terms_approved_by_counsel` are written to the auth user's metadata, so accounts created
  against *this* draft text stay distinguishable from ones created after a revision.
- **Turkish renders correctly end-to-end**, verified in a browser against a production
  build on 2026-08-31: `/privacy`, `/kvkk` (including the processor table, in both its
  desktop `<table>` and mobile card layouts), and the signup consent block, with the
  locale cookie (`oryn_locale`) set to `tr`; no horizontal overflow on a 375px viewport
  despite Turkish running longer than English in several places; English still renders
  correctly when the cookie is `en` or absent (the default is unchanged).

Not implemented, and not claimed anywhere in the product text: independent verification of
evidence, guardian consent, automated retention limits.

---

## 5. Before publication

- [ ] Fill in company identity in `COMPANY` (`lib/legal/content.ts`) — registered name, number, address, contact addresses. Renders correctly in both languages once filled (only the placeholder chip is bilingual; the values themselves are locale-invariant facts like a registration number).
- [x] ~~Translate the KVKK notice into Turkish.~~ Done 2026-08-31 — along with Privacy and Terms, not KVKK alone.
- [ ] Have a Turkish-qualified lawyer or professional legal translator review `legalCopyTr` independently of the English source review (item 7 in §3).
- [ ] Answer the remaining nine open questions in section 3 (items 2-6, 8-11 — item 1 is resolved for text and item 7 has its own line above); update the affected document sections in **both** `legalCopyEn` and `legalCopyTr` where the answer changes what's published (items 9-11 are new engineering findings with no corresponding published copy yet to update).
- [ ] Have counsel draft the liability, disclaimer, and governing-law sections, in both languages.
- [ ] Set `LEGAL_REVIEW_STATUS.approved = true` **with** `reviewedBy` and `reviewedOn` — a test enforces this. One flag covers both languages; if English and Turkish end up needing to be approved on different dates, that's a real gap in this constant worth flagging back to whoever built it.
- [ ] Re-verify the processor inventory against the code; add any provider introduced since, **to both `DATA_PROCESSORS_EN` and `DATA_PROCESSORS_TR`** — a test checks the two arrays' facts (id, personalData, verifiedIn) can't silently diverge, but won't catch a provider added to only one.

---

## 6. Minor-consent sequencing — design options for a founder/counsel decision

This section is design and analysis, not an implementation, and not a recommendation
between the options — that choice belongs to the founder and counsel together, the same
posture as the export-omission question in Part 3 of `DATA_RIGHTS_AUDIT.md`. It expands
`LAWYER_FLAGS.minorConsent` (§3, item 4) rather than replacing it; that entry stays the
one-line pointer, this is the detail behind it.

**The problem, stated precisely.** Consent (the Terms/Privacy checkbox) is captured at
signup. Age (`birth_year`) is captured at onboarding, which happens strictly after signup.
Under both GDPR (Art. 8) and KVKK, the mechanism for obtaining a minor's consent is not
the same as for an adult's. Today, every signup goes through the identical adult-shaped
consent flow — including the 14-year-olds the landing page and Privacy Notice explicitly
say the product is for — because at the moment consent is captured, the server does not
yet know, and cannot know, how old the person is.

### 6.1 What the product currently does, verified against the code

| Moment | What's known | What's recorded |
|---|---|---|
| Signup (`app/(auth)/actions.ts`, `signUp()`) | Nothing about age. `country` and `birth_year` are not fields on this form. | `terms_accepted_at`, `terms_version`, `terms_approved_by_counsel` written unconditionally to the auth user's metadata — one consent shape for everyone. |
| Onboarding, screen 2 of 5 (`features/onboarding/onboarding-wizard.tsx`) | The student *enters* `country` and `birthYear` here, client-side only, in React state. | **Nothing yet.** There is no per-step save and no `localStorage` — closing the tab here loses it. |
| Onboarding, final step (`completeOnboarding` in `app/(onboarding)/onboarding/actions.ts`) | Everything the wizard collected across all 5 screens. | `country`, `birth_year`, `onboarding_completed: true` are written together, in one call, only once the student reaches and submits the last screen. **As of migration 0072, this first-ever write is logged** (`birth_year_changes`, `previous_value` null) alongside the consent timestamp already on file, so the gap this row used to describe is now detectable, not invisible. |
| Settings, any time after (`app/(app)/settings/actions.ts`, `updateBirthYear()`) | The student can change their stated birth year later. | Overwrites `birth_year`. **As of migration 0072, a `birth_year_changes` row is written automatically** (old value, new value, and consent time as of that moment) — a database trigger, not application code, so it cannot be forgotten by a future call site. This makes the mismatch *detectable*; it still triggers no re-consent flow and applies no threshold, both of which remain the founder/counsel decision in §6.2-6.3. |

**The two "as of migration 0072" rows above are true of this repository and not yet true of
production** — migration 0072 is recorded in `supabase/migrations/` but has not been applied
to the live project, so `birth_year_changes` does not yet exist there and neither trigger
fires on a real account today; do not read this section as saying the mismatch is currently
detectable in production, only that it will be once 0072 is applied.

**One fact that meaningfully bounds the gap**: `app/(app)/layout.tsx` redirects to
`/onboarding` whenever `profile.onboarding_completed` is false, and every real feature —
the advisor, opportunities, profile building, everything under `(app)` — lives behind
that layout. A student cannot reach any of those features while the server's age is
unknown; the unknown-age window is signup plus however long onboarding takes (typically
minutes), not an open-ended period of real product use. This does not fix the sequencing
problem — the *consent event itself* still happens before age is known, and the flow that
adult and minor both click through at signup is currently identical — but it means the
realistic exposure is "an adult-shaped consent screen briefly preceded feature access for
a minor," not "a minor used the AI advisor for weeks under a consent basis meant for
adults." Worth having precisely, since it changes how urgent a full guardian-verification
build is relative to fixing the sequencing itself.

One more relevant fact: CV import (`uploadAndExtractCV`, reachable from onboarding's
Import screen) sends a document to Anthropic's API *before* onboarding's final submit —
so an AI call can happen before the server has recorded age, independent of the consent
question. Noting it here because it's adjacent, not because it changes the analysis above:
the Privacy Notice already discloses that CV contents are sent to Anthropic, and nothing
about that disclosure is age-conditional today either.

### 6.2 Options, with their real costs

**A — Ask for birth year at signup, before consent.**
- *Friction:* Signup today is three fields and a checkbox — deliberately minimal, matching
  the product's own stated progressive-onboarding philosophy (`AGENTS.md`'s Phase 3: "must
  NOT feel like a government form"). Adding a field to the very first screen a visitor
  sees is where funnel drop-off is most sensitive; this is the option most likely to cost
  signups, not just add a step.
- *Engineering:* Moderate. A new signup field, consent copy that branches on the entered
  age, and a decision about onboarding's own birth-year screen — remove it and thread the
  signup-time value through, or accept asking twice.
- *What it buys:* The cleanest fix to the sequencing problem specifically — age is known
  at the exact moment consent is captured, so the right consent shape can be shown from
  the first instant. Does not, by itself, solve *guardian consent verification* — that is
  a separate mechanism (see Option C) this option does nothing to build.

**B — Keep the current order; re-prompt once age becomes known.**
- *Friction:* None added at signup. A new step appears only for students who turn out to
  be minors, immediately after they enter their birth year in onboarding (or as a gate
  before the final submit) — scoped to the population that actually needs it, rather than
  shown to everyone regardless of age.
- *Engineering:* A new piece of state (something like "minor consent step completed",
  distinct from the adult `terms_accepted_at` already on record), a new UI step, and an
  explicit decision this option doesn't answer by itself: does the adult-shaped consent
  already captured at signup get superseded for a student who turns out to be a minor, or
  does the new step layer on top of it? Also needs a decision on `updateBirthYear()` in
  Settings — today, editing birth year later triggers nothing; if this option ships, does
  crossing the minor/adult line via a later edit re-trigger the same step, or is Settings
  deliberately left out of scope?
- *What it buys:* The same practical outcome as Option A — a minor-appropriate consent
  event is captured before any feature is reachable, since onboarding still gates
  everything under `(app)`. The open question for counsel is narrower than Option A's:
  whether having already shown a brief adult-shaped consent screen to a minor, even if
  immediately followed by the correct one seconds later, is itself a problem — particularly
  if that first screen's copy makes any representation inappropriate for a 14-year-old to
  have agreed to, even momentarily.

**C — Gate minor accounts on a guardian step.**
- *Friction:* By far the highest. This can block the product's primary use case for a
  real fraction of its stated audience — the landing page and Privacy Notice both
  explicitly target 14-18-year-olds — until a third party (a parent) takes an action that
  may take days or may never happen. Built naively, this is an activation-killer for
  exactly the users the product says it's for.
- *Engineering:* By far the largest. This is not a copy or sequencing change — it's a new
  feature: collecting a guardian's contact, verifying *their* affirmative response through
  some channel, a new holding/waiting state gating `(app)` the same way
  `onboarding_completed` does today, and handling a guardian who never responds. This is
  the build the signup form's own copy already promises is coming
  (`signupConsent.minorPlaceholderNote` in `lib/legal/content.ts`: "Guardian approval is
  not yet collected in the product — this is where it will be asked for once the
  requirement is confirmed with legal counsel") — Option C is that promise, not a new idea.
- *What it buys:* The most defensible posture if built correctly — actual verifiable
  guardian consent, which is what the stricter readings of both frameworks want for
  younger minors specifically. It is a project, not a fix that lands in one branch.

None of these three are mutually exclusive as end states — B or A could ship first to fix
sequencing, with C following later as the actual guardian-verification build. Whether
that staged approach is acceptable, or whether nothing should ship without C, is itself
part of what this decision needs to settle.

### 6.3 What this document cannot resolve

**The age threshold varies by jurisdiction, and the product already collects the input a
per-country rule would need.** GDPR Article 8 lets each EU member state set its own
digital-consent age between 13 and 16; Türkiye's position under KVKK is a distinct
question this document is not asserting an answer to — Turkish law's treatment of a
minor's capacity to consent does not come from the same GDPR Article 8 mechanism, and
guessing at a specific age here would be exactly the kind of invented legal claim this
whole packet has tried not to make. `country` is already collected at onboarding, so the
raw ingredient for a per-country rule exists — but it's a free-text field with
suggestions (`SuggestInput` in the wizard), not a constrained list, so building reliable
per-country logic on top of it would need normalizing that data first, and then
maintaining a threshold table across every jurisdiction the product reaches as those laws
change. A single conservative threshold (e.g. always applying GDPR's own ceiling, 16) is
far simpler to build and keep correct, at the cost of being stricter than the law actually
requires in the many countries that permit a lower age. **Whether to build per-country
logic or adopt one conservative number is a decision for counsel, not a fact this document
can settle** — it depends on risk tolerance and maintenance appetite as much as on the law
itself.

---

## 7. Feedback report retention and deletion — a decision to make before this migration runs

This section is design and analysis, not an implementation, and not a recommendation
between the options — the same posture §6 already takes. It expands item 11 in §3.

**The problem, stated precisely.** The feedback form (built 2026-09-03, per the founder's
own request for a place to report problems or leave feedback) stores each submission as one
row: free text the student wrote, the page they were on, their locale, and their plan
tier — nothing else. `user_id` links it to its author. Migration 0113, which creates the
table, sets that column `on delete set null` — the row survives its author's account
being deleted, orphaned rather than removed. That choice was made by copying
`admin_action_log`'s precedent (an operational audit table, migration 0097) without
re-examining whether an audit log and a minor's own written words are the same kind of
content. They are not: an audit log records *what an admin did*; this table records
*what a student chose to tell Oryn, in their own sentences*, and free text has no schema
to keep it from naming a person, a place, or a situation.

### 7.1 What the code does today, verified directly

| Fact | Detail |
|---|---|
| Deletion behavior | `feedback_reports.user_id uuid references public.profiles(id) on delete set null` (`supabase/migrations/0113_feedback_reports.sql`). Deleting an account nulls the link; the row, including `message`, is untouched. |
| Content retained | `message` (free text, unbounded by any schema beyond a 2000-character client-side cap — `app/(app)/feedback/actions.ts`), `path`, `locale`, `plan_tier`, `created_at`. No structured fields that could be selectively redacted; the risk, if any, lives entirely inside the prose. |
| Who can read it | The service-role admin client (`features/admin/sections/feedback-reports-section.tsx`, no student-facing surface) and, as of this migration, the report's own author via a select-own RLS policy — added specifically so the row can be included in the account data export, not so a student could review their own submission history; no UI exists that does the latter. |
| Precedent this mirrors | `ai_usage.user_id` (item 9 in §3, migration `0013_ops.sql`) uses the identical `on delete set null` mechanism and is the one existing case where engineering's own (non-lawyer) reasoning called anonymize-in-place defensible — because what survives there is seven metering columns and zero prose. That reasoning does not transfer here; it is named as the closest precedent, not as an argument this table should get the same answer. |
| Retention duration | No limit, same as every other table in this product (§3 item 5) — this section is about what happens *on deletion*, not about an independent time-based purge, which stays covered by the existing general question. |

### 7.2 Options, with their real costs

**A — Keep `on delete set null` (the current, shipped behavior).**
- *What it costs:* if the free text ever names someone or something identifying, that
  content outlives the account whose owner might later ask for it to be gone — an erasure
  request that does not actually erase the thing most likely to contain personal detail.
- *What it buys:* the report stays useful as operational history (a real bug or complaint
  described in the student's own words) even once the reporting account no longer exists,
  matching why `ai_usage`/`admin_action_log` chose the same shape for their own content.
- *Engineering cost to keep:* none — this is what's already written.

**B — Change to `on delete cascade`. The row is deleted outright with the account.**
- *What it costs:* a real complaint or bug report vanishes the moment its author deletes
  their account, even if the underlying problem it described is still live and unfixed —
  operational memory is traded for a cleaner erasure story.
- *What it buys:* the simplest, most defensible answer to "did deleting my account delete
  what I told you" — yes, all of it, no exceptions to explain.
- *Engineering cost to keep:* trivial while unapplied — see §7.3.

**C — A middle path: on deletion, scrub `message` but keep the row's metadata.**
Not something either the founder or CEO asked for; naming it because a "design options"
document is where an unexamined middle ground should get examined, not because it's
favored.
- *What it buys:* keeps *"a report existed, on this page, at this time"* for operational
  trend-watching (are certain pages generating more complaints?) while actually removing
  the one field that could contain a person's own words about themselves.
- *What it costs:* real engineering — a trigger or application-level scrub on deletion,
  not a column default — and a second decision this document is even less positioned to
  make: is a redacted stub still useful to anyone, or does it just look like erasure
  without being simpler than B to reason about?
- Flagging this option exists; not analyzing it further than that.

### 7.3 The part that is cheap now and will not stay that way

**Migration 0113 has never been applied to any database.** It is currently staged as item
8 of 8 in the founder's own pending-migration package
(`data/morning/07-migrations-bekleyen-2026-09-03.sql`, described in
`data/morning/07-OKU-BENI-migrations.md`) — one transaction, run once, by the founder,
against a table that has zero existing rows anywhere.

- **If Option A stays the answer:** nothing to do. Ship as written.
- **If B or C is chosen before that package is run:** it is a one-line edit to the `on
  delete` clause in `supabase/migrations/0113_feedback_reports.sql`, *and* the identical
  embedded copy inside `data/morning/07-migrations-bekleyen-2026-09-03.sql` (the two must
  be kept in sync or the founder runs a table that doesn't match the tracked migration) —
  no backfill, nothing to migrate, because no row has ever existed to reconcile.
- **If the decision comes after that package is run:** it becomes a real migration against
  however many genuine rows exist by then, and needs its own answer for what happens to
  reports collected under the old rule — which is a strictly harder version of the same
  question, not a new one.

The founder does not need to decide this before running the rest of that package — only
before this specific line in it, if the answer turns out to be B or C.

### 7.4 What this document cannot resolve

Whether free text submitted through a feedback/support channel counts as the kind of
personal data an erasure right reaches, or as an operational business record a company may
retain regardless of who wrote it, is a real, unsettled-here legal question — not an
engineering judgment call, and not one this document is taking a side on by describing the
options. That answer belongs with the founder and counsel together, the same posture §6.3
already states for the minor-consent age threshold.
