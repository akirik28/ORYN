# What it would take to actually sell Ultra — research and scope, not a build

**Status: research for the founder and counsel. Nothing implemented, no provider chosen.**
Written 2026-09-03, triggered directly by `docs/ultra-feature-inventory-2026-09-03.md`'s own
lead finding: the plan page currently sells access to a waitlist, not a plan. This document is
what stands between that and a real purchase.

**The honest headline, stated up front rather than buried at the end: the blocking constraint is
legal, not technical, and it's already on the decision list.** `LEGAL_REVIEW.md` §3 item 4 and
§6 (minor consent, written 2026-08-31, unresolved) turn out to gate commercial launch too, not
just data processing — see §B below for why they're the same underlying question in Turkish law
specifically, not just similar in spirit. Payments infrastructure (§A) can be researched and even
built in parallel, but nothing can actually charge a real student until §B has an answer.

## A. Payments — what exists, what doesn't, and what each real option needs

### What's already built

Confirmed in code, not assumed: `lib/admin/finance.ts` — `ULTRA_PRICE_TRY = 399.99` (matches
the live plan-page copy exactly), overridable via `admin_finance_settings.ultra_price_try`
(migration 0094, admin-editable), plus an exchange-rate setting
(`RateDependent<T>`/`exchange_rate_not_configured`, used for the existing unit-economics and
break-even calculations elsewhere in the admin panel). **The pricing side is real and already
live in the admin panel. Nothing collects money against it.** No payment provider SDK, API key
pattern, webhook handler, or subscription-state table exists anywhere in `lib/` or
`supabase/migrations/` — grepped directly, not inferred from absence of a mention.

### The real options, and what each actually requires

Not recommending one — the reasoning below is what each needs, not a pick, per instruction and
because a specific choice is exactly the kind of thing that should sit in front of counsel and
likely an accountant, not be decided by an inventory pass.

**Local Turkish processors (iyzico, PayTR are the two most established):**
- Both support recurring/subscription billing (iyzico's own product depth here is generally
  described as more mature; PayTR's as more of an add-on to its core one-time-payment product —
  a difference worth weighing, not a reason to pick either on this alone).
- Application requires: **Vergi Levhası** (tax certificate), **İmza Sirküleri** (notarized
  signature circular naming who can bind the company), **Ticaret Sicil Gazetesi** (the official
  trade-registry gazette entry from incorporation), and a current **Faaliyet Belgesi** (an
  activity certificate from the local chamber of commerce). **All four presuppose the company
  already exists as a registered legal entity** — most commonly a Limited Şirket (Ltd. Şti.),
  the standard, fastest-to-form option (roughly 10,000 TL minimum capital, registered via
  MERSİS, commonly cited at 3-5 business days once the paperwork is in order).

**Stripe:** launched a Turkish entity in September 2024, regulated by the BDDK as an Electronic
Payment Provider — this is a materially newer fact than it might read as; Stripe was not a real
option here until recently. Now supports TRY settlement to a Turkish IBAN, Visa/Mastercard/Troy,
and — the relevant difference for this specific product — **native subscription/recurring
billing** (Stripe Billing) rather than the add-on-style recurring support the local processors
offer. Still requires the same category of company-registration documentation Stripe asks any
merchant for; not independently confirmed whether Stripe Turkey's specific document list is
identical to iyzico/PayTR's four above, but a registered entity is the common prerequisite
either way — not found any real path that skips it.

**The one fact that matters more than which processor: every option researched needs a
registered company first, with no path found around that.** `LEGAL_REVIEW.md` §1a's own company-
identity fields (registered name, address, VERBİS registration) are still unfilled placeholders
as of this pass — **whether a registered entity already exists for Oryn wasn't something this
research could confirm either way from the repository, and is worth asking the founder directly
before scoping the payments work any further.** If one doesn't exist yet, entity formation is
itself a real, sequenced step before any processor application can even begin — not a detail to
discover mid-integration.

## B. The minor question — is it really "the same question wearing a commercial hat"?

**Checked specifically, not assumed either way: in Turkish law, yes — more precisely than the
same question would be under GDPR alone.** GDPR gives minors' data-consent its own explicit
mechanism (Article 8, a digital-consent age each member state sets between 13-16) — a rule that
exists specifically for data processing, separate from general contract law. **KVKK has no
equivalent provision of its own.** Multiple independent Turkish legal-analysis sources
converge on the same point: because KVKK doesn't specially address a minor's capacity to
consent to data processing, that question falls back to Türk Medeni Kanunu's (TMK, the Turkish
Civil Code) general rules on legal capacity (*fiil ehliyeti*) — the same body of law that governs
whether a minor can bind themselves to a contract at all. One source's own framing, translated
plainly: a minor's consent-capacity and general legal capacity "are not identical, but are
tightly bound" — consent-capacity is treated as *one application of* the broader legal-capacity
concept, not a separate regime alongside it.

**What TMK actually says, and why it reads as directly on point.** Article 16 (quoted from a
Turkish legal-practice source, not independently re-verified against the codified statute text
character-for-character this pass — flagged as a gap, not asserted with more confidence than
earned): *"Ayırt etme gücüne sahip küçükler ve kısıtlılar, yasal temsilcilerinin rızası
olmadıkça, kendi işlemleriyle borç altına giremezler. Karşılıksız kazanmada ve kişiye sıkı
sıkıya bağlı hakları kullanmada bu rıza gerekli değildir."** ("Minors and restricted persons with
discernment cannot incur an obligation through their own acts without their legal
representative's consent. This consent is not required for gratuitous acquisitions or for
exercising strictly personal rights.") Only two exceptions are named in this text — a free
acquisition, and a strictly personal right. **No small-transaction or age-appropriate-pocket-
money exception was found in what was checked this pass** — worth having counsel confirm whether
one exists elsewhere in TMK or in settled practice, since this document's own research did not
find one, which is different from confirming none exists.

**A recurring monthly subscription is, in plain terms, exactly the kind of thing Article 16
describes — incurring an ongoing obligation, not a free acquisition or a personal right.** On
the text found, a minor almost certainly cannot validly agree to Ultra's monthly charge alone;
a legal representative's consent looks required. This is this document's own reading of
publicly available legal-analysis sources, not a legal opinion — exactly the kind of question
`LEGAL_REVIEW.md` already flagged as needing counsel, not something this research is positioned
to settle on its own.

**What this means practically: it's very likely one build, not two.** Whatever mechanism
eventually resolves `LEGAL_REVIEW.md` §6's guardian-consent-for-data question (Option A/B/C
there) is likely to be the same mechanism — or close enough to share almost all its
infrastructure — that would need to exist before a minor's account could be billed at all. The
two consent *events* (agreeing to data processing; agreeing to pay) may still need to be
captured as two distinct moments even behind one shared guardian-verification flow, but
building two separate guardian-verification systems for the same underlying population would be
the wrong shape. Worth stating to counsel as one combined question, not two separate write-ups,
per the framing this task was assigned under.

## C. What the "interested" button actually does today

Checked directly rather than assumed. Clicking "İlgileniyorum" calls `logEvent(userId,
"ultra_interest_registered")` (`app/(app)/settings/actions.ts:293`) — a real row in
`product_events`, tied to the actual student's `user_id`. **This is not silently discarded**: it's
in `KNOWN_PRODUCT_EVENT_NAMES` (`lib/admin/queries.ts`), counted in the admin activity feed
(`features/admin/sections/activity-section.tsx`), and correctly labeled in both languages
("Ultra interest registered" / "Ultra ilgisi kaydedildi") — a real gap here (a name present in
the count but missing from both label maps) was already caught and fixed 2026-09-03, per that
file's own comment, and is now guarded by a test so it can't silently regress.

**What the founder can see today: who clicked, by display name, and when** —
`getProductActivity` (`lib/admin/queries.ts`) joins each event to the student's `profiles
.display_name`. **What he cannot do today: email them in one action.** The activity feed
surfaces a `user_id` and a name, not a contact address — reaching an interested student today
would mean looking their `user_id` up in Supabase Auth manually, one at a time, not a built
"contact everyone who clicked interested" feature. Worth naming plainly since an interest signal
nobody can act on efficiently is close to the "worse than no button" framing this task was
assigned under, even though the data itself is real and not lost.

## D. Sequencing — what the constraints actually impose, not what's convenient to do first

1. **Confirm whether a registered legal entity already exists for Oryn.** Blocks every payment
   option researched, before any provider conversation is worth having. A founder-level fact
   this research couldn't settle from the repository.
2. **Guardian consent / minor legal-capacity, already open in `LEGAL_REVIEW.md` §3/§6, now
   confirmed (§B above) to also gate commercial billing, not just data processing.** This is
   the real bottleneck — not payments integration effort, which is comparatively mechanical
   once a provider and entity exist. The founder's counsel is already engaged on this per
   today's context; this document adds the commercial half to what's presumably already being
   discussed, rather than opening a second, parallel legal question.
3. **Provider selection and technical integration** can be scoped and even partly built in
   parallel with (1) and (2) — the code doesn't need to wait on the legal answer to exist, only
   to go live. Worth being explicit that "researching/building payments" and "being able to
   actually bill a real student" are different milestones, so parallel progress on this doesn't
   get mistaken for the launch blocker being cleared.

**If the honest answer is "commercial launch is blocked on the same open legal question as data
processing" — that is this document's real deliverable, not a gap in the research.** It also
reframes what the plan page redesign (ab's current work) is actually for right now: an honest
waitlist page, not a conversion surface, until (1) and (2) resolve — worth surfacing back to
whoever owns that page's framing, separately from its content, which the earlier inventory
already covered.

## Sources

- Hostmana, Zunapro, and Workon (Turkish payments/e-commerce advisory blogs) — search-summary
  sourced 2026-09-03, cross-corroborated across three independent sources for the iyzico/PayTR
  document requirements and Ltd. Şti. formation basics; not independently primary-fetched from
  either processor's own developer documentation this pass.
- Dodo Payments, Zunapro, Stripe's own "Payments in Turkey" resource page, and FaStart —
  search-summary sourced 2026-09-03, for Stripe's September 2024 Turkish-entity launch and its
  native-recurring-billing capability; Stripe's own page not independently primary-fetched this
  pass.
- e-uyar.com and Erdem Akçay Hukuk Bürosu's own TMK Article 16 analysis —
  `https://www.erdemakcay.av.tr/tmk-16-ayirt-etme-gucune-sahip-kucukler-ve-kisitlilar/` — fetched
  directly 2026-09-03 for the quoted statutory text; the codified statute itself
  (mevzuat.gov.tr's own TMK text) was located in search results but not independently
  cross-fetched to confirm the quote character-for-character this pass.
- Hukuki Haber (Prof. Dr. Murat Volkan Dülger) and general search corroboration — search-summary
  sourced 2026-09-03, for the KVKK-has-no-separate-minor-consent-provision finding and its
  fallback to TMK.
- `LEGAL_REVIEW.md` (this repository) — read in full, cited throughout for existing findings
  this document builds on rather than restates.
- Direct code reading: `lib/admin/finance.ts`, `app/(app)/settings/actions.ts`,
  `lib/admin/queries.ts`, `features/admin/sections/activity-section.tsx`,
  `supabase/migrations/` (grepped for any existing payment-provider integration — none found).

## Unresolved questions

Whether a registered legal entity for Oryn already exists — not answerable from this repository,
needs the founder directly. Whether TMK recognizes any small-transaction or age-appropriate
exception beyond the two named in Article 16 — not found this pass, which is not the same as
confirmed absent; a question for counsel, not this document. Stripe Turkey's exact document
checklist versus iyzico/PayTR's — not independently confirmed as identical or different, only
that a registered entity is a shared prerequisite either way. Whether the guardian-consent
mechanism eventually built for `LEGAL_REVIEW.md` §6 can technically extend to a payment-consent
event cleanly, or needs its own additional step even once the underlying guardian-verification
exists — an engineering question for whoever eventually builds §6's chosen option, not answered
here since nothing in §6 has been built yet either.
