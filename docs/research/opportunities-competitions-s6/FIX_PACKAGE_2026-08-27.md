# S6 — Fix package: 2 confirmed live defects, ready to close

Both defects independently confirmed multiple times across separate research passes (cr1,
2026-08-23/24; S6-A/S6-B, 2026-08-26/27). Dry-run proposal only — this lane has no write access;
CEO/DATA executes.

## Fix 1 — Stockholm Water Prize: wrong entity live and student-facing

| Field | Old value | New value |
|---|---|---|
| `c8eb3d40-f8b8-461a-bd84-7afaf206ead4` (title "Stockholm Water Prize") | `status='active'`, `verification_state='unverified'`, no organizer/fields on file | Retire (`status='disabled'` or equivalent non-live state) |
| `17aeb772-5ee4-4448-a4af-36cb508ab305` (title "Stockholm Junior Water Prize") | `status='under_review'`, minimal fields | Promote to `status='active'`; adopt this session's enrichment: organizer "Stockholm International Water Institute (SIWI)", Türkiye's national route confirmed via **DSİ Genel Müdürlüğü (State Hydraulic Works)**, ages 15-20, 39-country eligibility |

**Why**: `c8eb3d40` is a professional career-achievement award for established researchers, not a
youth competition — a Turkish high-schooler would be shown something they cannot enter. The real
youth prize (`17aeb772`) already has full Türkiye-access data from this session.

**Source**: cr1_2026-08-23_HANDOFF_TO_CEO_DATA.md (original finding) → independently re-confirmed
by S6-A (`s6a_science_env_batch1.jsonl`, S6A-0030) and S6-B (`s6b_turkey_and_mixed_batch1.jsonl`,
S6B-0025) this session, both citing SIWI's own site (stockholmwaterfoundation.org /
stockholmwaterprize.org's own nomination pages) directly.

## Fix 2 — FRC / FIRST Robotics Competition: duplicate pair

| Field | Old value | New value |
|---|---|---|
| `dfb94075-d86e-4cba-ace2-a25953e2989b` (title "FRC (FIRST® Robotics Competition)") | `status='under_review'`, no organizer, stub | Retire / mark as duplicate of `db25d327` |
| `db25d327-ee37-4414-9003-f5654f64d3aa` (title "FIRST Robotics Competition") | `status='active'`, organizer "FIRST", no Türkiye-specific data | Keep as canonical; add Türkiye national-organizer data: **frcturkiye.org**, Fikret Yüksel Foundation, 8 regional events run in Türkiye |

**Why**: "FRC" is the standard abbreviation for FIRST Robotics Competition — same underlying
competition sitting as two rows, one an empty stub. Merging removes a false impression of two
separate options and adds real Turkish-access data the surviving row doesn't have.

**Source**: S6-A this session, `s6a_medicine_robotics_other.jsonl` (S6A-0036) — confirmed via
frcturkiye.org's own site (also independently named in the founder's seed PDF's competitions
list, "FRC (FIRST® Robotics Competition) ... https://frcturkiye.org/ Fikret Yüksel Foudation").

## Not included

No other live-DB writes are proposed here — everything else from this lane's research remains
dry-run proposals in `s6a_*.jsonl`/`s6b_*.jsonl`, not summarized in this fix package since those
are net-new/enrichment candidates, not confirmed live defects.
