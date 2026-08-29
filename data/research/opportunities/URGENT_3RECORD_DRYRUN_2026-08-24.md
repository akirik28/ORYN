# Urgent 3-record dry-run — Marshall / Blackstone / HKUST

Prepared by ORYN-CEO per founder approval 2026-08-24. **No production write yet.**
P1-only facts. Source records: `cr1_research_batch4.jsonl` (CR1-151, CR1-154),
`summer_findings_2026-08-23.jsonl` / `summer_proposals_dryrun_2026-08-23.jsonl` (HKUST),
each cross-checked against the live DB before this doc was written.

Clock note, kept separate per founder instruction: the DB's `current_date` runs UTC;
the founder's local clock is UTC+3. "Days left" below is given from **both** references
where it matters. This is a Phase 30 / product-timezone issue, not a blocker here.

---

## 1. The Marshall Society Essay Competition 2026

| Field | Value |
|---|---|
| **New vs existing** | **New.** Zero rows match `%Marshall Society%` in the live DB — confirmed by direct query, not inferred. |
| **Official source** | `https://marshallsoc.org/marshall-society-essay-competition-2026/` — operator's own competition page. |
| **Category** | `competition` |
| **Current status/cycle proposed** | `status = active`, `cycle_status = open` |
| **Exact deadline + timezone** | **2026-08-30**, verbatim *"30th August 2026"*. **Time-of-day cutoff not stated on the official page** — unresolved. Days left: **7** by DB clock (UTC), **6** by founder's local clock (UTC+3). |
| **Age/grade** | Verbatim: *"Open to all students who have not yet begun their university studies."* Not a grade or age figure — broader than most: a gap-year student who hasn't started university still qualifies. |
| **Country eligibility** | **NOT STATED on the official page.** Secondary sources say "worldwide," but the page itself is silent on location — silence is not an inclusive claim. **Not writing `eligible_countries` or any open-country flag.** |
| **Cost/fee** | **NULL.** Secondary sources say "entirely free"; the official page states no fee either way. Submission is via a Google Form with no payment step, which is *consistent* with free but not a confirmed statement. Per the founder's rule, this stays NULL, not `0`. |
| **Application URL** | Submission via a Google Form linked from the competition page (no separate stable URL to store; `official_url` above is the correct field). |
| **Unresolved fields** | Cost (unconfirmed), word limit (secondary sources say ~1,500 words, unverified), country eligibility, prize amounts, **relationship to the University of Cambridge — the operator's page makes no such claim**, and the exact submission-time cutoff on 30 August. |

**Note on the Cambridge question specifically**: the Marshall Society is widely understood as Cambridge's economics society, but the page retrieved does not state this. After the Blackstone case below — a similarly-named competition that explicitly *disclaims* a Cambridge connection — this record does not assert an affiliation the operator itself doesn't claim. Recording "probably Cambridge" is exactly the failure mode Blackstone's own page warns against.

**Why it's here**: Economics measures at 2 actionable rows against the product's own onboarding interest list (`INTEREST_SUGGESTIONS`), despite Economics being AGENTS.md's own worked example throughout the spec. Free, single-essay, no team, no institution, no nomination — one of the lowest-barrier entries found tonight.

---

## 2. The Blackstone Law Review Competition — Junior Division

| Field | Value |
|---|---|
| **New vs existing** | **New.** Zero rows match `%Blackstone%` in the live DB. |
| **Official source** | `https://www.theblackstonereview.org/` — operator's own page. |
| **Category** | `competition` |
| **Current status/cycle proposed** | `status = active`, `cycle_status = upcoming` (registration has not yet opened) |
| **Exact deadline + timezone** | Two dates, not one — this is the record's own flagged gap: **registration opens 2026-09-01** (the near-term action), **submission deadline 2027-03-31** (the substantive one), late window closes 2027-04-10. No timezone stated on the page. Registration opens in **9 days** by DB clock, **8 days** by founder's local clock. |
| **Age/grade** | Verbatim: *"secondary and high school students"* worldwide; **minimum age 13**; under-18s require parental consent. |
| **Country eligibility** | **WORLDWIDE** — verbatim *"Junior Division: 'secondary and high school students' worldwide."* This is an explicit, stated claim (unlike Marshall above), so writing `country_eligibility_confirmed_open = true` is warranted here. |
| **Cost/fee** | **`0.00`** (confirmed free) for the normal path — verbatim *"Registration and submission by the 31 March deadline are entirely free."* Caveat to carry in the description: an optional **£15 late-entry fee** applies only to the 10-day late window after 31 March. |
| **Application URL** | `https://www.theblackstonereview.org/` (registration process not yet open; no separate portal URL published yet). |
| **Unresolved fields** | Any track record — entrant counts, number of past editions run, none published (expected, since the operator's page gives no history). |

**Identity check that mattered**: search results present this as *"The Blackstone Law Review Competition — Cambridge,"* and the name reads as a UK legal institution. **The operator's own page explicitly disclaims it**: *"It is not affiliated with, endorsed by, or connected to the University of Cambridge or any of its constituent colleges."* The organiser is **Quant Terminal LLC**, a private company. Trusting the search framing would have recorded a Cambridge-affiliated competition that does not exist — this is the exact failure mode found repeatedly tonight (Oxford Royale, same shape).

**Prestige caveat, worth carrying into the description**: no institutional affiliation, no independent evidence of standing found. Recognition tiers reach down to the top 20% — generous, and a "top 20%" certificate should not be described to a student as comparable to an olympiad placement. Free and well-designed, but should be presented as a well-run open competition, not a prestige credential.

**Why it's here**: Law measures at **zero** actionable rows against the product's own onboarding list — one of 16 interests offered at onboarding, with nothing behind it. This is the first credible candidate found. Format is genuinely accessible: 2,500–3,000 word essay, "closed universe" (all materials in a provided case packet, no external legal research needed) — the same accessibility property as IOL's "no prior knowledge required," and rare at this level.

---

## 3. HKUST I·ELITE Pre-University Scholars Program

| Field | Value |
|---|---|
| **New vs existing** | **Existing.** Row `f3cda419-64ae-4bac-bda9-3d1c6ccbbc37`, currently titled just *"Hong Kong University of Science and Technology (HKUST)"* — an institution name, not the programme name. |
| **Official source** | `https://join.hkust.edu.hk/ielite` — this is already the row's stored `official_url` and is correct, which the source record notes is rarer than it should be in this corpus. |
| **Category** | `summer_program` (current, unchanged) |
| **Current status/cycle** | **`status = under_review`, `verification_state = unverified`, `cycle_status = unverified` — per founder instruction, this dry-run proposes field corrections but does NOT flip status. HKUST stays `under_review` unless a separate, explicit approval to surface it is given.** |
| **Exact deadline + timezone** | Proposed `application_open_date = 2026-09-11`, `deadline = 2026-11-20` (nomination period), timezone **stated on source**: *"Hong Kong Time 23:59."* Days until window opens: **19** by DB clock, **18** by founder's local clock. Also on record: *"Announcement and Acceptance of Nominations Nov 30, 2026 (Rolling-basis from Oct 15, 2026 onwards)"* — a third date the single `deadline` field cannot hold. |
| **Age/grade** | Verbatim: *"Year 11 / Grade 10 / Form 4 / 高一 or above"* — expressed across four school systems at once, unusually good for an international audience. No numeric age given. |
| **Country eligibility** | Not stated as a country restriction on the page. The binding constraint is structural (below), not geographic. |
| **Cost/fee** | Proposed **`cost = 0`** (confirmed free, not merely unpriced) — verbatim *"Membership Fee **Free**."* |
| **Application URL** | `https://join.hkust.edu.hk/ielite` (same as official source; already correct in the row). |
| **Unresolved fields** | Selectivity mechanism is stated (see below) but `selectivity_evidence` has **no column to store it in** — a standing schema gap, not specific to this row. |

**The structural wall — record, don't hide**: entry is *"by **School Nomination Only!**"*, and the nominee must be *"Ranked in the **top 20% of the grade** or have demonstrated exc[ellence]."* A named percentile threshold plus a nomination requirement is a real mechanism, not prestige language — proposed `selectivity_tier = selective`. Same shape as THIMUN's school-routed registration: a student whose school doesn't participate can't enter, and no age/country/cost field would ever show that. Unlike citizenship, this is a condition a student **can act on** — ask their school — which is why it belongs in the description as an instruction, not a silent exclusion.

**Why it's flagged urgent**: the nomination window opens in under three weeks and almost nothing else in the corpus can tell a student to do something *this month* — most remaining live opportunities are either closed or open in December–February.

---

## Summary for approval

| # | Record | New/Existing | Deadline (DB / local) | Cost | Country | Blocking gap |
|---|---|---|---|---|---|---|
| 1 | Marshall Society Essay | New | 2026-08-30 (7d / 6d) | NULL | silent, not written | time-of-day cutoff unstated |
| 2 | Blackstone Junior | New | reg. opens 2026-09-01 (9d / 8d); submit 2027-03-31 | 0.00 | worldwide (confirmed) | none blocking |
| 3 | HKUST I·ELITE | Existing, stays `under_review` | window opens 2026-09-11 (19d / 18d) | 0 (proposed) | not stated | remains hidden pending separate approval |

Awaiting go-ahead to write records 1 and 2. Record 3 is field-correction-only and does not surface the row.
