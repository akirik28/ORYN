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
  country, weekly time budget, dimension scores, and the *titles* of activities, projects,
  research, awards and goals — plus the student's advisor messages. **The student's school
  name is not sent.** On CV import, the **entire uploaded document** is sent.
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
- [ ] Answer the remaining six open questions in section 3; update the affected document sections in **both** `legalCopyEn` and `legalCopyTr`.
- [ ] Have counsel draft the liability, disclaimer, and governing-law sections, in both languages.
- [ ] Set `LEGAL_REVIEW_STATUS.approved = true` **with** `reviewedBy` and `reviewedOn` — a test enforces this. One flag covers both languages; if English and Turkish end up needing to be approved on different dates, that's a real gap in this constant worth flagging back to whoever built it.
- [ ] Re-verify the processor inventory against the code; add any provider introduced since, **to both `DATA_PROCESSORS_EN` and `DATA_PROCESSORS_TR`** — a test checks the two arrays' facts (id, personalData, verifiedIn) can't silently diverge, but won't catch a provider added to only one.
