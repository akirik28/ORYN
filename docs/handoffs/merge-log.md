# MERGE-1 merge log

Every merge to `main` performed by the MERGE-1 lane, newest last. MERGE-1 merges only
work that has been queued for it (by ORYN-CEO, or directly by the founder), and
independently re-runs the full gate on the *merge result* before merging — the CEO's
verification is never taken on its word. See `docs/ORYN-ORG-STRUCTURE.md` §5 and the
MERGE-1 brief in `docs/ORYN-ORG-BRIEFS.md`.

Gate = lint · typecheck · test · build, all green, run in a fresh scratch worktree of the
merge result off current `origin/main`.

| Date | PR | Branch | Queued by | Verdict summary | Merge SHA |
|---|---|---|---|---|---|
| 2026-08-22 | [#8](https://github.com/akirik28/ORYN/pull/8) | `oryn/res-v-ecw2-verification` | Founder | Docs-only (RES-V-R3W2 ECW2 verdict + 1 workstream row). Merged clean into `85c3d65`. Gate green: lint clean, typecheck clean, 122 files / 1,861 tests, build succeeds. Baseline reconciled (1,850 + FEAT-1's 11 = 1,861, no drop). No §6 founder-pending item, no migration, no credential, no policy copy. | `58ce0c5` |
| 2026-08-22 | [#10](https://github.com/akirik28/ORYN/pull/10) | `oryn/res-r3-eligible-countries-w2` | ORYN-CEO | Research-only, rebased by RES-R3 (BASORG-directed) to resolve the conflict noted below. Rebase integrity re-verified independently: 36→37 workstream rows, exactly RES-R3's row added, none lost, GATE-FIX/FEAT-1/RES-V-R3W2 rows all intact verbatim. Merges clean into `58ce0c5`. Gate green: 122 files / 1,861 tests, no drop from baseline. No migration/credential/app-code. Closes the dangling reference from #8's verdict (which cited this branch before it was on main). | `f9c4faa` |
| 2026-08-22 | [#11](https://github.com/akirik28/ORYN/pull/11) | `oryn/ceo-stranded-docs` | ORYN-CEO | CEO's own PR, verified with the same rigor as any other (explicit instruction, followed). Rescues coordination docs stranded on a diverged primary checkout (`oryn/hide-social-nav`, 212 behind/8 ahead of main) that never reached main: `docs/current-state.md` rewrite, `docs/founder-blocked-backlog.md` item 26 (migration 0057 authorization — a request added to the backlog, not an action taken), an inert unapplied SQL apply-script, and an ASU programme-catalogue JSONL batch (479 records, 0 parse failures, 0 duplicate IDs). The SQL's TechGirls 37-country array was mechanically diffed against PR #10's ECW2-017 record: exact match, 0 missing, 0 extra, 0 duplicates; both opportunity UUIDs in the SQL confirmed present in the record set. No `supabase/migrations/**`, no CI/workflow files, no credential values (one false-positive grep hit was a security-advisor status line, not a secret). Merges clean into `f9c4faa`. Gate green: 122/1,861, no drop. | `d29b456` |
| 2026-08-22 | [#9](https://github.com/akirik28/ORYN/pull/9) | `oryn/merge-log` | ORYN-CEO | This log's own bootstrap PR — not self-merged when opened; queued back by the CEO before merging, per protocol. Re-verified mergeable against main as it stood after #10 and #11 (not the stale state from when it was opened). Single new file, no gate surface. | `d9a29cf` |

## Routed back, not merged

| Date | Branch | Reason | Routed to |
|---|---|---|---|
| 2026-08-22 | `oryn/res-r3-eligible-countries-w2` | Conflicted on `docs/ORYN_WORKSTREAMS.md` (one hunk, purely additive). **Resolved**: BASORG directed RES-R3 to rebase; landed as PR #10, merged (see table above). | ORYN-BASORG → RES-R3 → merged as #10 |
| 2026-08-22 | `oryn/res-r2-opportunity-deadlines` | Same conflict shape as RES-R3's. RES-R3's rebase route hit the session's permission classifier on the force-push; BASORG explicitly declined to force-push on the lane's behalf (would cross a permission denial by proxy) and redirected RES-R2 to land via an ordinary merge commit instead — no force-push needed, lands under the lane's own permissions. Landed as **PR #13**, not yet queued to MERGE-1 by CEO as of this log entry. | ORYN-BASORG → RES-R2 → PR #13 opened, awaiting CEO queue |

## Standing notes

- **Test-count baseline** as of `58ce0c5`: **122 files / 1,861 tests**. An unexplained drop
  below this is a stop condition for any future merge.
- **Verification harness gotcha:** do not symlink `node_modules` into a scratch worktree
  from another checkout — Turbopack fails the build with "Symlink [project]/node_modules is
  invalid, it points out of the filesystem root", which reads as a code failure but isn't.
  Use an APFS copy-on-write clone (`cp -Rc`) instead: near-zero disk, and the build passes.
  Delete `.next` (~218M) after each verification; disk on this machine is scarce
  (org doc §3.13).
- **Merging research branches lands proposals, not facts** (BASORG, 2026-08-22). Research
  JSONL on `main` is not ingestion and reaches no student until a verifier clears it and an
  ingester applies it. This lowers the publication risk of merging research branches — it
  does not lower the validation bar.

## Standing gate rules (founder directive via ORYN-CEO, 2026-08-22, effective immediately)

Founder's stated concern: 13 simultaneous sessions must not destabilise the project — work
like a careful application developer, check everything many times over, above all don't
break it. Added on top of the existing lint/typecheck/test/build gate:

1. **Size is a gate condition.** A PR whose diff MERGE-1 cannot read in full and hold in
   its head is too big to merge that day — send it back to be split, regardless of green.
2. **Refactors don't merge same-day as the fix they ride with.** Scope creep past a PR's
   stated defect is a reject reason on its own, even with passing tests.
3. **Test count is a hard stop, not a note.** Baseline **122 files / 1,861 tests** at
   `58ce0c5`. An unexplained drop blocks the merge outright. An unexplained rise is fine.
4. **Non-regression evidence is required for user-facing PRs.** The PR body must state
   what was verified, on which surface, against which server, with what observed result —
   "tested" alone doesn't count. `localhost:3000` verification is worthless on its own if
   the primary checkout isn't confirmed to be on current main first (proven live: the
   primary checkout sat on `oryn/hide-social-nav`, 212 commits behind).
5. **When genuinely uncertain, don't merge — ask.** Two queued PRs touching the same file
   merge one at a time, gate re-run between them, never together.

Test baseline reconfirmed unchanged at 122/1,861 through PRs #10, #11, #9 (three merges,
zero app-code/test files touched by any of them).

## Routed back, round 2

| Date | Branch/PR | Reason | Routed to |
|---|---|---|---|
| 2026-08-22 | [#19](https://github.com/akirik28/ORYN/pull/19) `oryn/feat1-outlook-explanation-render` | Conflicts on `docs/ORYN_WORKSTREAMS.md` against main as it stood after #18 — same additive shape as every prior conflict today (main gained rows via merges since the branch pointed to `origin/main`@`85c3d65`). The code file (`app/(app)/universities/[id]/page.tsx`) merges clean; the conflict is isolated to the docs file. **Content independently reviewed in full before routing back** (not deferred until the rebase lands): the preserved-grid claim verified byte-for-byte (the strengths/gaps/unknowns block moved into an `else` branch, unchanged apart from indentation, gated on `notApplicableReason` which is null-by-construction for every holistic target — so holistic rendering is provably unchanged); the estimate-range fix verified as a real, in-scope consistency fix (the badge already preferred fresh `outlook` over the stale `targetRes.data` row pre-PR; the range paragraph didn't, which is the exact false-precision contradiction non-negotiable #5 forbids) rather than unrelated scope creep. When the rebase lands, only re-verification is needed — the deep read is already done. | CEO → FEAT-1, rebase keeping all rows |
