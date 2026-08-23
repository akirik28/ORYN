# Analysis — characterizing the Canada URL-identity defect (RES-V1, package V1-11)

**Lane:** RES-V1 · **Analyzed:** 2026-08-22 · **Posture: report only.** No URL edits, no
dedup proposals, no repair files, no live writes — every step is a read-only Supabase
query, a read of committed research files, or a public HTTP read of the same live pages
these records already cite as their own source.

## Headline: three universities, three genuinely different defects — not one problem

V1-10 established the 424 collision records (Western 231, Toronto 160, Alberta 33) are a
real, separate, unscoped population. This package went to find out what they actually
are, per-university, rather than generalize from Western's dramatic case. **They are not
the same defect.** Western is a real, recoverable acquisition gap. Alberta is not a defect
in the same sense at all — the researcher deliberately verified shared pages as correct.
Toronto sits in between. Collapsing all three into "the Canada URL problem" would send a
future repair effort after three different targets with one method, and get it wrong for
two of them.

Per **Rule 27**: a collision count is a within-corpus consistency check — it cannot tell
you a unique URL is *correct*, only that it isn't *duplicated*. Every recoverability claim
below is checked against the live institutional site (an independent origin from the
acquired record), not against the record's own plausibility.

---

## 1. Scale and shape, per university — confirmed, not generalized from the worst case

Queried live, grouped by `(university_id, official_program_url)`, every URL shared by 2+
records:

| University | Shape | Concentration |
|---|---|---|
| **Western** | **Power-law — a few dominant hubs.** One URL (`grad.uwo.ca/admissions/programs/index.cfm`) holds **160 of 231** collision records alone. The remaining 71 spread across ~17 secondary hub pages (department/subject pages, `n`=2–16 each) — smaller versions of the same pattern, not a different one. | 1 URL = 69% of the defect |
| **Toronto** | **Diffuse — many small near-duplicates.** ~95 distinct shared URLs, almost all `n`=2 or 3; the largest (`sgs.utoronto.ca/programs/kinesiology/`) holds only 6. The opposite shape from Western — confirms BASORG's caution that the 160-to-one case does not generalize. | Largest URL = 4% of the defect |
| **Alberta** | **Small multi-credential clusters, not a fallback pattern at all.** 23 distinct `calendar.ualberta.ca/preview_program.php?...poid=NNNN` URLs, each with its own specific `poid` (not a shared generic root), each shared by 2–4 records. Structurally unlike Western's — these look like per-programme URLs from the start, just each covering more than one credential. | Largest URL = 12% of the defect |

## 2–3. Recoverability and acquisition-vs-source — checked per university, live and against each research file's own account

### Western: acquisition gap, confirmed recoverable

The research file's own `verification_status` explains the cause directly, not
speculatively: the data was pulled from Western's **JSON search API**
(`getPrograms.json.cfm`), which the researcher confirmed **does not expose a per-program
URL field** — so `official_program_url` was set to the search tool itself, a reasoned
call given what the API returns, not an oversight.

**But the API isn't the only thing at that address.** Fetched the **HTML** page at the
same URL directly (independent of the record, per Rule 27) and found **161 embedded
`program.cfm?p=N` links** — one per program, rendered directly in the same table the
researcher's own note describes browsing. Fetched `program.cfm?p=8` directly: resolves to
Western's Anthropology MA page specifically, matching the DB record it corresponds to
exactly. **161 live links against 160 collision records is not a coincidence — the
correct URLs exist, are linked from the very page that got stored instead, and were
missed because the acquisition method queried the API layer and never rendered the HTML
that embeds them.** Acquisition defect, not a source limitation. Recoverable.

### Toronto: source granularity, not clearly a defect — the SGS directory links by subject, not by credential

The research file's own note: the SGS directory is "a table of 132 programs... with a
direct link to each program's own SGS page" — and that direct link, for Kinesiology, is
the same URL for all 6 of its actual credential options (confirmed live: the graduate
unit's calendar entry lists **Doctor of Philosophy, Master of Arts, Master of
Kinesiology, Master of Professional Kinesiology, Master of Science, and Master of Sport
Sciences** — six real, distinct degrees, matching the DB's 6-record split of 1 Doctoral +
5 Master exactly). **The directory's own link granularity is per subject-unit, not
per-credential** — sharing a URL across a unit's degree options is consistent with how
the source itself organizes access, not obviously a missed per-programme page the way
Western's was. A more granular resource does exist (`sgs.calendar.utoronto.ca`) but isn't
directly linked from the directory page the way Western's `program.cfm?p=N` links are —
recoverability here would need deliberately navigating a different site section, not
picking up a link that's already sitting in the page. **Weaker recoverability case than
Western's, and arguably not a "defect" in the same sense — flagging the distinction
rather than forcing one verdict onto both.**

### Alberta: not a defect — deliberately verified as correct

The research file's own note is explicit and specific, not a template: the
`poid=110141` page was "directly fetched... and its own 'General Information' opening
statement read verbatim to identify the specific degree(s) offered — not inferred from
the department name or guessed," and sharing it across 4 records was "the pattern
explicitly sanctioned for this research task when the shared page's own text names each
as a genuinely distinct degree/credential, as verified here." **This is the researcher
doing exactly the check this package is doing — confirming a shared page is correct
before accepting it — and reaching a conclusion, not skipping the question.**

**Could not independently re-verify Alberta live**: `calendar.ualberta.ca` runs an active
AWS WAF JavaScript challenge (confirmed on two attempts, consistent 202/empty or a
`challenge.js`-only response) — did not attempt to bypass it, consistent with this
lane's standing prohibition on defeating bot-detection. This is a real limitation of this
package's own coverage, stated plainly rather than papered over: Alberta's "not a
defect" conclusion rests on the researcher's own documented verification, not on this
package's independent confirmation the way Western's and the §4 sample were.

## 4. Beyond the three: sampled the collision-free universities, not just trusted the zero

Per Rule 27, zero collisions proves no duplication, not correctness. Sampled 4 records —
1 each from Montreal, UBC, Queen's, Waterloo, chosen at random, not cherry-picked — and
fetched each live page directly:

| University | Record | Live result |
|---|---|---|
| Université de Montréal | Microprogramme de 1er cycle en langue et culture arabes | Title matches exactly |
| University of British Columbia | Doctor of Philosophy in Zoology (PhD) | Title matches exactly |
| Queen's University at Kingston | Master of Management Innovation and Entrepreneurship | Title matches exactly (202 on first attempt, resolved clean on retry — transient, not a persistent block like Alberta's) |
| University of Waterloo | Mechatronics Engineering | Title matches exactly |

**4/4 confirmed correct.** A sample of 4 across 4 universities is not proof the other
~1,765 non-collision Canadian records in these four universities are all correct — it is
evidence against a *hidden, systematic* wrong-but-unique-URL problem of the kind Rule 27
warns a collision count alone can't see. Stating the sample size plainly rather than
letting "4/4" imply more coverage than it has.

## Scope: what this covers, and what it does not

**Covered:** the shape/scale of collisions at Western, Toronto, Alberta (§1); whether
correct URLs are recoverable and whether the defect is acquisition- or source-side, for
each of the three, checked against live pages and each research file's own documented
reasoning (§2–3); a small, non-exhaustive live spot-check of the four collision-free
universities (§4).

**NOT covered:**
- **Alberta's live re-verification** — blocked by an active bot-mitigation system this
  lane does not attempt to defeat; the "not a defect" conclusion here rests on the
  original researcher's own documented check, not this package's independent
  confirmation.
- **Toronto's `sgs.calendar.utoronto.ca` resource**, whether it in fact offers a stable,
  linkable, per-credential URL for each of the 6 Kinesiology-type cases — noted as
  existing, not characterized in depth.
- **All 231/160/33 individual collision records** — sampled representative cases per
  university (the dominant URL at each), not every one; Western's other ~17 secondary
  hub pages were counted but not each individually fetched.
- **Any actual fix** — explicitly out of scope by this package's own terms.

## For the founder's decision, stated plainly

If Path A (the UPDATE-by-id path) gets built for `url_repair`'s sake, it is **also** the
mechanism Western's 160 corrections would need — the correct URLs exist, are already
identified in this report, and are a research-and-write task away (RES-R1 to extract the
161 `program.cfm?p=N` links against their programs; RES-I1 to write them), not this
lane's. **That is new leverage this package found, separate from and not contradicting
V1-10's negative on `url_repair` overlap.** Alberta's 33 are very likely not correctable
at all — they're already correct. Toronto's 160 sit in between and would need a
scoping decision (is the subject-level page acceptable, or is the more granular calendar
resource worth pursuing) before anyone writes research for them.
