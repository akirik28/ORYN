# Is research_topics_top5 shown to students, and how misleading is it?

CEO's follow-on question from the university-opportunity overlap measurement: if the
astro/physics-skewed `research_topics_top5` metric is actually visible on screen, a business/
economics-interested student looking at Oxford sees astrophysics — a wrong impression on
screen, not just a bad ranking input. Measure where it's shown and how many universities would
mislead this way.

## Where it's shown — three surfaces, two different treatments

**Detail page** (`app/(app)/universities/[id]/page.tsx:734-756`) — the raw, uncapped topic list,
one pill per topic string, under the heading **"Research strengths"**:
```tsx
{researchTopics.map((topic) => (
  <span key={topic} className="...">{topic}</span>
))}
```
There IS an honest description sentence beneath the title, worth crediting:
`"Topics this university publishes in most, from OpenAlex's open research index."` — this
correctly says "publishes in," not "strengths for you" or "known for." But the bold section
*title* is still "Research strengths," a more evaluative, student-facing label than the
hedged description underneath it — a skimming 16-year-old reads the title, not necessarily the
smaller sentence below it. Also carries a real `SourceBadge` crediting OpenAlex explicitly,
confirming the source directly rather than leaving it a guess (the earlier measurement report
flagged this as unconfirmed — now confirmed, straight from the code).

**Compare page** (`app/(app)/universities/compare/page.tsx:150-151, 277-`) — same raw topics
(first 3, not 5), same "Research strengths" row label, **no description sentence, no source
badge, no hedge at all** — a plainer, less-honest presentation of the identical underlying data.

**Browse card** (`features/universities/university-card.tsx`, via
`lib/universities/research-taxonomy.ts`) — **already mitigated, and deliberately so.** A
real, existing keyword-taxonomy function (`categorizeAndDedupeResearchTopics`) maps each raw
topic down to one of 12 short categories (AI, Computer Science, Physics, Medicine, Biology,
Engineering, Mathematics, Economics, Business, Social Sciences, Law, Arts & Humanities) — and a
topic matching nothing is **dropped, never forced into a wrong bucket**. This module's own doc
comment states the reasoning explicitly: raw OpenAlex strings have no room on a card and would
misrepresent the university. Someone already recognized and solved exactly this class of
problem — just for one surface, not all three.

## How many universities would mislead — measured with the real taxonomy, not a guess

Ran every university's real `research_topics_top5` value through the **actual, already-shipped**
`categorizeResearchTopic` function (not a hand-rolled keyword regex) — same discipline as the
country-boost measurement: use the real code, not an approximation of it.

- **934 universities** have `research_topics_top5` populated (a large majority of the corpus —
  this is a routinely-shown feature, not a rare edge case).
- **647 of 934 (69.3%)** have **zero** of their 5 topics categorize into Economics, Business,
  Social Sciences, Law, or Arts & Humanities. For any student whose interests sit in those
  fields — a real, common case in this product's own actual data (several of the 8 students in
  the overlap measurement) — the detail page's "Research strengths" section shows them nothing
  relevant, for the majority of universities they might look at, regardless of how strong that
  university genuinely is in their field.
- **122 of 934 (13.1%)** have **all 5** topics uncategorized by the existing taxonomy entirely —
  specialized enough that even the browse card's mitigation would drop every single one (showing
  no research-focus badge at all, the safe fallback), while the detail and compare pages would
  still show the raw, unfiltered jargon regardless.

This is a lower bound on "how many mislead a given student" in one sense (a student interested
in, say, History specifically isn't covered by "Arts & Humanities" alone matching some other
topic) and a real, directly-measured number in another (nearly 7 in 10 universities' shown
research focus has nothing to do with the exact fields this product already asks every student
to declare at onboarding).

## What this is, precisely

Not a ranking-signal problem (already resolved — CEO's decision was "don't build" that side).
This is a **display-honesty** problem, on two of the three surfaces this exact metric appears
on. Look-and-report only — no code changed. The mitigation pattern already exists in this
codebase (the card's own taxonomy function) for whoever decides how to extend it; not applied
to the detail or compare pages here, since that's a design/scope decision, not a measurement
one.

## What was not covered

- Didn't measure how many of the 647 "zero non-STEM match" universities are ones any real
  student has actually looked at, saved, or targeted — this is a corpus-wide measurement, not
  scoped to real student traffic the way the country-boost measurement was.
- Didn't check whether `categorizeAndDedupeResearchTopics`'s specific keyword list itself is
  complete or accurate for non-STEM fields — reused it as-is, trusting the existing, tested
  module rather than auditing its own correctness, which was out of scope for this question.
- Didn't propose or evaluate a specific fix (extending the card's taxonomy to the other two
  surfaces, adding a stronger disclaimer, hiding the section below some confidence threshold,
  etc.) — CEO's own framing was "measure, then decide," matching the assignment's own method.
