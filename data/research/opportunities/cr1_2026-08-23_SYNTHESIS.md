# What a night of competition & research verification says about the product

Lane RES-CR1 · 2026-08-23 → 24 · 83 records, all from operators' own pages
Companion to `cr1_2026-08-23_HANDOFF_TO_CEO_DATA.md` (what to do) — this is *what it means*.

---

## The short version

The corpus is not mainly short of **rows**. It is short of the three or four fields that decide
whether a student can act, and its schema cannot express several of them at all.

Four things the data model cannot currently say, each of which changed a real recommendation tonight:

1. **What the student's actual next action is** — for most top-tier opportunities it is not "apply".
2. **Who is eligible** — when the rule is not a country list, and it usually isn't.
3. **What it costs** — when the money is at the other end, or paid by someone else.
4. **Whether the link still works** — nothing checks.

---

## 1. The action model is wrong for the best opportunities

I recorded `self_registration_possible` on every competition. Across the entire flagship tier it is
**false**:

> IMO — *"Participation in an IMO is by invitation only."*
> IBO — *"you have to win the Biology Olympiad in your country or region."*
> IOI — national delegation. IOL, IEO, SJWP — national organiser.
> ISEF — only via an affiliated fair. AMC — *"Students and parents do not register directly with the MAA."*

Direct-entry exceptions found all night: **CERN BL4S, Regeneron STS, NYAS Junior Academy, CrowdMath,
Davidson Fellows, Marshall Society, Blackstone Junior.**

So for most of the highest-value records, storing the international deadline and rendering "apply by
X" produces an instruction the student **cannot follow**. The real action is *"enter your national
competition"* — which happens months earlier, under a different organisation's name, in their own
language.

**This is not a missing field. It is a missing concept.** An opportunity has an *entry path*, and the
student's next step is the first hop on it, not the last.

Worked example, fully evidenced tonight:

> A student in Türkiye who wants to reach the **International Biology Olympiad** does not apply to
> IBO. They enter **TÜBİTAK Bilim Olimpiyatları** — which IBO's own member list names, by URL, as
> Türkiye's national route. Applications close in spring, **final-year students are excluded**, and
> a student who waits until 12th grade has permanently missed it.

And the same shape inverted, which is why this must be evidenced per-opportunity rather than assumed:

> **HMMT publishes a warning that there is no legitimate national representative** — *"Any non-HMMT
> person or group claiming to represent HMMT is untruthful, especially if they claim to represent
> HMMT in a specific country."* Someone is selling that intermediary role. An advisor that had
> learned "find your country's route" as a general rule would walk a student straight into it.

---

## 1b. The stored deadline often belongs to someone other than the student

A variant of the same problem, and I found four instances in ~25 rows examined closely. The date is
**accurate**; its **owner** is not the student.

| Row | Stored | What it actually is |
|---|---|---|
| AMC - AIME | 2026-10-15 | The **school's** registration deadline. *"Students and parents do not register directly with the MAA."* |
| Waterloo / CEMC | 2026-10-22 | The school's contest **ordering** deadline. Students write on 2026-11-18. |
| Wharton Investment | 2026-09-11 | A real deadline — but entry needs *"teams of four to six, guided by a teacher from their school"*. **That fact IS stored, in `description` — and `lib/ai/opportunity-context.ts` never passes `description` to the advisor.** |
| Purple Comet | 2027-04-15 | The **last day of the contest window**, not an application date at all. |

**This is worse than a missing date.** A missing deadline produces no urgency messaging. A deadline
owned by someone else produces *confident* urgency for an action the student cannot perform — "12 days
left to apply" for something only their school can do. They either watch it pass or try and find no
door. Both cost more trust than silence would.

`deadline` is one date with no owner and no type. At least four distinct things are being stored in
it: the student's own submission date; an institution's registration or ordering date; the date an
event happens; and the date a national qualifying round closes — which, per §1, is the real first hop
for most of the flagship tier.

The `self_registration_possible` flag I recorded on every competition in this lane is a usable proxy:
**if it is false, the stored date is probably not the student's.**

## 2. "Eligible countries" is the wrong shape for eligibility

**Four US opportunities resolve the same student's case four different ways:**

| Opportunity | Rule |
|---|---|
| Regeneron STS | residence + school, **citizenship irrelevant** — but *"attending American schools abroad, but who are not US citizens, are not eligible"* |
| Davidson Fellows | citizenship/PR **and** residence |
| SIMR | residence **and** school **and** citizenship/PR |
| MIT PRIMES | residence only — **and MIT names the alternative itself**: *"International students are welcome to participate in CrowdMath"* |

Take one student — a Turkish citizen in their final year at an American school in Istanbul. STS: no,
*by name*. Davidson: no. SIMR: no. PRIMES: no, but MIT hands them CrowdMath, where the answer is yes.
Move that student physically into a US school and **STS flips to yes** while the others stay no.

One country field answers all of this identically, and confidently, and wrongly.

**And the tag can be simply false.** `National History Day` is stored as `["United States"]` with no
other qualifier — while NHD's own affiliate directory lists **NHD China** (Concordia International
School Shanghai), **NHD Korea** (Seoul International School) and **NHD International** (Singapore
American School).

**And sometimes eligibility is partial**, which no single field can hold:

> USACO — *"All are welcome to participate in online USACO contests and training. Only pre-college
> students in the USA are eligible for selection as finalists to attend the USACO training camp."*

A Turkish student can compete, be promoted Bronze→Silver→Gold→Platinum, and put a real verified rank
on an application. They cannot make the US team. `["United States"]` excludes a student who can
genuinely compete; an empty field implies a national squad place they can never have.

**And it is not a US quirk.** Three flagship olympiads — same kind of event, same age group, selected
the same way — answer the single most common question an international student has in three
**incompatible** ways:

| Olympiad | The expatriate student's answer |
|---|---|
| **IMO** | May represent their country of **residence** — but only after *"at least one full academic year"* there, a commitment to *"at least two years in full-time education"*, and *"for a bona fide family reason"*. |
| **IOI** | *"Students who are studying abroad may instead represent the Country of their **nationality**."* |
| **IOAA** | *"Must be either a **citizen or a regular resident** of the country they represent"* — plain disjunction, no duration test. |

IMO also adds: *"IMO tourism is not permitted: a student may not attempt the final selection
examinations of more than one country in a given IMO year."*

So a Turkish student at an international school abroad gets three different answers depending on which
olympiad they ask. **Any heuristic the advisor learns from one will be wrong for the others.**

**The minimum honest fix:** store the eligibility *sentence* beside the country list. Every record I
wrote carries it in a `*_verbatim` field for exactly this reason.

---

## 2b. "My country is on the list" is not the same as "I can enter"

The national-route model (§1) only works if the national route is actually **running**. Twice tonight
a country directory said yes and the truth was no:

- **IOL** lists the United Arab Emirates — with no national olympiad named and marked
  **Not Accredited**. Listed, not eligible.
- **IJSO** lists Türkiye — and its published participation grid shows √ in only **4 of 22 editions
  (2004, 2016, 2019, 2021)** and **nothing since 2021**. Listed, but dormant for five years.

Compare a genuinely live route: **IOI** shows Türkiye at 33 years' participation, 97 contestants,
90 medals, with a national-body URL published by IOI and verified live. Both look like "yes" in a
country list; only one is a route a student can take this year.

A participation directory answers *"has this country ever taken part?"* — a different and much weaker
question than *"can a student here enter now?"* Any eligibility field derived from such a list
inherits that ambiguity silently.

*(Related and mundane but costly: in every alphabetically sorted country table, **Türkiye and
Turkmenistan are adjacent**. A substring match on "turk" returned the wrong country five separate
times tonight — SJWP organisers, IBO members, IOL countries, IChO contacts, IJSO participants.)*

## 2c. The homepage banner lies more often than the dedicated cycle page

Three separate times tonight, a competition's landing-page call-to-action was stale while a
dedicated "current cycle" page told the truth:

- **Özyeğin Summer Research** — banner: *"APPLICATIONS FOR 2026 ARE NOW OPENED"*. Actual: closed,
  deadline 15 May already passed.
- **IPsyO** — I initially read only the landing page and told the team it had lapsed. It hadn't; a
  `current-ipsyo.html` page showed a full 2026 edition had run to completion.
- **IEnvO** — homepage: *"Register for IEnvO 2026"*, Global Grand Test dated 8 August 2026 — **15
  days in the past**. Its own `current-ienvo.html` page: *"Registration for IEnvO 2026 has closed."*

**Trust the dedicated cycle page over the homepage CTA.** A landing page is marketing and gets
updated on its own schedule; a "current edition" page is closer to the actual operational state.

## 3. Cost is at least four questions, and `cost` answers one

- **How much** — the only one the column holds.
- **When** — JRHS takes **$350 at submission** against its own published **~30% acceptance**; IJHSR
  takes the same $350 **only on acceptance**. Identical column value, opposite risk.
- **Who pays** — IChO's *"participation fee for IChO is 3000 USD for one team"* is billed to the
  country. AMC's $55/$75/$115 is the school's. Writing either into `cost` tells a 16-year-old to find
  money they were never being asked for.
- **Where the money is** — the four commercial essay contests are **genuinely free to enter**. Their
  prize is a discount on the organiser's own product, and in Immerse's case that product is
  `open_enrollment` at **£7,495**. The competition is free; the pathway it feeds is purchased. **A
  cost-based gate cannot see this, because the money is at the other end.**

And the heuristic behind a cost gate breaks in both directions:

> **The Concord Review** charges **$70 at submission** and publishes *"We publish about 5% of the
> essays we receive."* That is ~$1,400 per publication — **worse expected cost than JRHS's ~$1,167**.
> Yet it is the right answer and JRHS is the wrong one, because TCR is the most selective venue of its
> kind and JRHS has no external standing. **Fee structure and prestige are independent axes.**

---

## 4. Nothing checks whether the link still works

`evaluateRecommendationReadiness()` requires `official_url` to **exist**. It never asks whether it
**resolves**.

> Columbia Junior Science Journal: `verified_current`, `cycle_status='open'`, a **correct** deadline
> 38 days out — and `cjsjournal.org` returns no DNS answer. The real site is
> `columbiajuniorsciencejournal.org`. The deadline being right is what makes it worse: a student acting
> on a real, near date lands on nothing.

One broken link in a sample of 13. A corpus-wide liveness sweep is a cheap script, and it asks a
different question from both provenance ("is this claim supported?") and freshness ("is this still
true?"): **"is the source still reachable?"**

**Related, and mine:** a tool failure is not a fact about the source. Perimeter 403s WebFetch, a real
browser *and* the Internet Archive; cee.org, maa.org, hmmt.org and arts.princeton.edu all 403 WebFetch
but serve a real browser fine; `cjsjournal.org` looked like the same thing and was actually a dead
domain. Three different underlying realities behind one symptom.

---

## 5. Coverage is wildly uneven — measured against ORYN's own interest list

Counted actionable competition/research rows against the 16 interests in
`lib/validation/onboarding.ts`:

**Law 0 · Psychology 0** · Medicine 1 · Biology 2 · Design 2 · Economics 2 · History 2 · Engineering 3
· Environmental Science 3 · Physics 3 · Politics 3 · Business 5 · Mathematics 5 · Entrepreneurship 8 ·
Literature 9 · **Computer Science 18**

ORYN invites a student to choose **Law** or **Psychology** at onboarding and then has nothing to offer
them. Computer Science alone outnumbers Law + Psychology + Medicine + Biology + Design + Economics +
History **combined**. An advisor recommending from what exists will steer every student toward CS
regardless of what they said they wanted.

**None of this is visible in a row count.** The corpus looks healthy at 86 rows.

*(This measurement changed my own priorities mid-session — I had assumed CS was thin and had not
thought about Law at all.)*

---

## 6. For Türkiye specifically, one organisation is the hub

Evidenced end to end tonight:

**TÜBİTAK Bilim Olimpiyatları** (9 subjects, one application) is Türkiye's national route to **five**
of the world's flagship olympiads. Each was confirmed separately, from the *international* body's side:

| Body | How it names TÜBİTAK | Subject |
|---|---|---|
| **IBO** | publishes `bilimolimpiyatlari.tubitak.gov.tr` as Türkiye's national olympiad site | Biology |
| **IMO** | the sole national link on its Türkiye country page | Mathematics |
| **IChO** | names TÜBİTAK as the institution of Türkiye's first long-term contact | Chemistry |
| **IPhO** | publishes a `tubitak.gov.tr` national link — *though that URL is dead and the page is dated 2019* | Physics |
| **IOI** | publishes the TÜBİTAK **Bilgisayar** branch page; link verified live, 33 years' participation, 90 medals | Computer Science |

**And note the asymmetry:** TÜBİTAK's own competition pages never say where its ladder leads. Every one
of these confirmations had to be found from the other end. A student reading TÜBİTAK's site alone
cannot see the ladder they are standing on — which is precisely the kind of connection an advisor
exists to make. **TÜBİTAK 2204-A** is the national research competition, and TÜBİTAK's own newsroom states it
selects Türkiye's **EUCYS** entrants through *four* stages — the fourth being a separate selection of
who goes abroad.

And the reason this matters more than any other Turkish record:

> §7.1.1 — national top-three earns an **Ek Katsayı** (coefficient uplift) on YKS.
> §7.1.2 — top-three at an international competition TÜBİTAK **sent you to** earns **sınavsız
> yerleştirme**: placement into a related university programme **without sitting the exam**.

Both need a **separate application to TÜBİTAK**, in the **first exam year, once only**, in a
field-related department — and the document puts the burden on the student:
*"başvuru sürecinin takibi proje sahibi öğrencilerin sorumluluğundadır."*

**The fourth stage is the finding that matters most.** Winning nationally does not put you on the
plane. Exam-free placement is **two selections away, not one**. Without that, ORYN would have told a
student that placing in the national final leads to exam-free admission — a wrong-and-permissive error
they would discover years later, at a point of no return.

Other confirmed Turkish routes: **IEO** → Turkey Economics Olympiad · **IOL** → Ulusal Linguistik
Olimpiyatı (accredited) · **SJWP** → Devlet Su İşleri (DSİ), Ankara · **AMC** → International Group
Leader, not MAA directly · **Brain Bee** → Beyin Araştırmaları Derneği.
**Not confirmed and deliberately not generalised:** IChO, IPhO, IOI, IOAA, IESO, IJSO, IOAI.

---

## 7. Method notes that earned their keep

- **Verify identity, don't pattern-match.** "Stockholm Water Prize" (a career award for senior
  researchers, live and matched to all 7 users) vs "Stockholm **Junior** Water Prize" (ages 15-20,
  39 countries, absent). One word. Twice a search for `turk` returned **Turkmenistan** first.
  "Blackstone Law Review — Cambridge" *explicitly disclaims* any Cambridge connection.
- **Where a claim sits matters as much as what it says.** "169 countries have participated" is a
  statistic, not an eligibility rule. I left `eligible_countries` empty on rows whose worldwide reach
  I strongly believe, because the operator stated reach and not eligibility.
- **Check the authority that can settle it, not the one that implies it.** TÜBİTAK's call never names
  an international competition; IBO, IMO and TÜBİTAK's own newsroom each named the link from the
  other end. Three times.
- **Aggregators are discovery only.** Clark Scholars is described by a consulting blog as open to
  international students; the official page says *"Must be a U.S. Citizen or Permanent Resident."*
  An "LSE Global Innovation Challenge" for 13-18s does not appear anywhere on lse.ac.uk.
- **Record non-results.** "I checked and could not verify this, here is the specific obstacle" is
  worth more than silence, which the next lane reads as "cleared".

**And my own errors, all three of the same shape** — concluding from the surface I happened to open
rather than the one that holds the answer: I called parked commercial rows "unlabelled" (never
queried `status`); I called `unverified` rows "what reaches students" (read `opportunity_matches`
instead of the counselor's gate, which filters at two layers); I called IPsyO lapsed (read the
landing page, not its current-cycle page). A date-audit script I wrote against my own 43 records also
caught **7 defects of my own**, including the string `"NOT STATED"` sitting in a `deadline` field.

---

## What I would fix first

1. **Breakthrough Junior Challenge** — reaches recommendations, **23 days out**, and does not say the
   video must be **in English**.
2. **The three near-deadlines that are not in the corpus or not stored**: Marshall Society (**7 days**),
   HMMT registration (**~28 days**, field empty), Regeneron STS (74 days, absent).
3. **The CJSJ dead URL** — one field, real deadline behind it.
4. **Store the eligibility sentence** alongside the country list. Cheapest change with the largest
   truth gain.
5. **Store fee timing**, not just amount.
6. **Re-run the interest-coverage measurement after every ingest.** It catches what row counts hide.
