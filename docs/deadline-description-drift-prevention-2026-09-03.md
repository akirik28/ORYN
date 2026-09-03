# Preventing deadline/description drift — 2026-09-03

Follow-up to the [deadline contradiction audit](opportunity-deadline-contradiction-audit-2026-09-03.md):
eleven rows had a correct, sourced `deadline` sitting next to a `description` that still
claimed no date existed, because three separate write passes — weeks apart, different
lanes — each populated `deadline`/`cycle_status`/`verified_at` and none touched
`description`. Tonight's eleven fixes close what already happened. This doc is about what
stops it happening again, and it leads with a query that works today regardless of whether
anything else here gets built.

## The detection query — the thing that's actually reusable tonight

```sql
-- Deadline/description drift detector. Flags active, deadline-bearing opportunities whose
-- description still contains negative-evidence language about a date -- candidates for
-- human review, not a verdict. Not scoped to any transaction, lane, or time window; run it
-- against the whole catalogue any time, before or after a batch.
select id, title, deadline, cycle_status, last_verified_at
from public.opportunities
where status = 'active'
  and deadline is not null
  and (
    description ilike '%not yet%'
    or description ilike '%not confirmed%'
    or description ilike '%not published%'
    or description ilike '%not posted%'
    or description ilike '%did not include%'
    or description ilike '%check the official%'
    or description ilike '%no deadline%'
    or description ilike '%not stated%'
    or description ilike '%deliberately left%'
    or description ~* 'does not .{0,20}confirm'
  )
order by title;
```

**Run live against `oryn-qa-scratch` tonight: 24 rows**, out of the 94 that carry a
deadline at all — a 74% reduction from "read all 94" to "read these 24," while catching
**100% of the 11 rows this audit independently confirmed needed a fix.** Full recall on the
known cases. What it is not, honestly:

### What it cannot see

**It over-flags.** 13 of the 24 rows are not actually wrong — verified by hand, not
assumed. Two distinct, recurring shapes account for all of them:

1. **The negative-evidence language is about a different field entirely.** Breakthrough
   Junior Challenge's *"not yet 19 by 1 October"* is an age-eligibility clause. CyberPatriot
   and Northwestern NHSI's *"fee not stated"* / *"tuition figures were not published"* are
   about cost. The query can't distinguish "this row's prose is uncertain about dates" from
   "this row's prose happens to contain the word 'not' near an unrelated fact" — it has no
   concept of what a phrase is actually modifying.
2. **The negative-evidence language is about a *different cycle* than the one the stored
   deadline represents.** GENIUS Olympiad, Zero Robotics, YIS Stock Pitch, DNA Day Essay
   Contest, and Stanford ULO all correctly say "[next/2027] cycle not yet announced" or
   "check the official page for the next open window" — true, honest statements about a
   *future* cycle — while the *stored* `deadline` is a different, already-closed cycle's
   real date. The query can't tell "uncertain about the thing this field represents" from
   "uncertain about some other thing this same paragraph also mentions." Upenn Wharton
   Hack-AI-thon is the same shape and was caught the same way independently, by CEO's own
   narrower query, before this one existed — see that finding folded into the corrected
   audit doc.

**It under-flags anything phrased outside its word list**, by construction — a description
that hedges with different words ("unclear," "hasn't been posted," "TBD") would slip past
silently. The list above is exactly the vocabulary this corpus's own research passes
actually used, not a general theory of hedging language — it will need new terms added as
new phrasings show up, the same way the deadline-contradiction audit's own manual read (not
this query) is what surfaced the vocabulary in the first place.

**It cannot resolve who's right.** A flagged row needs the same check every one of the 11
got: find the actual sourced fact (usually already sitting in `data/research/opportunities/`
under some other file name) and confirm which field — deadline or description — is the
stale one. This query narrows the search; it doesn't replace it.

**It only ever looks at `description` vs. `deadline`.** The same failure shape almost
certainly exists for other field pairs this audit didn't check (`description` vs. `cost`,
`description` vs. `eligible_countries`, `current_cycle_label` vs. `deadline`) — out of scope
here, flagged as a real possibility, not measured.

## Why the fix isn't "run a monotonicity check on description"

The obvious-looking answer doesn't work, and this codebase already found out why. Two
existing tools were surveyed before writing anything new:

- **`lib/opportunities/monotonic-guard.ts`** is explicitly "column-agnostic by design" —
  it could in principle evaluate `description` like any other field. But its whole model is
  "is the *proposed* value more informative than the *live* one" — a question with a clean
  answer for a date or an enum, and no answer at all for prose. None of the three drifted
  passes ever proposed a `description` value in the first place (confirmed by reading every
  UPDATE statement in all three — none writes that column), so there's nothing for a
  before/after comparison to compare.
- **`scripts/validate-research-records.ts`** — the actual adopted, reusable validator
  (`npm run validate:research`, four passes: contract/ID/live-identity/monotonicity, with
  new lanes added by extending `LANE_CONTRACTS`) — already tried the free-text version of
  this exact idea for a sibling field. Its own comment on why a `current_cycle_label
  (replacement)` check was built and then removed: *"exact-string inequality is a bad proxy
  for 'meaningfully different' (37 of 43 hits were paraphrase — same underlying fact,
  different wording)."* Comparing two descriptions for "did this get worse" runs into the
  identical problem `description` would hit. This finding doesn't repeat that experiment —
  it takes the documented lesson as settled and designs around it instead.

The actual shape of the bug isn't "the new description is worse than the old one" (nothing
proposes a new description at all) — it's **"the live description asserts something the
live deadline field itself now contradicts."** That's not a before/after comparison, it's a
same-moment consistency check between two live columns, phrased narrowly enough (a fixed,
literal phrase list, not a semantic diff) that it doesn't inherit the paraphrase problem
`current_cycle_label`'s check ran into. That's what the query above is, and it's also why it
can live as a plain SQL statement instead of new application code — the check doesn't need
`monotonic-guard.ts`'s live-vs-proposed machinery, because there's no "proposed" side to
compare.

## Where this belongs — three candidates, weighed

1. **A convention where `deadline` and `description` always travel together in one write.**
   Cleanest in theory. Doesn't survive contact with how these passes are actually built:
   three different lanes, three different formats (raw SQL with an inline comment,
   SQL generated from a hand-reviewed JSONL batch, SQL generated from a validator-checked
   JSONL batch), no single point all of them pass through. Retrofitting "always include a
   description field" into every future ad-hoc SQL file depends on every future author
   remembering a rule that isn't mechanically enforced anywhere — the exact failure mode
   that produced this bug three times already.
2. **A note in whatever brief a research lane gets.** CEO's own framing going in: *"a rule
   nobody reads at 3am is not a fix."* Rejected as the primary answer for the same reason —
   it's the thing that was already implicitly true (every researcher presumably knows a
   stale "not confirmed" sentence is bad) and didn't stop this. Worth keeping as a
   *pointer*, not a rule: a brief that says "run the query in
   `docs/deadline-description-drift-prevention-2026-09-03.md` before finalizing" is a note
   pointing at a mechanical check, not a mechanical check itself.
3. **A check that flags rows whose description asserts a field is empty when it isn't.**
   This is the query above. It's mechanical (doesn't depend on anyone remembering
   anything), it's narrow (literal phrases, not a semantic judgment — avoiding the
   paraphrase trap), and it already exists and already works. The only design question left
   is where it runs.

**The lightest version that actually holds: the query is the fix, not a future check that
implements the query's idea.** Concretely, in two layers, because the pipelines aren't
uniform:

- **For the two passes that were never going to be caught by strengthening any validator**
  (`data/morning/02-veri-doldurma-2026-09-03.sql` and the `night2_2026-08-21` batch — both
  hand-authored SQL, and `night2` isn't a registered lane in `validate-research-records.ts`
  even though it has paired JSONL evidence files) — the fix is procedural and lightweight:
  **run the query above against the specific ids a batch is about to touch, before staging
  the SQL**, and paste any hits into the batch's own header comment the same way source URLs
  already get cited. This costs one query per batch, not a new tool.
- **For batches that already go through `validate-research-records.ts`** (currently `dlopp`,
  `ecw`, `au-r1`, `ca-r1`) — add one shared check to the engine, not per-lane, following the
  file's own stated design ("the four passes above are shared engine, not per-lane code").
  It isn't quite a `MonotonicityCheck` (that interface compares a record's *proposed* value
  against live — there is no proposed `description` to compare). It needs its own small
  category: a live-consistency check that reads the *live* `description` and the record's
  *proposed* `deadline`/`cycle_status`, independent of whether the record proposes touching
  `description` at all. Sketched, not built — this pass didn't touch
  `validate-research-records.ts`'s code:

  ```ts
  // Sketch only -- not wired in. Would need its own list distinct from monotonicityChecks,
  // since it reads live `description` against a DIFFERENT field's proposed value, not
  // before/after on the same field.
  interface LiveConsistencyCheck {
    name: string;
    /** Does the record propose writing a value to this live column at all? */
    triggersOn: (record: Json) => boolean;
    /** Given the row's CURRENT live description, does it contain language this write
     * would falsify? */
    describeConflict: (liveDescription: string | null) => string | null;
  }
  ```

  This only ever helps a batch that already runs the validator, and it would not have
  caught most of tonight's 11 even if it had existed all along — at least four of the
  eleven (BrUMO, Sabancı, World Wildlife Day, Zero Robotics) trace to DLOPP/DLOPP-SP
  research records, a format `validate-research-records.ts` already recognizes as a lane,
  but the rest trace to `night2`'s own dqbatch files (a real JSONL format that was simply
  never registered as a lane) or to standalone research files
  (`summer_findings_2026-08-23.jsonl`, in Rockefeller's case) with no lane contract at all —
  and the validator has no description-consistency check today regardless of lane, so
  *none* of the 11 were actually caught by it as it currently stands. It's still worth
  adding, because the next batch that goes through an already-registered lane gets it for
  free, permanently, per the tool's own "ratchet" design ("a check that caught something
  once runs on every batch thereafter") — it just isn't the fix for tonight's specific 11,
  which the query above already found without it.

Net: the query is doing all the real work either way. Wiring it into the validator makes it
automatic for one class of future batch; running it by hand covers every batch regardless of
format, including the two that caused most of tonight's actual defects.

## What this doesn't solve

Not proposing a fix for the two lanes that produced most of tonight's drift ever adopting a
structured format at all — `data/morning/` packages are, by design, closer to "founder-brief
+ direct research" than a JSONL pipeline, and forcing that into the DLOPP shape would be
solving a problem nobody has. The procedural fix above (run the query first, cite hits in
the header) works without requiring that. Also not measured: whether the same drift shape
exists between `description` and fields other than `deadline` — flagged above as likely, not
checked.
