# ORYN — Day report, 2026-08-22

Written by ORYN-CEO for the founder. Everything here was measured, not relayed; where a claim
is someone else's measurement rather than mine, it says so.

---

## The short version

**Today's work had one theme, and it wasn't planned:** almost every defect found and fixed was
the same shape — **the product asserting something its own data could not support.** Not crashes,
not missing features. Confident-sounding claims with nothing behind them.

That matters because it's the exact failure `AGENTS.md`'s non-negotiables were written to
prevent, and because a student can't tell the difference between a fact Oryn knows and a fact
Oryn is guessing. Six instances were closed today. One of them was telling Turkish students the
opposite of what its own official source said.

**~30 PRs merged. `main` is healthy** — independently verified at `297c220` in a clean
checkout: lint clean, typecheck clean, 124 files / 1,888 tests, production build succeeds. The
app was also run against the live database and walked by hand; the dashboard and opportunities
surfaces render correctly.

---

## The trust defects closed

**1. Türkiye Scholarships told students it was open to them when its own source says otherwise.**
The row read "Open to citizens of all countries." The official `turkiyeburslari.gov.tr` page
separately lists *Turkish citizens and individuals who have lost Turkish citizenship* as
**ineligible**. For a product whose core audience is Turkish students, the live row said the
opposite of its source. Found by research, verified independently against the official page,
fixed and confirmed live.

**2. Unresearched opportunities were shown as unrestricted.** An empty `eligible_countries`
meant "no country restriction" in both the matching layer and the counselor — so a genuinely
restricted programme nobody had researched appeared eligible to everyone, silently. 351 of 391
rows are in that state. They now carry an honest *"Country eligibility not verified yet — check
the official page for restrictions"* instead. **Visible consequence you should expect:** most
opportunity cards now show "Eligibility unknown". The product looks less confident than it did
this morning. That is the correct appearance — it was falsely confident before.

**3. Closed-cycle opportunities could appear in "Due soon" and fire a deadline reminder.** The
dashboard's own opportunity block already suppressed them; the deadline block never called the
same guard. A student could be told to act on something that isn't actionable.

**4. The admission outlook told students with no essays that essays were an unknown.** For a
YKS-style placement system the engine correctly computed a sourced explanation — and the page
threw it away and rendered a US-holistic strengths/gaps panel listing "Essays" and
"Recommendations" as unknowns, directly beneath a badge reading "Not a profile-review system".
The root cause was a hardcoded US-holistic list applied to every target on earth.

**5. 2,097 well-sourced programme records were wrongly blocked** by an evidence gate that
matched attestation *wording* rather than judging evidence. Replaced with a structured
`retrieval_method`. **1,657 Canadian programme records ingested and verified** as a direct
result — `university_programs` went 14,457 → 16,119. Genuinely weak evidence (McGill's archive
captures) stays correctly blocked; nothing was widened to make numbers look better.

**6. Four Yale deadlines rendered as four identical rows.** The data was perfectly
differentiated — four dates, four cycle labels. The UI was rendering the one field that was
identical across all four. Two of those rows differ by *US Citizens 1 November* versus
**International Citizens 1 December** — a month's difference on a financial-aid deadline, for
exactly our audience.

Also fixed: three places where a failed save showed the student nothing at all, and one where an
optimistic checkbox reported success that never happened.

---

## A security hole, and a second one caught before it shipped

A live RLS verification — newly possible because this environment now has real database access,
which the audit that recommended it did not — found:

**Live, in the database now:** the `public_profiles` view returns data to **anonymous,
unauthenticated callers** for any profile marked public. Migration 0023 granted it to
`authenticated` and its own comment says that was deliberately conservative. That grant was
already redundant: Supabase grants `anon` access to everything in the schema by default, and RLS
is the real gate — except this view's `is_public` branch never checks who's asking. Measured
exposure: **7 profiles, 1 currently public**, safe-column fields only, private fields verified
still protected. Small today, and a launch blocker: it's a 14–18-year-old's details readable by
anyone on the internet, for a profile the product says is visible to other Oryn students.

**Caught before shipping:** the unapplied `0058_social_posts.sql` had the identical defect and
worse — **full post content**, not a field whitelist. Its own comment cited `public_profiles` as
precedent for "no anonymous tier, ever", inheriting the wrong belief in writing. Fixed in place.

An exhaustive sweep followed: all ~90 live RLS policies read individually, branch by branch —
**clean**. Every table has RLS enabled, no exceptions. Only two views exist and the second is
structurally safe. So this is one specific hole and one near-miss, not a systemic failure.

**Migration `0061` fixes the live hole. It is written and NOT applied — it needs you.**

---

## Numbers

| | 08-20 | this morning | now |
|---|---:|---:|---:|
| `university_programs` | 418 | 14,457 | **16,119** |
| `university_requirements` | 84 | 1,254 | 1,254 |
| `opportunities` missing `eligible_countries` | — | 366 | **351** |
| `opportunities` with a deadline | — | 56 | 56 |
| Test suite | 1,824 | 1,861 | **1,888** |

The deadline number hasn't moved yet: 74 verified deadline records plus more are in the
verification pipeline, not yet ingested. That's the honest state, not a rounding.

---

## What needs you

Full detail in `docs/founder-blocked-backlog.md`. In priority order:

1. **Item 34 — open one ingester session.** Six of thirteen sessions ended without warning this
   afternoon, including **both** database-writing lanes. Verified, bounded, revertible work is
   now stranded with nothing able to apply it, and one new session clears most of it in under
   an hour. **The piece with a clock: Habitat Derneği's application deadline, 26 August — four
   days out.** It needs its PR merged *and* the record applied to reach a student; merging alone
   isn't enough. Nothing else on this list expires.
2. **Item 30 — the anonymous-read hole.** Approve applying migration `0061`. Launch blocker.
3. **Item 29 — migration 0060** (honest eligibility marker), and **item 26 — migration 0057**
   (YÖK Atlas identifier). Both written, reviewed, unapplied, waiting on you.
4. **Item 27 — ~79 opportunity rows** whose descriptions are degraded *in your own Drive source
   spreadsheet*. 31% of the live browse surface carries a defect signature; the categorically
   broken ones are already retired. Re-research, retire, or accept.
5. **Item 35 — the schema forces one value where reality has several.** Four lanes hit this
   independently today in four different columns, without coordinating: an opportunity can be
   `closed` *and* awaiting an unannounced next cycle at once (true for 11 of 18 rows examined);
   a programme lists 2–4 awards and the field holds one; Girl Up has per-region deadlines and
   one deadline field. Every stored value is factually correct — the misleading part is the
   field's implied claim to be complete. Deciding the principle once settles all four. Item 32
   (`degree_type` specifically) is the sharpest instance if you want a concrete entry point.
6. **Items 31, 33, 28** — an unbuilt apply path blocking 1,429 verified URL corrections; ten
   backup tables to drop or relocate; five opportunities no permitted fetch path can reach.
6. **UI.** `docs/ui-audit-2026-08-22.md` is the agenda for the conversation you deferred:
   six safe fixes, findings that need your taste, and costed proposals in three tiers. Theme
   (light vs dark) is still formally open — nobody resolved it in your absence.

**Not needed any more:** the Supabase secret key was never broken — the failure was transient
server-side and it's been working all day. Two QA accounts exist and work.

---

## Honest notes

**Six of thirteen sessions died mid-afternoon** — FEAT-1, UI-1, BUG-1, RES-R2, RES-I1 and
RES-I2, within about an hour, with no warning and no pattern I could find. FEAT-1 left an open PR nobody could rebase;
I carried it. RES-I1 left a design for a write path that was never built, which is why 1,429
verified corrections sit unapplied. Standing practice changed: closure is *not* reversible, so
every lane now pushes everything and leaves a resumable handoff before standing down.

**I made three mistakes worth recording.** I let my own doc commits land on a diverged branch
where nobody could see them, and told two lanes a file was on `main` when it wasn't — caught by
UI-1. I instructed one session to perform work another session had been denied permission for —
refused, correctly, by MERGE-1. And I reported a test failure that didn't exist, from a
verification worktree I'd reused instead of rebuilding — BUG-1 ran it three times, couldn't
reproduce it, and held its ground. All three are now written into the org's standing rules
against my name, because the rules are worth more than the record.

**The thing that actually worked** wasn't any individual lane's cleverness. Every real error
today — mine included — was caught by someone re-checking the primary artifact instead of
trusting the report. Three sessions independently propagated claims that were true when written
and stale when read. That is now rule 15, and it earned its place.
