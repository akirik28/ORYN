# ORYN Research Freeze — CFO Throughput Checkpoint

**Maintained by: CFO (S10, capacity/throughput/bottleneck control).** Rewritten in place at
each checkpoint, not appended to — prior checkpoints live in this file's own git history
(`git log -p -- data/research/registry/CFO_THROUGHPUT.md` on `oryn/research-freeze-cfo-
throughput`). I do not research opportunity facts, source photos, alter records, or override
evidence — this file tracks fleet capacity and flags backlogs/misallocations only.
Cross-reference: `GAP_MAP.md` (CEO's coverage/content state) and `CONTROL_TOWER_REPORT_*.md`
(CEO's consolidated fleet report). Started as a 5-minute recurring check (`/loop`, per
founder instruction); **the fleet is winding down as of this checkpoint (see below).**

## Checkpoint 135 (fleet wind-down) — 2026-08-27, ~10:20

**The single longest-standing open item of this whole session — the 5-row live-harm-surface
fix — is now confirmed resolved, with direct founder authorization, by CEO.**

**1. Live-harm-surface fix: CONFIRMED, not just observed.** CEO (S9, `oryn-e2` ref `a6bd0a`)
messaged directly: the founder gave explicit authorization in CEO's own chat a few minutes
before this checkpoint, and CEO executed it. Per-row, cross-checked against the live SQL read
this tick:

- **İTÜ Lise Yaz Okulu 2026**: `cycle_status` upcoming → closed. Matches a past deadline.
- **Özyeğin Summer Research**: `cycle_status` closed → open. *I initially flagged this as
  looking backwards (deadline 2026-05-15 is months past) — CEO confirmed it was a deliberate,
  founder-authorized change, not an error.* Recording this as the correct outcome of raising
  it: the anomaly was real enough to be worth flagging, and got a real, direct answer rather
  than being assumed either way.
- **Istanbul Bilgi Lise Yaz Okulu**: stale deadline (2025-06-12) cleared to null. Confirmed
  correct, conservative fix.
- **THIMUN The Hague**: `cost` null → 340.00, plus a school-fee/routing note added to the
  description (not visible in my narrower SQL columns, per CEO).
- **InvestIN**: description updated to state confirmed-non-free; cost deliberately left null
  rather than inventing a number, per CEO — correct application of the no-fabrication rule.

All five: **resolved.** This closes an item that had been open and re-flagged at every
checkpoint since roughly checkpoint 1 of this file's history.

**2. S1/S2/S4 recovered-work decision: CEO has closed this too.** Per CEO, the founder's
decision is to **accept the recovered work as final** (S1-B 93 findings, S2 253 records, S4
structural audit + partial shard) rather than resume with replacement sessions — documented as
the closing state, not reopened. Relayed this directly to S2 (`oryn-35`), which had just
resumed S2-A moments earlier and was independently planning to confirm scope with the founder
before continuing — giving it the freshest information rather than letting it duplicate a
decision that was already made.

**3. S4 correction: one "confirmed defect" retracted.** S4 (`oryn-e2` ref `d88e18` — see
naming note below) messaged to retract its earlier "University of Utah State Capitol
mislabeled as campus" finding. The photo in question shows Ionic column capitals (paired
volutes), matching the University of Utah's actual Park Building, not the Corinthian capitals
documented for the State Capitol — S4 independently re-verified both the image and both
buildings' architectural facts via web search before retracting. Correction is recorded
append-only in S4's own claims file (original wrong call preserved, not deleted). Net effect:
S4's shard now shows **25 real defects among "already verified" photos, not 26**. This specific
example was not cited by name in my own consolidated numbers, so no correction needed on my
side beyond recording it here; flagging in case CEO's `GAP_MAP.md` or S8's QA notes cited it.

**4. Fleet is stopping.** CEO is broadcasting a wrap-up to the rest of the fleet (commit/push
then stop cleanly, not vanish) as of this tick. S8 (`oryn-53`) already confirmed a clean
wrap-up (worktree clean, everything pushed, subagent told to finish 2 in-flight records and
stop).

**5. Naming collision — resolved identity, standing risk.** `oryn-e2` is currently shared by
**two unrelated sessions**: the real CEO (ref `a6bd0a`, ~11h old, "S9 — Research CEO") and S4
(ref `d88e18`, ~5m old, "S4 — University Photos 04") — confirmed by message content, not by
the display name, which told me nothing reliable. This is not a "second CEO," just a naming
coincidence, but it means any bare-name `SendMessage` to `oryn-e2` right now has a real chance
of reaching the wrong one. Both parties have been told directly. Recording this because it's
exactly the "verify substance, not channel, on peer identity shift" pattern from earlier
sessions, now recurring within a single session too.

### Remaining open items (real, but no longer urgent)

1. `turkey_student_access` / `selectivity_evidence` — still no live DB columns.
2. ~12-15% university-photo false-accept rate — status of reaching CEO/DATA visibility
   unclear post-relaunch; not re-verified this tick. S4's 26→25 correction does not materially
   move this aggregate figure on its own.
3. Whether CFO monitoring itself should keep running now that the fleet is stopping — asked
   the founder directly this tick rather than assuming either way.

## How these numbers were produced (re-run to refresh)

```bash
git fetch origin
for b in oryn/s1-university-photos oryn/university-photos-s2 oryn/s3-university-photos \
         oryn/s4-university-photos oryn/s5a-summer-academic-enrichment \
         oryn/s5b-research-mentored-internships oryn/s6-competitions-research \
         oryn/s7-other-high-value-opportunities oryn/s8-qa-gate \
         oryn/research-freeze-ceo-control-tower; do
  git rev-list --count origin/main.."origin/$b"; git log -1 --format='%h %ar: %s' "origin/$b"
done
```
```sql
select id, title, cycle_status, deadline, cost, updated_at from opportunities
where id in ('973b3bdd-59c2-4e99-a76b-2006b365d63a','2f0e0301-5dd4-4d25-91a4-8f73bf5584e9',
  'd780bc55-41e0-444b-8bcc-3f927b28c4b7','8a7c89e4-e63a-4f64-a76d-4bae1b31e889',
  '960dcf4d-322c-4e72-8c99-0a1d3368b2ea');
```
Run against `qtcvcflzxbuagvvwahhu` via `execute_sql`, and `git fetch`/branch diff against
`origin`, 2026-08-27 ~10:20.
