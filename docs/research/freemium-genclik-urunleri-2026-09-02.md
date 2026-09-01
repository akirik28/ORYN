# Freemium Mechanics in Teen/Student-Facing Products — 2026-09-02

**Status:** Public-source research only. No ORYN code, schema, or product was touched. No
accounts were created, no forms submitted, nothing purchased.
**Opened:** 2026-09-02. **Evidence cutoff:** 2026-09-02.
**Author:** research session (oryn-b9), brief #1 of 3 dispatched this round (the other two:
AI usage metering/behavior-at-the-limit, and legal capacity to sell subscriptions to minors).

## How to read this document

Every price, limit, or feature claim below carries a source URL and the date it was
verified by actually opening the page in a browser this session (not just a WebFetch
summary). Where I could not verify a number against the product's own page, it is marked
**NOT FOUND** rather than filled in with a third-party estimate. Where a secondary source
(deal site, App Store listing, press coverage) is used because the primary page would not
disclose the number without an account, that is flagged explicitly, inline, every time.

Three confidence levels appear throughout:
- **OBSERVED** — read directly on the product's own official page/app-store listing this
  session, with URL + date.
- **SECONDARY** — a non-official source, used only when explicitly flagged and only where
  the official page would not disclose the figure without signing up.
- **NOT FOUND** — I looked and could not verify it from a source that meets this doc's bar.

---

## 1. Duolingo

**Sources checked (all this session, 2026-09-02):**
- [duolingo.com/super](https://www.duolingo.com/super) — plans/marketing page
- [duolingo.com/family](https://www.duolingo.com/family) — family plan marketing page
- [duolingo.com/help/super-duolingo](https://www.duolingo.com/help/super-duolingo) — official help center, "What is Super Duolingo and how do I subscribe?"
- [blog.duolingo.com/duolingo-energy](https://blog.duolingo.com/duolingo-energy/) — official company blog, "Why Duolingo Switched From Hearts to a Battery," dated 2025-07-03
- [apps.apple.com — Duolingo: Language Lessons](https://apps.apple.com/us/app/duolingo-language-lessons/id570060128) — App Store listing
- [duolingo.com/privacy](https://www.duolingo.com/privacy) — Privacy Policy, "last revised on May 26, 2026"

### 1.1 What exactly stays free
All course content is free — Duolingo's own marketing repeats this as a mission claim
("we offer the same lesson content to all users") and it's consistent across every page
checked. The free tier is throttled by a **consumable-energy mechanic**, not a content
wall: OBSERVED (official blog, 2025-07-03) that Duolingo replaced its old "Hearts" system
(5 hearts, −1 per mistake) with "Energy" (starts full each day, decreases per lesson
attempted — including correct ones — recharges roughly once a day, refillable with a
rewarded ad or in-app gems). The blog post itself states Energy was "only available to a
small number of users" and "actively being tested" as of its July 2025 publish date — I
could not independently confirm from an official page today (2026-09-02) whether it is now
100% rolled out; the current App Store listing text (checked today) already advertises
"Unlimited Energy" as a paid perk, which at minimum confirms "Energy" — not "Hearts" — is
the live term in today's marketing copy.

### 1.2 What's behind the wall
OBSERVED (help.duolingo.com/help/super-duolingo, official page): No ads, Unlimited Hearts/
Energy, "Personalized Practice" (a mistakes-focused lesson), unlimited attempts at
"Legendary" challenge levels. The App Store listing separately names "Monthly Streak
Repair" as a Super perk not mentioned on the help page — the perk list is not fully
consistent across Duolingo's own surfaces.

Note on the comparison table on `/super` itself: its rendered text lists identical feature
rows under both the "Free" and "Super" columns ("Unlimited Hearts" appears under both).
This is very likely a checkmark/cross-mark rendering artifact lost in text extraction, not
a real claim that Free has unlimited hearts — it directly contradicts the help-center page
and the App Store listing, both of which name Unlimited Hearts/Energy as Super-exclusive.
Flagging this because it's exactly the kind of thing that looks like a source but isn't;
I did not use the comparison-table text as evidence for anything.

### 1.3 WHEN the wall appears — the key question
Duolingo shows the upgrade CTA **immediately, everywhere, before any usage** — "Start my 1
week free" is the single most prominent button on the root marketing page, not something
that appears after hitting a limit. This is a always-on, ambient upsell, not a
limit-triggered one, at least on the marketing site. The in-product moment most people
associate with Duolingo's paywall — running out of Hearts/Energy mid-lesson — is a
real, well-documented mechanic (confirmed structurally via the official blog's description
of how Energy depletes), but I did not reproduce it live myself this session since doing
so requires an actual account making lesson attempts, which is out of scope (no
signups). So: **ambient/always-on CTA is OBSERVED; the specific "you hit zero energy,
here's the upgrade modal" moment is inferred from the mechanic's design, not independently
reproduced.**

### 1.4 CTA style
Interruptive and omnipresent rather than a quiet inline badge — full-bleed marketing pages
with a single large CTA button repeated 4-5 times per page (root page, `/super`, `/family`
all follow this pattern). Not a subtle line-item upsell anywhere I found.

### 1.5 Price
**NOT FOUND** via an official, unauthenticated page. Both `/super` and `/family` render
zero numeric price in their marketing copy — price only appears once you start the sign-in/
purchase flow, which requires an account. I did not create one. The App Store listing shows
"Free · In-App Purchases" and a 14-day trial callout, but the price list itself sits behind
a tap-to-expand element that did not return readable text through this session's tooling.
**SECONDARY, flagged as such and not used as a verified figure:** deal-aggregator listings
(Slickdeals) reference a discounted annual price around $59.99, implying a full price near
$150/year, but this is third-party, not confirmed against Duolingo's own page, and is
reported here only to explain why I'm not simply silent on price — I have a lead, not a
verified number. Annual-vs-monthly discount rate: not found. Student-specific discount:
not found — nothing on any page checked mentions a distinct student price.

### 1.6 Minor-specific flow
This is Duolingo's strongest, best-documented area. OBSERVED directly in the Privacy
Policy (§"Child Users," current as of the policy's stated May 26, 2026 revision date):
- Users under 13 (US) — or the local digital-consent age elsewhere — are "Child Users."
  They register with a username only, no email/name/phone collected at signup.
- On first logout, Duolingo asks for a **parent's email** and sends the parent a notice
  explaining what's collected and how to access/change/delete it.
- Child Users get a materially different product: age-appropriate lesson content,
  non-personalized/family-safe ads, no third-party behavioral tracking or analytics, no
  promotional email, speech data not used for product improvement, restricted social
  features (no real name/photo — avatar only; canned comments only; no cross-recommendation
  with non-Child users), randomized display name on leaderboards.
- All users under 16 (a broader band than the Child User COPPA definition) get
  non-personalized ads and disabled third-party tracking/analytics regardless.
- **On paid plans specifically:** the policy states "Child Users may join paid Duolingo
  Family Plans" — i.e., the sanctioned path for a minor to be on a paid plan is being added
  to an adult's Family Plan, not an independent purchase. Nothing on any page checked
  describes a Child User buying an Individual Super plan directly.
- A parent can remove a child's age restrictions by emailing Duolingo directly
  (privacy@duolingo.com).
- Duolingo ABC (separate younger-kids app) is explicitly parent-setup-only and collects no
  child personal information at all.

---

## 2. Quizlet

**Sources checked (all this session, 2026-09-02):** `quizlet.com`'s own app pages
(`/upgrade`, `/features`) returned **"Access to this page has been denied"** to this
session's browser on every path tried — this looks like bot-detection on the main app
shell specifically, not a broken link, since the same domain's help subdomain loaded fine.
All findings below come from the official `help.quizlet.com` help center instead, plus one
attempt at the Google Play Store listing.
- [help.quizlet.com — Subscribing to Quizlet](https://help.quizlet.com/hc/en-us/articles/360041181691-Subscribing-to-Quizlet)
- [help.quizlet.com — Studying on Quizlet](https://help.quizlet.com/hc/en-us/articles/360030841732-Studying-on-Quizlet)
- [help.quizlet.com — Studying with Ask Quizlet](https://help.quizlet.com/hc/en-us/articles/4279035072-Studying-with-Ask-Quizlet)
- [help.quizlet.com — Signing up for a free account](https://help.quizlet.com/hc/articles/360030555532)
- [play.google.com — Quizlet: More than Flashcards](https://play.google.com/store/apps/details?id=com.quizlet.quizletandroid)

### 2.1 What exactly stays free
OBSERVED (Studying on Quizlet, official): flashcard creation/search/sharing, basic
Flashcards study mode, and the game-style activities (Match, Blast, Blocks) are free with
no stated cap. Beyond that, free access is **metered per-feature, and several caps are
scoped per flashcard set rather than per month**:
- **Learn mode** (adaptive, progressively-harder questions): free for "a limited number of
  rounds per flashcard set" — exact number not stated in this article.
- **Test mode**: free users get "one practice test per flashcard set."
- **Practice Tests** (AI-generated full exam simulations) and **Study Guides**
  (AI-generated from your own uploaded notes): both explicitly "try for free with limited
  access" — no number given.
- **Expert Solutions** (step-by-step textbook answers): notably tiered by academic level,
  not just by subscription — "Standard high school–level expert solutions are free for
  students and teachers" with no stated limit, while **college-level textbook solutions are
  capped per-textbook** for non-subscribers. This is the one place any product in this
  survey gives strictly more for free specifically to the younger/high-school segment of
  its own users.
- **Diagram sets** (image/map labeling): not available to free users at all — Plus-only,
  no metered free tier.
- Teacher-assigned work is called out as a specific exemption: a separate help article
  ("Using Assignments") states "Assignments are free from ads and study limits" — i.e. when
  a teacher assigns Quizlet content, the student doing that specific assignment is not
  metered even on a free account.

**Discrepancy worth flagging, not silently resolving:** third-party aggregator sites
(SECONDARY, not used as a verified figure) describe Quizlet Plus's limits as flat monthly
quotas — "3 practice tests/month, 3 Q&A/month, 20 Learn rounds/month" — while Quizlet's own
help articles describe the free/Plus distinction as **per-flashcard-set**, not per-month.
Both could be true at once (a per-set cap that also nets out to a monthly-ish number in
practice), but I could not confirm the monthly framing against an official page, so the
per-set language above is what's verified; the monthly numbers are not.

### 2.2 What's behind the wall
Quizlet is unusual among this set for having **three** paid tiers, confirmed on
help.quizlet.com/.../Subscribing-to-Quizlet: **Quizlet Plus** ("extended access... with
monthly usage limits" — explicitly still metered, just less than free), **Quizlet Plus
Unlimited** (removes the caps, adds custom study paths / progress tracking / smart
grading), and **Quizlet Plus for teachers** (separate). A **Family Plan** exists too, with
one specific restriction stated officially: "Only free Quizlet users are eligible to
purchase or join a Family Plan" — an existing individual Plus subscriber can't fold into a
Family Plan the way Duolingo's Super subscribers can upgrade into Super Family.

### 2.3 WHEN the wall appears
Two different moments, and they're genuinely different in kind:
1. **At first use of a premium mode** (Learn beyond N rounds, a second Test on the same
   set, any Diagram set) — a hard, feature-level gate, not a trial period. There is no
   Duolingo-style "N days of full access, then it locks" — the free ceiling is present from
   a brand-new account's very first session.
2. **Never, for core flashcard creation and the game modes** — those aren't gated at all,
   so a purely free user who never touches Learn/Test/Practice Tests/Study Guides never
   sees an upgrade prompt tied to a limit, only whatever ambient upsell exists in the UI
   chrome (not independently verified this session — the app shell itself was inaccessible
   to this browser).

### 2.4 CTA style
**NOT FOUND / NOT VERIFIED.** Because the main app domain returned "Access denied" on
every path this session tried, I could not see the actual upgrade modal, banner, or
in-line badge Quizlet shows a free user. Nothing here should be read as a claim about CTA
style — this is a real gap, not an omission.

### 2.5 Price
**NOT FOUND** via an official, unauthenticated page — same failure mode as the CTA
question, and for the same reason (app shell inaccessible). The Google Play Store listing
confirms the app "Contains ads" and has "In-app purchases" but did not render a visible
price or price range in this session's page text. **SECONDARY, explicitly flagged, not
verified:** aggregator sites cite Quizlet Plus at $2.99/mo billed annually ($35.99/yr) and
Plus Unlimited at $3.74/mo billed annually ($44.99/yr), both with a 7-day trial. I am not
treating these as confirmed. Student-specific discount: not found. Annual-vs-monthly
discount rate: not found from an official source.

### 2.6 Minor-specific flow
OBSERVED (Signing up for a free account, official): signup asks for a birthday, and "certain
users may need to enter their parent's email address to help us comply with local laws...
must have their parent confirm their consent via a confirmation email before they can
create and edit flashcard sets" — a COPPA-style consent gate tied to account creation
itself, not to payment specifically.

**The single most directly relevant finding in this entire document** sits here, not in
the pricing sections: Quizlet's own AI chat feature, **Ask Quizlet**, carries an explicit,
separate age-and-geography gate stated in its own help article: *"Ask Quizlet is currently
only available for users in the United States who are 14 years old or older."* This is a
different, additional restriction layered on top of the general account age-gate above —
Quizlet evidently decided its conversational AI feature specifically needed a stricter,
narrower eligibility check than the rest of the product, independent of subscription tier.
I could not determine from this article alone whether Ask Quizlet is free-tier-available
(subject to that 14+/US gate) or Plus-gated on top of it — not stated either way in the
source checked, and I'm not guessing.

---

## 3. Photomath

Photomath is owned by Google (acquired 2022); its help center now lives on
`support.google.com`, not a Photomath-branded domain — worth knowing since it means
"official" here spans two domains.

**Sources checked (all this session, 2026-09-02):**
- [support.google.com/photomath/answer/14330572 — Photomath Plus overview](https://support.google.com/photomath/answer/14330572?hl=en)
- [photomath.com/terms](https://photomath.com/terms/) — Terms of Service
- [photomath.com/en/privacypolicy](https://photomath.com/en/privacypolicy) — Privacy Policy
- App Store listing (checked, price not extractable — see 3.5)

### 3.1 What exactly stays free
The clearest, simplest free tier in this whole survey. OBSERVED, quoted directly from
Google's official Photomath Plus overview: "Core Photomath features with step-by-step
solutions to symbolic math will always remain free of cost, so you can scan equations,
expressions, functions etc., or use our calculator to solve **as many problems as you
need**." That's an explicit, official no-usage-cap statement — Photomath's free tier is
not metered by count at all. The wall here is 100% a feature wall, not a volume wall.

### 3.2 What's behind the wall
"AI-powered animated tutorials, deeper explanations and contextual hints" — Plus doesn't
unlock more answers, it unlocks better-explained answers to the same unlimited problems.

### 3.3 WHEN the wall appears
Based on the official text (not on watching the live app, which would need an account/
device session out of scope here): there is no limit to trigger, so there is no
limit-triggered upgrade moment. The overview article describes Plus as reachable via a
persistent "Photomath Plus tab" in the app's menu — i.e. discoverable/always-available
rather than interrupt-triggered. This is an inference from official documentation of the
navigation, not a direct observation of the in-app moment, and I'm flagging it as such.

### 3.4 CTA style
**NOT VERIFIED.** Same limitation as 3.3 — I have the official description of where Plus
lives in the app's navigation, not a first-hand look at how it's presented visually.

### 3.5 Price
OBSERVED (official): yearly billing is stated explicitly as "a 50% discount compared to a
monthly plan," and a 6-month tier exists at its own discounted rate (no percentage given
for that one). **The dollar figures themselves are NOT FOUND via an official page** — the
overview article defers to the in-app menu ("Check out our subscription plans by opening
the Menu button...") rather than stating a number, and the App Store listing's price
component did not render as extractable text this session (same failure mode as Duolingo
and Quizlet's store listings — see §1.5, §2.5; this looks like a general limitation of
this session's tooling against App Store IAP price widgets, not something specific to any
one app). **SECONDARY, flagged, not verified:** widely-reported figures put monthly at
$9.99 and yearly at $69.99 (≈$5.83/mo, consistent with the official 50%-off claim above).
Student discount: not found.

### 3.6 Minor-specific flow
OBSERVED (Privacy Policy §15, "Children's Privacy"): Photomath tracks age at use, "will
never knowingly collect personal data from children under 13 years of age (or applicable
age in your country)," and for anyone under 16, requires "consent or consent of your
authorized holder of parental responsibility before we process your Personal information
in any way" (GDPR-style language, not COPPA-specific phrasing — a different legal
vocabulary than Duolingo's or Quizlet's US-centric COPPA framing). Notably, unlike
Duolingo, **no separate payment/subscription-specific consent mechanic is described** —
the consent requirement is framed generally around personal-data processing, not
specifically tied to purchasing Plus. Terms of Service, checked separately, has no
age/minor clause at all — the age-gating logic lives entirely in the Privacy Policy here.

---

## 4. Brilliant

**Sources checked (all this session, 2026-09-02):**
- [brilliant.org/premium/](https://brilliant.org/premium/) — pricing/comparison page
- [brilliant.org/courses/](https://brilliant.org/courses/) and a specific course page (Fractions) — public catalog
- [brilliant.org/privacy/](https://brilliant.org/privacy/) — Privacy Policy
- The onboarding flow itself, up to (not including) any request for name/email/payment — see 4.3

Note on pricing currency: this session's browser resolved to a Turkish IP, so
`brilliant.org/premium/` rendered prices in **TRY (Turkish Lira)**, live, under an active
"Back to School" promotion. Given ORYN's own Turkey market, I'm treating this as a feature
of this observation, not a limitation — but it means the figures below are what a
Turkey-based visitor sees today, not a universal USD list price, and the promotional
framing means the "everyday" price may differ once Back-to-School ends.

### 4.1 What exactly stays free
OBSERVED directly from the pricing page's comparison table (read via the accessibility
tree, which — unlike Duolingo's version of this same kind of table — carries explicit
per-cell alt text confirming availability, not just a flattened list): the free plan gets
exactly one of five listed benefits, **"Daily lesson."** All four others — Unlimited
learning, Tutoring by Koji, No ads, Jump ahead and personalized practice — are each
explicitly marked "not available in the Free plan." The full 40+ course catalog (with
syllabus, lesson-by-lesson breakdown, grade-level tags 4–12) is browsable with zero
authentication — I read a complete course outline (Fractions: 27 lessons, 375 exercises
across 5 levels) without signing in.

### 4.2 What's behind the wall
"Unlimited learning" (full access to all 40+ courses, vs. free's single daily lesson),
**"Tutoring by Koji"** — Brilliant's own AI tutor/chat feature, entirely Premium-gated per
this table — no ads, and "jump ahead and personalized practice."

**Worth flagging plainly, per the standing ask to surface this rather than bury it:**
Brilliant put its AI tutor behind the hardest gate in this survey — not metered, not
age-limited, just **not available on free at all** per the pricing page's own comparison
table. That's a stricter stance than Quizlet's Ask Quizlet (age/geography-gated but not
stated as paid-only) and stricter than what I understand ORYN's chosen design to be (some
free advisor access, wall on depth/volume). One nuance worth naming rather than smoothing
over: Brilliant's own Privacy Policy (Children's Privacy section, detailed in 4.6) lists
"AI tutor interaction data" among what it collects from **under-13 users with parental
consent** — meaning children can generate AI-tutor chat data on this product, which sits
in tension with the pricing page's blanket "Premium only" claim. I did not resolve this
tension myself (most likely explanation: the child is on a parent's paid Family plan,
which the pricing table doesn't separately depict) — flagging the discrepancy rather than
picking one source over the other silently.

### 4.3 WHEN the wall appears — directly observed, not inferred
This is the one product in the survey where I watched the actual trigger fire. From the
public, no-login Fractions course page, clicking **"Start" on the very first exercise of
the very first lesson** (not after any free usage at all) redirected immediately to
`brilliant.org/welcome/`, an onboarding flow opening with "Hi, I'm Koji! I'll be your
personal tutor" and a first question ("What motivates you to learn?" — school, professional
growth, staying sharp, or helping a child learn). I stopped at that point, before any
screen requested a name, email, or payment method, in keeping with this session's no-signup
rule — so I can confirm the gate sits at **first interaction with any lesson content**, but
not exactly which step inside that funnel first asks for real personal data. **This
directly contradicts a reading of "Daily lesson" as something a visitor can just start
doing** — in practice, "free" still requires completing at least the start of an account
funnel before the first exercise renders; there is no fully anonymous trial exercise.

### 4.4 CTA style
The pricing page itself is interruptive-by-default in structure (dedicated `/premium/`
page, comparison table, single prominent "Subscribe now" CTA repeated at top and bottom),
similar in spirit to Duolingo's marketing pages. The in-product moment is stronger evidence
though: clicking to begin a specific lesson **redirects away from the content entirely**
into a full-screen onboarding flow, rather than showing an inline banner or dismissible
modal over the content. That's the most aggressive placement pattern found in this survey —
everyone else's hardest gate is a modal or a locked feature *within* the page; Brilliant's
is a page-level redirect before the page you wanted ever loads.

### 4.5 Price
OBSERVED, live, TRY, 2026-09-02, with the caveats above: **Monthly** TRY 450/mo (no
discount). **Annual**, under the active Back-to-School promotion: TRY 300/mo struck
through, discounted to **TRY 210/mo** (billed as one annual payment) — a **30% discount**,
matching the page's own "Save 30%" banner exactly (300 × 0.7 = 210). **Family** (6 seats):
TRY 600/mo struck through, discounted to **TRY 420/mo**, same 30% rate. A separate gift
option and a group/institutional plan both exist (linked, not priced on this page). Student
-specific discount: not found — nothing on this page names a separate student price; the
discount available today is seasonal ("Back to School"), not identity-based.

### 4.6 Minor-specific flow
OBSERVED (Privacy Policy, "Children's Privacy" section, standard COPPA framing, names
Brilliant Worldwide, Inc. as the COPPA "operator"): verifiable parental consent required
under 13; if collected without consent, Brilliant will "either seek parental consent or
promptly delete the information." The policy is unusually specific about exactly what's
collected from a consented under-13 account — **full name, email address, age, push
notification tokens, and AI tutor interaction data** (chat messages, submitted files like a
homework photo, and Voice Input transcriptions — the AI tutor's file inputs are explicitly
"processed... and not stored"). No chat rooms, community areas, public profiles, or message
boards exist for any user, adult or child. Children under 13 can appear in leaderboards but
"anonymized."

**Comparative note against §1.6 (Duolingo):** two real products, same underlying COPPA
obligation, opposite design choices about what a child's own account holds. Duolingo's
Child User has no email at all — a username only, with the *parent's* email collected
instead. Brilliant's under-13 flow collects the *child's own* full name and email address
directly (under verifiable parental consent). Neither is wrong, but they're genuinely
different privacy postures worth ORYN knowing exist as two validated options, not one
default.

---

## 5. Khan Academy / Khanmigo

**The single most directly relevant product in this survey.** Khan Academy is a free,
donation-funded nonprofit K-12 platform; **Khanmigo is its separately-branded AI tutor**
(its own domain, `khanmigo.ai`), and Khanmigo's own access model is closer to ORYN's
proposed advisor-chat shape than anything else researched — same age band, same
"AI-tutor-as-the-paid-layer-on-a-free-platform" structure.

**Sources checked (all this session, 2026-09-02), with direct-DOM verification, not
WebFetch summaries, for every number quoted:**
- [khanmigo.ai](https://khanmigo.ai) — marketing/FAQ page. The FAQ answers are
  visually collapsed by a Webflow accordion that would not open under scripted or real
  click events in this session (likely requires a lazy-init step this browser didn't
  trigger) — so I read them the honest way available: confirmed each answer's exact text
  is genuinely present in the loaded page's DOM via `document.body.textContent`, matching
  a WebFetch lead word-for-word, before quoting anything below. Every quote here was
  matched against the live page's own text, not taken from the WebFetch summary alone.
- [khanmigo.ai/pricing](https://www.khanmigo.ai/pricing) — dedicated pricing page,
  rendered normally, read directly.
- [khanacademy.org/about](https://www.khanacademy.org/about) — official mission/scale page.

### 5.1 What exactly stays free
The base Khan Academy platform (video lessons, practice exercises, mastery tracking across
math, science, humanities, test prep, etc.) is **entirely free, for everyone, with no
paywall of any kind** — this is the organization's stated mission, quoted directly from
their About page: *"Khan Academy's mission is to provide a free, world-class education to
anyone, anywhere."* Available in 190+ countries and 55+ languages per the same page.
**Khanmigo, the AI tutor layer, has no free tier at all for individual/parent users** — see
5.3. Teachers get Khanmigo free (5.2).

### 5.2 What's behind the wall
Confirmed on the pricing page: for **teachers**, Khanmigo itself is free (lesson planning,
student-work summaries, rubric/exit-ticket generation, chat history) — the wall is
specifically on **non-teacher humans**: individual learners/adults and parent-managed
family accounts both pay identically, **$4/month or $44/year** ("Save $4 w/ annual" — an
8.3% discount, notably the smallest annual discount found anywhere in this survey, versus
Duolingo/Photomath's ~50% and Brilliant's 30%). The family tier is not priced per child —
one $4/month subscription lets a parent "Add children from your parent account," confirmed
elsewhere on the same page as **up to 10 children**. Family-tier extras beyond the
individual tier: viewing "the history of your children's interactions," moderation alerts,
and (parent-tier only) "personalized coaching" framed around college admissions —
worth flagging given ORYN's own subject matter.

### 5.3 WHEN the wall appears — no free allowance at all
This is the sharpest, most unambiguous finding in this document, and directly verified,
not inferred. From the FAQ, DOM-confirmed verbatim: *"To access Khanmigo as a parent or
learner, you must make a monthly or annual payment, be 18 years or older, live in the
United States, and have a billing address in the U.S."* There is no free-message
allowance, no trial period mentioned anywhere on either page checked, and no path for an
individual learner under 18 to hold their own paid account — a minor can only reach
Khanmigo at all as one of up to 10 children added under a paying adult's family
subscription. Compare this to every other AI-chat feature found in this survey (Quizlet's
Ask Quizlet, Brilliant's Koji): both of those have *some* stated free-usable path (even if
age- or feature-gated); Khanmigo's individual/family product has none. The wall is at
**account creation itself**, before message one — the most restrictive placement in this
entire document.

*Two things outside my brief, flagged for oryn-f5 rather than analyzed here:* the pricing
page states chat history is retained and accessible to subscribers, and for family
accounts, a parent can view "the history of your children's interactions" — both are
mechanics of what happens *inside* a paid allowance, not about where or when the wall
itself triggers, so I'm handing them over as raw observation rather than drawing
conclusions about them.

### 5.4 CTA style
The public marketing site (`khanmigo.ai`) is built entirely as an upgrade funnel — every
top-level page (`/parents`, `/learners`, `/pricing`) exists to sell the subscription, with
repeated "Get Khanmigo" CTAs. This reads as the same ambient/omnipresent style as Duolingo
rather than a limit-triggered interruption, for the simple reason that there's no free
usage during which an interruption could occur (5.3) — the entire visitor journey before
payment *is* the CTA.

### 5.5 Price
OBSERVED directly, `khanmigo.ai/pricing`, 2026-09-02: **$4/month or $44/year** for both
"For you" (individual) and "For families" tiers — identical price, family tier adds
child-management features rather than costing more. Teachers: free. Districts: custom
quote ("Request pricing"). Sales tax explicitly excluded per an on-page footnote. Student
discount: not applicable/not found — the individual tier is priced the same regardless of
who's buying it.

**Anchor this against the cost numbers already on the table for ORYN's own advisor:** Khan
Academy — a nonprofit, not optimizing for margin the way a VC-backed product would — prices
unlimited(-seeming; usage limits within the paid tier not stated on this page and are
oryn-f5's territory, not mine) AI tutoring, for up to 10 people on one account, at $4/month
total. That's a genuinely low anchor for what a family expects to pay for AI tutoring
access in this exact market, independent of what it costs Khan Academy to serve.

### 5.6 Minor-specific flow
The clearest-stated age mechanic in this whole document: the **paying account holder must
be 18+ and US-resident** (5.3, DOM-verified verbatim); a minor's only access path is as one
of up to 10 children added to that adult's account, with the parent able to see the child's
interaction history and receive moderation alerts. This is a stricter version of the same
shape as Duolingo's "Child Users may join paid Family Plans" (§1.6) and Brilliant's
parent-consent-driven under-13 flow (§4.6) — a third product independently converging on
**"a minor's access to the paid/AI tier routes through an adult's account and an adult's
payment," never a minor paying directly.** I attempted to verify the base (non-Khanmigo)
Khan Academy platform's own under-13 account mechanics via an official explainer article
surfaced by search, but that specific URL 404'd this session — secondary summaries
describe a "restricted account" / parent-or-school-consent model consistent with COPPA, but
I'm not stating that as verified since I couldn't open the source page myself. Flagging as
**NOT INDEPENDENTLY VERIFIED**, distinct from everything else in this section.

---

## 6. Chegg

**This is the thinnest section in this document, and that itself is a finding.** After
one successful load of `chegg.com`'s homepage, every subsequent request to the domain —
`/study`, `/contactus`, even the bare homepage again, in both the original tab and a fresh
second tab — returned **"Access to this page has been denied."** This reads as bot
detection tripped after a small handful of requests, not a broken link (the same URLs are
publicly live for a normal browser). Of the products in this survey, Chegg's own site was
the most resistant to being read directly. I'm reporting exactly what I got before the
block, and marking everything else NOT FOUND rather than filling the gaps from memory or
blogs pretending to be equivalent to a verified figure.

**Sources checked:** `chegg.com` homepage (one successful load, 2026-09-02, before being
blocked) and the [Chegg Study App Store listing](https://apps.apple.com/us/app/chegg-study-homework-help/id385758163).

### 6.1–6.4 What's free / what's paid / when / CTA style
OBSERVED (the one homepage load that succeeded): Chegg states its own funnel in three
steps, verbatim: *"Create an account & explore our free tools → Choose your subscription →
Ask a question & start learning."* That confirms account creation happens **before**
subscription choice, and that some tools are usable free post-signup — but I could not
open any further page to see which specific tools those are, what limit they carry, or
what the upgrade moment looks like. The App Store listing confirms the core product is
"expert Q&A" (submit a scanned/typed question, get a written solution, historically ~30–46
minute average response time per the listing's own fine print) plus a "60 million" question
solution library and AI-assisted solving layered on top of the expert-answer model. Whether
any of that is accessible free, or how much, is **NOT FOUND** — the page that would show it
was the one that got blocked.

### 6.5 Price
**NOT FOUND** via an official page opened this session. **SECONDARY, explicitly flagged,
not verified, and inconsistent across the aggregators that report it** (one summary this
session cited both $15.95 and $14.95 for the same plan in the same paragraph, which is
itself a reason not to trust the category of source): commonly-reported figures are
Chegg Study around $14–16/month with a cheaper effective annual rate (~$9.95/mo billed
annually), a higher "Study Pack" tier around $19.95/month, and a 7-day free trial. None of
this is used as a verified number in this document — it's reported only so the gap isn't
silent.

### 6.6 Minor-specific flow
**NOT FOUND.** The Privacy Policy URL is known (`chegg.com/en-US/privacypolicy`, visible in
the App Store listing's own text) but was blocked when I tried to open it. No claim made.

---

## 7. Scribbr

Scribbr doesn't fit the subscription mold at all, and that's the headline finding — worth
stating plainly rather than forcing it into the same shape as the other six.

**Sources checked (all this session, 2026-09-02):**
- [scribbr.com/plagiarism-checker/pricing](https://www.scribbr.com/plagiarism-checker/pricing/)
- [scribbr.com/citation/generator](https://www.scribbr.com/citation/generator/)
- [app.scribbr.com/plagiarism-checker](https://app.scribbr.com/plagiarism-checker) — the actual product step 1 (viewed, nothing uploaded)
- [scribbr.com/privacy-policy](https://www.scribbr.com/privacy-policy/)

### 7.1 What exactly stays free
OBSERVED: the **Citation Generator** (APA/MLA/Chicago/Harvard, autocite by title/URL/ISBN/
DOI, export to Word) is free with no cap or account stated, plus a free Chrome extension
that auto-fills citations from any page. This is Scribbr's genuinely free, ungated tool —
directly relevant to ORYN's own audience since it's explicitly marketed to "University
applicants": ORYN's users are exactly the people citing sources in application essays and
extended-essay-style projects.

### 7.2 What's behind the wall
The **plagiarism checker, AI Detector, and AI Proofreader are not a subscription feature at
all — they're bundled into a single paid, one-time check**, priced by document length (7.5).
The pricing page states this explicitly: AI Detector and AI Proofreader access is "free
access... with a premium plagiarism check" — i.e. bundled into the one-time purchase, not
separately free and not separately subscribable.

### 7.3 WHEN the wall appears — directly observed
No free preview of any kind. From the actual product flow (app.scribbr.com/plagiarism-
checker, step 1 of 4, read directly, nothing submitted): **"1. Upload — Upload a Microsoft
Word, PDF or ODT file of your paper, enter your details and pay."** Payment is bundled into
step 1, before the document is even processed — there's no scan-first-see-a-teaser-result
pattern here the way there is with, say, a metered AI query. You pay to submit, not to see
results.

### 7.4 CTA style
Not applicable in the usual sense — there's no upgrade modal interrupting a free experience,
because the paid tool and the free tools are simply different products on different pages.
The paid tool's own pricing page is a standard interruptive marketing page (comparison-style
feature list, prominent "Get started" CTA), but nothing about using the free Citation
Generator ever prompts an upsell into the plagiarism checker within the flow I observed.

### 7.5 Price
OBSERVED, `scribbr.com/plagiarism-checker/pricing`, 2026-09-02, USD (page offered a
currency switcher): **pay-per-document, explicitly stated "Prices are per check, not a
subscription"** — Small document (up to 7,499 words) **$19.95**, Regular (7,500–49,999
words) **$29.95**, Large (50,000+ words) **$39.95**. No monthly/annual price exists to
compare, and therefore no annual discount rate applies — the pricing page's FAQ literally
asks "Can I buy a monthly subscription for the Scribbr Plagiarism Checker?" as one of its
listed questions, which I take as Scribbr pre-empting the exact comparison a reader used to
subscriptions would reach for. Student discount: not found.

### 7.6 Minor-specific flow
OBSERVED (Privacy Policy, "Children's Privacy" section), and genuinely the **lightest-touch
policy in this survey** — worth naming as its own category, not a variant of the others:
*"Our Services are not intended for or directed to children, meaning those under the age of
13 years old in the United States, age 16 years old in Europe and the U.K.... We do not
knowingly collect or solicit personal information from children. If you are above the age
of consent and below 18 years of age please get your parent or guardian's permission before
using our Services."* That's the entire mechanic: a statement that under-13/16 users
shouldn't be there, plus an honor-system request for parental permission for 13/16–18 —
**no age-gate at signup, no restricted/child account type, no verified-parental-consent
flow, and no separate product experience for a minor**, unlike every other product in this
document. Worth naming directly for ORYN's audience: Scribbr's own stated floor (16 in
Europe/UK) sits *above* the bottom of ORYN's 14–18 target band, meaning Scribbr's own
policy would treat some of ORYN's actual users as below its intended age. (Corporate
footnote, incidental: the contact address in this section is `privacy@learneo.com` — Learneo
is Scribbr's parent company.)

---

