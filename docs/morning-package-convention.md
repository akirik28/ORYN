# `data/morning/` — what it is, and who writes it

**Short version for lanes: you stage SQL, the CEO packages it. Don't write into
`data/morning/` yourself.**

A lane grepped for "package 11" on 2026-09-04 and found nothing, because this
convention had never been written down despite sixteen files following it. That's
what this document fixes.

---

## What it is

`data/morning/` holds files the **founder pastes by hand** into the Supabase SQL
editor. Nothing here is applied by CI, by a job, or by any session.

Each numbered item is one paste. Most have a Turkish `OKU-BENI` beside them
explaining what it does, what it can't do, and what was verified.

The numbering is chronological, not semantic — `09` came before `11`, that's all
it means.

## Why it exists

**The live database is the only ORYN database.** There is no separate production
project; `oryn-qa-scratch` is production in everything but name. So no session
writes to it, and the founder applies every schema change himself, having read
what it does first.

## Who writes what

| | |
|---|---|
| **Lanes** | Stage SQL as a migration (`supabase/migrations/NNNN_*.sql`) or, for data fills, a dry-run file under `data/research/sql-dry-runs/`. |
| **CEO** | Assembles those into a numbered `data/morning/` package with its README, verifies it, and hands it to the founder. |

**The split isn't ceremony.** Only the integrator knows which migrations are
already in which package — and getting that wrong has a specific cost: on
2026-09-04, migration 0118 was staged after package 09 was already sent, so the
founder would have applied 0116 and found P5's column missing. Caught, but by
accident the first time.

## Rules for a package (CEO)

**One transaction.** `begin;` … `commit;`. All of it applies or none does.

**A precondition guard** where the package depends on an earlier one. Package 11
refuses and applies nothing if 09 hasn't run.

**Idempotent.** `add column if not exists`, `drop trigger if exists`. He may run
it twice; that must be harmless, and it must be *verified* harmless, not assumed.

**A verification block that aborts the transaction** if any expected object is
missing — so a partial apply is impossible.

**Verified by applying, not by parsing.** A parse check passes on SQL that cannot
run: on 2026-09-04 migration 0115 parsed cleanly and failed on a real Postgres,
because it altered a column type while a trigger still depended on that column.
Since the package is one transaction, that failure would have rolled back 0116
too and cost the parent-account feature its morning.

Use a throwaway local database (`psql -q postgres -c 'create database …'`), stub
`auth.users` / `auth.uid()`, apply the real chain, and **watch the check fail
before trusting it passes.**

**Re-derive against the current tree immediately before sending.** Not against
the tree it was built from. A package verified an hour ago describes a repo that
no longer exists.

## Rules for the founder-facing README

Turkish. Say what it does, what it does **not** do, and what was actually verified
versus reasoned. If a check couldn't be run, say that plainly rather than
implying coverage that doesn't exist.
