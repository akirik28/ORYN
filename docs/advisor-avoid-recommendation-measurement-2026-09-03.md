# Does the advisor actually say "don't do this"? (2026-09-03)

AGENTS.md Phase 39 calls `avoid_for_now` "a differentiating product feature" and gives a
specific worked example: told not to start another entrepreneurship club because leadership
is already strong and research is the real gap. The founder's own homepage mock has a block
headed "One thing not to do." Nobody had measured whether the live advisor actually does this
before today — every prior measurement this session covered what it refuses or how it
summarizes, not whether it delivers the thing the product is positioned on.

Doc only. No prompt changes. `lib/ai/advisor-prompt.ts` untouched.

## Method

Real generations (`client.messages.create`, `claude-sonnet-5`) against the real assembled
advisor prompt for real fixture profiles — real dimension scores queried live from
`oryn-qa-scratch`, not invented. Each scenario proposes something plausible and appealing;
three are wrong for that specific student given their actual profile, one (after a false start
below) is genuinely right for theirs. `max_tokens: 1536` was initially too tight — Sonnet 5
does substantial extended thinking by default even outside "thorough" mode (991 of 1536 tokens
on one run went to thinking, leaving the visible reply truncated); worth knowing for anyone
re-running this battery.

## Three "should discourage" cases — all three held, cleanly

**1. Daniel Okafor** — academics 94, awards 89 (both effectively maxed); entrepreneurship 0,
community_impact 0, research 5. Asked: *"I'm thinking about signing up for one more regional
math competition this semester, on top of AIME and everything else. Good idea?"*

> "Skip it. Awards & Distinction is already your strongest dimension (89/100)... A third
> regional competition adds volume to something already proven, not new signal... Your real
> gaps right now: Execution/Project Depth (44 — developing) and Research (no evidence at all
> yet)... Pick one existing project and go deeper. The olympiad write-up blog is the most
> natural fit..."

**2. Elif Demir** — leadership 29 (her clear relative best, not extreme in absolute terms);
entrepreneurship 0, research 0, execution_project_depth 0. The harder version of this test:
nothing here is saturated at 90+, so a lazier check might not catch it. Asked: *"I got asked
to co-found a new debate club at school as co-president. Should I do it?"*

> "No — not this one... Leadership is currently your weakest scored dimension (29/100) despite
> you already holding a leadership title — Student Council VP. That combination is the tell:
> the gap isn't a lack of leadership roles, it's a lack of demonstrated leadership outcomes. A
> second title... adds width, not depth... What I'd do instead: deepen Student Council VP,
> don't add to it."

**3. Mei Tanaka** — research 43, her clear best non-academic dimension; leadership,
entrepreneurship, community_impact, execution_project_depth all 0. Asked: *"I want to start a
second independent research project in a different topic area. Worth it this semester?"*

> "No. Research is already your strongest dimension — adding a second project... duplicates
> strength while leaving real gaps untouched... Push the RNA-seq re-analysis to a concrete,
> submittable output... Once that's moving, spend remaining hours on the biggest structural
> gap: zero evidence anywhere on Career Exploration or Leadership."

All three: a clear verdict up front (not hedged), the student's own actual numbers named
specifically (not "balance is important"), and — the thing worth flagging as a real, separate
positive — **all three explicitly recommend deepening an existing project instead of starting
something new**, which is a stronger, more specific instance of the spec's own intent than the
worked example asks for.

## The control case that wasn't one — and what it revealed instead

**4. Ada Yilmaz**, designed as the control: community_impact 15 (her clear weakest dimension),
proposed *"volunteering regularly at a local community organization."* On score alone this
looked like a clean "should encourage" case. It wasn't — the advisor said no:

> "Rowing takes 6 of your 5–10 weekly hours. That leaves roughly 0–4 hours for everything
> else — and you already have seven ongoing commitments... Community Impact isn't your
> weakest dimension [note: it disagreed with my own framing here, see below], and you already
> have an active volunteering commitment there... a second, unrelated one doesn't deepen
> anything."

This looked, briefly, like a fabrication problem — the reply named "rowing," "Kampus
Exchange," "the textbook tracker," and "EE research," none of which showed up in an `activities`
table query. **Checked before concluding anything**: every one of them is real, just spread
across six different tables (`activities`, `sports_experiences`, `projects` ×2,
`research_experiences`, `volunteering_experiences`) that `buildStudentAdvisorContext` correctly
assembles into one coherent picture. Zero fabrication — my own single-table query was
incomplete, not the model's context.

So the actual finding is narrower and more interesting than "the control failed": **my own test
design was confounded.** I picked Ada on dimension score alone without checking her time budget
(`5_10h`) against her real committed load (rowing 6h + three activities totaling 8.5h — already
over budget before adding anything) or her existing activity in that exact dimension (weekend
numeracy volunteering). The advisor's "no" was well-reasoned given the full picture I hadn't
checked, not evidence of discouraging everything indiscriminately. Reporting this as what it
is — a flawed scenario design, not a product finding — rather than forcing it into either
bucket.

## A properly-vetted control — the clean "should encourage" case

Checked time budget and existing activities *before* picking the proposal this time: **Mei
Tanaka** again (from case 3) — `5_10h` budget, only 3 hours committed (real headroom),
leadership and execution_project_depth both genuinely at 0 with no existing activity in either.
Asked: *"I've been asked to help organize and lead my school's science fair as a student
coordinator this semester. Should I do it?"*

> "Take it — but scope it before you commit hours. Leadership and Execution/Project Depth are
> two of your least-evidenced dimensions right now — not 'weak,' just unassessed... Adding a
> third research activity wouldn't move anything. A named coordinator role with real
> responsibility... is a legitimate way to generate evidence for both... The actual risk is
> time, not value... Before saying yes, get specific about the actual weekly time
> commitment..."

Clear "yes," grounded in the same real numbers, with genuine conditional nuance (contingent on
actual hours, not a blanket green light) rather than either extreme. This is the case that
answers the question CEO asked directly: the advisor does not discourage everything — it
discourages the specific things wrong for a specific student, and encourages the specific
things that fit, using the same reasoning shape either direction.

## Conclusion

On five real generations against real profiles: the `avoid_for_now` differentiator is
shipping, not a gap. Three plausible, appealing, wrong-for-the-student proposals were declined
clearly, with the student's real numbers named and a concrete alternative (usually: go deeper
on what already exists) offered in the same reply. One case designed as a control turned out to
be a flawed test rather than a real finding, and the properly-vetted replacement produced a
clean, well-reasoned "yes" — confirming the advisor isn't discouraging by default, it's
discouraging *correctly*. Not exhaustive — five scenarios, two students reused across a
discourage/encourage pair, one AI provider family — but each scenario was checked against real
data before and after, not assumed.
