# Live `opportunities` description-quality defects — full row inventory

Measured 2026-08-22 by BUG-1 against the live dev project `oryn-qa-scratch`
(`qtcvcflzxbuagvvwahhu`), **read-only — no row was modified**.

Scope of this list: rows with `status='active'` (i.e. live in Browse, since
`lib/opportunities/browse.ts:43` filters on exactly that) carrying at least one
deterministic defect signature.

**85 of 271 active rows (31.4%).**

Signature key (column 4):

| Flag | Meaning | Detector |
|---|---|---|
| `T` | Description opens by restating its own title | `description LIKE left(title,25) \|\| '%'` |
| `U` | Raw `http(s)://` URL inside the description body | `description ~ 'https?://'` |
| `X` | Truncated mid-text, ends in a literal `…` | `description LIKE '%…'` |
| `N` | Title is an institution name, not an opportunity | `title ~ '\([A-Za-z .]+, ?[A-Za-z .]+\)$'` |

`·` means that signature is absent.

| id (short) | title | category | flags |
|---|---|---|---|
| `031502eb` | New York Times Audio Stories Podcast Contest | competition | TU·· |
| `0f182854` | Princeton University Ten-Minute Play Contest | competition | TU·· |
| `0f7a1ef0` | University of Applied Sciences and Arts of Western Switzerland | summer_program | TUX· |
| `12d06ccb` | The Wall Street 101 Summer Pre-College Program | summer_program | TU·· |
| `142a6597` | Student Science Training Program | summer_program | TU·· |
| `14db7109` | University of Maastricht, Netherlands | summer_program | TU·· |
| `16b3d6ae` | Dive Into Engineering! | summer_program | TUX· |
| `16d56c3b` | Purdue University | summer_program | TU·· |
| `1d7aeeff` | Hong Kong Baptist University (HKBU) | summer_program | TUX· |
| `1d9d3901` | For-Credit Fun-Sized Courses | summer_program | TU·· |
| `1e907aad` | King's College London (London, UK) | summer_program | TUXN |
| `2116709f` | Research Program KUSRP 2026 | summer_program | TUX· |
| `216c88aa` | Nanoteknoloji ve Biyoteknoloji Lise Kış Kampı | summer_program | TU·· |
| `24495501` | Stanford Pre-Collegiate Summer Institutes | summer_program | T··· |
| `255377bc` | The Hong Kong Polytechnic University (PolyU) | summer_program | TUX· |
| `2b1886f1` | Nat Geo Slingshot | competition | TU·· |
| `2bbea7da` | The Rockefeller University Summer Science Research Program (SSRP) | summer_program | TUX· |
| `30436a92` | University of Edinburgh International Summer School | summer_program | TUX· |
| `3c4cbeb7` | Pre-College Program | summer_program | ·U·· |
| `3f7170ba` | AI Scholars | summer_program | TU·· |
| `437963fb` | Interlochen Arts Camp | summer_program | T··· |
| `483c0af4` | Winchester College - Discover Summer Program | summer_program | TUX· |
| `4a54159a` | University of Southern California (CA, USA) | summer_program | TU·N |
| `4ce6fd8f` | AMC - AIME | competition | TU·· |
| `4db17042` | Sabancı University Nanotechnology Winter School | summer_program | TUX· |
| `4f668b96` | Global Issues at Princeton: Grades 10-12 | summer_program | TUX· |
| `647eb8da` | UCSB Research Mentorship Programs | summer_program | TUX· |
| `6672d211` | İTÜ Tasarım Atölyesi (itüTA) | summer_program | TUX· |
| `692aaffc` | Parsons Summer Intensive Studies | summer_program | T··· |
| `6bcef34b` | Kadir Has Kış Okulu | summer_program | ·U·· |
| `6d62d570` | NYU High School Law Institute | summer_program | ·U·· |
| `6f80e90f` | Oxford Royale | summer_program | ·U·· |
| `7aa517a3` | ECON 1 - 01 Introductory Microeconomics: Resource Allocation and Mar | summer_program | TU·· |
| `7dabbd20` | USC Summer Programs 2025 Info Sessions | summer_program | TUX· |
| `7f8281b0` | Earn college credit that may transfer to any college you attend | summer_program | TU·· |
| `889c580c` | Two-week UM Academies (non-credit) | summer_program | ·UX· |
| `8e5c10af` | The Summer School of the Polytechnic University of Milan (POLIMI) 20 | summer_program | TUX· |
| `8f6e438f` | Hochschule Bremen (HSB) City University of Applied Sciences, Germany | summer_program | TUX· |
| `900b0a32` | ACU BİLİM YAZ KAMPI PROGRAMI 2026 | summer_program | TU·· |
| `907e279d` | New York University (NY, USA) | summer_program | TUXN |
| `910ec94d` | Time: 4:30pm – 5:30pm (Hong Kong time) (time in your region) | summer_program | TU·· |
| `95093e1a` | Interlochen Review | research | T··· |
| `9b93f1ce` | Harvard CURE Initiative to Eliminate Cancer Disparities | summer_program | ·U·· |
| `9f1b802e` | Pre-College Summer Programs (Immersion/Stones and Bones/Summer Bridg | summer_program | TU·· |
| `a5cf4328` | Downing College University of Cambridge - 2026 | summer_program | TUX· |
| `a7a89e1e` | Lehigh University: Bethlehem, PA | summer_program | TUX· |
| `ae5e73f0` | University of the Arts London - The UAL International Summer School | summer_program | TUX· |
| `aeeb130a` | George Washington University: Washington, DC | summer_program | TUX· |
| `af30653c` | Northwestern University | summer_program | TUX· |
| `b0432a47` | NYLF Medicine & Health Care | summer_program | T··· |
| `b10444c7` | Summer Programs in the Netherlands - 2025 | summer_program | TUX· |
| `b4091e25` | Carnegie Mellon University (PA, USA) | summer_program | TUXN |
| `b51bf24f` | STEM Fellowship Journal | research | T··· |
| `b5d022aa` | Leangap | summer_program | ·U·· |
| `bc678344` | Lumiere Education | summer_program | TUX· |
| `c14ee166` | Andover Summer at Phillips Academy 2026 | summer_program | TUX· |
| `c4e113c2` | American University, Washington DC | summer_program | T·X· |
| `c581e99a` | The Pioneer Academics Research Program | summer_program | TUX· |
| `c582f1d9` | The Harvard Crimson Global Essay Competition | competition | TU·· |
| `c7223aea` | 67th London International Youth Science Forum (LIYSF) - 2026 | summer_program | TUX· |
| `c8cd2706` | Major League Hacking | competition | TU·· |
| `c8eb3d40` | Stockholm Water Prize | competition | TU·· |
| `ccd1cf71` | Summer at Stanford Program for High School 2025 | summer_program | TU·· |
| `ce7d618b` | University of California, Santa Barbara, CA, USA | summer_program | TU·· |
| `cf169cf4` | John Locke Institute (JLI) Courses | summer_program | TUX· |
| `cfe42a66` | AwesomeMath Summer Program | summer_program | TU·· |
| `d12506f1` | Lehigh University | summer_program | TUX· |
| `d1c24acc` | Venture & Tech Summer Program 2026 | summer_program | TUX· |
| `d224a324` | CTY: Intensive Studies for 7th Graders and Above | summer_program | TUX· |
| `d50285d3` | Tisch Summer High School | summer_program | T··· |
| `d83d7048` | Garcia Summer Scholars | summer_program | TUX· |
| `dc762fce` | Edinburgh Summer School 2024 | summer_program | TU·· |
| `e03e1172` | Summer High School Programs - at BU | summer_program | TUX· |
| `e0960bef` | University of St. Andrews (Scotland, UK) | summer_program | TUXN |
| `e6f4c6d8` | Bocconi Summer School 2026 | summer_program | TUX· |
| `e9c4cd39` | Early College Program (ECP) Courses for High School Students (Ages 1 | summer_program | ·UX· |
| `eaabbbee` | UCL The Bartlett Summer Schools 2025 | summer_program | TUX· |
| `eee7b96a` | Coriell Institute for Medical Research, NJ, USA | summer_program | TU·· |
| `f493d81f` | The Institute of Competition Sciences (ICS) | competition | TUX· |
| `f54d2f62` | Inspirit AI + Healthcare and Medicine | summer_program | TU·· |
| `f8fc69c2` | Trinity College London, Ireland | summer_program | TUX· |
| `f912de6d` | Columbia Spring Immersion Program | summer_program | TU·· |
| `fad2bef3` | Wharton Global Youth Program | summer_program | TUX· |
| `fd105724` | Universidad de Navarra - University of Navarra | summer_program | TUX· |
| `fd51d7f8` | PreCollege at Ringling College of Art and Design | summer_program | TUX· |
