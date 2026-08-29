# S3-Review-A — Independent Review of S3-A's University Photos

**Reviewer:** S3-Review-A. **Input:** `data/research/university-photos/s3_photos_agent_a_2026-08-26.jsonl`
(126 records researched by S3-A). **Output:** `data/research/university-photos/s3_review_of_a_2026-08-27.jsonl`
(92 records reviewed — not all 126; scope defined below).

## Scope and method

Per the review brief, this was a targeted audit, not a full re-research of all 126 records:

| Category | Count | Selection |
|---|---|---|
| All `VERIFIED` records | 48 | 100% of the claimed-clean, license-verified set |
| Handoff "worth a reviewer's specific double-check" | 4 | rn513, rn518, rn529, rn629 (the other 6 named in that section were already in the VERIFIED 48) |
| Random sample of remaining `CANDIDATE`/`RIGHTS_REVIEW_REQUIRED` | 37 | Seeded random sample (seed 20260827) of the 71 not already covered, spread across the full rn range (507-631) |
| `NOT_FOUND` | 3 | 100% — fresh search attempt on each |
| **Total reviewed** | **92** | 73% of the 126-record shard |

For every VERIFIED record: downloaded the actual image, viewed it directly, and independently
fetched its Commons file page to confirm (a) the claimed license is genuinely what's stated there
and (b) the file's own title/description/category corroborates the claimed institution — not just
that the record's fields say so. For CANDIDATE records: same visual check (real photo, correct
institution, no dominant logo), without a license check since none is claimed. For NOT_FOUND: fresh
Wikipedia + Commons searches, including checking category names S3-A may not have tried.

All 89 images with a URL were freshly downloaded in this session directly from the `image_url` in
the input file (Wikimedia Commons requests used a descriptive User-Agent header, which cleared up
the rate-limiting the task brief warned about). Note for the record: this session's scratchpad
directory was not empty at start — it already contained substantial prior working files (downloaded
images, draft notes, batch files touching rn ranges well beyond this task's 507-632 shard, apparently
from other agents' work, e.g. files named `agent_b_records*.json`, `spotcheck-a/`, `spotcheck-b/`,
`reviewb_imgs/`). None of that pre-existing content was read or used for any judgment in this review;
all 92 verdicts below come from images and source pages fetched fresh in this session and inspected
directly. Flagging this only because it's an anomaly worth knowing about, not because it affected the
output.

## Verdict breakdown (92 reviewed)

| Verdict | Count |
|---|---|
| `CONFIRMED` | 86 |
| `DOWNGRADED` | 3 |
| `REPLACED` | 2 |
| `UPGRADED` | 1 |

The random sample of 37 previously-unexamined `CANDIDATE` records came back **100% clean** — no
issues found. Every problem this review surfaced was concentrated in the higher-scrutiny buckets
(the full VERIFIED set, and the records S3-A itself or the orchestrator had already flagged as
lower-confidence), which is exactly where you'd want problems to concentrate if S3-A's own
self-assessment was accurate.

## rn617 — Manipal Academy of Higher Education (the orchestrator's flagged judgment call)

**Verdict: DOWNGRADED.** Visually confirmed the orchestrator's finding: a large, brightly-colored
"State Bank of India" branch sign occupies roughly a quarter to a third of the frame in the
foreground of an otherwise real, correctly-identified Manipal Institute of Technology academic
building photo (CC BY-SA 4.0 genuinely confirmed on the Commons file page).

**My call: the bank signage disqualifies this specific photo for production use.** Reasoning:
- It isn't the university's *own* branding, so it wouldn't trip a "university logo" check — but it
  is a large, unrelated third-party commercial sign, which is a distinct problem from that.
- ORYN's own design philosophy (AGENTS.md) explicitly calls for "premium, calm, credible" with no
  clutter. A prominent bank ad on a "this is your target university" card fails that bar regardless
  of licensing correctness.
- This is separate from the constituent-institute question (MIT-Manipal vs. MAHE) that S3-A already
  investigated and flagged in its own notes — I agree with S3-A's reasoning on that part and am not
  reopening it. My downgrade is purely about the bank-sign composition.
- The license research itself is sound (I independently re-confirmed CC BY-SA 4.0 on the Commons
  file page), so I left `rights_status`/`license_type`/`license_evidence_url` untouched and only
  changed `verification_state` to `CANDIDATE` and `no_logo_verified` to `false`. A future pass just
  needs a different photo or crop of the same or a similar MAHE building — not a rights
  re-investigation.

## Other DOWNGRADED records (found independently, not pre-flagged)

- **rn539, Hacettepe University (VERIFIED → CANDIDATE).** The photo shows only a tree, a birdhouse,
  and a sliver of wall — no campus architecture at all. Checked the Commons file page: its own
  structured data literally tags the subject as "nest box" and "tree." The source is genuinely from
  the right series (Hacettepe University Beytepe Campus, May 2023, CC BY 4.0 — so the institution and
  license are not in question), it's simply a bad frame choice from a 173-photo series. I tried a few
  plausible low-numbered filenames looking for a building shot to swap in but couldn't resolve them
  (the sequence isn't simply zero-padded); recommend a future pass browse
  `Category:May_2023_at_Beytepe_Campus` directly.
- **rn603, Wuhan University of Technology (VERIFIED → CANDIDATE).** A hazy, elevated view of generic
  apartment blocks — no discernible campus architecture, signage, or anything reading as
  "a university" rather than "a hazy city skyline." The Commons file is genuinely categorized under
  Wuhan University of Technology (filename starts "WHUT," correctly distinguished from Huazhong
  University of Science and Technology as the original researcher intended), so this is the same
  failure mode as rn539: correct source, uninformative frame. Same recommendation — needs a
  different photo from the same institution's Commons category, not a rights re-investigation.

Both of these are a real, if narrow, gap in S3-A's own stated audit standard — they explicitly
rejected other existing-DB photos for being "generic scene with no identifiable place" (SUSTech's
unreadable street-intersection shot, for example), but didn't apply that same scrutiny to the actual
pixel content of a couple of their own fresh Commons picks, trusting the category/filename tag
instead of looking hard at what the frame actually shows.

## UPGRADED: rn529, Université de Tunis El Manar

S3-A flagged this as "moderate confidence only... no embedded text to independently confirm the
exact building." I cropped and zoomed the facade sign in the existing photo and it's legible at
higher resolution: **"Institut Supérieur des Sciences Humaines de Tunis" (ISSHT)**. Web research
confirms ISSHT has been a constituent institute of Université de Tunis El Manar since 2000 (multiple
independent Tunisian sources, including the institute's listing on the university's own directory).
This resolves the caveat into a firm, positive identity match. Rights remain unverified (still an
unattributed legacy DB photo), so `rights_status`/`verification_state` are unchanged — this is a
confidence upgrade on the identity question only, reflected in an updated `image_depicts` and
`review_notes`.

## REPLACED: rn586 (PUC-Rio) and rn588 (University of Siena)

Both of S3-A's `NOT_FOUND` conclusions for these two were reasonable given the searches they ran, but
both had a genuine open-licensed photo available that a differently-worded search turns up:

- **rn586, PUC-Rio.** S3-A's notes say the Commons category for "Pontificia Universidade Catolica do
  Rio de Janeiro" (the Portuguese canonical name) doesn't exist / is empty — true as searched. The
  actual category is filed under the **English** name, `Category:Pontifical Catholic University of
  Rio de Janeiro`, and holds 4 files. I found it via the English Wikipedia article's own images.
  Selected `Rio de Janeiro - Pontifical Catholic University.jpg`: a real street-level photo with
  "PUC" lettering and the university's coat of arms on the building facade (modest, not dominant).
  License: dual CC BY-SA 3.0 / GFDL, confirmed on the file page. This is a strictly better outcome
  than the Solar Grandjean de Montigny candidate S3-A considered and correctly declined (that one is
  still unconfirmed as actually part of PUC-Rio; I didn't need it).
- **rn588, University of Siena.** S3-A searched "Universita degli Studi di Siena" and English/Italian
  category variants, surfacing only the medical-instrument museum interior photos (correctly
  declined — those don't depict the institution as a place). The actual category is
  `Category:Università di Siena`, which has real exterior building photos. Selected
  `Siena, palazzo dell'università 01.JPG` — literally "University Palace" — a real, distinctive photo
  of the ochre Sienese palazzo housing the university administration on Banchi di Sotto. License:
  CC BY-SA 3.0, confirmed on the file page. (A second candidate, the Palazzo San Galgano building
  housing the Dept. of Historical Sciences, is also available under a similar license if a future
  researcher wants an alternate photo.)

Both are now `OPEN_LICENSE_VERIFIED` / `VERIFIED` with `research_agent` attributed to
`S3-Review-A` (not relabeled as S3-A's work, since S3-A explicitly and correctly reported not
finding these).

## rn532, Effat University — NOT_FOUND confirmed as genuinely not found

Independently re-attempted: Wikipedia's infobox has only a logo, `Category:Effat University` on
Commons returns 404 (doesn't exist), and a general web image search surfaced only Getty Images
results (not openly licensed) with no Flickr/Commons alternative. Agree this is genuinely
`NOT_FOUND` under a reasonable-effort search — no changes.

## What this implies about the two `NOT_FOUND` misses

Both PUC-Rio and Siena were missed for the same underlying reason: **the Commons category name
didn't match the canonical name/language S3-A searched under** (Portuguese vs. English institution
name; a full official Italian name vs. the shorter category Commons actually uses). This is a
narrow, systematic, and easily-generalizable gap — worth a note for whoever runs the next
`NOT_FOUND` cleanup pass across other shards: when the canonical-language category search comes up
empty, also try the English Wikipedia article's own infobox/body images and an English-name category
variant before concluding not-found.

## Records not in scope for this pass

34 of the 126 records (mostly `RIGHTS_REVIEW_REQUIRED`/`CANDIDATE` records outside the random sample)
were not reviewed here. None of them were flagged by S3-A or the orchestrator as lower-confidence, and
the 37-record random sample that *was* reviewed came back entirely clean, which is a reasonable (though
not certain) signal about the quality of the remaining unreviewed set.
