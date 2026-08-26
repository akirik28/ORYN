# Live `opportunities` baseline, `category='competition'` — measured 2026-08-26, freeze day 1 start

Queried directly against Supabase project `qtcvcflzxbuagvvwahhu` (`oryn-qa-scratch`) via
`execute_sql`. **This is a snapshot — re-run the query below before treating any single row as
current**, especially `status`/`verification_state`/`deadline`, since other lanes may write to
this table during the week.

```sql
select id, title, organization, status, verification_state, cycle_status, deadline,
       eligible_countries, source_confidence, fields
from public.opportunities where category='competition' order by title;
```

**101 rows total: 70 `active`, 31 `under_review`.** Almost none carry populated
`eligible_countries` (shown as `[]` below unless noted) — this is the corpus-wide gap this
lane exists to close. Do not propose any of the titles below as a "new" record — verify, deepen,
Turkey-gate, and photo-check them instead.

| Title | Organization | Status | Verification | Cycle | Deadline | Eligible countries | Fields |
|---|---|---|---|---|---|---|---|
| 120 Hours | 120 Hours | active | verified_current | closed | — | [] | architecture, design |
| AMC - AIME | Mathematical Association of America (MAA) | active | unverified | upcoming | 2026-10-15 | [] | mathematics |
| American Regions Mathematics League (ARML) | American Regions Mathematics League | active | verified_current | closed | — | [] | mathematics |
| Andrew Jobbings Senior Kangaroo | UK Mathematics Trust (UKMT) | under_review | unverified | upcoming | 2027-03-19 | [] | mathematics |
| Baltic Sea Philosophy Essay Event (BSPEE) | FETO / Philosophical Society of Finland | active | verified_current | date_not_announced | — | [] | philosophy, writing |
| Barcelona International Youth Science Challenge (BIYSC) | BIYSC | active | verified_current | date_not_announced | — | [] | science |
| Battle Code MIT | MIT Battlecode | active | verified_current | date_not_announced | — | [] | computer_science, artificial_intelligence |
| Bennington College Young Writers | (null) | under_review | unverified | unverified | — | [] | — |
| Blue Ocean Competition | Blue Ocean Student Entrepreneurs Corporation | active | verified_current | upcoming | 2027-02-21 | [] | entrepreneurship, business |
| BmMT (online) | (null) | under_review | unverified | unverified | — | [] | — |
| BMO Round 1 / Round 2 | UK Mathematics Trust (UKMT) | under_review | unverified | unverified | — | [] | mathematics |
| Breakthrough Junior Challenge | Breakthrough Prize Foundation | active | verified_current | upcoming | **2026-09-15** | [] | Science, Physics, Mathematics, Life Sciences |
| BrUMO (Brown University Math Olympiad) | Brown University | active | verified_current | closed | 2026-02-15 | [] | mathematics |
| Carnegie Mellon Informatics and Mathematics Competition (CMIMC) | Carnegie Mellon University | active | verified_current | date_not_announced | — | [] | mathematics, computer_science |
| Cayley Olympiad | UK Mathematics Trust (UKMT) | under_review | unverified | upcoming | 2027-03-19 | [] | mathematics |
| Congressional App Challenge | Internet Education Foundation | active | verified_current | open | 2026-10-26 | **[United States]** | computer science, software development |
| Conrad Challenge (Space Center Houston) | Space Center Houston | active | verified_current | upcoming | 2026-10-30 | [] | entrepreneurship, engineering, computer_science |
| CyberPatriot | Air & Space Forces Association | active | verified_current | upcoming | 2026-10-01 | [] | cybersecurity, computer science |
| DECA Competitive Events Program | DECA Inc. | active | verified_current | upcoming | — | [] | business, marketing, finance, entrepreneurship, hospitality |
| DNA Day Essay Contest | American Society of Human Genetics (ASHG) | active | verified_current | historical | 2026-03-04 | [] | writing |
| European Union Contest for Young Scientists (EUCYS) | European Commission | active | verified_current | upcoming | — | [] | science, research, technology |
| FIRST Global Challenge | FIRST Global | active | verified_current | upcoming | — | [] | Engineering |
| FIRST Robotics Competition | FIRST | active | verified_current | upcoming | 2026-11-17 | [] | robotics, engineering, computer science |
| FRC (FIRST® Robotics Competition) | (null, likely dup of above) | under_review | unverified | unverified | — | [] | — |
| Future Innovators Scholarship Competition | (null) | under_review | unverified | unverified | — | [] | — |
| GENIUS Olympiad | Terra Science and Education | active | verified_current | date_not_announced | 2026-03-07 | [] | artificial_intelligence, computer_science, robotics, research |
| Grey Kangaroo / Hamilton Olympiad / Maclaurin Olympiad / Pink Kangaroo | UK Mathematics Trust (UKMT) | under_review | unverified | upcoming | 2027-03-19 | [] | mathematics |
| Harvard Alumni for Global Women's Empowerment Essay Contest | (null) | under_review | unverified | unverified | — | [] | — |
| Harvard Pre-Collegiate Economics Challenge (HPEC) | Harvard Undergraduate Economics Association | active | verified_current | date_not_announced | — | [] | economics |
| Harvard-MIT Mathematics Tournament (HMMT) | Harvard-MIT Math Tournament | active | unverified | unverified | — | [] | mathematics |
| Horizon Academic Essay Prize | (null) | under_review | unverified | unverified | — | [] | — |
| HOSA Future Health Professionals | HOSA | active | verified_current | date_not_announced | — | [] | health sciences, medicine, biomedical science |
| iGEM High School Competition | iGEM Foundation | active | unverified | unverified | — | [] | Synthetic Biology, Biology |
| Immerse Education Essay Competition | (null) | under_review | unverified | unverified | — | [] | — |
| Intermediate Mathematical Challenge | UK Mathematics Trust (UKMT) | under_review | unverified | upcoming | 2027-01-06 | [] | mathematics |
| International Academic Marathon | (null) | under_review | unverified | unverified | — | [] | — |
| International Biology Olympiad (IBO) | International Biology Olympiad | active | verified_current | date_not_announced | — | [] | Biology |
| International Brain Bee (IBB) | International Brain Bee | active | verified_current | date_not_announced | — | [] | Psychology, Medicine, Biology, neuroscience |
| International Chemistry Olympiad (IChO) | International Chemistry Olympiad | active | verified_current | upcoming | — | [] | chemistry |
| International Economics Olympiad (IEO) | International Economics Olympiad | active | verified_current | date_not_announced | — | [] | Economics |
| International Environmental Olympiad (IEnvO) | (null) | active | verified_current | closed | — | [] | Environmental Science |
| International Genetically Engineered Machine Competition (iGEM) | (null, likely dup) | under_review | unverified | unverified | — | [] | — |
| International Greenwich Olympiad | (null) | under_review | unverified | unverified | — | [] | — |
| International Mathematical Olympiad (IMO) | International Mathematical Olympiad | active | verified_current | upcoming | — | [] | Mathematics |
| International Olympiad in Artificial Intelligence (IOAI) | International Olympiad in Artificial Intelligence | active | verified_current | date_not_announced | — | [] | Computer Science, artificial_intelligence |
| International Olympiad in Informatics (IOI) | International Olympiad in Informatics | active | verified_current | date_not_announced | — | [] | Computer Science |
| International Philosophy Olympiad (IPO) | FISP / UNESCO | active | verified_current | date_not_announced | — | [] | philosophy |
| International Physics Olympiad (IPhO) | International Physics Olympiad | active | verified_current | date_not_announced | — | [] | Physics |
| International Psychology Olympiad (IPsyO) | International Psychology Olympiad | active | verified_current | closed | — | [] | psychology |
| International Public Policy Forum (IPPF) | Brewer Foundation / NYU | active | verified_current | upcoming | 2026-10-13 | [] | public policy, IR, debate, humanities |
| International Young Physicists' Tournament (IYPT) | IYPT | active | verified_current | upcoming | — | [] | physics |
| JLI Global Essay Competition | John Locke Institute | active | verified_current | closed | 2026-05-31 | [] | economics, humanities, IR, law, psychology, political_science, philosophy |
| Major League Hacking | (null) | active | unverified | unverified | — | [] | — |
| Mathematical Competition for Girls / Olympiad for Girls | UK Mathematics Trust (UKMT) | under_review | unverified | upcoming | 2026-09-23 | [] | mathematics |
| Microsoft Imagine Cup Junior | (null) | under_review | conflicting | discontinued | — | [] | artificial_intelligence, computer_science |
| Nat Geo Slingshot | (null) | active | unverified | unverified | — | [] | — |
| National Economics Challenge | Council for Economic Education | active | verified_current | closed | — | [] | economics |
| National High School Ethics Bowl (NHSEB) | UNC Chapel Hill | active | verified_current | date_not_announced | — | **[United States]** | philosophy, ethics, humanities |
| National History Day (NHD) | National History Day, Inc. | active | verified_current | upcoming | — | **[United States]** | history, humanities, research |
| New York Times Audio Stories Podcast Contest / Student Editorial & Essay Contests | (null) | active/under_review | unverified | unverified | — | [] | — |
| NFTE Youth Entrepreneurship Showcase Series | Network for Teaching Entrepreneurship | active | verified_current | upcoming | — | [] | entrepreneurship, business |
| Penn Apps | PennApps, UPenn | active | verified_current | date_not_announced | — | [] | computer_science |
| Princeton University Ten-Minute Play Contest | (null) | active | unverified | unverified | — | [] | — |
| Purple Comet! Math Meet | Art of Problem Solving Foundation | active | verified_current | upcoming | 2027-04-15 | [] | mathematics |
| Scholastic Art & Writing Awards | Alliance for Young Artists & Writers | active | verified_current | open | — | **[United States, Canada]** | art, writing |
| Science Olympiad (Division C) | Science Olympiad, Inc. | active | verified_current | upcoming | — | [] | biology, chemistry, physics, earth science, engineering |
| Senior Mathematical Challenge / Senior Team Maths Challenge | UK Mathematics Trust (UKMT) | under_review | unverified | upcoming/unverified | 2026-09-16 | [] | mathematics |
| Singularity AI Essay Contest | (null) | under_review | unverified | unverified | — | [] | — |
| STEM Racing | STEM Racing | active | verified_current | unverified | — | [] | engineering |
| Stockholm Junior Water Prize | SIWI — Turkey route via DSİ | under_review | unverified | date_not_announced | — | [] | environmental science |
| Stockholm Water Prize | (null) | active | unverified | unverified | — | [] | — |
| Taiwan International Student Design Competition (TISDC) | Taiwan Ministry of Education | active | verified_current | date_not_announced | — | [] | Design |
| Team Maths Challenge (Junior) | UK Mathematics Trust (UKMT) | under_review | unverified | unverified | — | [] | mathematics |
| Technovation Girls | Technovation | active | verified_current | date_not_announced | — | [] | technology, entrepreneurship, computer science |
| The Blackstone Law Review Competition — Junior Division | Quant Terminal LLC | active | verified_current | upcoming | 2027-03-31 | [] | Law |
| The Concord Review - Emerson Prize | The Concord Review, Inc. | active | verified_current | open | 2026-11-01 | [] | history, humanities, writing, research |
| The Diamond Challenge | Horn Entrepreneurship, U. Delaware | active | verified_current | upcoming | 2027-01-14 | [] | entrepreneurship, business |
| The Diana Award | (null) | under_review | unverified | unverified | — | [] | — |
| The Earth Prize Competition | The Earth Foundation | active | verified_current | open | — | [] | environmental_science |
| The Harvard Crimson Global Essay Competition | (null) | active | verified_current | open | 2027-01-31 | [] | — |
| The Institute of Competition Sciences (ICS) | (null) | active | unverified | unverified | — | [] | — (not a real competition — directory) |
| The Marshall Society Essay Competition 2026 | The Marshall Society | active | verified_current | open | **2026-08-30** | [] | Economics |
| UK Chemistry Olympiad | Royal Society of Chemistry | active | verified_current | upcoming | 2027-01-11 | **[United Kingdom]** | chemistry |
| UniHive Research Proposal Competition | (null) | under_review | unverified | unverified | — | [] | — |
| Upenn Wharton Hack-AI-thon | Wharton AI & Analytics Initiative | under_review | verified_current | upcoming | 2027-04-01 | [] | artificial_intelligence, computer_science |
| USA Computing Olympiad (USACO) | USACO | active | verified_current | date_not_announced | — | [] | computer science, competitive programming |
| Waterloo Mathematics and Computing Contests | CEMC, U. Waterloo | active | verified_current | upcoming | 2026-10-22 | [] | mathematics, computer_science |
| We the People | Center for Civic Education | active | verified_current | date_not_announced | — | **[United States]** | civics, public policy, government, humanities |
| Wharton Data Science Competition | Wharton Sports Analytics / Global Youth | active | verified_current | date_not_announced | — | [] | computer_science, mathematics |
| Wharton Global High School Investment Competition | UPenn Wharton | active | verified_current | open | 2026-09-11 | [] | finance, economics |
| World Scholar's Cup | World Scholar's Cup Foundation | active | verified_current | open | — | [] | interdisciplinary |
| World Wildlife Day International Youth Art Contest | IFAW | active | verified_current | closed | 2026-02-01 | [] | art |
| YIS Stock Pitch Competition | Young Investors Society | active | verified_current | closed | 2026-02-20 | [] | business, finance |
| Zero Robotics | MIT | active | verified_current | closed | 2026-05-22 | [] | robotics, computer_science, engineering |

**Known likely duplicate pairs already in this list** (verify, don't assume — confirm via
official domain before merging or flagging): `FRC (FIRST® Robotics Competition)` vs `FIRST
Robotics Competition`; `International Genetically Engineered Machine Competition (iGEM)` vs
`iGEM High School Competition`; `Stockholm Water Prize` (professional career award — wrong
entity per `cr1`'s finding) vs `Stockholm Junior Water Prize` (the real youth award, correctly
already flagged `under_review`/unverified — this is the one to develop, not the professional
one).

**`cost` / `application_requirements` / `selectivity_tier` are not shown above** — pull them
per-row via `execute_sql` if you need them before proposing a change to an existing row.
