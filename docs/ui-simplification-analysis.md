# UI simplification analysis — first pass

Compiled 2026-08-20 by the UI-simplification workstream (branch `oryn/ui-simplification-v1`,
worktree-isolated from Computer B's `oryn/counselor-data-quality-v1`). Method: cross-checked
`docs/current-product-capability-map.md` and `docs/design-system.md` against live rendering
via `/design-preview` (the only route tree that renders without a live Supabase session in
this sandbox) and direct code reading for everything else. Per the founder's brief, this is
the "what should the student actually see" research pass that comes before any page rewrite
— not a redesign. One small, low-risk fix was implemented alongside it (§1); everything else
here is analysis and a proposal, not yet applied.

**Visual verification scope, stated plainly**: confirmed live (desktop + 375px mobile) —
landing page, dashboard, university world-map/region-grid explorer, acceptance-moment card.
Not renderable in this sandbox (no live Supabase session) — profile, opportunities,
universities detail, applications, advisor, connections. Those are assessed from code
structure only; treat findings there as "reasoned," not "seen," until a live-backend QA pass
confirms them.

---

## 1. Dashboard — already strong; one fix made

The dashboard (`features/dashboard/dashboard-view.tsx`) is the best-executed screen in the
product against the founder's own brief. Confirmed live: greeting → score+gap hero → max-3
weekly actions → "one thing not to do" → due-soon deadlines → university outlook (categorical
labels, never a percentage) → opportunities preview. This is close to a literal match for the
master spec's own worked example — no IA rework needed here.

**Found and fixed**: the opportunities preview rendered a bare `{matchScore}% match` (e.g.
"91% match") with no explanation — the one spot on the dashboard using unexplained numeric
precision, which the founder's brief explicitly asks to avoid for opportunity fit (prefer an
explained categorical label, the same pattern already used for university outlook on the same
page). The full `OpportunityCard` used everywhere else in the product already does this
correctly via a `tierFor()` helper (`80+` → "Exceptional match", `60+` → "Strong match", etc.,
rendered through `StatusBadge`) — the dashboard preview was the one place that bypassed it.

Fix: extracted `tierFor()` out of `opportunity-card.tsx` (a `"use client"` module) into
`lib/opportunities/match-tier.ts` — a small, genuine architecture correction, not just a
copy-paste, since a Server Component (`DashboardView`) can't call a function that lives inside
a Client Component module. Both `OpportunityCard` and `DashboardView` now import the same
single source of truth. Verified: typecheck/lint/tests clean (1051/1051), confirmed live —
"International Economics Challenge 2027" now reads "Exceptional match" instead of "91% match".

## 2. Profile — the real information-architecture question

This is the densest screen in the product and the one worth actually thinking hard about, not
the one to reflexively rebuild into tabs because a reference mockup had tabs.

**Current shape** (`app/(app)/profile/page.tsx`): one continuous server-rendered scroll —
Professional profile / Open to / Contact info, Featured, Profile Strength (completeness +
views), Score hero (radar + dimension bars), Peer comparison, then **13** repeated
`AchievementSection` blocks in sequence (Goals, Activities, Sports, Projects, Research, Awards,
Work, Volunteering, Education, Coursework, Test scores, Certifications, Skills). No tabs, no
grouping beyond section dividers.

**Why not just tab it (the founder's earlier reference used tabs — worth weighing against,
not copying):**

- Tabs *hide* content until clicked. That cuts against two decisions already on record for
  this product: "simplicity without capability loss" and "the frontend should hide complexity
  rather than delete intelligence." A first-time student trying to understand everything Oryn
  tracks benefits from being able to see the page's whole scope, even if they don't read every
  section today.
- The page isn't visually chaotic today — it already uses consistent primitives
  (`SectionHeader` dividers, uniform `AchievementSection` cards). The problem is length, not
  disorganization. Long-but-well-organized is a legitimate, lower-risk pattern (comparable
  profile-edit surfaces elsewhere in the industry are also long single scrolls with anchor
  navigation rather than hard tabs).
- A full tab rebuild touches exactly the files (`app/(app)/profile/page.tsx`,
  `features/profile/*`) that Computer B's own queued package list also touches next (student
  data contract, counselor dashboard contract). That's the highest-collision surface in the
  whole product right now for two lanes working the same repo.

**What the density actually calls for, concretely**: a sticky/lightweight jump-navigation
that groups the ~18 regions into a handful of labeled clusters — something like *About*
(professional identity, open-to, contact, featured), *Your standing* (profile strength, score,
peer comparison), *Academic record* (education, coursework, test scores), *Experience &
achievements* (activities, sports, projects, research, awards, work, volunteering,
certifications, skills), *Goals*. Purely additive — `id` anchors on existing sections plus one
new small nav component — no section removed, restructured, or hidden. This is genuine
progressive disclosure (jump to what you need) without the capability-loss risk tabs carry, and
it's a much smaller, more reviewable diff than a page rewrite.

**Not implemented yet** — this is a visible, structural change to the product's largest page,
and worth a quick founder nod (or redirect) before touching it, especially given Computer B is
actively working adjacent files. Flagging as the next candidate package.

**Two smaller, real gaps surfaced by the capability map worth folding into that same package**
(both are "what should the student see" issues, not data-model issues):
- `student_interests` has no edit surface after onboarding — a student can set interests once
  at signup and never again. Worth a small "Interests" block in the *About* cluster.
- Completeness now has two different meanings rendered in two different places (the
  counseling-scoped 10-item score just split out this session, vs. the still-broad Profile
  Strength checklist) — both correctly *named* differently already, but worth confirming a
  reader can actually tell them apart when they land on the page, not just in the code.

## 3. Opportunities — no separate issue found

The main `/opportunities` surface (For You, Browse, detail) already uses the correct
categorical `tierFor()` treatment via `OpportunityCard` — confirmed by reading the current
file, this was never broken, only the dashboard's compact preview was (§1). The
eligible/eligibility-unknown distinction was fixed by Computer B this session and is
architecturally sound (three real states, never collapsed). Nothing to change here right now.

## 4. Universities — no major issue found

Confirmed live: world map (desktop) + `RegionGridExplorer` pill fallback (mobile and
accessibility) both render cleanly, no horizontal overflow at 375px. Per the capability map,
the admission-outlook section is "the strongest-adherence area found in the whole audit"
(categorical label, wide range only when real data exists, mandatory strengths/gaps/unknowns
explanation). Not touching this.

## 5. What's already solved — don't redo it

Chat 2's pass already built the entire premium/light design system this brief keeps asking
for: OKLCH tokens, a deliberate two-font system (serif only where Oryn is "talking to" the
student), a real motion system with reduced-motion support baked in globally, and a full
primitive set (`StatusBadge`, `InsightCard`, `ActionCard`, `DeadlineBadge`,
`ConfidenceIndicator`, `SourceBadge`, `EmptyState`, `ErrorState`) that every screen already
composes from. This is not a rebuild-from-scratch situation. The open work is IA and a handful
of concrete correctness gaps, not visual language.

## Next step

Recommend: founder confirms (or redirects) the profile jump-navigation package in §2, since
it's the first visible structural change and the one area with real file-overlap risk with
Computer B. Everything else in this doc is either already fixed (§1) or a "no issue found"
verdict (§3, §4) — no blocking decision needed there.
