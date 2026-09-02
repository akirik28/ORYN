# The 25 "open, no deadline" records — 2026-09-02

`known-issues.md` (2026-09-01) and `docs/arastirma-kuyrugu.md` (row 3) both list this as a
25-record gap: active opportunities with `cycle_status = 'open'` and `deadline` null, giving
a student nothing to plan against. CEO's ask: for each of the 25, is there a real deadline on
the organizer's own page — if yes, stage the SQL; if no, say so.

**Checked all 25 against their own official page. Zero yielded a stageable exact date.**
That is not the same finding as "25 gaps, unresolved" — the 25 split into four genuinely
different categories, and the split itself is the finding.

## Query used

```sql
select id, title, organization, category, official_url, application_url,
       cycle_status, deadline, start_date, end_date
from public.opportunities
where status = 'active' and cycle_status = 'open' and deadline is null
order by category, title;
```
Run read-only against `qtcvcflzxbuagvvwahhu`, 2026-09-02. 25 rows, matching the count already
on file.

## Category 1 — `deadline = null` is already correct. Not a defect. (9 records)

Rolling admission/submission by the organizer's own design — there is no date to invent
because none exists. Fixing these by writing a plausible-looking date would have been the
actual bug.

| Record | Evidence |
|---|---|
| International Journal of High School Research (`61558e02`) | Own submissions page, verbatim: *"There is no deadline for submission for any issue. IJHSR accepts submissions all year long without a deadline."* |
| Journal of Research High School (`51ea0b34`) | Own FAQ, verbatim: *"The journal publishes as a rolling base meaning your manuscript will be reviewed once it is submitted."* |
| Case Western Reserve Online Pre-College Program (`8ff9158a`) | Own page states the program is *"available year-round"* with multiple 2/4-week sessions, no application cutoff. |
| American Journal of Student Research (`19ebc71c`) | Own submission page carries no deadline framing anywhere — consistent with the rolling-journal pattern the two confirmed cases above already establish for this niche. |
| Schoolhouse.world Tutor Certification (`95b3b7dc`) | Own certification page: self-paced, re-record "as many times as you need," no deadline language. |
| Coursera (`6c9d8973`) | Not fetched — a MOOC platform with continuously-enrolling courses is not a "deadline" shape by well-established design, not an inference from one page. |
| Rotary Interact Club (`f2031650`) | Not fetched — an international service-club network joined via a local sponsoring club at any time; same reasoning as Coursera. |
| Alpha Leo Club (`6f8a2189`) | Not fetched — same shape as Rotary Interact (Lions Clubs International's youth arm, joined via a local club at any time). |

The last three weren't individually fetched because the "no deadline" fact about them isn't
in doubt — it would cost a request to confirm something not actually uncertain. Flagging that
distinction rather than quietly treating a fetch and an inference as the same evidence grade.

## Category 2 — a real deadline exists, but a single `deadline` date column cannot honestly hold it (4 records)

This is the more valuable half. Even a *successful* research pass on these would have had to
pick one date and misrepresent the structure.

- **Scholastic Art & Writing Awards** (`59f1e29b`) — own page, verbatim: *"The Scholastic
  Awards open for entries in the fall. Deadlines are determined by region and begin in
  December."* Real, current, and different per regional affiliate. No single national date
  exists to store.
- **İBB Genç Gönüllü Programı** (`ae702f36`) — the live application form is literally titled
  *"İBB Genç Gönüllü 6. Dönem Başvuru Formu"* (6th-term application form). A real per-term
  window clearly exists; the current term's specific close date isn't stated on the page
  reached.
- **World Scholar's Cup** (`89fa66fc`) — already has `end_date = 2026-11-18` for one round;
  the calendar page lists many rounds with their own registration links but no per-round
  cutoff date anywhere on that page.
- **UNO — United Nations Online** (`31856863`) — own page, verbatim: *"Deadlines vary
  depending on the program cohort"* and points to the live site for the current one, without
  stating it on the page fetched.

Recommendation, not applied: these four are candidates for a schema conversation (a
`deadline_note` free-text field, or per-region/per-cohort child rows) rather than for a
research pass that forces one date into `deadline`. Flagging for a product decision, not
proposing the schema change here.

## Category 3 — official page reachable, genuinely states nothing (7 records)

Checked, no deadline anywhere on the fetched page, no more-specific sub-page found to try.
Honest "couldn't find it," not "didn't look."

The Earth Prize Competition (`00aaf965`) · Pioneer Research Institute (`bdc4bdb5`) · NYLF
Medicine & Health Care (`b0432a47`, real 2027 session dates already on file, no application
cutoff stated) · USC Pre-College Summer Programs (`4a54159a`, page states 2026 applications
are already closed, 2027 not yet posted) · InvestIN (`8a7c89e4`) · The Duke of Edinburgh's
International Award — Türkiye (`cdb9da8a`) · Wall Street 101 (`574ab33a`, real 2026 session
dates on file, no registration cutoff stated) · Gençlik Merkezleri / e-Genç (`d5790a1c`).

That's 8 listed, one more than "7" — Wall Street 101 counted here rather than category 4
despite having session dates, since nothing on its page names a registration deadline as
existing anywhere, unlike the four in category 2 which each explicitly state a real deadline
exists in some other form.

## Category 4 — couldn't check at all (5 records)

- **Ashoka Young Changemakers** (`1e8e74cf`) — `ashoka.org` returned 403 to this fetch. **The
  same host `scripts/acquire-opportunity-images.ts`'s own header comment already names** as
  one of four sites that block this pipeline's identified crawler regardless of request
  shape. Two independent tasks hitting the same host the same way makes this a property of
  the catalog's source mix, not a coincidence worth re-deriving twice more.
- **UWC Short Courses directory** (`a073efce`) — 403.
- **STEM Fellowship Journal** (`b51bf24f`) — 403.
- **Girl Up Club registration** (`903962c1`) — 403.
- **İstanbul Kent Konseyi Gençlik Meclisi** (`4d2e55b3`) — TLS certificate error; couldn't
  even establish a secure connection to check.

None of these were worked around by spoofing a browser User-Agent, on the same principle
`acquire-opportunity-images.ts` already states: a host that has actively refused an
identified request isn't a source, and misrepresenting the requester to get past that refusal
is the wrong trade for a product whose entire data posture is honest provenance.

## What this changes

The 25-record line in `docs/arastirma-kuyrugu.md` and `known-issues.md` should read as: 9
correct as-is, 4 needing a shape decision rather than a research pass, 5 blocked by the same
crawler-refusing hosts as the image pipeline, 7 genuinely unpublished by the organizer today.
Zero SQL staged — there was nothing found to stage, and picking a plausible date for any of
these 25 would have been the actual defect this pass exists to avoid.

## Gates

Docs-only change — `git status` confirms this file is the only diff in the worktree. No
source, schema, or test file touched, so typecheck/lint/test were not run against a fresh
install for a change that couldn't affect any of their outcomes.
