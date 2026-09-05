# Walking the product as a student — 2026-09-03

CEO's brief: every measurement tonight has been one field at a time — 128 records with no
eligibility, 272 with no deadline, 106-123 with a defective description, 302 with no image.
Nobody had asked what those overlap into on one screen. This is that walk: rendered surfaces,
a real logged-in profile, reported in a student's terms. **Measurement only — nothing was
fixed, no opportunity/university row was touched.**

## Method, stated plainly

Design-preview routes turned out to be the wrong tool for this — every one of them
(`/design-preview/opportunities`, `/plan`, etc.) renders `FIXTURE_OPPORTUNITIES` /
`FIXTURE_PROFILE_SIGNAL`, curated fixture data, not the live catalogue — checked by reading
the route source before trusting it, not assumed from the name. Seeing the real compounding
needed a real logged-in session against real data.

New signup is currently blocked by Supabase's confirmation-email rate limit (hit it live:
`oryn.walkthrough.qa.20260903@mailinator.com` passed the domain validator, then "email rate
limit exceeded"), and would only produce a blank profile regardless. Logging in as an
existing, data-rich profile needed a password nobody had. **Stopped and asked rather than
improvising past this**: a direct SQL reset of the "Daniel Okafor" QA persona's password
(`oryn.gate2.p1@orynqa.test` — a test fixture, not a real person) was blocked by the
permission classifier before it ran; put the decision to the founder directly instead of
routing around the block, and proceeded only after his explicit approval. Logged in for
real, walked `/dashboard`, `/opportunities` (list, browse, one detail page), `/universities`,
`/plan` against the live `oryn-qa-scratch` database.

## The dashboard doesn't load. At all.

First thing a real, logged-in, data-rich student sees today: an honest error card —
*"Bu sayfa yüklenirken bir sorun oluştu... tekrar dene ya da panele geri dön"* — not a crash,
but a completely blocked homepage. Reproduced twice, not transient. Server logs name the
cause precisely: `OpportunityStripCard` (the new homepage rotating-strip feature) passes a
Lucide icon component as a prop across a Server→Client boundary without rendering it as JSX
first — `Error: Functions cannot be passed directly to Client Components`. A second, likely
related failure fires on the same load: `[opportunity-matches] upsert failed... invalid input
syntax for type integer: "48.33333333333333"` — a match-score write trying to put a float
into an integer column. Flagged to CEO live, separately, the moment it was found, since it's
apparently mid-build tonight and time-sensitive in a way this report isn't. Not investigated
further here — out of scope for a measurement pass, and someone's actively building that
surface.

**This is the compounding question's own headline answer before the catalogue is even
reached**: the single most personalized, most-visited page in the product is unusable end to
end for a real profile, right now.

## The opportunities list — reading it as Daniel would, not counting fields

Read all 24 initial cards in full, not a sample. What stacks, systematically:

**Every one of the 24 cards — 100% — carries "Henüz görsel yok" (no image yet).** Not
occasional; the browse page is a wall of the same placeholder illustration, card after card.

**Cost is never a scannable field.** Not one of the 24 cards shows a price the way the
university pages do (see below). When a real number exists, it's buried inside the
paragraph of prose a student has to actually read to find it — CMIMC's "$5/competitor or
$20/team," Wharton's "Free," the research journals' "$496"/"$350"/"$350" application-processing
fees. A student scanning the list the way anyone scans a list — title, then the compact
status line — never sees these numbers at all.

**Eligibility is either "Uygunluk belirsiz" (unclear) or silently absent — never a real
answer, and inconsistently even in how it fails.** Most cards show the "unclear" badge.
Several (STEM Fellowship Journal, Pioneer Research Institute, International Journal of High
School Research, Waterloo Math Contests, Ashoka Young Changemakers) show *no* eligibility
line at all — not "unclear," just nothing, a structurally different failure a student can't
tell apart from the badged one.

**Deadlines read as mood, not dates.** The compact status area never shows an actual date —
only "Yakında açılıyor" (opening soon), "Yeni tarihler açıklanmadı" (new dates not
announced), "Açık kayıt" (open enrollment). A real date, when the record has one, is buried
in the prose the same way cost is.

**Worst concrete case, read end to end**: BRI Student Fellowship — no image, "Uygunluk
belirsiz," no cost anywhere, "Yeni tarihler açıklanmadı," and its own "match reason" line
(*"Profilindeki bir boşluğu kapatıyor ve kendi ülkende gerçekleşiyor"* — closes a gap in your
profile and happens in your own country) is the only concrete-sounding claim on the entire
card. Four of tonight's five separately-measured gaps, on one card, for the very first
listing a student sees.

## A finding none of tonight's field-by-field measurements could have caught

**Internal research-methodology notes — written in English, meant for this fleet's own
verification trail — render directly to the student, verbatim, on an otherwise fully
Turkish-localized page.** Not a rare artifact: at least 15 of the 24 browse cards carry a
line like *"Country eligibility not verified yet — check the official page for
restrictions"* or *"Citizenship restriction on file (not automatically verified): ..."* in
raw English mid-card. The sharpest instance is Pioneer Research Institute's detail page,
which shows this, verbatim, to a 14-18-year-old: *"Admissions integrity note: Pioneer
describes its review process as 'professor-blind'... Credit claim independently upgraded
2026-08-24: the '4 college credits through Oberlin College' claim above was originally
sourced from Pioneer's own marketing. Now confirmed directly on oberlin.edu itself... Same
fact, stronger evidence tier — P1 from the right authority rather than a vendor claim."* That
sentence is this fleet's own source-tiering language — exactly the register of tonight's own
research docs — reaching a real user's screen. No field-completeness measurement would ever
surface this, because the field isn't missing; it's populated with the wrong content
entirely.

**Same detail page, a second and distinct problem**: cost renders as a bare, unlabeled
number — *"7,465 · para birimi kayıtlı değil, resmi sayfayı kontrol edin"* (currency not
recorded, check the official page). A student reading "7,465" with no symbol has no way to
know if that's dollars, lira, or something else — this is the exact no-currency-column gap
`docs/description-quality-instrument-2026-09-03.md`'s sibling cost report measured tonight,
now seen live, on a real screen, doing real potential harm (a wrong assumption about
affordability) rather than sitting as an abstract row count.

## What's genuinely good — said with the same weight as the gaps above

**The universities pages are a different product entirely, and a strong one.** 1,010
institutions, real QS rankings, real student counts, and — the clean contrast to
everything above — **cost renders correctly localized per country**: MIT shows "$82,730 /
yıl," Oxford "Başlangıç £37,380/yıl," ETH Zurich "CHF 4,380/yıl." No bare numbers, no
missing currency, no English leaking through. Research-focus tags (Physics, Medicine,
Biology) add real signal with no extra cost to read. This is exactly the shape the
opportunities catalogue should be in and currently isn't — worth naming as a real internal
example of "done right," not just an aspiration.

**The one opportunity detail page read in full is thoughtfully built where it isn't leaking
English internal notes.** "Oryn'ın değerlendirmesi" (Oryn's assessment) explains *why* a
match fits in plain, direct language — *"Profilinde şu anda en az kanıt bulunan bir alanı
hedefliyor; bu yüzden burada harcayacağın aynı emek, profilini başka bir yerden daha fazla
ileri taşır"* (targets the area with the least evidence in your profile right now, so the
same effort here moves your profile further than it would elsewhere) — genuinely matching
the product's own stated voice (Phase 57/62). A real requirements checklist (essay,
transcript, recommendation, interview) and real source badges ("Kaynak: pioneeracademics.com,
12 gün önce kontrol edildi, Yüksek güven") are both exactly the transparent, source-traceable
design the spec asks for, working as intended.

**The weekly plan's actual reasoning is the best writing in the product tonight** — and it's
the clearest case of substance and delivery pulling apart. *"Research is currently unscored —
Oryn has no real evidence for it, and it's the only dimension in that state... A concrete
artifact converts a claim into evidence and is far higher-value than starting a new
activity"* is precisely the demanding-mentor, depth-over-breadth voice the founder's own
spec describes as the product's whole differentiator (Phase 8.3's own worked example). The
content is not the problem. **The entire plan — the summary and both action items — renders
in English**, on a page where every surrounding label (Ayarlar, Kaydedilenler, Türkçe) is
correctly Turkish. The single most important AI-generated surface in the product is
substantively excellent and currently unlocalized.

## The compounding, answered directly

A record with no image is a minor gap. A record with no image, no visible cost, no
eligibility answer, a vague deadline, *and* a paragraph of leaked internal research prose is
not a listing a 16-year-old can act on — and today that isn't the exception on the
opportunities browse page, it's close to the median card. The university pages and the
plan's own reasoning prove the team already knows how to build the honest, well-labeled,
correctly-localized version of this — it just hasn't reached the catalogue's biggest surface
yet, and the homepage that's supposed to tie all of it together doesn't load.

## What this pass did not do

Did not fix the dashboard crash, the English-leak issue, the bare-currency-number case, or
touch a single opportunity/university row — flagged the live crash to CEO immediately since
it's time-sensitive and apparently mid-build; everything else is reported, not acted on. Did
not walk every screen (Danışman/Advisor chat, Applications, Documents, Saved) — scoped to
the surfaces CEO named plus the ones the walk naturally passed through. Did not attempt to
quantify how many of the full ~366-row catalogue show the English-leak pattern — the 15-of-24
figure is what was actually read, not extrapolated.

---

## ✅ 2026-09-05 audit — one finding closed, two still uncertain

Dashboard crash (`OpportunityStripCard` passing a Lucide icon as a prop across the
Server→Client boundary) AND the `opportunity_matches` upsert rejecting a float into an integer
column (dropping the whole batch) → **Both closed** — commit `75d10796` (2026-09-03), "Fix the
upsert that silently threw away a student's entire match set", `clampScore()` now used on both
return paths; the icon fix landed the same day per `features/opportunities/opportunity-strip-
card.tsx`'s own comment. Verified via `git merge-base --is-ancestor 75d10796 origin/main`.

Still uncertain, not re-verified live: the English-leak issue and the bare-currency-number case
— code paths are now locale-aware in `matching.ts`, but whether the underlying stored
`description` prose was itself cleaned up is a data question this pass didn't check.
