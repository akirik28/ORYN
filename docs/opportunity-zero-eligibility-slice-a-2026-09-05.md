# Slice A (rows 1–95 of 190) — zero-eligibility opportunity research, 2026-09-05

CEO's exact filter (`docs/opportunity-zero-eligibility-190-2026-09-05.md`), rows 1–95
by `id` order, boundary-verified: row 1 `0009f66d-…9309`, row 95 `900b0a32-…b438b`
(ACU BİLİM YAZ KAMPI PROGRAMI 2026), row 96 `903962c1-…` (Girl Up Club) confirmed NOT
mine.

Rule, unchanged from yesterday: official source only, `source_url` + date on every
fill, blank stays blank when not found, "doesn't state" ≠ "doesn't have", "couldn't
access" ≠ "source is silent" (403/blocked domain gets neither a fill nor
`checked_not_stated` — just left alone, noted why), read the actual quoted sentence,
not the fetch tool's own summary framing (caught it mislabeling grade statements as
age answers twice yesterday).

**Known blocked, per CEO's own doc — not re-attempted**: row 4 (NYT Podcast, blocked
domain). Girl Up (row 96, Girl Up Club) and STEM Fellowship Journal are NOT in this
slice at all (96 is lane B's first row) — noted here only so nobody assumes they were
missed by me.

Prepared, not applied. SQL only, CEO packages, no live writes.

## Research log

**Rows 1-38 done.** Real fills/corrections and checked_not_stated entries are in the two
SQL files (`slice-a-additions-2026-09-05.sql`, `slice-a-requires-0126-0129-0133-2026-09-05.sql`).
This section covers what those files' own per-row comments don't: the rows left
deliberately untouched, and why.

**A real methodology decision, made explicit here rather than applied inconsistently**:
foreign school-year systems (UK Year/S-levels — rows 11, 15, 24, 38; Hong Kong Secondary
N — row 33) are not converted to this product's grade scale anywhere in this slice.
Started to convert Hong Kong's "Secondary 4-5" to grades 10-11 with more confidence than
the UK system got, caught the inconsistency before finalizing, and applied the same
conservative standard to both — CEO's own rule today, "a wrong value is worse than an
empty one," applies exactly as much to a plausible-looking foreign-system conversion I'm
not certain of as to a fabricated one.

**Multi-program bundling — the same structural issue as yesterday's Waterloo/CEMC and
InvestIN, not fixed here, flagged**:
- Row 3, University of Toronto (`018f5962-…`): the fetched page lists several distinct
  programs with different ages/grades (Daniels Design Discovery 14-18, Performing Arts &
  AI 15-18, Blueprint grade 10-11, MedLinx grades 9-12). Which program this DB row
  represents isn't clear from the row itself. No fill on any dimension; age/country
  checked_not_stated only (grade left fully untouched, not even checked_not_stated,
  since a real per-program answer clearly exists somewhere, just not attributable to
  this row without more research).
- Row 20, Boğaziçi Üni Yaz Okulu (`19248dee-…`): same shape — one sub-program mentions
  an IB/AP preference, not a hard grade rule; a Turkish-citizenship registration field
  implies non-citizens can register but isn't a stated eligibility policy. Left
  completely untouched, no SQL at all — the signal is too indirect and multi-program to
  turn into a confident fill or even a confident "checked and silent."
- Row 22, iD Tech Camps (`1b636769-…`): three different age bands for three different
  program types (7-19 general, 7-17 summer camps, 13-18 academies). Age left untouched
  for the same reason as row 3; grade/country checked_not_stated (neither dimension has
  this same multi-program conflict — none of iD Tech's own sub-programs state a grade,
  and country is unaddressed across the whole page regardless of program).

**Genuinely incomplete research — page defers to an unfetched section, not silent**:
- Row 19, Columbia Pre-College Admissions (`17d177de-…`): explicitly defers to
  "Application Materials"/"Program Policies" pages not fetched. Grade/country left
  untouched entirely (age given the checked_not_stated treatment in the SQL file was a
  closer call, noted there — flagging here that this row is borderline, not clean, in
  case CEO reads it differently).
- Row 29, IOI Türkiye stats page (`205b02f9-…`): the stored `official_url` points at a
  statistics subpage (`stats.ioinformatics.org/countries/TUR`), not an actual eligibility
  page — the same class of wrong-URL issue as AMC/AIME yesterday. Left completely
  untouched; flagging the URL itself as likely wrong is the more useful finding here than
  guessing at eligibility from the wrong page.
- Row 36, International Mathematical Olympiad (`2dd6e52f-…`): homepage only, defers to
  "Regulations"/"What is IMO?" pages not fetched. Left completely untouched.

**Genuine fetch failures (403 or connection failure) — "couldn't access," not "source is
silent"**: row 13 Princeton Ten-Minute Play Contest (403), row 30 KUSRP (403), row 32
Koç Nanoteknoloji Kış Kampı (403), row 18 Purdue Think Summer (transient "socket hang
up" on today's re-attempt — but this row already has a real, successfully-fetched age
fill from yesterday's research, carried forward unchanged in the additions file; today's
failure doesn't erase yesterday's confirmed finding, it just means grade/country weren't
re-attempted today).

**A closer-call judgment, named rather than silently treated as clean**: row 35 (Nat Geo
Slingshot) treats "our community of 13- to 18-year-olds rose to the challenge" as a real
age fill despite past-tense/community framing that's closer to descriptive-attendee
wording than a bare eligibility rule elsewhere in this slice. Specific and quantified
enough, and close enough to this product's own 14-18 target language, that it was
treated as usable — but flagged here in case that reasoning doesn't hold up on review.

**Reused from yesterday's own research (D2 visible-set task), re-verified rather than
retrusted from memory**: row 2 (Earth Prize, age 13-19 fill + grade checked_not_stated),
row 8 (DECA, age+grade both checked_not_stated), row 17 (Wall Street 101, grade 11-12
fill + age/country checked_not_stated), row 18 (Purdue, age 15 fill, see above). None of
yesterday's SQL has been applied yet, which is exactly why these rows still appear in
today's 190-row measurement.

---

**Rows 39-95 done — all 95 rows of Slice A are now researched.** Fills/corrections are in
`slice-a-additions-part2-2026-09-05.sql` (18 rows), checked_not_stated entries in
`slice-a-requires-0126-0129-0133-part2-2026-09-05.sql` (24 age + 20 grade + 24 country
entries across 24 distinct rows). Both re-verified with a comment-stripped semicolon
count (`sed 's/--.*$//' file | grep -o ";" | wc -l`) matching the statement count exactly
— the raw (unstripped) count came out 2 high on the checked_not_stated file at first
glance, which would have looked like the same kind of syntax error caught in part 1, but
turned out to be two legitimate semicolons inside English comment prose (rows 49 and 87
below), not malformed SQL. Worth naming since it's the same "verify the file, don't trust
the first grep" discipline, refined: a raw semicolon count is a proxy that can itself
give a false alarm when comment text uses normal punctuation.

**The confirmed-open discriminator, named explicitly since it's the single trickiest
judgment call across both halves of this slice**: text that defines the program's OWN
SCOPE ("USACO supports computing education in the USA and worldwide," "a competition for
high school students around the world," "open to all students from any country") is
treated as a real policy statement → `country_eligibility_confirmed_open = true`. Text
that just describes who happens to show up (a testimonial naming a few countries, "50
states and 87 countries," "meet classmates from around the world," alumni profiles) is
treated as descriptive, not policy → left as `checked_not_stated`, never confirmed-open.
Applied this consistently across ~15 country-language rows in this half; flagging it here
because a reviewer could reasonably draw the line in a different place on a few of them
(Sabancı vs. Kadir Has's nearly-identical Turkish "all high school students" phrasing is
the closest call — see below).

**A significant structural finding, not a routine gap — row 94, Hochschule Bremen
(`8f6e438f-…`)**: the stored page is a graduate **Master's programme (M.Sc.)** in Space
Systems Engineering, requiring a completed Bachelor's degree and B2 English — realistically
an applicant pool aged 21+. This is not a "source is silent on age/grade/country" case;
no value in any of those three columns would make sense for a product whose entire
audience is 14-18-year-old high schoolers. No SQL written for this row at all — flagging
for CEO to decide whether this opportunity belongs in the dataset, independent of the
eligibility-fill exercise.

**Multi-program bundling — same structural issue as Toronto/iD Tech/Boğaziçi from rows
1-38, three more instances**:
- Row 49, BU Summer High School Programs (`4b9f3125-…`): four named sub-programs with
  different grade floors (High School Honors/Academic Immersion: rising juniors+seniors;
  RISE: rising seniors only; Summer Challenge: rising sophomores+juniors+seniors) under
  one generically-titled row. Grade left completely untouched; age/country get
  checked_not_stated (no such conflict on those two dimensions).
- Row 78, Battle Code MIT (`7997f38c-…`): the page defines five tournament tracks, and
  four of the five (Sprint, US Qualifier, International Qualifier, MIT Newbie) explicitly
  require **college** students — only the fifth ("High School Tournament: teams must
  consist entirely of high school students") matches this platform's audience at all.
  Left completely untouched rather than guessing this row means the high-school track
  specifically.
- Row 87, Summer Discovery (`868d4a6f-…`): four campus locations with materially
  different, non-overlapping grade bands — "grades 9-12" (UPenn Carey Law), "grades 6-12"
  (Yale), **"grades 6-8" (Cornell)**, "grades 6-12" (UCLA). The Cornell track is
  middle-school-only, entirely outside this product's 14-18 target band. Grade left
  completely untouched and flagged prominently; age/country get checked_not_stated (no
  conflict on those two).
- Row 70, NFTE Youth Entrepreneurship Showcase Series (`718cc3c4-…`): the only quote the
  fetch surfaced ("free online competition for anyone... ages 5-24") is explicitly about
  NFTE's separate **World Series of Innovation**, not the Showcase Series this row
  actually names. Left completely untouched rather than fill from a quote about the wrong
  sub-program.

**Structural mismatch — the opportunity type itself doesn't fit an age/grade/country
eligibility model**: row 65, Coursera (`6c9d8973-…`) is a general online-course
marketplace with no unified enrollment policy (thousands of independent courses); no
fill attempted, flagged for CEO alongside row 94 as possibly not belonging in this
eligibility exercise at all.

**Qualification-through-national-team structure — no direct individual eligibility to
state, same shape as IMO from rows 1-38**: row 59 (International Biology Olympiad,
`5f847357-…`: "winners of National Biology Olympiads from 70+ countries participate"),
row 61 (IOAI, `65c6464b-…`: "designed for the 4-6 best high school students from each
participating country"), row 84 (International Brain Bee, `809616f2-…`: "must first win
their respective national Brain Bee"). All three: students reach these competitions by
winning a national qualifier, not by applying directly against an age/grade/country gate
this product tracks — left completely untouched.

**Foreign/ambiguous school-year phrasing, not converted — same standing rule as rows
1-38**: row 43 (UKMT Pink Kangaroo: England/Wales Year 10-11, Scotland S3-4, NI Year
11-12 — country restriction still filled, "UK schools only"), row 92 (POLIMI Techcamp,
`8e5c10af-…`: "aimed at students in their second year of high school (or their first
year in four-year programs)" — Italian secondary system runs 4 or 5 years depending on
track, and this phrasing tries to reconcile both, which is exactly the kind of numbering
this product's US-style grade array can't safely absorb).

**Genuinely incomplete — thin page or defers elsewhere, real answer likely exists but
wasn't locatable this session**: row 53 (JRHS, defers to unfetched Author
Information/Submission pages), row 57 (YGA, homepage names four sub-programs including
"Global Impact High School" but states no criteria for any of them), row 63 (RISE for
the World, homepage has no eligibility language and a guessed `/eligibility` subpage
404'd), row 82 (Baltic Sea Philosophy Essay Event, a thin WordPress site — homepage and
a guessed `/about/` page both came back with no eligibility content), row 86 (iStar
Class, the fetched `/istarcourses` section describes course content but not enrollment
criteria).

**Genuine access failures — "couldn't access," not "source is silent," same standing
rule as rows 1-38**: row 41 (IE University Pre-University — redirect loop on 3 separate
URL attempts, a systemic ie.edu issue not a one-off), row 50 (AMC-AIME — 403, **and** the
stored `official_url` points at an unrelated MAA MathFest special-sessions page, the same
wrong-URL class as yesterday's AMC/AIME finding, now confirmed twice), row 52 (CTY
Global Issues at Princeton — 403; note the row's own title already says "Grades 10-12"
but that's the row's title text, not an independently re-verified source, so it was not
used as a substitute for one), row 56 (HMMT — 403), row 58 (IE JAB — redirect loop,
second ie.edu domain hit), row 66 (JHU Engineering Innovation — 403 on two attempts), row
74 (Phillips Exeter Summer — 404 on two different URL guesses), row 76 (Columbia
Pre-College Online Summer — connection failure then 404), row 88 (York University Helix —
302 redirect to a page that then failed TLS certificate verification), row 95 (ACU
Bilim Yaz Kampı — the stored URL is a PDF that returned only unreadable embedded-font
binary content, not extractable text).

**A closer call, named rather than resolved unilaterally**: row 64, Kadir Has Kış Okulu
(`6bcef34b-…`) — "we are delighted to welcome all high school students who wish to shape
their future" reads almost identically to row 51's Sabancı "the program is open to all
high school students," but is framed as a warm invitation around student motivation
rather than row 51's flatter declarative "is open to" policy sentence. Treated
differently here (checked_not_stated, no grade fill) than row 51 (real
grades-9-12 fill) on that phrasing distinction alone — flagging because a reviewer
reading Turkish marketing copy might reasonably collapse this distinction the other way.
Also row 81, HSHSP (Michigan State, `7b6ebabf-…`) — "students from across the U.S. and
territories" could be read either as a real domestic-only restriction or as neutral
descriptive framing; treated as checked_not_stated (neither confirmed-open nor a
restriction fill) rather than guessing which.
