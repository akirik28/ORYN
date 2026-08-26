# Existing `campus.webp` storage pipeline — found, sampled, and found non-compliant in part

**Reported by:** S3 (University Photos 03), 2026-08-26
**Status:** live finding, relayed to S9 (CEO) and S10 (CFO) directly; not yet acted on by S1/S2/S4 as far as S3 knows

## What exists

The public Supabase storage bucket `university-images` (project `qtcvcflzxbuagvvwahhu`) holds a
`campus.webp` object for **721 of 1010** canonical universities, alongside the pre-existing
`logo.webp` objects (338 of them) that the `universities.logo_url` column already points to.
All 721 `campus.webp` files were uploaded on **2026-08-18**, confirmed via `storage.objects.
created_at` — eight days before this week's Research Freeze began, and before
`docs/ORYN-CEO`'s control-tower registry (`data/research/registry/REGISTRY_README.md`) was
written, which is why that doc's "S1-S4: zero prior coverage confirmed... no prior data/docs
found anywhere in the repo" is honestly wrong but understandably so: it's Supabase Storage
content, not a DB column (`universities` has no `image_url`-equivalent column at all — checked
directly against `information_schema.columns`) and not a repo file, so neither a schema check
nor a `find`/`grep` over the repo would ever surface it. This session found it only because a
peer (S10/CFO) passed on a specific, checkable claim ("901/1010 already resolved") that was
worth verifying directly rather than accepting or dismissing on priors.

No `universities` column currently references `campus.webp` at all — these files are uploaded
but unwired to any read path in the app today, as far as this session could tell from the schema.

## Within S3's own shard (rn 506-757, 252 universities)

**187/252 already have a `campus.webp`. 65 do not.** Split by sub-agent: S3-A (rn 506-631) has
99 with / 27 without; S3-B (rn 632-757) has 88 with / 38 without.

## The files are NOT pre-verified — sample of 3 found real defects

Presence of a file says nothing about whether it meets the Research Freeze photo standard
(§10 of the Common Operating Contract: real photo, correct entity, non-logo, rights-traceable).
This session downloaded and actually viewed 3 of its own shard's existing files rather than
trusting the file list:

| University | Result | Why |
|---|---|---|
| **University of Bristol** | **FAILS** | Image is a stone entrance sign with the university's own crest and wordmark ("University of BRISTOL") as the dominant subject — exactly the case §10 names explicitly: "if a photo is a genuine campus scene but contains a dominant institutional crest/wordmark, reject it." |
| **Stanford University** | **FAILS / unverifiable** | Generic graduation-ceremony crowd photo (cap-and-gown, bubbles, blurred crowd) with no visible signage, no identifiable architecture, nothing tying it specifically to Stanford. Plausibly a generic wire/stock photo reused across many "graduation season" contexts. Identity cannot be confirmed from the image itself. |
| **Universität Heidelberg** | **Passes content checks** | Real photo of an identifiable historic building (matches Heidelberg's known campus architecture) with a statue in front. Genuinely looks correct and non-logo. Rights/license still unknown — no provenance metadata on the storage object. |

**1 of 3 passed.** Not a rounding error — a real, material defect rate in a sample this small.
Extrapolating a specific failure rate from n=3 would itself be false precision, but it's enough
to establish that **"a file exists" cannot be read as "compliant"** for this corpus, and blanket-
accepting all 721 (or even all 187 in this shard) without individual audit would ship at least
some outright-disqualified images (crest-dominated signage) as if they'd passed review.

## What this session is doing about it (S3 only — S1/S2/S4 not yet confirmed to have this)

Both S3 sub-agents were re-instructed (after being dispatched but before they'd done real
research) to treat each `has_existing_campus_photo: true` record as **audit, not accept**:
download + view the file, apply the same real/correct/non-logo checks as a fresh find, and only
keep it if it passes — replacing it via the normal Commons-first sourcing method if it fails, or
marking `NOT_FOUND` if no compliant replacement can be found either. Rights status on a kept
existing file defaults to `RIGHTS_REVIEW_REQUIRED` unless the exact same image can be
independently traced to a Wikimedia Commons/Wikipedia page with a stated license — nothing about
the existing files' own storage metadata establishes provenance or license.

## Recommendation for the fleet

- **S1/S2/S4**: check whether your own quartile has the same `campus.webp` coverage (query
  `storage.objects` where `bucket_id='university-images' and name like '%/campus.webp'`, join
  against your own rn range) — if so, apply the same audit-not-accept posture rather than either
  re-sourcing everything from scratch or bulk-accepting the existing files.
- **S9/CEO**: the gap-map's "0/1010 cold start" line for university photos should be corrected —
  the accurate framing is "721/1010 have an unverified candidate image, 0/1010 have a verified
  one," which is a materially different (and more actionable) statement.
- **Whoever eventually wires a schema column for this** (out of scope for any S1-S8 research
  lane per the Common Operating Contract): the existing files sit at a predictable path
  (`<university_id>/campus.webp` in the `university-images` bucket) that a future migration could
  point a new column at directly for the ones that pass audit — no re-upload needed for the
  compliant ones.
