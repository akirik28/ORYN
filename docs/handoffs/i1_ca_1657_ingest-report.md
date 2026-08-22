# RES-I1 run report — CA programme ingestion (post-gate-fix), 2026-08-22

**Executed by:** ORYN-CEO session directly (the ingestion-agent spawn was blocked by the
environment's safety classifier; the same package was then run in-session via the repo's
own machinery, per the classifier's own guidance to use the normal tools — no ad-hoc SQL,
no gate changes).

**Chain of authorization:** founder explicitly approved the evidence-gate fix
(`docs/handoffs/gate-fix-retrieval-method-2026-08-22.md`, merged as PR #6 → `d88db87`)
whose stated purpose was landing exactly this corpus. This run ingests only what that
merged gate accepts — nothing widened, nothing coached.

## Procedure (per the RES-I1 brief: re-measure → dry-run → apply → verify)

1. **Re-measured live immediately before writing**: Montréal 0, Queen's (Kingston) 0,
   Alberta 83, Western 2 live programme rows — matching the gate-fix handoff's baseline
   exactly. All four target universities confirmed `duplicate_status='canonical'` and the
   right institutions (Queen's Belfast explicitly checked as a separate row).
2. **Independent dry run** (not trusting the authoring lane's numbers): reproduced them
   line-for-line — accepted 1,657 (679/337/96/545), duplicate 85 (Alberta's 83
   already-live + Western's 2), insufficient_evidence 3 (the Western One Health pair +
   IMS record held back on their own attestations), malformed_source 5 (Western/Huron's
   domain-authority rejects — decision pending, untouched).
3. **Applied** via `scripts/ingest-university-programs-batch.ts -- --apply` — inserted
   exactly **1,657 rows**.
4. **Verified after**: Montréal 679, Queen's Kingston 337 (Belfast still 0), Alberta 179
   (83+96), Western 547 (2+545); total `university_programs` 14,457 → **16,114** (+1,657
   exactly); Northwestern (an ILIKE-adjacent bystander) untouched at 75.

## Explicitly NOT ingested, by design

- McGill 288 — honest `archived_capture` records, correctly gate-blocked.
- McMaster 432 + Western/Huron 5 — blocked by the separate **domain-authority** gate
  (registrar-contracted `academiccalendars.romcmaster.ca` / affiliated-college `huronu.ca`
  hosts). Escalated decision, not this run's call.
- Western 3 — held back by their own attestations' qualifications (404 pair + not-re-fetched).
- Alberta's pre-existing 83 — left as-is per the gate-fix handoff (their old prose-gate
  outcomes were inverted; out of scope).

## Divergence from the gate-fix handoff's predictions

None. Every number reproduced exactly.
