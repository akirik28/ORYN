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

## Routed back, not merged

| Date | Branch | Reason | Routed to |
|---|---|---|---|
| 2026-08-22 | `oryn/res-r2-opportunity-deadlines` | Conflicts with current `main` on `docs/ORYN_WORKSTREAMS.md` — one hunk, purely additive: `main` gained the GATE-FIX + FEAT-1 rows via PRs #5/#6 while the branch appended its own lane row at the same anchor. No content disagreement; every row should survive a rebase. Nothing else conflicts; no app code, migrations, or credentials in the branch. MERGE-1 diagnoses conflicts but never resolves them. | ORYN-BASORG → RES-R2, rebase keeping all rows |
| 2026-08-22 | `oryn/res-r3-eligible-countries-w2` | Same shape and same diagnosis as the row above. | ORYN-BASORG → RES-R3, rebase keeping all rows |

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
