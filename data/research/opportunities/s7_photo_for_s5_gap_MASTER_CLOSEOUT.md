# S7 → S5 Photo-Gap-Fill — Master Closeout

CEO reassignment after S7's own photo pass: extend the same methodology to S5's records. Before
dispatching, verified S5's actual branch content directly rather than trusting the assignment's
"never touched images" framing — S5A and S5B had each already sourced real photos for a majority
of their own records (30/37 and 6/23 respectively). Real gap: **23 records**, not 38 from
scratch. One further finding: S5B-0021 "Science Mentorship Institute" is the same entity as
S7's own S7-oryn4d-0063 (sci-mi.org) — a genuine cross-lane duplicate, already photo-resolved on
S7's side (no-candidate-terminal), flagged to CEO for DATA's eventual record-merge rather than
re-worked here.

## Scope

23 records: S5A's 7 remaining PRODUCTION_READY records without a photo, S5B's 16 remaining
VERIFIED_CURRENT records without a photo (of 17 originally identified — the 17th, Science
Mentorship Institute, is the cross-lane duplicate above). Output matches each lane's own native
schema (S5A: nested `image_proposal`; S5B: flat top-level fields) so it can merge directly into
their files rather than requiring reshaping.

## Results

| Outcome | S5A (of 7) | S5B (of 16) | Total |
|---|---|---|---|
| **Verified** | 7 | 2 | **9** |
| **Genuine gap** (real component confirmed, no photo found) | 0 | 3 | **3** |
| **Terminal, correctly resolved** (online-only) | 0 | 11 | **11** |

S5A's batch skewed heavily toward genuine in-person summer programs with confirmable current
host campuses, hence 7/7 verified. S5B's batch skewed toward online mentorship/research
programs, hence the high online-only-terminal count — both distributions are honest reflections
of what each lane's records actually are, not an artifact of search effort.

## Notable findings

- **S5A-0049 (Ross Mathematics Program)**: the best-looking initial candidate — an official
  2012 photo with the program's name baked into the image — was caught as likely stale by
  cross-checking S5A's own `host_institution` field before finalizing (the program has since
  moved off its original host to a two-site Otterbein/Rose-Hulman structure). Swapped to a
  current Otterbein campus photo; kept the 2012 photo flagged as an alternate rather than
  discarding the finding.
- **S5A-0001 (Mathcamp)**: S5A's own record noted the 2026 host campus as "not independently
  confirmed" — resolved directly from mathcamp.org's own homepage (Champlain College) during
  this pass, a small factual assist beyond just the photo.
- **S5B-0025 (Zooniverse) / S5B-0026 (iNaturalist)**: Zooniverse's own 121 Commons hits were
  entirely logos/avatars (host-institution fallback used instead — Adler Planetarium);
  iNaturalist yielded a genuine program-specific photo (someone using the app in the field),
  stronger evidence than a fallback.
- **Noise-hit discipline held**: several large raw hit counts on Commons searches were
  confirmed pure noise on inspection (VTSP's 46 hits were all an unrelated Thai airport;
  "Medical Aid"+internship's 40 hits were all unrelated organizations) — hit count was never
  treated as a signal by itself.
- **3 genuine gaps, not silently closed**: IMA Healthcare Internship (confirmed in-person,
  Mombasa flagship site, no hospital photo found), ASDRP (confirmed physical Fremont, CA lab,
  no facility photo found), The Intern Group (confirmed 9 in-person host cities, no
  company-specific photo found — generic city photos explicitly rejected as not entity-specific).

## Operational finding, third independent occurrence tonight

Both sub-agents on this pass hit the same shared/contested Browser pane issue already flagged
and now fleet-broadcast by CFO (tab count climbing unexpectedly, screenshots intermittently
returning page-chrome only) — both recovered using the now-standard mitigation (claim/reselect
a dedicated tab, re-verify via fresh screenshot before trusting anything). No unverified content
made it into either output.

## Schema-convention note for whoever merges this

S5A's actual live files use slightly different field conventions than this pass's template
(URL format details, `host_campus`/`venue` as an enum rather than free-text `image_depicts`,
`rights_status` using `cleared_*` keywords in places rather than a raw license string) — flagged
by the S5A sub-agent so the merge preserves S5A's own conventions rather than overwriting them
with this pass's template shape.

## Files

`s7_photo_for_s5a_gap.jsonl` (7, S5A's native schema), `s7_photo_for_s5a_gap_CLOSEOUT.md`,
`s7_photo_for_s5b_gap.jsonl` (16, S5B's native schema), `s7_photo_for_s5b_gap_CLOSEOUT.md`,
this file. Proposals only — not merged into S5A/S5B's own files (their worktrees confirmed
untouched), for S5A/S5B/DATA to pull in.
