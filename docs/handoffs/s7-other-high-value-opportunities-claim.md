# S7 — Other High-Value Turkey-Accessible Opportunities (lane claim)

**Claimed:** 2026-08-26, ORYN Research Freeze Week fleet dispatch (Common Operating Contract).
**Branch/worktree:** `oryn/s7-other-high-value-opportunities`, isolated worktree at
`.claude/worktrees/s7-other-opportunities`, branched from `origin/main`@`f7af914`.

## Scope

Two internal sub-agents per the S7 brief:

- **Agent A** — scholarships, student awards, merit awards, research-paper opportunities,
  academic journals, essay publication, student publications, literary/science publications.
- **Agent B** — leadership programs, social-impact programs, fellowships, youth councils,
  social entrepreneurship, year-round academic programs, online programs, online mentorship,
  Türkiye-based opportunities with credible international relevance.

Target: ≥140 unique PRODUCTION_READY records combined. Target user: a high-school student
based in Türkiye intending to apply to universities abroad.

## File ownership (prefix-isolated, shared `data/research/opportunities/` directory)

`s7a1_*` (scholarships/awards), `s7a2_*` (research-paper/journals/publications),
`s7b1_*` (leadership/fellowships/social-impact), `s7b2_*` (online/year-round/Türkiye-based) —
all under this worktree only. No other lane's files touched.

## Dedup baseline established before starting (live DB + existing committed research)

Live `opportunities` table already has (do not re-propose): scholarship (9) — Coca-Cola
Scholars, Cooke College Scholarship, Coolidge Scholarship, Davidson Fellows, QuestBridge,
RISE for the World, Ron Brown Scholar, Gates Scholarship, Türkiye Scholarships Bachelor's.
fellowship (5) — Ashoka Young Changemakers, BRI Student Fellowship, Girl Up Project Awards,
TechGirls, Three Dot Dash. volunteering (7) — Alpha Leo Club, Geleceği Eşitle, İBB Genç
Gönüllü, Rotary Interact Club, Schoolhouse.world, Duke of Edinburgh Türkiye, Young Guru
Academy. entrepreneurship (7) — Conrad Challenge, Diamond Challenge, Genç UPSHIFT,
GençBizzTech, JA Company Programme (Europe), LaunchX, Young Enterprise UK. student_program
(7) — Erasmus+ Youth Exchanges, EYP Türkiye, Gençlik Merkezleri e-Genç, Girl Up Club, Girl Up
Global Teen Advisor Board, İstanbul Kent Konseyi Gençlik Meclisi, UK Youth Parliament.
online_program (6) — Columbia Pre-College Online, Coursera, Inspirit AI Scholars, Stanford
ULO, UNO (Stanley Prep), Wall Street 101. research/journals (6 relevant) — AJSR, CJSJ, IJHSR,
JEI, JRHS, STEM Fellowship Journal.

Already-researched-but-not-necessarily-ingested (from uncommitted-but-present
`leadership_batch1-5_2026-08-21.jsonl`, `thincat_scholarship/entrepreneurship/volunteering_
2026-08-21.jsonl`, `discovery_scholarship/fellowship/volunteering/online_program_
2026-08-22.jsonl` — these files exist in the shared main checkout, not yet committed by
whoever produced them; left untouched per parallel-session protocol): European Youth Event
(EYE), Euroscola, INJAZ Al-Arab, Peace First Grants, THIMUN The Hague Conference, GençBizz
Lise Girişimcilik Programı, TEGV Gönüllülüğü, European Solidarity Corps, Congress-Bundestag
Youth Exchange (CBYX), Kennedy-Lugar YES Program Türkiye, Prudential Emerging Visionaries,
Schulich Leader Scholarships, Loran Award, TD Scholarships for Community Leadership, TEV
Mesleki Ortaöğretim Bursu, Türk Kızılay Ortaöğrenim Bursları, Cooke Young Scholars Program,
EUNICE MOOCs, Youth Engagement Summit (YES), Lise Afet Bilinçlendirme Eğitim Projesi (LABEP).

Full list of ~110 filenames already present under `data/research/opportunities/` surveyed
for prefix collision (none of `s7a1_/s7a2_/s7b1_/s7b2_` in use).

## Status

ACTIVE — dispatching 4 research sub-agents now (A1/A2/B1/B2 split of Agent A / Agent B for
tractable batch sizes). Will update this file at close-out with final counts per the
contract's handoff format.
