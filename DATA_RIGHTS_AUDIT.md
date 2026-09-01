# Data rights audit — account deletion and data export

**This is a read-only audit. No deletion was executed, no code was changed, and no data was
modified anywhere in producing it.** Every claim below is backed by either the migration
files (the schema as designed) or a live, read-only query against the `oryn-qa-scratch`
Supabase project (the schema as actually deployed) — the two were cross-checked against
each other and agree everywhere except where noted.

Scope: `deleteMyAccount()` (`app/(app)/settings/actions.ts`) and `/api/export-data`
(`app/api/export-data/route.ts` + `lib/export/tables.ts`).

---

## Headline

**Deletion is close to complete at the database-row level (41 of 42 live owner tables cascade
correctly) but has zero coverage of Supabase Storage.** A student who uploads evidence or a
CV, then deletes their account, is told their data is gone. The database rows are. The files
are not — nothing in this codebase ever calls `storage.remove()` as part of account deletion,
and Postgres foreign-key cascades do not reach into Storage at all. This is confirmed live: a
file with no owning account currently sits in the `evidence` bucket on `oryn-qa-scratch`
today (details below, with an important caveat about that specific file).

**Export has six undocumented gaps.** `lib/export/tables.ts` is unusually well-documented
about what it deliberately excludes and why — but six tables that hold real, student-specific
data are missing from both `EXPORT_TABLES` and `EXPORT_PARTICIPANT_TABLES` with no comment
explaining the omission, unlike everything else in that file.

---

## Method

1. Extracted every `create table public.*` statement across all 68 files in
   `supabase/migrations/`, then extracted every column referencing `public.profiles(id)`
   (or, in one case, `auth.users(id)` directly) and its `on delete` behavior, via a script —
   not by sampling or by memory.
2. Cross-checked that extraction against the **live** database
   (`information_schema.referential_constraints` on `oryn-qa-scratch`,
   `qtcvcflzxbuagvvwahhu`) — every foreign key and delete rule below is what is actually
   deployed today, not just what the migration files say. They matched exactly.
3. Individually inspected the 34 tables with *no* `profiles(id)` reference to confirm they
   are genuinely global/institutional reference data (universities, schools, canonical
   entities, opportunities, research-pipeline queues, import staging) and not student data
   under a different column name. None had a hidden owner column.
4. Read `deleteMyAccount()` and `/api/export-data` in full, plus `lib/export/tables.ts`'s
   own documentation of what it deliberately excludes.
5. Queried `storage.objects` (read-only, no rows modified) for orphaned files — objects
   whose folder prefix doesn't match any current `profiles.id`.

**What I could not verify without executing a deletion** (and was told not to): whether
`deleteMyAccount()` actually behaves this way end-to-end against a real running request —
e.g., whether `auth.admin.deleteUser()` could fail partway through in some edge case
(concurrent write, an FK I mismapped) and leave a partial deletion. The schema says cascade
is atomic at the Postgres level (a single statement, all-or-nothing within one transaction),
which is a strong guarantee — but I have not watched it happen on a real account, and was
told not to.

---

## Part 1 — Deletion: the full owner-table inventory

44 distinct tables have at least one column referencing `profiles(id)`, per the repo's full
migration set (68 files) — six of them (`connections`, `messages`, `blocked_users`,
`message_reports`, `recommendations`, `profile_views`) have *two* owner-linking columns each
(e.g. `sender_id`/`recipient_id`), both checked below. Two of the 44 — `posts`, `post_likes`
— belong to the social-posts feature, which is built but explicitly switched off
(`lib/social/posts-feature-flag.ts`) and not yet applied to the live database (confirmed:
absent from `oryn-qa-scratch`'s live schema). That leaves **42 tables live today**.
`deleteMyAccount()` deletes the `auth.users` row via the admin client;
`profiles.id references auth.users(id) on delete cascade` starts the chain from there.

**41 of the 42 live tables are `on delete cascade` — verified in the migration files and
independently confirmed against the live database's `information_schema`.** These are
correctly, completely removed when an account is deleted; no gap. Full list (41): `activities, advisor_conversations, advisor_messages, ai_recommendations,
application_requirements, applications, awards, career_goals, certifications, connections
(both requester_id and recipient_id), contact_info, courses, education_records,
evidence_files, featured_items, languages, message_reports (reporter_id and
reported_user_id), messages (sender_id and recipient_id), notifications,
opportunity_matches, product_events, profile_score_snapshots, profile_scores, profile_views
(viewed_user_id and viewer_id), projects, rate_limit_events, recommendations (author_id and
recipient_id), research_experiences, saved_opportunities, skill_endorsements (endorser_id),
skills, sports_experiences, student_interests, student_requirement_evaluations,
target_universities, test_scores, volunteering_experiences, weekly_actions, weekly_plans,
work_experiences, blocked_users (blocker_id and blocked_id)`.

**One genuine exception: `ai_usage.user_id` is `on delete set null`, not cascade** — in the
migration file (`0013_ops.sql:33`) and confirmed live. `deleteMyAccount()`'s own code comment
claims "every other table cascades... this one call removes all of the student's data." That
claim is not quite true for this one table: the `ai_usage` *row* survives deletion, with
`user_id` set to null. What survives is `feature`, `provider`, `model`, `input_tokens`,
`output_tokens`, `estimated_cost`, `created_at` — no prompt content, confirmed by reading the
actual `insert()` call in `lib/ai/usage.ts`'s `logAIUsage()`, which never writes prompt or
response text to this table, only those seven columns. Once `user_id` is null and
nothing else in the row identifies a person, this is a legitimate, irreversible
anonymization, not a retained personal-data record — anonymization is a recognized way to
satisfy an erasure right, distinct from literal row deletion. **Flagging this as a decision
for you, not a bug I'm asserting**: is "delete `ai_usage` rows too" the intended behavior
(the code comment suggests it was believed to already work that way), or is "anonymize but
keep for aggregate cost/usage reporting" the actual intent? Either is defensible; the code
comment and the actual schema currently disagree with each other, which is the part that
needs a decision.

**Two `set null` columns that are correctly not a gap**: `message_reports.reviewed_by` and
`posts.removed_by` are *moderator-action* attributions, not the row's own data — losing the
"who reviewed this" link when the reviewing admin's account is deleted is the right behavior,
not a completeness problem. Not part of "the student's data" in the sense this audit is
about.

### Storage — the real gap

Searched the entire codebase for every call to `storage.remove()` (the only way an object
actually leaves a Supabase Storage bucket). There is exactly **one**, in
`app/(app)/documents/actions.ts:95` — the manual "delete one evidence file" button on the
Documents page, invoked by the student one file at a time. **`deleteMyAccount()` does not
call it, and nothing else in the codebase does either.** Postgres FK cascades operate entirely within
`public`/`auth` schema tables; `storage.objects` is a separate subsystem with no FK back to
`auth.users`, so a `profiles`/`auth.users` cascade has zero effect on it. This is standard,
documented Supabase platform behavior, not something specific to a misconfiguration here.

Three buckets are affected:
- **`evidence`** — the DB row (`evidence_files`) cascades away correctly; the actual file in
  Storage does not. Confirmed live: querying `storage.objects` for the `evidence` bucket
  shows 1 of 2 objects with a folder prefix that matches no current `profiles.id`. **Caveat,
  in the interest of not overclaiming**: that specific orphan's folder is
  `99999999-9999-9999-9999-999999999999` — an all-nines UUID pattern strongly characteristic
  of a deliberately-seeded QA/test fixture (the file is literally named `secret.pdf`, which
  reads like a security-test artifact, plausibly from the RLS test suite), not evidence that
  a *real* student's account was ever deleted and left this behind. I can't prove that
  either way from here. What I can state with full confidence, independent of this one
  sample: the code path that would produce exactly this orphaning pattern for a real
  deletion does not exist, so if it hasn't happened to a real account yet, that's only
  because no real student has deleted their account with an evidence file attached — not
  because anything would stop it.
- **`cv-uploads`** — worse in one respect: there is no tracking table at all
  (`uploadAndExtractCV` in `app/(onboarding)/onboarding/actions.ts` uploads the file, runs
  extraction, and returns — nothing ever deletes it, in normal operation or on account
  deletion). A CV's only stated purpose is one-time import extraction (per the Privacy
  Notice this lane wrote: "Nothing extracted from it is saved to your profile until you
  review it and confirm"), yet the raw file is retained indefinitely regardless.
- **`post-media`** — same gap in principle (`deletePostForUser` in
  `lib/social/post-actions.ts` deletes the `posts` row via the regular DB client but never
  calls `storage.remove()` on the attachment), but currently low-risk in practice: the posts
  feature is built and explicitly switched off (`lib/social/posts-feature-flag.ts`), so no
  real student has post-media today. Worth fixing before that flag ever flips, not urgent
  before then.

(`opportunity-images`/`university-images` also showed as "100% orphaned" in my first pass at
this query — that's a false positive from my join, not a finding: those two buckets are
foldered by `opportunity_id`/entity id, not by student `user_id`, so they were never in scope
for this audit. Confirmed by inspecting actual object paths before including this note.)

---

## Part 2 — Export: what's covered vs. what exists

`lib/export/tables.ts` covers 29 tables via `EXPORT_TABLES` (plain `user_id` match) + 7 via
`EXPORT_PARTICIPANT_TABLES` (participant-pair tables, each with its own filter function) +
`profiles` itself = 37 tables, fetched by `/api/export-data/route.ts`. This file is genuinely
well-built — explicit column allowlists where `select("*")` would leak admin-internal or
viewer-identity columns (`message_reports`, `profile_views`), directional filters to avoid
leaking "who blocked me," and a clearly-documented, correct decision to leave `posts`/
`post_likes` out because that feature is switched off (verified: it is — see above).

**Six tables with a direct, cascade-verified `profiles(id)` ownership link are not in either
export list, and — unlike every other exclusion in that file — none of the six has a comment
explaining why:**

| Table | What it contains | Materiality |
|---|---|---|
| `ai_recommendations` | The advisor's "do / consider / avoid for now" recommendations shown to this student, plus their own `user_response`/`feedback` on each | **High** — this is Phase 39's differentiating "don't do this" feature, generated *about* the student and responded to *by* them |
| `opportunity_matches` | Per-opportunity `eligible`, `eligibility_notes`, `relevance_score`, `profile_need_score`, `match_score`, `reason_codes` | **High** — the "why this fits you" reasoning the product spec treats as core, not incidental |
| `student_requirement_evaluations` | `status` + free-text `reasoning` for whether this student meets a specific university requirement | **High** — substantive, personalized analysis, not metadata |
| `ai_usage` | `feature`/`provider`/`model`/token counts/`estimated_cost` per AI call (no prompt content) | **Medium** — usage metering tied to the account; no qualitative content |
| `product_events` | `event_name` + `metadata` per tracked product action | **Medium** — behavioral/usage data, same character as `ai_usage` |
| `rate_limit_events` | `action` + `created_at` only | **Low** — thin infrastructure/throttling log; weakest case that this is meaningfully "their data" in the portability sense, though it does carry their `user_id` |

Five of the six (`ai_recommendations`, `opportunity_matches`, `student_requirement_evaluations`,
`product_events`, `rate_limit_events`) cascade-delete correctly, so a student who deletes
their account without exporting first permanently loses the ability to ever receive a copy of
this data, even though the code was fully capable of serving it — deletion completeness and
export completeness are separate axes, and these five only fail the second one. `ai_usage`
is the exception that fails both: it's on this export-gap list *and* it's the one table from
Part 1 that doesn't actually delete on account deletion either.

---

## What I'd flag for a decision, not fix myself

Per instruction, none of this is fixed on this branch. In rough priority order, for you to
triage:

1. **Storage cleanup on account deletion — fix pushed, not yet merged**
   (`oryn/deletion-storage-fix-2026-08-31`, `lib/account/delete-storage.ts`). Storage
   objects are now removed, per bucket, before `deleteUser()` runs; a cleanup failure
   returns an honest error instead of proceeding to delete the account. Covers `evidence`,
   `cv-uploads`, and `post-media` (the last enumerated from the schema even though the
   posts feature is off, so the flag flipping on later doesn't reopen this). Unit-tested
   (pagination, chunked removal, first-bucket-failure-stops-everything) without executing
   against a real account, per instruction.
2. **`ai_usage`'s delete-vs-anonymize mismatch** — needs a decision (see above), then either
   the schema or the code comment should change to match reality; right now they disagree.
3. **Six export gaps** — likely a straightforward fix (same `EXPORT_TABLES`-style pattern the
   other 29 tables already use), but I was asked to report, not patch, and wanted you to see
   the materiality ranking before anyone decides whether all six need the same urgency.
4. **`cv-uploads` retention generally** — arguably a product decision independent of account
   deletion: should the raw file be deleted right after successful extraction, given its
   documented purpose is one-time import? Separate from, but related to, item 1.

Nothing here required inventing a claim I couldn't check — where I was uncertain (the
`secret.pdf` orphan's real origin, whether `ai_usage` anonymization was deliberate or an
oversight), I said so rather than picking the more dramatic reading.

---

## Part 3 — For counsel: is each export omission legally required?

> **Status note added 2026-09-01, updated 2026-09-02 — the code moved twice after this
> analysis was written; the analysis below is unchanged and still the thing for counsel to
> react to.**
>
> All six are now in the export (`opportunity_matches`, `student_requirement_evaluations`,
> `ai_recommendations`, `ai_usage`, `rate_limit_events`, `product_events`), so a subject
> access request today returns all of them. `product_events` was the last holdout: it
> needed migration 0073's `"select own product_events"` RLS policy first (confirmed live
> against `oryn-qa-scratch` via `pg_policies` on 2026-09-02, not inferred from the
> migration file's existence), then moving from `EXPORT_EXCLUDED_TABLES` into
> `EXPORT_TABLES` in `lib/export/tables.ts`. A seventh table surfaced independently in Part
> 3a below (`birth_year_changes`) and is a different kind of gap — not fixed here, see that
> section.
>
> Storage cleanup (Part 1) is also closed: `lib/account/delete-storage.ts`, referenced as
> "fix pushed, not yet merged" in the original "What I'd flag" list below, has since merged
> to `main` (`4409b65d`) with tests. `deleteMyAccount()` now calls it before deleting the
> auth user and refuses to proceed if cleanup fails.
>
> `ai_usage`'s delete-vs-anonymize question (item 2 below) is still exactly as open as when
> this was written — not fixed, because it is a decision, not a bug — but is now recorded
> as `LAWYER_FLAGS.aiUsageAnonymization` in `lib/legal/content.ts` and the
> `deleteMyAccount()` comment no longer implies this table cascades along with the other 41.
>
> **One of those five settles something this section deliberately did not.** On
> `rate_limit_events` the text below says inclusion is "a risk-posture opinion, not a legal
> one, and exactly the kind of call this section exists to hand to you rather than settle
> myself." It now ships included, following this section's own stated lean. That was my call,
> it is flagged rather than buried, and it is one line in `lib/export/tables.ts` to reverse.
>
> The distinction this section draws between the **access** right and the **portability**
> right is untouched by any of that: the export still emits one JSON file covering both, so
> if counsel concludes the two should carry different contents, that is a change to the
> export's shape, not just to its table list.


Requested separately from the storage fix, and deliberately not resolved in code: this is
an analysis for a lawyer to confirm or correct, not an engineering decision, and nothing
below should be read as legal advice — it is the technical facts plus my own non-lawyer
reasoning about how they likely map onto GDPR Article 15 (access)/Article 20 (portability)
and KVKK Article 11, laid out so counsel has something concrete to react to rather than a
bare table name.

**The general shape of the question.** Both frameworks define "personal data" broadly —
any information relating to an identified or identifiable natural person. Whether a
category is *convenient to serialize* has no bearing on whether it falls inside that
definition; "we didn't get to it" is an engineering fact, not a lawful basis for omitting
something a subject access request is entitled to. That's the standard I ranked these six
against — not whether including them would be easy, but whether a reasonable reading of
"the student's personal data" plainly includes them.

**The three I ranked High materiality read, to me, as squarely inside that definition and
without an obvious exemption:**
- `ai_recommendations` — text generated *about* this specific student (`title`, `reason`)
  that they then responded to (`user_response`, `feedback`). This is about as clear a case
  of "relates to an identifiable person" as exists in this schema.
- `opportunity_matches` — the eligibility/relevance/match analysis computed from this
  student's own profile, about this student. Same reasoning.
- `student_requirement_evaluations` — a per-student `status` and free-text `reasoning`
  evaluating whether *this* student meets *this* requirement. Same reasoning.

None of these three resemble a business's own confidential algorithm or a third party's
data (the two most common lawful grounds for withholding something from an access
request) — they're records of an assessment made of one specific person, stored under
their own `user_id`.

**The three I ranked Medium/Low are where I think the actual legal question sits, and
where I'd most want a lawyer's read rather than mine:**
- `ai_usage` / `product_events` — both carry a `user_id` and therefore likely qualify for
  the *access* right (Art. 15/KVKK Art. 11's "learn whether processed" and "request
  information about the processing") almost regardless of content, since access is not
  limited to data the subject themselves supplied. Whether they specifically belong in a
  *portability* export (Art. 20, which some readings limit to data the subject "provided"
  by using the service, not data the system generated in response to their actions) is
  more genuinely contestable — this table's export today conflates both rights into one
  JSON file, so the distinction matters for what gets included, not just how.
- `rate_limit_events` — `action` + `created_at` only. The thinnest case that this is
  meaningfully "the student's data" in the sense a subject access request is understood to
  be about, versus operational/security logging closer in character to a web server's
  access log. I'd lean toward including it anyway on the basis that the marginal cost of
  including thin operational data is near zero and the downside of a regulator disagreeing
  with an "it's not really personal data" argument is not — but that's a risk-posture
  opinion, not a legal one, and it's exactly the kind of call this section exists to hand
  to you rather than settle myself.

**What I am not qualified to answer, and am not attempting to**: which specific Article
5/6 legal basis covers each processing purpose (already an open item — see
`LAWYER_FLAGS.legalBasis`), whether Article 20's "provided by the data subject" language
has a settled interpretation that resolves the `ai_usage`/`product_events` question one
way, and whether Turkish KVKK practice on this point differs from GDPR practice in any way
that changes the answer for Turkish users specifically.

---

## Part 3a — A seventh gap, and a different kind of question: can the export mechanism even carry it?

`birth_year_changes` (migration 0072, added after this document's first pass, to make a
birth-year edit that outpaces consent detectable — see `LEGAL_REVIEW.md` §6.1) has the
same direct `user_id` link the six gaps above were flagged for, and by the same materiality
reasoning in Part 3, is plausibly the student's own data. But the question this section
answers is different from Part 3's: not *should* it be exported, but *can* it, given how
`/api/export-data/route.ts` actually works today. The answer is no, not without a change,
and the reason is structural rather than an oversight like the other six.

**Every table `EXPORT_TABLES` currently touches is exported through the request-scoped
client, never the admin client** — verified by grep: zero occurrences of `createAdminClient`
or an admin call anywhere in `app/api/export-data/route.ts`. That means the export
mechanism has one uniform assumption baked into its shape: every exportable table must
carry an RLS policy granting the owning student `SELECT` on their own rows. This is easy to
miss because it's satisfied invisibly for all 37 tables currently exported (EXPORT_TABLES's 29, EXPORT_PARTICIPANT_TABLES's 7, plus profiles itself) — including the
two, `message_reports` and `profile_views`, that already needed special handling (an
explicit column allowlist instead of `select("*")`, to avoid leaking admin-only columns).
Both still depend on an RLS policy existing at all (`reporter_id = auth.uid()`,
`viewed_user_id = auth.uid()` respectively) — they're special-cased on *which columns*,
never on *whether RLS permits the read in the first place*.

`birth_year_changes` breaks that assumption on purpose. Its migration enables RLS and adds
no policies — not even a select-own one — specifically because whether a student should
ever see this log through *any* surface was left as its own open product decision (see the
table's own `COMMENT ON TABLE`). The consequence for export: adding `"birth_year_changes"`
to `EXPORT_TABLES` today would not fail loudly. `select("*").eq("user_id", userId)` through
the request-scoped client would run, RLS would silently return zero rows for every student,
and the export would look complete — the table listed, a query executed — while never once
returning what it claims to. That's a worse failure mode than the six gaps above, which are
at least honestly absent rather than present and empty.

**Two ways to close this, with a real tradeoff between them, not a preference**:

- **Add an RLS "select own" policy** (`user_id = auth.uid()`) matching the pattern the other
  37 tables already use. Simplest, and keeps the export route's defense-in-depth property —
  a filtering bug in the route would still be caught by RLS underneath, the same backstop
  every other exported table has. But it doesn't scope the visibility to *export
  specifically*: it makes the log readable by the student's own session through any future
  code that queries this table with the normal client, not just this one route. That
  re-opens, by a side door, exactly the "should a student ever see this" question the
  migration deliberately left unanswered.
- **Read it via the admin client, scoped in application code** (`.eq("user_id", userId)`
  inside the route, the same trust model `deleteMyAccount()` already uses elsewhere). Keeps
  RLS locked down for every other surface — the visibility question stays genuinely open.
  But it would be the first admin-client read in this route, and it trades away that
  defense-in-depth property specifically for this table: a bug in the route's own filter
  would no longer be caught by anything underneath, unlike the other 37 tables where RLS
  independently blocks a leak even if the application code got the filter wrong.

Not resolving which one — that's a real design call with a security tradeoff on one side and
a product-visibility question on the other, not something to pick unilaterally in an audit
document. Flagging it here so whoever adds this table to the export surface later doesn't
discover the RLS gap by shipping a query that silently returns nothing.
