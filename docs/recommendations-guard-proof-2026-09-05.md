# Proving the recommendations content/identity guard — 2026-09-05

Same rigor as every guard-trigger fix this sweep has produced. Closes §4 of
`docs/permissive-update-policy-sweep-2026-09-04.md` — `recommendations.body`/`.author_id`/
`.relationship`, unguarded, smuggleable via the recipient's own "toggle visibility" UPDATE.

CEO flagged this one as needing more careful thought than §6/§7, not a drop-in repeat — worth
stating up front what was actually checked before concluding the mechanism is, in fact, the same
shape, just three columns instead of one or two.

## What makes this table different, checked explicitly rather than assumed away

`recommendations` has two distinct "owners" in a way messages/connections don't quite: the
**recipient** is who RLS's UPDATE policy is scoped to (`recipient_id = auth.uid()`), but the
**content itself** — `body`, `relationship`, and the `author_id` credit — belongs entirely to
the **author**, a different party who isn't even a participant in the UPDATE statement at all.
Unlike a message (arguably "about" both parties in a conversation) or a connection's requester
field, this is the one table in the sweep where the row's real content is unambiguously someone
else's words, being updated by someone who has zero legitimate claim to any part of it except
whether they, personally, still want to display it.

That framing matters for the SEVERITY (reputational harm to a third party who isn't even in the
request), but checked whether it also changes the MECHANISM:

**Is there any legitimate author-side edit path at all** — could `body` ever legitimately be
UPDATEd (as opposed to only set once at INSERT), e.g. the author fixing a typo? Read migration
`0035_recommendations.sql`'s full policy set and every Server Action in
`app/(app)/u/[id]/recommendation-actions.ts`: INSERT (`writeRecommendation`) sets
`author_id`/`recipient_id`/`relationship`/`body` once; UPDATE (`setRecommendationVisibility`)
sends only `{status}`; DELETE (`deleteRecommendation`) is the author's only other option. There
is no "author edits own recommendation" policy, Server Action, or UI anywhere — an author who
wants to change their wording must delete and (if eligible) write a new one. Grepped every file
that references `recommendations` (`lib/admin/queries.ts`, `lib/social/recommendations-query.ts`,
`app/api/export-data/route.ts`, `lib/export/tables.ts`) for `.update(`/`.insert(`/`.delete(` —
zero matches outside the three Server Actions above. **So unlike §1/§2 (where the paired code
change was moving an EXISTING legitimate writer to admin), there is no existing UPDATE writer of
these three columns anywhere to preserve** — the guard can block them unconditionally, same
"cheap" shape as §6/§7, not a more complex one.

**Conclusion: the mechanism is identical to §6/§7 (guard-only, no paired code change, no
admin client anywhere in the write path, RLS stays fully in force).** The "careful thought" this
finding warranted was confirming that conclusion by actually reading every write path, not
assuming three columns implies three times the design complexity — measuring first changed
nothing about the mechanism, only confirmed it, which is itself worth stating rather than
silently skipping the check because §6/§7 had already established the pattern.

## Does the protection stand on its own, or borrow from something else?

Same answer as §6/§7, same reasoning: the write never moves to admin (`setRecommendationVisibility`
uses the caller's own `createClient()`), so RLS's `recipient_id = auth.uid()` policy is
re-evaluated live, in the same statement, every time — not borrowed from an earlier check. The
content-guard half is deliberately not conditioned on "no code today updates these columns" —
column-scoped so a future writer (an author-edit feature, an admin redaction tool) would still
be caught unconditionally, the same defense-in-depth framing as 0138/0139.

## Method and attack shape

Same real local Postgres 17 recipe as the messages/connections proof the same night
([[reference_psql_set_config_local_does_not_survive_psql_f]] — `grant usage on schema auth`
included from the start this time, learned from that proof). Same combined-statement attack
shape: the legitimate `{status}` field alongside the smuggled `{body, author_id, relationship}`
fields, in ONE UPDATE, matching a real PATCH. A (author) is the victim; B (recipient) is the
attacker — the only party with any legitimate UPDATE right at all; C is an uninvolved third
profile, the smuggled-to target for `author_id` (reassigning to B's own id would collide with
`recommendations_no_self`, same lesson as the messages/connections proof).

1. A writes B a recommendation: `author_id=A`, `recipient_id=B`, `relationship='teacher'`,
   `body='A genuinely strong recommendation, written by A'`, `status='visible'`.
2. **Before any guard**, as B: one UPDATE — `set status='hidden', body='REWRITTEN BY B',
   author_id=C, relationship='colleague' where id=<rec> and recipient_id=auth.uid()`. **Result:
   succeeds completely** — status hidden, body rewritten, author_id reassigned to C,
   relationship changed. The vulnerability, reproduced, not asserted.
3. Reset (as `service_role`). Apply the guard —
   `recommendations_guard_content_columns()`: resets `body`/`author_id`/`relationship` to `OLD`
   on any non-service-role UPDATE, `before update of body, author_id, relationship`.
4. As B, **with the guard**: repeat the identical combined statement. **Result: `status`
   becomes `hidden` (the real visibility-toggle feature works), but `body`/`author_id`/
   `relationship` all stay at A's originals** — one statement, three columns silently held while
   a fourth legitimately changes.
5. **Proving the proof can fail**: dropped the guard, repeated the attack — **succeeds again**
   (all three columns take the smuggled values). Not vacuous.
6. Restored the guard, re-ran once more — **blocked again**, `status` still works, confirmed
   clean.

## Result

Guard proven: vulnerability reproduced pre-guard, blocked post-guard in the same statement that
legitimately changes `status`, proof-can-fail confirmed, restored-clean reconfirmed. No paired
code change — no writer of these three columns exists anywhere via UPDATE, confirmed by reading
every referencing file, not assumed from §6/§7's precedent.

## setup.sql

```sql
create schema if not exists auth;

create or replace function auth.uid() returns uuid language sql stable as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
$$;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin;
  end if;
end $$;

create table public.profiles (
  id uuid primary key
);

-- recommendations (migration 0035) -- real schema, real RLS policy text, unmodified
-- (SELECT + the UPDATE policy under test only -- INSERT/DELETE aren't exercised by this proof
-- and would pull in connections + is_blocked_between() for no behavioral benefit here)
create type recommendation_relationship as enum ('teacher', 'mentor', 'teammate', 'project_collaborator', 'colleague', 'other');
create type recommendation_status as enum ('visible', 'hidden');

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  relationship recommendation_relationship not null,
  body text not null check (char_length(body) between 1 and 3000),
  status recommendation_status not null default 'visible',
  created_at timestamptz not null default now(),
  constraint recommendations_no_self check (author_id <> recipient_id)
);

alter table public.recommendations enable row level security;

create policy "select involved recommendations" on public.recommendations
  for select using (author_id = auth.uid() or recipient_id = auth.uid());

create policy "recipient toggles visibility" on public.recommendations
  for update using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

grant usage on schema public to authenticated, service_role;
grant usage on schema auth to authenticated, service_role;
grant all on public.profiles to authenticated, service_role;
grant all on public.recommendations to authenticated, service_role;
```

## proof.sql

```sql
\set ON_ERROR_ROLLBACK on

insert into public.profiles (id) values
  ('11111111-1111-1111-1111-111111111111'), -- A (author -- the victim)
  ('22222222-2222-2222-2222-222222222222'), -- B (recipient -- the attacker)
  ('cccccccc-cccc-cccc-cccc-cccccccccccc');  -- C (uninvolved third profile)

insert into public.recommendations (id, author_id, recipient_id, relationship, body, status) values
  ('dddddddd-dddd-dddd-dddd-dddddddddddd',
   '11111111-1111-1111-1111-111111111111',
   '22222222-2222-2222-2222-222222222222',
   'teacher',
   'A genuinely strong recommendation, written by A',
   'visible');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', true);

update public.recommendations
  set status = 'hidden', body = 'REWRITTEN BY B', author_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc', relationship = 'colleague'
  where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' and recipient_id = auth.uid();

do $$
declare
  st recommendation_status; b text; a uuid; rel recommendation_relationship;
begin
  select status, body, author_id, relationship into st, b, a, rel from public.recommendations where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  if st <> 'hidden' or b <> 'REWRITTEN BY B' or a <> 'cccccccc-cccc-cccc-cccc-cccccccccccc' or rel <> 'colleague' then
    raise exception 'SETUP CHECK FAILED: expected the pre-guard smuggled rewrite to fully succeed, got status=%, body=%, author_id=%, relationship=%', st, b, a, rel;
  end if;
  raise notice 'CONFIRMED VULNERABLE (pre-guard): B''s own visibility-toggle UPDATE also rewrote body, reassigned author_id to C, and changed relationship.';
end $$;

reset role;

set local role service_role;
update public.recommendations
  set status = 'visible', body = 'A genuinely strong recommendation, written by A', author_id = '11111111-1111-1111-1111-111111111111', relationship = 'teacher'
  where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
reset role;

create or replace function public.recommendations_guard_content_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if pg_catalog.pg_trigger_depth() <= 1 and current_user <> 'service_role' then
    new.body := old.body;
    new.author_id := old.author_id;
    new.relationship := old.relationship;
  end if;
  return new;
end;
$$;

drop trigger if exists recommendations_00_guard_content_columns on public.recommendations;
create trigger recommendations_00_guard_content_columns
  before update of body, author_id, relationship on public.recommendations
  for each row execute function public.recommendations_guard_content_columns();

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', true);

update public.recommendations
  set status = 'hidden', body = 'REWRITTEN BY B', author_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc', relationship = 'colleague'
  where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' and recipient_id = auth.uid();

do $$
declare
  st recommendation_status; b text; a uuid; rel recommendation_relationship;
begin
  select status, body, author_id, relationship into st, b, a, rel from public.recommendations where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  if b <> 'A genuinely strong recommendation, written by A' or a <> '11111111-1111-1111-1111-111111111111' or rel <> 'teacher' then
    raise exception 'GUARD FAILED: body=%, author_id=%, relationship=% -- the guard did not reset them.', b, a, rel;
  end if;
  if st <> 'hidden' then
    raise exception 'GUARD OVER-BLOCKED THE REAL FEATURE: status=% -- the legitimate visibility-toggle mutation broke.', st;
  end if;
  raise notice 'CONFIRMED GUARDED, REAL FEATURE PRESERVED: the SAME statement hid the recommendation (real feature) while body/author_id/relationship silently stayed at A''s originals.';
end $$;

reset role;

drop trigger if exists recommendations_00_guard_content_columns on public.recommendations;

set local role service_role;
update public.recommendations set status = 'visible' where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', true);
update public.recommendations
  set status = 'hidden', body = 'REWRITTEN BY B AGAIN', author_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc', relationship = 'other'
  where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' and recipient_id = auth.uid();

do $$
declare
  b text; a uuid; rel recommendation_relationship;
begin
  select body, author_id, relationship into b, a, rel from public.recommendations where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  if b <> 'REWRITTEN BY B AGAIN' or a <> 'cccccccc-cccc-cccc-cccc-cccccccccccc' or rel <> 'other' then
    raise exception 'PROOF-CAN-FAIL CHECK ITSELF FAILED: expected the attack to succeed with the trigger removed, got body=%, author_id=%, relationship=%.', b, a, rel;
  end if;
  raise notice 'CONFIRMED THE PROOF CAN FAIL: with the guard removed, B''s smuggled rewrite succeeds again -- not vacuous.';
end $$;

reset role;

create trigger recommendations_00_guard_content_columns
  before update of body, author_id, relationship on public.recommendations
  for each row execute function public.recommendations_guard_content_columns();

set local role service_role;
update public.recommendations
  set status = 'visible', body = 'A genuinely strong recommendation, written by A', author_id = '11111111-1111-1111-1111-111111111111', relationship = 'teacher'
  where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', true);
update public.recommendations
  set status = 'hidden', body = 'REWRITTEN BY B', author_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc', relationship = 'colleague'
  where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' and recipient_id = auth.uid();

do $$
declare
  st recommendation_status; b text; a uuid; rel recommendation_relationship;
begin
  select status, body, author_id, relationship into st, b, a, rel from public.recommendations where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  if b <> 'A genuinely strong recommendation, written by A' or a <> '11111111-1111-1111-1111-111111111111' or rel <> 'teacher' or st <> 'hidden' then
    raise exception 'RESTORE CHECK FAILED: status=%, body=%, author_id=%, relationship=%.', st, b, a, rel;
  end if;
  raise notice 'COMPLETE, RESTORED CLEAN: guard blocks the content/identity rewrite again, status still updates.';
end $$;

reset role;
```
