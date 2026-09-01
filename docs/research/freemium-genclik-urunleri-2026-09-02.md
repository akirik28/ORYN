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

