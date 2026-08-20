# Morning report — Claude 2 (programs & opportunities intelligence), 2026-08-18

Covers the "ORYN DATA BASE — PROGRAMS & OPPORTUNITIES INTELLIGENCE" pivot, from when it
started this session through the last commit before this report. Branch
`oryn/programs-opportunities-intel`, 9 data commits (`c39a536`..`337143c`), all pushed. Full
batch-by-batch narrative, including things tried and rejected, is in
`docs/handoffs/claude2-programs-opportunities.md` — this report is the measured summary on
top of it.

## Completed

- Mined the founder's Drive opportunity corpus (`04` summer programs, `05` online
  programs/internships, `06` competitions) at their highest-confidence tiers, hand-verifying
  every record rather than trusting the corpus's own status column — found and worked around
  a real duplicate-emission parsing bug in `04`, and caught several records where the
  corpus's "2026 cycle confirmed" tag didn't match its own captured evidence.
- Confirmed `02_ORYN_University_Programs.xlsx` was already fully mined (0 of 159 clean-tier
  rows missing from the live table) before doing any fresh research, rather than assuming.
- Independent research (WebSearch + WebFetch against official pages, not corpus-derived) to
  close the founder's explicitly-named subject and category gaps: medicine, psychology,
  architecture, international relations, law, and finance in `university_programs`;
  scholarship and fellowship in `opportunities` — **fellowship was the last of the seven
  founder-named opportunity categories still at zero; it is not anymore.**
- Attempted to bulk-map `03_ORYN_Program_Requirements.xlsx` into `university_requirements`.
  Found the source file's per-column structure is unreliable (content misfiled across
  columns, one cell leaking raw scraper metadata) across multiple universities and columns —
  documented with specific examples, did not bulk-ingest, built a smaller hand-verified batch
  from this session's own already-verified research instead.
- Mid-session, a live re-fetch turned up 6 opportunities rows from a parallel session working
  the same pipeline concurrently (not this session's work) — verified they were well-formed,
  left them untouched, used the live table as fresh ground truth going forward. See
  `[[project_oryn_parallel_sessions]]` (this agent's persistent memory) for the pattern this
  confirms: the live database, not just git branches, is a real concurrent-write surface.

## Integrations

No new external integrations touched this pivot — same stack as the rest of ORYN
(Supabase, Google Drive MCP for the founder's corpus, WebSearch/WebFetch for independent
research). `SUPABASE_SECRET_KEY` remains absent from this environment (a standing,
previously-reported blocker) — every write this session went through the Supabase MCP's
`execute_sql` directly, replicating each pipeline script's own decision logic
(`decideIngestion()`, imported and run for real via a temporary `tsx` script each batch, never
reimplemented) rather than bypassing it.

## Database — measured counts

**University programs**
```
university_programs total:                195   (baseline this session: 182,  +13)
universities with >=1 program:              49   (baseline: 49, unchanged -- all growth was
                                                    new subjects at already-covered schools,
                                                    not new schools, per the hard rule)
universities with >=5 programs:              8   (baseline: 0)
subject_taxonomy, before -> after (only changed ones):
  medicine:              0 -> 4
  psychology:             0 -> 3
  architecture:           0 -> 2
  international_relations: 2 -> 3
  law:                    3 -> 5
  finance:                4 -> 5
program_research_queue outcomes: accepted 198, unresolved_university 32,
  insufficient_evidence 29 (includes pre-session history; this session's own 13 accepted
  programs are all present with matching queue rows, 1:1)
```

**University requirements**
```
university_requirements total:    41   (baseline: 15,  +26)
rows with program_id set (program-specific, not just institution-level): 26 -> 26
  (baseline: 0 -- all 15 pre-existing rows are institution-level only)
```
The other ~149 programs in file 03's clean tier are deliberately NOT mapped — see "Completed"
above and the full writeup for why.

**Opportunities**
```
opportunities total:               52   (baseline: 11,  +41 combined across this session
                                          and the parallel session's 6-row batch;
                                          +35 from this session's own 5 batches)
verified_current:  47   verified_historical: 1   unverified: 4
by category, before -> after:
  summer_program:     3 -> 20
  competition:         4 -> 14
  online_program:      0 -> 6   (new category added this pivot -- migration 0045)
  research:            1 -> 4
  entrepreneurship:    3 -> 3   (unchanged)
  scholarship:         0 -> 2
  fellowship:           0 -> 2
  internship:           0 -> 1
```
Every one of the seven categories the founder named in PRIORITY 3 now has at least one live,
`verified_current`, officially-sourced entry.

## Founder-corpus coverage

- Candidates discovered across `04`/`05`/`06` (unique, deduped): 215 (`04`) + 14 (`05`) + 55
  (`06`) = 284 raw candidate rows surfaced from the founder's own files.
- Candidates independently verified and promoted from that corpus: 13 + 9 + 8 = **30** (the
  strictest, page-confirmed, currently-evidenced tier of each file — the remainder needs
  further per-record review before it's trustworthy, documented file-by-file in the full
  handoff). Of these 30, **6 (SIP, Wall Street 101, Inspirit AI, IYPT, BrUMO, CMIMC) started
  as a corpus identity row but had failed/blocked automated evidence** — promoted only after
  this session live-re-verified each one directly via WebFetch, rather than trusting or
  discarding the corpus's own stale attempt.
- New candidates found via independent research, with no corresponding row in any founder
  file at all: **5** opportunities (Coca-Cola Scholars, QuestBridge, TASS, BRI Fellowship,
  TechGirls) + **13** university programs (medicine/psychology/architecture/international
  relations/law/finance across 8 universities).

## Claude 1 handoffs

None written this session. No unresolved-university case came up in either the corpus batches
or the independent research — every program/opportunity resolved to an existing spine
university via exact name or registered alias, or (for opportunities, which don't require
university resolution) simply didn't need one.

## Tests / build

Full `lint` / `typecheck` / `test` (725/725) / `build` gate run and clean after every single
batch this session, 9 times over — never batched or skipped. Same gate clean as of this
report.

## Genuine limitations, stated plainly

- `university_requirements` covers only the 10 programs this session personally researched
  end-to-end — the other ~185 live programs have no structured requirement data yet, and the
  one corpus file that could have supplied it in bulk (`03`) turned out not to be reliable
  enough to trust mechanically. `03B` (the richer sibling file) was never even sampled for the
  same defect.
- `physics` and `entrepreneurship` remain the thinnest university_programs subjects (1 program
  each) among the founder's named priority list.
- `internship` (1) and `research` (4) are the thinnest opportunity categories.
- The corpus files' lower-confidence tiers (`04`'s "official/provider search evidence" bucket
  specifically, ~102 records) were deliberately not touched — ambiguous whether that status
  means a fetched page or a search snippet, and this session's discipline throughout was to
  not promote anything without a genuine page read.

## Recommended next focus

Two genuinely comparable next steps, both already scoped in the working handoff doc — picking
the higher-leverage one rather than asking: **continue closing `university_programs` subject
gaps** (physics, entrepreneurship, plus the remaining founder-named subjects) using the same
already-in-spine-university approach that worked cleanly seven times this session, since it's
proven fast, safe, and directly serves PRIORITY 1. The `03`/`03B` requirements-file salvage
job is real but lower-leverage per hour spent (expensive per-row review for uncertain payoff)
and can wait for a dedicated pass.
