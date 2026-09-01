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

