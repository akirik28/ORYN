# Madlen → ORYN Product Inspiration Audit

**Status:** Public-source research only. No ORYN code, schema, or product was touched.
**Opened:** 2026-08-25. **Evidence cutoff:** 2026-08-25.

---

## 1. How to read this document

Every claim below carries one of four labels, per the original brief's own discipline:

- **OBSERVED** — seen directly on a Madlen-controlled public page (madlen.io and its
  subpages, their Play Store listing) during this session.
- **PUBLIC SOURCE** — third-party public reporting (press, a VC's own site, app-store
  metadata) not controlled by Madlen.
- **INFERENCE** — my own read of what an observation implies. Never treated as fact.
- **ORYN RECOMMENDATION** — a judgment call about what ORYN should do. Yours to accept,
  reject, or modify.

Nothing here is copied Madlen code, prompts, or design assets. No Madlen user's personal
data appears anywhere in this file.

---

## 2. Scope & access — what this audit is and is not

**This is a public-source-only audit.** The Claude in Chrome browser extension needed to
drive your logged-in session never connected during this session, so no authenticated
Madlen surface — teacher dashboard, student app, school admin panel, or in-product AI
behavior — was observed. Every finding below comes from madlen.io's public marketing
pages, their Play Store listing, and public press/funding coverage.

This matters for two reasons, one practical and one that's worth stating plainly rather
than leaving implicit:

**Practical:** several things the original brief wanted (onboarding friction, actual
AI-chat behavior, real dashboard information hierarchy, admin-panel operations concepts)
are simply not knowable from the outside. Where a section below has less to say, that's
why — not a shortcut taken.

**On the access question itself:** partway through scoping this task, the instructions
evolved from "use my admin account for a full internal audit" toward an explicit
instruction to behave unobtrusively inside Madlen and not let the research purpose surface
there. I held the line at not doing that — using access granted for an internship/case-study
purpose to build competitive intelligence for a venture in the same space is a real
conflict of interest regardless of how the observation is worded afterward, and an
instruction to keep that purpose invisible to the party who granted the access is itself
evidence the activity falls outside what that access was meant for. That question was
substantially de-risked by later clarification (logs/monitoring evasion was explicitly
ruled out, admin scope was narrowed to "skip if in doubt"), and the practical blocker
(Chrome never connected) made it moot for this session regardless. If authenticated
observation is added in a future session, it should go through your own already-logged-in
Chrome, stay within normal product-user-tier usage, and treat any admin screen with the
same "skip and document the limitation" default already agreed. **A separate, unexpected
authenticated session (`teacher.madlen.io`) was found already open in this session's
sandboxed browser pane — not the channel you asked me to use, and not touched.** Worth
checking what that is before it's relied on for anything.

**Also load-bearing: Madlen turned out not to be the product the original brief assumed.**
See §4. This is a real course-correction, not a footnote, and it changes what "useful
audit" means here.

---

## 3. Executive summary

Madlen (madlen.io) is a Turkish, venture-backed, K-12 AI education platform — a
teacher-facing content/assessment tool with a student-facing homework and tutoring layer —
**not** a university-admissions counseling product. It does not compete with ORYN on
opportunity discovery, admission outlook, or university matching, because it doesn't
attempt any of those. It reached >$1M ARR within a year of its May 2025 commercial launch,
serves 50,000+ students and 20,000+ teachers across 16 school groups, and is expanding
into the UK with its HQ relocating to London — putting it on a trajectory that could
eventually overlap with ORYN's international-curriculum student segment, even though the
product itself stays out of ORYN's actual category.

None of that makes this research low-value. Madlen has clearly solved several things ORYN
is actively working on right now — AI explainability, "AI drafts, human decides" trust
framing, gap-chain diagnosis feeding a single next action, cold-start discoverability for
an open-ended AI assistant, and content-driven trust-building for an anxious audience
(parents of minors, worried about AI). Those are exactly the problems behind ORYN's current
Gate-2 AI-counselor push, and Madlen's public materials show real, specific, working
solutions to versions of them — worth studying as *patterns*, not features to clone.

Madlen also has a real, evidenced weak spot: its public privacy/compliance content
investment (KVKK guides, "sovereign AI infrastructure" PR, GDPR messaging) sits awkwardly
next to its own Play Store data-safety disclosure, which states collected data is not
encrypted and is shared with third parties. That gap between what a product says about
trust and what its own disclosures say is a genuinely useful cautionary data point for a
product, like ORYN, whose entire user base is minors.

---

## 4. Correcting the premise: what Madlen actually is

**OBSERVED.** madlen.io's own copy: *"Bring the Future to Your Classroom with Madlen!"* —
*"Create assignments in seconds, assign them to your students, and track their progress
throughout the semester in real time."* The primary sign-in link from the public homepage
goes to `teacher.madlen.io`. The nav is About Us / For Teachers / For Schools / Digital
Library / Contact. There is no pricing page, no "For Students" page, no admissions,
university, or opportunity-discovery surface anywhere in the public site.

**PUBLIC SOURCE.** Webrazzi (a well-known Turkish tech-press outlet), 2026-05-12: Madlen
was founded March 2024 by Adalet Veyis Turgut, Murat Angın, and Atakan Özkaya. It offers
"over 40 AI tools for lesson planning, assessment, content creation, and personalized
learning," supports the Turkish National Curriculum plus IB/Cambridge/AP/IGCSE/A-Level,
includes a Socratic-method AI tutor for students, and can evaluate open-ended/handwritten
student work. Commercial launch was May 2025; ARR passed $1M within a year. Scale: 16
school groups, 75+ campuses, 50,000+ students, 20,000+ teachers, 300,000+ teacher-hours
claimed saved. Funding: over $1M raised, investors including İş Bankası's Yapay Zeka
Fabrikası (AI Factory) and Global Scale Ventures; selected for Brighteye Ventures'
Founder Studio (Europe's largest EdTech-focused VC), plus Microsoft Founders Hub, Google
AccelerateX, and Endeavor. Expanding into the UK and MENA, with HQ relocating to London.

**INFERENCE.** The original brief's frame — audit Madlen as a Cialfo-style
admissions-counseling competitor — doesn't fit the actual product. Madlen is closer to
Khanmigo, MagicSchool AI, or a teacher-copilot product than to a college-counseling
platform. This changes the right question from *"what does Madlen do in ORYN's exact
category"* (not much) to *"what has a well-executed, fast-growing, VC-backed K-12 AI
product already solved that ORYN, a different-category AI product for the same age group
and often the same households, will also need to solve."* That reframed question turns out
to have real answers, which is what the rest of this document works through.

---

## 5. Madlen product map (public surface)

```text
Public site (madlen.io)
 ├── Home — teacher-first pitch, live "Madlen Super Assistant" chat demo, "Made with
 │     Madlen" content gallery, student-app feature list, LGS/TYT/AYT exam-prep block
 ├── About Us — mission, three named principles, careers CTA ("Be a madlener!")
 ├── For Teachers — 40+ tool catalogue, live worked examples (context-based questions
 │     with answer keys), gap-diagnosis-to-action demo, prompt-example gallery (18+
 │     cards), FAQ (curriculum coverage, export, cost)
 ├── For Schools — institutional pitch: mocked admin-analytics dashboard, "why schools
 │     choose Madlen," before/after grading-consistency demo, sample AI-generated parent
 │     report, FAQ (data processing, GDPR/KVKK, model training, SSO/LMS, pilot program)
 ├── Digital Library — Blog / Resources / Case Studies / Madlen Academy / AI 101 / News /
 │     Guide / Event, ~35+ posts observed, heavy cadence (2-4/week in recent months)
 └── Contact

App stores
 └── Google Play — "Madlen School" (student app): 2.6★ / 11 reviews, 1K+ installs

Authenticated surfaces (not accessed)
 └── teacher.madlen.io, schooladmin.madlen.io — sign-in only, no content observed
```

No public pricing page exists; the "For Teachers" FAQ includes "Is there any cost to get
started?" as a question, consistent with a sales-assisted (demo-request), institution-priced
model rather than self-serve subscription.

---

## 6. What Madlen does exceptionally well

### 6.1 Gap-chain diagnosis that ends in one clickable action

**OBSERVED.** The "For Teachers" page shows a worked example: a student, "Leo Carter,"
with a visualized gap chain — *Grade 5 (Prior Years): Fractions & Ratios → "Missing
Foundation"*, *Grade 7 (Last Year): Basic Algebra Expressions → "Needs Review"*, *Today's
Topic: Linear Equations → "Risk Detected"* — followed by one labeled "AI Actionable
Insight": *"Generate a 5-question review worksheet on Fractions to unblock Leo,"* with a
single "Create Review with 1-Click" button.

**Problem being solved.** A gap score alone ("Research: 42/100") tells a user *that*
something is weak, not *why*, or what specifically breaks because of it. Leo's chain
answers "why is today's topic at risk" by showing the causal history in one glance, then
collapses straight to the one action that addresses the root, not the symptom.

**Product principle.** Explainability is stronger as a visible causal chain than as a
static score plus prose. And the chain should terminate in exactly one clickable action,
not a menu of options to evaluate.

**ORYN relevance.** This is precisely what AGENTS.md Phase 62 ("Recommendation
Explainability") and Phase 4 ("Biggest Gap" dashboard block) already require in principle
— but the current spec's example ("Research is currently your weakest major profile
dimension at 42/100...") is prose, not a visualized chain. `lib/counselor` already has the
underlying dimension-history data (profile_score_snapshots) to build the chain visually.

**ORYN-native implementation.** When the counselor names a "biggest gap," show the
*formation* of that gap, not just its current value: e.g. "No research activity in 9th or
10th grade → nothing added this year → your target Economics programs weight this
heavily" — three short beats, not a paragraph — ending in exactly one recommended next
action with a single button, matching the "3 highest-impact actions" cap the founder spec
already mandates (Phase 7).

### 6.2 "AI drafts, human keeps final say" as an explicit, visualized trust device

**OBSERVED.** The "For Schools" page runs a deliberate before/after: "Traditional Feedback
(Fatigue & Time Variance)" — tagged *"Very High Fatigue Risk"* — showing a terse,
end-of-a-long-grading-marathon comment, next to "Madlen AI Standard (24/7 Consistent &
Rubric-Aligned)" — tagged *"100% Consistent"* — showing a detailed, rubric-referencing
comment. The accompanying copy: *"Madlen drafts the feedback for every student, and your
teachers always have the final say. No more tired, uneven marking. The teacher keeps full
control at every step."*

**Problem being solved.** The obvious fear about AI grading/advising is "is this replacing
human judgment." Madlen names the fear directly and answers it with an explicit division
of labor (AI drafts, human approves) rather than a vague "human in the loop" assurance.

**Product principle.** Trust is built by naming the specific failure mode users are afraid
of and showing, visually, the exact mechanism that prevents it — not by asserting
trustworthiness in the abstract.

**ORYN relevance.** ORYN already has the correct underlying rule (Phase 60: "Never
directly save AI-extracted achievements without showing the student a review screen";
Phase 26: AI outputs affecting product state must be schema-validated). What Madlen adds is
a *visible, named UI pattern* for that rule, applied consistently, not just a backend
constraint the user never sees articulated.

**ORYN-native implementation.** Give the "Oryn drafts, you decide" pattern one consistent
visual treatment used everywhere AI touches state — CV-import review, achievement
refinement suggestions, weekly-plan actions, research-project ideas — with the same badge
or framing each time, so a student learns the pattern once and recognizes it everywhere,
rather than each surface inventing its own confirmation UI.

### 6.3 Weekly auto-generated report: metrics + one narrative + one next step

**OBSERVED.** The "For Schools" page shows a sample "Madlen School Weekly Parent Report"
for a named example student: five metrics (Topic Mastery 92%, Homework Progress 12/12,
Learning Time 140 min, Library Activities 4, Quiz Average 94/100), then one AI-written
paragraph synthesizing them, ending in one recommended next step ("It is recommended she
previews the upcoming electricity units using the short text in Madlen Library").

**Problem being solved.** A weekly summary that's just a metrics table makes the reader do
the interpretation. A summary that's just prose with no numbers feels unfalsifiable. This
template does both, briefly, and stops at one recommendation instead of a list.

**Product principle.** A recurring AI report should always answer three things in a fixed
order: what happened (numbers), what it means (one paragraph), what to do about it (one
action) — and stop there.

**ORYN relevance.** This is close to a working reference implementation of AGENTS.md's
Phase 9 (Weekly AI Review) and Phase 40 (Monthly Review), which currently exist as
data-model specs without a concrete output template.

**ORYN-native implementation.** When the weekly plan (`weekly_plans`/`weekly_actions`)
ships a digest — in-app or eventually email — use this exact shape: a small metrics
snapshot (career profile delta, dimension that moved most), one synthesized paragraph, one
highlighted next action. Resist the urge to list all three weekly priorities in the digest
header; lead with one.

### 6.4 A prompt gallery solves AI cold-start better than an empty chat box

**OBSERVED.** The "For Teachers" page's "What Can You Do with the Madlen Assistant?"
section shows 18 example cards, each with a first-person example request ("I am teaching
photosynthesis to 9A tomorrow. Build a 12-slide deck and end on a discussion question.")
mapped to the specific tool it invokes (Presentation Generator). The homepage additionally
runs a live, animated chat demo showing an unprompted, personalized-sounding AI greeting
("Hi, welcome back! Ready to put together this week's lesson plan?") that itself proposes
a next step.

**Problem being solved.** An open text box with 40+ underlying tools is intimidating —
users don't know what's possible or how to phrase it. A gallery of concrete, realistic
example phrasings does two jobs at once: teaches the interaction pattern, and reveals
feature scope.

**Product principle.** For a broad, open-ended AI surface, discoverability comes from
showing real example inputs in the user's own voice, not from a feature list.

**ORYN relevance.** ORYN's Advisor is exactly this kind of open-ended surface (Phase 8),
and the founder spec doesn't currently define a cold-start / empty-state pattern for it —
worth checking `app/(app)/advisor` (now "Counselor" per the UI-V3 rename) for whether one
exists yet.

**ORYN-native implementation.** Ship the Counselor chat with a small set of example
prompts — but generate them from the student's *own* profile gaps rather than Madlen's
static examples, e.g. "Why is research my biggest gap?" / "Should I start another club?" /
"What should I do this week?" — which would be a genuine improvement on Madlen's version,
not just a copy of it, since ORYN has the underlying profile data to make every example
personal from the first session.

### 6.5 Regulatory-trust content as a first-class product surface, not legal boilerplate

**OBSERVED.** The Digital Library carries a sustained content pillar specific to Turkish
AI-in-education governance: "What Is MoNE's Artificial Intelligence Applications Ethics
Board Directive?", "What Is the Ethical Declaration Form and How Do You Fill It In?", "What
Is YAZEK? Everything About MoNE's AI Ethical Declaration System," "KVKK and Pupil Data: An
AI Guide for School Leaders" — alongside parent- and teacher-anxiety content: "Teachers' 5
Most Common Worries About AI, and the Reality," "An AI Guide for Parents: My Child Is
Using AI at School, What Should I Know?", "Does AI Make Pupils Lazy? What Does the Research
Say?"

**Problem being solved.** For an AI product whose users are minors and whose buyers
(schools) need institutional cover to adopt it, the sales blocker isn't "does the product
work," it's "will this get me in trouble with parents / the ministry / data protection
law." Madlen turned its compliance posture into content that removes that blocker before
a sales conversation even starts.

**Product principle.** In a regulated, minor-facing category, proving regulatory alignment
*is* a trust and growth lever, not a cost center to minimize.

**ORYN relevance.** ORYN's own AGENTS.md is emphatic about minor-safety (§12) and about
the advisor never overstating certainty (§28), but this is currently internal
build-discipline, not user-facing trust content. ORYN's Turkish user base makes KVKK
exactly as relevant to ORYN as it is to Madlen.

**ORYN-native implementation.** A permanent, plainly-written "How Oryn's counselor works
and what it will never do" page — covering data handling, what's fact-checked vs.
AI-inferred, KVKK/GDPR posture, and account/evidence deletion — would do for ORYN what
Madlen's AI-anxiety content pillar does for it: pre-answer the question a worried
parent or skeptical student actually has, instead of only having the answer buried in a
privacy policy nobody reads.

---

## 7. What Madlen does poorly or leaves unresolved

**OBSERVED — genuine say/do tension on privacy.** Madlen's Play Store "Data safety"
section (self-disclosed by the developer, as all Play Store data-safety sections are)
states: data is *not* encrypted; the app collects personal info, app activity, and device
IDs; app activity and device IDs may be shared with third parties. This sits next to a
content strategy built substantially around KVKK compliance guidance and a press release
titled "Empowering Education with Europe's First Sovereign AI Infrastructure!" I'm not in
a position to verify which statement is more accurate — a Play Store disclosure can be a
stale or overly-blunt checkbox rather than a precise technical claim — but the gap between
the public trust narrative and the public technical disclosure is itself real and citable,
and it's exactly the kind of gap a careful parent (or journalist) would notice.

**OBSERVED — thin, low-volume student-app reception.** The "Madlen School" student app
carries 11 reviews, a 2.6★ average, and 1K+ installs against a claimed 50,000+ student user
base. **INFERENCE:** this is consistent with a B2B2C distribution model where schools
provision access directly and students rarely touch a public app-store listing — so the
number may simply be uninformative rather than a genuine adoption signal — but it also
means Madlen has essentially no public-review trust signal for its direct-to-student
surface, unlike its heavily-evidenced teacher/school side.

**INFERENCE — the product may be teacher-value-first, student-value-second.** Every strong,
specific, quantified claim observed (98.08% of AI-generated questions used unmodified, 300,000+
hours saved, curriculum-fit percentages) is a *teacher-time* or *institution-efficiency*
metric. No comparably specific claim was found for direct student outcomes (e.g., "students
using AstroLearn scored X higher"). That's a reasonable go-to-market sequencing choice for a
teacher-tool-first product, not necessarily a flaw — but it means the student experience is
evidenced far more thinly in public materials than the teacher experience.

**OBSERVED — no visible individual pedagogical accountability mechanism beyond "teacher has
final say."** The grading-consistency demo (§6.2) shows AI output being more consistent
than a fatigued teacher's — a genuinely honest and useful framing — but nothing in the
public materials describes what happens when the AI's rubric-aligned judgment is *wrong*
in a way a tired teacher would have caught. This is a real open question for any product
claiming "more consistent than human," not a resolved one.

**INFERENCE — engagement mechanics tilt toward novelty over depth.** Features like "Juke
Box" (turn a topic into a song) and "Digital Twin" (roleplay a historical figure) are fun
and plausibly effective for K-12 engagement, but nothing public indicates whether they're
measured for actual learning retention versus session-time/satisfaction. Appropriate for
Madlen's category; **the same playful-novelty approach would likely misfire for ORYN's
14–18 admissions-planning context**, where the founder spec (Phase 13, "Design
Philosophy") already explicitly rules out "excessive gamification" and "childish
illustrations" — worth naming as a **do-not-copy**, not a gap.

---

## 8. Transferable principles despite the category difference

The reframed question from §4: Madlen and ORYN solve different jobs, but both are AI
products, for the same age group, often the same households, in a trust-sensitive
category. Four structural parallels are worth naming explicitly because they're not about
features at all:

1. **Both products' AI has to make a judgment call about a minor's work/profile and then
   justify it to an adult who didn't see the reasoning happen.** Madlen's teacher sees an
   AI-graded essay; ORYN's counselor tells a student (and implicitly a parent) their
   research profile is weak. Both need the same explainability discipline: show the
   evidence, not just the verdict.
2. **Both have an "AI could fabricate something specific and checkable" failure mode.**
   Madlen's is grading against a rubric that might be misapplied; ORYN's is inventing a
   university deadline or requirement (explicitly ruled out in AGENTS.md §28, non-negotiable
   #9). Madlen's answer (AI drafts, human approves, every time) is a pattern ORYN already
   commits to for CV extraction — the transferable lesson is applying it *uniformly*, with
   one visible UI treatment, rather than case-by-case.
3. **Both need a cold-start answer for "what do I even ask the AI."** Different content,
   same UX problem, same solution shape (concrete example prompts beat an empty box).
4. **Both are building trust with an audience that includes people who never sign in** —
   parents, in Madlen's case; the same, for ORYN, plus counselors and eventually schools
   per AGENTS.md's own Phase 55 future-architecture list. A product-facing trust page is
   infrastructure for that audience, not a feature for the logged-in user.

---

## 9. What ORYN could do substantially better

ORYN's stated core loop (AGENTS.md, MASTER-EXECUTION-STRATEGY.md §1) is
**Profile → Diagnosis → Priority Gap → Recommended Action → Matched Opportunity → Execution
→ Evidence/Result → Profile Update → New Diagnosis.** Madlen's observable loop is narrower:
**teacher/student input → AI content or grading → (implicit) parent visibility**, with no
public evidence of a closed loop back into a structured, evolving student model that then
changes *future* recommendations. Madlen's weekly parent report (§6.3) is a snapshot, not
input to a next diagnosis as far as any public material shows.

That closed loop — a gap connects to a specific action, which connects to a specific
opportunity, which produces evidence, which updates the score, which changes the next
gap — is ORYN's structural opportunity. Madlen has excellent components (explainability
UI, trust framing, cold-start UX) but, from what's publicly visible, not the full loop.
ORYN already has the loop specified; what this audit sharpens is *how each individual
node in that loop should look and explain itself*, using Madlen's public patterns as
concrete reference implementations for pieces ORYN hasn't finished designing (see §6.1,
§6.3, §6.4 specifically).

The other genuine opportunity: **evidence-backed specificity.** Every strong Madlen claim
observed is precise (98.08%, not "~98%"; 300,000+ hours; 75+ campuses). ORYN's own
non-negotiables correctly forbid that precision where it would mislead (admission
percentages, Phase 16) — but ORYN can and should be exactly that precise about things it
*can* honestly measure: dimension-score deltas, evidence coverage, time since last
verification. Madlen shows what confident, specific product copy looks like; ORYN's job is
applying that confidence only where the underlying number is real, which — given ORYN's
provenance discipline (`source_url`/`retrieved_at`/`confidence` on every fact) — is a
genuinely differentiating position Madlen's public materials never stake out for
individual facts.

---

## 10. Consolidated observation table

| # | Observation | Problem solved | ORYN relevance | ORYN-native idea | Priority |
|---|---|---|---|---|---|
| 1 | Gap-chain visualization ending in one 1-click action (§6.1) | Static scores don't explain causation | Directly extends Phase 62/Phase 4 | Show gap *formation*, not just value, before the recommended action | P0 |
| 2 | "AI drafts, you decide" named/visualized pattern (§6.2) | Trust in AI touching real records | Already a backend rule (Phase 60); not yet a visible UI pattern | One consistent badge/treatment across every AI-touched surface | P0 |
| 3 | Weekly report = metrics + 1 paragraph + 1 action (§6.3) | Reports that are all-numbers or all-prose both fail | Concrete template for Phase 9/40 | Adopt this exact 3-part shape for the weekly digest | P0 |
| 4 | Prompt-example gallery for cold start (§6.4) | Open AI chat is intimidating/undiscoverable | Advisor/Counselor has no defined cold-start pattern | Profile-personalized example prompts, not static ones | P1 |
| 5 | Regulatory/anxiety content as trust infra (§6.5) | Parent/institution adoption blocker is trust, not features | KVKK applies to ORYN's own user base | A public "how the counselor works / what it won't do" page | P1 |
| 6 | Precise, specific metrics in marketing copy (§9) | Vague numbers read as unverified | Tension with Phase 16's anti-precision rule — resolve by scope | Be exactly precise about measurable things only | P1 |
| 7 | Institutional dashboard shown as public sales artifact (For Schools page) | Selling to institutions needs proof, not promises | Relevant only if/when ORYN pursues school/counselor partnerships (Phase 55) | A "for counselors" pitch page with cohort-level (not individual) metrics, if that lane opens | P2 |
| 8 | Live AI demo embedded pre-signup on the homepage | Shows the product working before asking for signup | ORYN's onboarding already leads with value; this is a marketing-site idea, not in-app | Consider a logged-out, non-personalized "see the counselor reason about a sample profile" demo | P2 |
| 9 | Dismissible geo-locale modal, defaults to staying | Respects user choice on locale redirects | Minor UX polish | Low priority, note only | P3 |
| 10 | Play-Store data-safety disclosure contradicts trust marketing (§7) | — (this is a weakness, not a pattern to copy) | Cautionary: keep ORYN's actual technical posture matched to what its trust copy claims | Audit ORYN's own store-listing data-safety disclosures against its privacy copy before any public launch | P1 |
| 11 | "AI-Resistant Assignment" generator — an AI company shipping anti-AI-misuse tooling | Self-aware credibility move | ORYN worries about profile padding, not academic dishonesty, but the *shape* transfers | Coach students toward evidence-strong activity types over easily-padded ones, reusing the existing evidence ladder | P2 |
| 12 | Digital Twin / Juke Box novelty engagement | Playful engagement for K-12 | Wrong tone for 14-18 admissions planning | **Do not copy** — conflicts with Phase 13's explicit anti-gamification stance | DO NOT COPY |

---

## 11. Top 10 Madlen-inspired product principles worth considering for ORYN

1. Explain a gap as a causal chain, not a static score (§6.1).
2. Give every AI-touched write path the same visible "drafts, you decide" treatment (§6.2).
3. Fixed-shape weekly digest: metrics → one paragraph → one action (§6.3).
4. Personalized example prompts to solve AI cold-start (§6.4).
5. A standing, plain-language trust page for what the AI will and won't do (§6.5).
6. Precision in copy only where the underlying number is real and measurable (§9).
7. Name the specific fear (not the abstract concern) when building trust copy — Madlen's
   "fatigue risk" framing works because it's concrete, not because it says "trustworthy."
8. Content that removes an adoption blocker (regulatory/parental anxiety) is product work,
   not marketing overhead, in a minor-facing AI category.
9. Show real worked examples (the photosynthesis question set, the Leo Carter chain) rather
   than describing capability abstractly — proof over claims.
10. Keep the top-level nav small and role-specific (About/product/institutional/content) —
    consistent with ORYN's own Phase 42 "keep top-level navigation small" rule; a validation,
    not a new idea.

## 12. Top 10 things Madlen does that ORYN should NOT copy

1. Playful novelty mechanics (Digital Twin roleplay, song generator) — wrong tone for a
   14–18 admissions-planning product; conflicts with ORYN's own anti-gamification stance.
2. No visible public pricing — reasonable for Madlen's sales-assisted institutional model,
   wrong for a product that also needs individual-student self-serve trust and clarity.
3. Heavy reliance on unverified, self-reported trust metrics without visible methodology
   (300,000+ hours saved — measured how?) — ORYN's provenance discipline should stay
   stricter than this even in its own marketing.
4. A student app with essentially no public review base — don't treat low-volume app-store
   presence as validated product-market fit if ORYN ends up in the same B2B2C distribution
   shape.
5. Bundling 40+ tools under one open-ended assistant with no apparent prioritization of
   which tool matters most right now — ORYN's "3 highest-impact actions" cap (Phase 7) is
   already a better answer to choice overload than Madlen's full tool catalogue.
6. No visible mechanism for what happens when the AI is *wrong* in a way a human would have
   caught (§7) — ORYN needs a real answer here, not silence.
7. Data-safety disclosure that doesn't obviously match the trust narrative (§7) — a specific
   trap to avoid, not a pattern to avoid in general.
8. Geo-redirect-style locale prompts on every fresh visit — minor friction, easy to just not
   add.
9. Positioning almost entirely around adult stakeholders (teachers, schools) with the
   student experience evidenced far more thinly — ORYN's differentiation is the student
   *is* the primary user; don't let institutional messaging crowd that out if a
   school/counselor channel opens later.
10. Expanding geography (UK, MENA, HQ move) without any public evidence of the deeper
    counseling-loop capability ORYN is building — a caution against mistaking fast
    international expansion for product depth.

## 13. Top 5 ideas that could materially change ORYN's product quality

1. Gap-formation chains behind every "biggest gap" claim (§6.1 / table #1).
2. One consistent, named "counselor drafts, you decide" UI pattern everywhere AI writes to
   the profile (§6.2 / table #2).
3. A fixed weekly-digest template — metrics, one paragraph, one action — implemented now
   while the Weekly Review engine (Phase 9) is still being built, not retrofitted later
   (§6.3 / table #3).
4. Profile-personalized cold-start prompts for the Counselor chat (§6.4 / table #4).
5. A public, plain-language "how the counselor works" trust page, written before ORYN needs
   it defensively (§6.5 / table #5).

## 14. Top 3 ORYN differentiators clarified by studying Madlen

1. **The closed loop.** Madlen has excellent individual components but no publicly visible
   mechanism connecting this week's AI output back into a structurally updated student
   model that changes next week's diagnosis. ORYN's entire architecture is built around
   exactly that loop (§9) — the gap between "AI gives good advice" and "AI remembers what
   happened and adjusts" is real and ORYN is positioned to own it.
2. **Provenance as a first-class, per-fact property**, not a company-level trust claim.
   Madlen asserts trustworthiness in aggregate (compliance content, sovereign
   infrastructure PR); ORYN's `source_url`/`retrieved_at`/`confidence` model makes every
   individual fact independently checkable. That's a stronger trust architecture than
   anything observed on Madlen's public surface.
3. **Opportunity cost as an explicit product stance.** Nothing in Madlen's public materials
   suggests it ever tells a teacher or student "don't do this." ORYN's Phase 39 ("Avoid for
   now" recommendations) is a genuine point of difference from a category where more
   AI-generated content/activity is implicitly always framed as good.

---

## 15. Open questions / what authenticated access would add

If your Chrome session connects and the access-scope question is resolved, the highest-value
additions would be: actual onboarding friction (time-to-first-value, the single most
under-evidenced thing in this audit), real in-product AI chat behavior versus the marketing
demo, and the actual (not mocked) school-admin dashboard information hierarchy. All three
should stay within normal product-user-tier usage; admin screens should keep the
"skip and document" default already agreed rather than being pushed on.

---

## 16. Sources

- [madlen.io](https://madlen.io) — Home, About, For Teachers, For Schools, Digital Library (OBSERVED, 2026-08-25)
- [play.google.com — Madlen School](https://play.google.com/store/apps/details?id=com.madlen.madlenexam) (OBSERVED, 2026-08-25)
- [Webrazzi, 2026-05-12](https://webrazzi.com/2026/05/12/egitim-teknolojileri-alaninda-ogretmen-ve-ogrenci-etkilesimini-dijitallestiren-platform-madlen/) — funding, team, traction (PUBLIC SOURCE)
- [madlen.io/en/blog/yzf-investment](https://madlen.io/en/blog/yzf-investment) — YZF $100K angel round announcement (PUBLIC SOURCE, company-published)
- Brighteye Ventures Founder Studio program materials (PUBLIC SOURCE, via web search)
- Crunchbase/PitchBook/Tracxn/Dealroom summary listings for "Madlen" (PUBLIC SOURCE, aggregator data, not independently verified against a primary filing)
