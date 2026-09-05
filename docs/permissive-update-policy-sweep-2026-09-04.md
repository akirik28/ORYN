# Permissive owner-scoped UPDATE policy sweep — 2026-09-04

CEO's ask, following directly from the `profiles.plan_tier` finding
([[project_oryn_guard_trigger_column_drift_sweep]] / migration 0121): the guard trigger only
exists because `profiles`' UPDATE policy trusts the row owner with every column on the row —
`using (id = auth.uid()) with check (id = auth.uid())`, no column restriction. The question this
sweep answers is which OTHER tables have that same permissive shape (an owner-scoped policy with
no column restriction) **combined with** a column no owner should be able to write directly
(system-computed, an entitlement/status flag, a timestamp the app itself maintains). Report, fix
nothing. Nothing in this sweep touched the live database — every table/column/policy/grant/
trigger fact below was pulled from a fresh local Postgres 17 instance with all 121 migrations
applied (0001–0119, 0121; 0120 no longer exists — see the memory entry above for why), using the
recipe from [[reference_psql_set_config_local_does_not_survive_psql_f]], improved further this
pass (see Method).

## Method, stated plainly — what this pass actually checked

1. **Read `0014_row_level_security.sql` in full** (CEO's named starting point) — its `owner_tables`
   loop grants `for all using (user_id = auth.uid()) with check (user_id = auth.uid())` to 25
   tables in one `foreach`. This is the widest permissive shape in the codebase: full CRUD, not
   just UPDATE, gated on nothing but ownership.
2. **Did not stop at that one migration.** `0014` is dated early in this repo's history; RLS
   policies for later tables were added in their own migrations as those tables were built.
   Queried `pg_policies` directly (local instance) for every `UPDATE`/`ALL` policy in `public`,
   regardless of which migration created it — 40 rows, on 33 distinct tables. This caught real
   candidates `0014`'s own loop never could: `connections`, `contact_info`, `featured_items`,
   `messages`, `recommendations`, `advisor_generation_locks` (all added later, all with the same
   ownership-only shape, several with a *narrower-looking* policy name — "recipient marks message
   read," "recipient toggles visibility" — that turns out to gate the whole row, not just the
   field the name implies).
3. **Pulled full current column lists** for every one of those 33 tables from
   `information_schema.columns` on the local instance (376 columns total), then went through them
   by hand looking for the shape CEO named: not "is this column writable" (nearly all of them
   correctly are — a student editing their own activity's title is the product working) but "is
   this specific column one a job or an admin should be the only writer of."
4. **For every candidate that shape produced, traced the real write path** — grep for the column
   name against `.update(`/`.insert(` call sites, then checked which Supabase client each call
   uses (`createClient()`, the caller's own RLS-scoped session, vs `createAdminClient()`,
   service-role). Same test already applied to `plan_tier`.
5. **Checked the grant, not just the policy**, for every Tier-1/Tier-2 finding below —
   `information_schema.table_privileges`/`pg_trigger` on the local instance, confirming
   `authenticated` holds the UPDATE grant and no OTHER trigger (guard or otherwise) already
   covers the column, the same two-part check that made the `plan_tier` finding trustworthy
   rather than theoretical.
6. **What this pass did NOT do**, stated so this isn't overclaimed: it did not trace every
   Server Action's Zod schema field-by-field for every table (only for the two classes where it
   materially changes the finding — see §2 below). It did not check every low-stakes
   `created_at`/`updated_at`-only table (`skills`, `languages`, `courses`, `student_interests`,
   `contact_info`, `career_goals`, `application_requirements`, `applications`,
   `saved_opportunities` — went through all of them, found nothing but ordinary user-editable
   fields, and did not write up a "nothing here" paragraph for each individually; listed once at
   the bottom instead). One column (`featured_items.item_id`) is flagged unverified rather than
   characterized either way — see §11.
7. **A methodological point worth stating explicitly, because it affects how every finding below
   should be read**: application-level validation (a Zod schema that never accepts a given field)
   is not a security boundary here. Supabase's PostgREST endpoint is directly reachable by any
   client holding a valid session JWT — the Next.js app's own Server Actions are one caller of
   that API, not a gate in front of it. A schema that correctly never sends `evidence_status`
   does not stop a direct `PATCH .../rest/v1/activities?id=eq.<own-row>` with that field added by
   hand. Every finding below is real regardless of how careful the app's own code is, for exactly
   this reason — the same reason `plan_tier` was exploitable even though no button in the UI
   offers to set it.

## Findings, in consequence order

### 1. `target_universities` — 8 admission-outlook columns, unguarded, AND the legitimate writer isn't on service-role either

`academic_fit_score`, `profile_fit_score`, `outlook`, `estimate_range_low`, `estimate_range_high`,
`outlook_confidence`, `outlook_model_version`, `outlook_calculated_at` — this is PHASE 16/17's
entire admission-outlook engine output, sitting on the same table as `status`/`notes` (both
correctly user-editable) inside `0014`'s owner-`ALL` policy. No guard trigger exists on this
table (only `target_universities_set_updated_at`). `authenticated` holds full UPDATE grant.
Structurally identical to `opportunity_matches` before its own guard (0063) — a scoring engine's
cached output, directly writable by the row owner.

**The nuance that makes this different from every guard fixed so far, worth being explicit
about rather than assuming the `plan_tier` fix pattern transfers unchanged:** the LEGITIMATE
writer, `refreshAdmissionOutlook` (`lib/admissions/persist.ts`), defaults to
`client ?? (await createClient())` — the request-scoped, cookie-bound, USER'S OWN session
client. Its own doc comment: *"every existing caller (the save action, the university detail
page) is a logged-in user's own request."* Only the background sweep (`scanStaleOutlooks`,
`lib/admissions/scan.ts`) passes an explicit admin client. A `current_user <> 'service_role'`
guard copied verbatim from `profiles` would BREAK the real feature — the university detail
page's own refresh call runs as the student, not service-role. Closing this one is not a pure
guard-trigger addition; it needs the same "paired code change" 0062/0063 made for `is_admin` —
migrating the request-scoped write itself to an admin client — decided and done together, not
this sweep's call to make alone.

**Why this one is worth ranking above the others despite the lower "financial" stakes of
`plan_tier`:** this exact data is what `get_parent_child_target_universities()`
(migration 0116, §5) serves to an ACTIVE PARENT — `academic_fit_score`, `profile_fit_score`,
`outlook`, both estimate-range bounds, `outlook_confidence`, all returned verbatim. A student
has a concrete, plausible incentive to inflate their own outlook specifically to show a parent
a falsely optimistic picture, not just a theoretical one.

### 2. `evidence_status` — 10 tables, same shape as `evidence_files.verification_status` which IS guarded, these are not

`education_records`, `test_scores`, `activities`, `awards`, `certifications`, `projects`,
`research_experiences`, `sports_experiences`, `volunteering_experiences`, `work_experiences` all
carry `evidence_status` (`self_reported` → `evidence_added` → `verified` →
`verification_rejected`), the exact column `evidence_files_guard_verification_status()` (0063)
already protects on the ONE table that trigger covers. These ten don't have it. AGENTS.md §11,
non-negotiable #4: *"Uploaded evidence does not equal independent verification."*

The one legitimate writer across all ten (`app/(app)/documents/actions.ts:103`) uses the
caller's own `createClient()`, not admin — same nuance as `target_universities` — but writes a
fixed literal, `"evidence_added"`, never a variable, and every generic CRUD Server Action for
these tables (`app/(app)/profile/actions.ts`'s `crudCreate`/`crudUpdate`, backed by
`ActivitySchema` and its ten siblings in `lib/validation/achievements.ts`) declares no
`evidence_status` field at all — Zod strips it before the app ever reaches `.update()`. Per the
methodological point in §7 above, that's real defense in depth, not a substitute for one: a
direct REST PATCH to any of these ten tables, on the owner's own row, with
`{"evidence_status": "verified"}`, is not stopped by RLS, GRANT, or any trigger today. The one
table this class already covers correctly (`evidence_files`) shows the fix is mechanically
simple when the write path already qualifies — worth checking on a future pass whether these
ten evidence-linkable tables should all gain the identical guard `evidence_files` already has,
possibly via one shared function parametrized by table the way this codebase already does for
`enforce_canonical_entity_type`.

### 3. `advisor_conversations.summary` / `summarized_at` — single admin-only writer, unguarded

`lib/advisor/retention.ts:215` — `admin.from("advisor_conversations").update({ summary, summarized_at })`,
`admin = createAdminClient()`, the ONLY writer of either column. Sits inside the same 0014
owner-`ALL` policy as `title` (correctly user-editable — renaming a conversation). Mechanically
identical fix shape to `plan_tier`: legitimate writer already on service-role, just add both
columns to a new guard. Lower stakes than §1/§2 — rewriting your own AI-generated conversation
summary doesn't grant privilege or mislead a third-party reader the way §1 does — but the same
class, and the cheapest of these to close correctly.

### 4. `recommendations.body` / `author_id` / `relationship` — recipient's own "toggle visibility" UPDATE can smuggle a rewrite of someone else's words

`app/(app)/u/[id]/recommendation-actions.ts:75` sends only `{ status: visible ? "visible" : "hidden" }`
— narrow and correct in the app. But the RLS policy ("recipient toggles visibility") is
`using (recipient_id = auth.uid())` `with check (recipient_id = auth.uid())` with no column
scope, same shape `parent_links`' pre-0116-hardening `confirmed_at` gap was. `body` is a
testimonial someone ELSE wrote about this person; `author_id` says who wrote it. A direct PATCH
from the recipient's own session, alongside the legitimate `status` change, can rewrite what a
recommender is credited with having said, or reassign authorship to someone else entirely.
Reputationally the most serious of the "content smuggling" class below — this is the one table
in this whole sweep where the row's real content isn't the owner's own words.

### 5. `notifications.title` / `body` / `link` / `category` — smuggling into a table `0014` itself calls "system-generated"

0014's own header comment: *"notifications: system-generated, user can read/acknowledge/delete
but not create."* The intent is stated plainly in the same file that then implements it with an
unscoped `using (user_id = auth.uid())` `with check (user_id = auth.uid())` UPDATE policy. The
one legitimate write (`app/(app)/notifications/actions.ts`, three call sites, all
`{ read_at: new Date().toISOString() }}`) never touches the other four fields, but nothing in
RLS/GRANT stops a direct PATCH from doing so — a user could rewrite their own past notification's
title/body/link to whatever they want. Lower real-world stakes than §4 (a notification is
already addressed to its one recipient, so there's no third party being misrepresented), but
this is the one instance in the whole sweep where the *intent* not to allow it is written down
in the very migration that left it open.

### 6. `messages.body` / `sender_id` — recipient's own "mark read" UPDATE can smuggle a rewrite of a message someone else sent

Same shape as §4/§5, one tier down in stakes: `app/(app)/messages/actions.ts` sends only
`{ read_at: ... }`, three call sites, all scoped `.is("read_at", null)` besides. The RLS policy
("recipient marks message read") is unscoped by column. A recipient could rewrite the sender's
own message body, or reassign `sender_id`, via their own read-receipt update.

### 7. `connections.requester_id` — smuggling risk on the identity column; `low_id`/`high_id` are safe by construction

Checked and ruled out first: `low_id`/`high_id` (the pair used for the `connections_unique_pair`
constraint) are `generated always as (least/greatest(requester_id, recipient_id)) stored` —
Postgres physically rejects any direct write to a generated column, no RLS or guard needed, not
a finding. `requester_id` itself is a plain column, though, and the "recipient responds to
connection request" policy (`using (recipient_id = auth.uid())`) has no column scope — the
same shape as the others in this tier. Lower stakes than §4/§5/§6: reassigning who requested a
connection is a data-integrity oddity, not exposure of anyone's private content.

### 8–10. Lower-stakes metadata, same shape, named for completeness rather than urgency

- **`weekly_actions.carried_forward` / `priority` / `impact_level` / `source_type` / `source_id`**
  — AI-plan-generation metadata (0077's `carried_forward`, distinguishing a
  preserved-through-regeneration action from a fresh one) sitting beside `status`/
  `reflection_note`/`reflection_outcome` (all correctly user-editable — Phase 10's "what
  happened?" reflection loop). No real privilege gained by tampering; would only misrepresent
  which plan an action came from.
- **`weekly_plans.summary`** — plausibly AI-generated plan summary text, same shape, not
  independently traced to a specific writer this pass (lower priority given the low stakes even
  if confirmed).
- **`advisor_messages.status` / `degraded` / `error_message`** — AI response integrity flags
  (whether a reply actually completed, was quota-degraded, or errored). A user could hide their
  own degraded/failed response by resetting these, or fabricate one. No cross-user exposure.

### 11. `advisor_generation_locks` — full owner CRUD on a concurrency-lock table

The legitimate path (`lib/advisor/generation-lock.ts`) goes through
`acquire_advisor_generation_lock()`/`release_advisor_generation_lock()`, almost certainly
`SECURITY DEFINER` RPC functions (not independently confirmed this pass — the two function
BODIES weren't read). But the table also carries `0014`'s same owner-`ALL` policy, meaning a
user could bypass the RPC pair entirely and INSERT/UPDATE/DELETE their own lock row directly,
sidestepping whatever concurrency control the lock exists to provide. Likely a race-condition
risk (a user racing two AI-advisor requests against their own quota) rather than a
cross-user exposure — flagged, not characterized as high-severity, since the two RPC functions'
actual logic wasn't read closely enough this pass to be certain that's the full extent of it.

### Flagged unverified, not characterized either way

**`featured_items.item_id`** — a user curates which of their own achievements to feature on
their public profile. `item_id` is a bare UUID with no FK constraint tying it to `item_type`,
and this pass did not trace whether the render path that resolves `item_id` → the actual
achievement checks that the referenced row is owned by the SAME user before displaying it. If it
doesn't, a user could set `item_id` to another student's private activity/award id and have it
rendered on their own public profile — worth a closer look, not confirmed as a real gap this
pass.

## Confirmed clean

- **The 8 tables with an existing guard trigger** (`posts`, `profiles`, `profile_scores`,
  `profile_score_snapshots`, `opportunity_matches`, `student_requirement_evaluations`,
  `evidence_files`, `parent_links`) — re-checked against the local instance's `pg_trigger`, no
  drift since [[project_oryn_guard_trigger_column_drift_sweep]]'s own last check.
- **`ai_recommendations`** — `user_response`/`completed_at`/`feedback` are legitimately
  user-set (responding to a recommendation); `shown_at` is low-stakes. Already named in 0063's
  own header as having a policy but effectively no real UPDATE path in practice — not
  re-litigated here.
- **`application_requirements`, `applications`, `career_goals`, `saved_opportunities`,
  `target_universities.status`/`.notes`** — every status/notes-shaped field checked is a real
  user-driven tracker (application status, goal status, "not interested" reason), not a
  computed or admin-only value.
- **`contact_info`, `featured_items` (aside from `item_id`, above), `languages`, `skills`,
  `courses`, `student_interests`** — went through each table's full column list, found only
  ordinary user-entered/preference fields.

## Summary

One high-severity finding with a genuine design nuance (§1, `target_universities`), one
medium-high finding spanning ten tables via one shared column (§2, `evidence_status`), one
mechanically-simple-to-fix finding matching the `plan_tier` pattern exactly (§3), four
content/identity-smuggling findings of varying real-world stakes (§4–7), three low-stakes
metadata findings (§8–10), one flagged-unverified item (§11), and a confirmed-clean list. Not a
second `plan_tier` — nothing here is a live, self-serve financial bypass — but §1 and §4 both
have a real third-party reader (a parent, a recommendation's own subject) who could be misled by
tampered data, which is its own kind of consequence AGENTS.md's trust principles were written
to prevent. Report only; nothing above has been fixed.

## ✅ 2026-09-05 audit — three of eight closed

**§3 (`advisor_conversations.summary`/`.summarized_at`) — Closed**, but not by this sweep's own
follow-up work: commit `7e67def6` (2026-09-04, "feat(advisor): past sessions reachable on the
right, titled by topic") bundled migration `0122_advisor_conversations_guard_admin_columns.sql`
as a drive-by fix, same day as this sweep and possibly before it — the exact guard this section
asked for, column-scoped to `summary, summarized_at`, reset-to-OLD on any
`current_user <> 'service_role'` write, and its own header confirms the legitimate writer
(`lib/advisor/retention.ts`) was already on `createAdminClient()`, so no paired code change was
needed. Verified as an ancestor of `origin/main` via `git merge-base --is-ancestor`. **This was
missed by the 2026-09-05 docs-findings audit** ([[project_oryn_docs_findings_audit_2026_09_05]]),
which carried this section's own "nothing fixed" framing forward without re-checking the
migrations directory for this specific column — caught only when actually starting the §3 work
dispatched off that audit's backlog, not by the audit itself.

**§1 (`target_universities`) and §2 (`evidence_status`) — Closed** this same night, deliberately
(not a drive-by): migrations `0136`/`0137`, guard + the paired admin-client code change, plus a
follow-up closing an RLS-bypass ownership gap CEO caught on review. Merged via `4a8c8307`,
`2f75f022` (2026-09-05). Full writeup:
[[project_oryn_evidence_status_target_universities_rls_fix_2026_09_05]].

§4–8 not yet touched.
