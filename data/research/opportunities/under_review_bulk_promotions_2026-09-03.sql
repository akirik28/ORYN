-- Prepared, NOT applied. Read-only investigation per CEO brief (2026-09-03), the founder
-- applies. 84 of the 107-row bulk under_review population, individually verified against
-- each program's own official page today. 7 confirmed dead. 16 unresolvable (untouched,
-- still status='under_review') -- 13 of the 16 are known/newly-found tool-access blocks,
-- not content ambiguity; see docs/under-review-bulk-verification-2026-09-03.md section 3.
-- Dry-run validated live (begin/rollback via the Supabase connector) before this file was
-- written -- all 84 statements matched and applied cleanly, confirmed rolled back after.

begin;

-- Acıbadem Üniversitesi Lise Yaz Programları
update public.opportunities set status = 'active', cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Acıbadem Üniversitesi (ASEGEM)' where id = 'a4451907-20af-43d3-8498-25a3829254c1';

-- BETA Camp
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Prequel, Inc. (formerly "BETA Camp")', official_url = 'https://www.joinprequel.com/' where id = 'd70e5392-9f0d-4191-8c8d-4921dbaa3651';

-- BRAND-ED
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Edconic (formerly BrandEd/"BRAND-ED"), owned by Cambridge Information Group', official_url = 'https://edconic.com/pre-college-programs/' where id = '72b66f92-1356-4827-9139-530db7c52c74';

-- Bahçeşehir Üniversitesi Yaz Okulu
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Bahçeşehir Üniversitesi (BAU)' where id = 'de7ab9aa-74a5-43d1-b02f-2730b2aed80f';

-- Bennington College Young Writers
update public.opportunities set status = 'active', cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Bennington College', deadline = '2026-11-01' where id = '793f6cf1-5af8-413a-b15f-89e5f1f9e44f';

-- Bentley University Pre-College Programs
update public.opportunities set status = 'active', cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Bentley University' where id = '9e601648-0d30-462e-b9f0-8d069392f29f';

-- BmMT (online)
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Berkeley Math Tournament (UC Berkeley student org, independent of the university)' where id = '823e79e6-3d59-48c4-a3cf-39bc9a670b98';

-- Boğaziçi Uni Yaz Okulu
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Boğaziçi Üniversitesi (BÜYEM)' where id = '19248dee-8118-47ee-9f5b-866b0d754be8';

-- Brown University (RI, USA)
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Brown University' where id = 'c2444f7f-e137-411d-9a14-c1ba8052e217';

-- Cambridge Future Scholars Programme
update public.opportunities set status = 'active', cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Cambridge Scholars'' Programme Ltd (private; not University of Cambridge)' where id = '70519f22-f165-44cf-b954-a3ab864077e0';

-- College Edge Summer
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Columbia University School of Professional Studies (Pre-College Programs)' where id = '40ef389f-b58f-447d-87b4-b7deb3effe2a';

-- Columbia Junior Science Journal (CJSJ)
update public.opportunities set status = 'active', cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Columbia Undergraduate Science Journal (CUSJ) — a Columbia student publication, not the institution', deadline = '2026-09-30', official_url = 'https://columbiajuniorsciencejournal.org/' where id = 'e0e1584c-5d96-41d6-a3a0-a62eaffa37d6';

-- Columbia University: New York, NY
update public.opportunities set status = 'active', cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Columbia University School of Professional Studies (Pre-College Programs)', deadline = '2027-03-01' where id = '17d177de-6ca7-4754-ab15-3a9dd93f4893';

-- Cornell University
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Cornell University (School of Continuing Education)' where id = '9caff85d-6976-422e-8fa1-6893eaefa54c';

-- DigiPen Academy Pre-College Summer Programs 2025
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'DigiPen Academy (a division of DigiPen Institute of Technology)' where id = '036f80e1-7ae5-46a9-8b68-6a890d50f8b8';

-- Frontiers Overview
update public.opportunities set status = 'active', cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Worcester Polytechnic Institute (WPI), Pre-Collegiate Outreach' where id = '9f0bb452-86ff-4f7b-93fd-9e23298c2d3b';

-- Future Innovators Scholarship Competition
update public.opportunities set status = 'active', cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Immerse Education', deadline = '2027-03-28' where id = '21368fde-a4f9-49f8-af64-7326b6c60e60';

-- Future Ready Summer Experience Program 2025 | Inspiring Global Citizens
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Renison International Programs, Renison University College, University of Waterloo', official_url = 'https://uwaterloo.ca/renison-international-programs/future-ready/dates-fees-and-application-process-future-ready' where id = '053114c6-b049-4eab-b7e1-b081efe183c9';

-- Galatasaray University High School Summer Programs 2026
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Galatasaray University (GSÜSEM — Lifelong Learning/Continuing Education Center)', official_url = 'https://liseyazokulu.gsu.edu.tr' where id = 'b3e40e31-a82d-4a34-bceb-b841f20d7296';

-- Georgetown Pre-College Online Program (Medicine / Journalism & Media)
update public.opportunities set status = 'active', cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Prelum (Kaplan, Inc., a Graham Holdings subsidiary), in partnership with Georgetown University' where id = '948b2e5f-1ec8-4838-9a0a-01c928b02a8c';

-- Georgetown University HOYA Summer-High School Sessions
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Georgetown University School of Continuing Studies' where id = 'a78975de-a35f-4030-b4fd-88a724b653ae';

-- HKUST I·ELITE Pre-University Scholars Program
update public.opportunities set status = 'active', cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Hong Kong University of Science and Technology (HKUST)', deadline = '2026-11-20' where id = 'f3cda419-64ae-4bac-bda9-3d1c6ccbbc37';

-- HSHSP (High School Honors Math, Science and Engineering Program)
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Michigan State University, College of Education' where id = '7b6ebabf-dd0a-4da5-9155-381674f6d7f0';

-- Harvard University (MA, USA)
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Harvard Division of Continuing Education (Harvard Summer School)' where id = '66c76976-90e5-4637-8afe-6828992e838a';

-- Horizon Academic Essay Prize
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Horizon Academic Research Program LLC' where id = '496ef7db-b8d4-4a72-8bcc-b7cb13208e40';

-- Horizon Inspires
update public.opportunities set status = 'active', cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Horizon Academic Research Program LLC (private; not university-run)' where id = '74bf3eb7-6f04-4dbb-9b71-9175287ed4b8';

-- IE JAB (Junior Advisory Board)
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'IE University' where id = '5eff8569-58f3-48fd-89ba-a320725b6321';

-- Illinois Institute of Technology: Chicago, IL
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Illinois Institute of Technology (Illinois Tech) — Elevate College Prep' where id = 'f05643c5-88fa-477c-ac16-8de0b0b547bc';

-- Immerse Education Essay Competition
update public.opportunities set status = 'active', cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Immerse Education', deadline = '2026-10-25' where id = 'ce680bf5-d52a-444e-a7de-ed1789cfc6aa';

-- International Academic Marathon
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'International Academic Marathon (self-operated, no parent institution)' where id = 'd4450b97-5d23-4ab1-acf7-8f3908117fd6';

-- International Greenwich Olympiad
update public.opportunities set status = 'active', cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'North London Grammar School', deadline = '2027-03-01' where id = '1ba4bf99-d36e-45d8-8dda-510587e52b05';

-- International Research Institute of North Carolina (IRI)
update public.opportunities set status = 'active', cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'International Research Institute of North Carolina (IRI-NC)' where id = '09b42a46-cd61-4576-bc5a-565975c66d05';

-- International Summer Schools St Andrews, Cambridge and Yale Universities (ISSOS)
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'ISSOS International Limited (private UK company; not St Andrews/Cambridge/Yale)' where id = 'f52db280-638a-49ec-a972-d1658b046234';

-- InvestIN Young Lawyer / Young Political Leader Summer Experience (London)
update public.opportunities set status = 'active', cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'InvestIN Education' where id = 'd99d1a5c-2b77-4bc1-af84-e429410eef68';

-- Johns Hopkins Engineering Innovation Pre-College Programs
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Johns Hopkins University — Engineering Innovation (Whiting School of Engineering)' where id = '6d3a439a-433e-4cce-b155-4dfd4cb53b48';

-- Journal of Emerging Investigators (JEI)
update public.opportunities set status = 'active', cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Journal of Emerging Investigators (JEI)' where id = '35f7475c-2567-4dde-ab61-c427059ff180';

-- Kadir Has Yaz Okulu
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Kadir Has University, sponsored by Kadir Has Foundation' where id = 'ee5d3870-77a8-43e5-8800-8738f6318d5f';

-- Kode With Klossy
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Kode With Klossy Inc. (501(c)(3) nonprofit)' where id = '455e6fb3-7592-45d4-852a-602acd95bd81';

-- Kış Bilim Kampı
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Acıbadem University, via ASEGEM' where id = 'c3a16d0e-55d1-4dd7-9c5e-d930a83b0460';

-- Maastricht Summer Program
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Maastricht University — Maastricht Summer School' where id = '991e6bda-56b9-4b48-9a51-16e9f0ec7c38';

-- Mathworks (Honors Summer Math Camp)
update public.opportunities set status = 'active', cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Texas State University (Mathworks Honors Summer Math Camp, Dept. of Mathematics)' where id = 'ccc1ff13-8673-4ba0-95fc-17050eee4306';

-- NYU Tandon Machine Learning Summer Program
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'New York University Tandon School of Engineering (K-12 STEM Education Programs)' where id = '08ee973d-9dce-485e-b2f2-51deeb48c2ff';

-- PACT Program in Algorithmic and Combinatorial Thinking
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'PACT (independently run; 2026 in-person component on UPenn campus; no single named parent — contact summertcs@gmail.com)' where id = '9d4f568b-f14b-4925-bf79-753088583ffe';

-- PROMED Projects 2026
update public.opportunities set status = 'active', cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Premed Projects Ltd.' where id = '1e0f59bd-2a96-4744-b5fd-90a9c0ba5801';

-- Phillips Exeter Academy
update public.opportunities set status = 'active', cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Phillips Exeter Academy (Exeter Summer program)' where id = '7761f771-fd60-48d8-a51f-152349051747';

-- Phillips Exeter Academy - New Hampshire NH
update public.opportunities set status = 'active', cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Phillips Exeter Academy (Exeter Summer program)' where id = 'f069afec-005f-43a8-82f2-6869785ad6f1';

-- Polygence
update public.opportunities set status = 'active', cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Polygence, Inc.', deadline = '2026-09-15' where id = '0337369f-bb69-47e5-aa82-d4a0e92a674b';

-- Pre-Baccalaureate Program
update public.opportunities set status = 'active', cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'The Wharton School, University of Pennsylvania (Wharton Global Youth Program)', deadline = '2026-09-09' where id = 'bbb81017-3570-4a13-8e82-e4bf612b3436';

-- RISD Pre-College Rhode Island School of Design
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Rhode Island School of Design (RISD)' where id = '0cb2bd7c-9a36-44c5-9bbf-ecb9cbe586f4';

-- RISE for the World
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Schmidt Futures / Eric and Wendy Schmidt Fund for Strategic Innovation, with Rhodes Trust' where id = '6a932044-4fc8-483d-95df-9737262321f1';

-- Research in Biological Sciences (RIBS)
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'University of Chicago (Summer Session)' where id = 'ea0a2569-e027-4d7c-b9b7-a858fb1359a8';

-- SPINWIP
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Stanford Physics Department / Kavli Institute for Particle Astrophysics and Cosmology (KIPAC)' where id = 'dc08474d-8363-4125-b94e-33460354903e';

-- Sabancı University Summer School 2026
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Sabancı University' where id = 'aaf5b259-4e72-4cba-85a9-43be675384aa';

-- Sevenoaks School Summer Program
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Sevenoaks School' where id = 'a17202b1-b8da-4ed4-8cf7-ee0506d01653';

-- Singularity AI Essay Contest
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Veritas AI (a program of Lumiere Education)' where id = 'c996443d-7360-4197-850a-339ef959d585';

-- Stanford Institutes of Medicine Summer Program (SIMR)
update public.opportunities set status = 'active', cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Stanford University School of Medicine (SIMR)' where id = '8f0a8a3f-6c12-4277-91ca-7d120222b231';

-- Stanford Summer Humanities Institute
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Stanford Pre-Collegiate Studies (Stanford University)' where id = 'cb2e1b38-c154-4cc7-9186-bb1aa4e724a7';

-- Stanley Prep for Educational Excellence
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Stanley Prep (private company; UNAT run w/ WFUNA — not an official UN program)' where id = 'c6b985f9-1a40-4e8a-a2fb-63408263e66e';

-- Summer Discovery
update public.opportunities set status = 'active', cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Musiker Discovery Programs, Inc.' where id = '868d4a6f-855d-48c9-b55d-3dd831178135';

-- Summer@Brown
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Brown University Pre-College Programs' where id = '47bc163d-65b1-4e72-94bd-ffc7fabe8a20';

-- The Diana Award
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'The Diana Award' where id = 'b399d24d-3606-4d3d-bb59-2b94623c58b2';

-- Tulane University Pre-College, New Orleans
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Tulane University (Pre-College Programs)' where id = 'f9421944-556f-46ed-b748-cfdce8ed8cf7';

-- UC Berkeley Business Academy for Youth
update public.opportunities set status = 'active', cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Haas School of Business, UC Berkeley (Institute for Business & Social Impact)' where id = '7a2a2aea-af5f-4e06-ba12-104f08df7b8c';

-- UC San Diego Futures Programs
update public.opportunities set status = 'active', cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'UC San Diego Division of Extended Studies' where id = '10a944b3-26de-4bcc-a408-baa5b57e6c81';

-- UChicago College Pathway Program in Economics (Immersion)
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'University of Chicago Summer Session' where id = '89117ca8-52f4-41fb-8674-dd23998e7281';

-- UniHive Research Proposal Competition
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'UniHive Education' where id = '55dd21cd-859e-498a-a69d-56f45d777d8e';

-- UniHive Summer Programmes hosted at the University of Cambridge
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'UniHive Education (private; not formally affiliated with University of Cambridge)' where id = 'f9b261e6-69fb-4c1e-b7f9-ec9870ba79ac';

-- University of Bath International Summer School
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'University of Bath' where id = 'bb519c8f-71f8-4e89-83e2-3b7e7a7ebf1f';

-- University of Chicago Chicago, IL
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'University of Chicago Summer Session' where id = '16ab0b91-6ecd-463a-a0bf-85f9376c67a9';

-- University of Miami
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'University of Miami, Division of Continuing and International Education (DCIE)' where id = '1228cff1-265d-4cc2-aa49-95b1f3408250';

-- University of Pennsylvania (PA, USA)
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'University of Pennsylvania, School of Engineering and Applied Science (ESAP)' where id = '0009f66d-9231-4dbd-938f-9eb1c9319309';

-- University of Toronto (Toronto, CANADA) - 2025
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'University of Toronto' where id = '018f5962-6e43-4941-af90-ead024ebf8f3';

-- Upenn Wharton Hack-AI-thon
update public.opportunities set status = 'active', cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Wharton AI & Analytics Initiative, University of Pennsylvania', deadline = '2027-04-01' where id = '724a375c-fa54-439c-b8d2-c86869fed88d';

-- Uygulamalı Moleküler Biyoloji ve Genetik Kampı
update public.opportunities set status = 'active', cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Acıbadem University (ASEGEM)' where id = 'dc4343ec-4856-483f-a3b0-7e0de9e38a09';

-- Warwick University Pre-University Summer Programme 2026
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'University of Warwick' where id = 'ff5d9710-80d3-47ae-959a-b8b40406f003';

-- Wharton Sports Analytics and Business Initiative
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Wharton Sports Analytics and Business Initiative / Wharton Global Youth, University of Pennsylvania' where id = 'c35f002c-a4b2-4965-b07f-ba775eb0e31e';

-- Woodstock School: Mussoorie, India
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Woodstock School' where id = 'dfd08c03-75c6-4bc2-b087-70c58c64db2a';

-- XLAB International Science Camp, Germany
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'XLAB Göttingen (central facility of University of Göttingen)' where id = '9f611eed-7787-4d26-b1a5-7c9cda0439aa';

-- York University Helix Summer Science Institute (ON, CANADA)
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'York University, Science Engagement Programs (Faculty of Science)' where id = '87f773f9-c7d2-4233-8061-7002e272df7c';

-- Young Founders Lab (YFL)
update public.opportunities set status = 'active', cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Young Founders Lab (independent, not university-affiliated)', official_url = 'https://www.youngfounderslab.org/' where id = '269c4d5e-bb27-4897-bfb8-9779fef57ee6';

-- Young Guru Academy (YGA)
update public.opportunities set status = 'active', cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Young Guru Academy (YGA)' where id = '5d2aca22-26d5-4592-a5fb-a554c7a51f50';

-- iD Tech Camps
update public.opportunities set status = 'active', cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'iD Tech (private; not affiliated with host campuses)' where id = '1b636769-b88d-4c54-a270-79c3f68a044c';

-- iStar Class Credit and Research Program
update public.opportunities set status = 'active', cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'IPERC (operating "iStar Class")' where id = '83bbb28b-437b-4ab1-9a3d-45c23d061539';

-- Özyeğin University Summer School 2026
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Özyeğin University' where id = '78c7c178-d6dd-4d50-a76f-b44ebd603784';

commit;

-- Confirmed DEAD (7) -- recommend disabling (status='disabled'), founder's call, NOT
-- included above since disabling is a distinct, separate judgment from promoting:
--   3779b871-652b-4d56-bbd7-b1c451686852  Columbia Writing Academy
--   0ad4ccae-77db-450f-9768-064086e2fdd2  Duke University Talent Identification Program 2024
--   75952d25-c434-491d-becb-c3e78bda5e12  Harvard Alumni for Global Women's Empowerment Essay Contest
--   a14a5d3f-089f-4bd8-b9ad-be6cd193915d  Microsoft Imagine Cup Junior
--   dc0b92eb-5887-4163-8b71-1c3a4ab3bf80  NEW! The Immerse Cambridge Experience: A one-week taster program
--   69be38ed-9d26-46e3-aaf1-4819fa83f6ca  Robomaster High School Summer Camp (Shenzhen, China)
--   53ae13de-cbc9-443f-b668-5b557d9a1290  Vesalius College: Brussels, Belgium Innovative Entrepreneurship Summer Programme

-- UNRESOLVABLE (16) -- untouched, still status='under_review'. See the findings doc for
-- the full per-row reasoning and the tool-block vs content-ambiguity breakdown.
--   4d866643-6a6d-481a-add3-e29b6a163592  Bogazici University BOUN 101 Online Kış Okulu
--   3900e10b-dc11-4d4d-ba69-7f9a630cf602  Boğaziçi Üniversitesi Lise BOUN 101
--   a18a12db-6e7d-4d1f-9243-de94ae621ed8  CTY (Center for Talented Youth) Online Programs Courses
--   8a302e54-e237-49f7-9757-9b5262ae592b  Civic Leadership Institute (Grades 9-12)
--   5af50558-fcb5-4390-a8ff-5a6946e65862  Durham University Global Futures Summer School 2026
--   76a53c74-ea3a-4951-84af-a3e108a62d2c  Fordham University: New York, NY
--   1da5f8df-9ea0-4a85-90ac-fa1539986611  Google Computer Science Institute
--   4c7f5a9f-79d0-42df-8343-fc6a4983fe8d  Institute for Advanced Critical and Cultural Studies, Carlisle, PA: Grades 10-12
--   931e7fc2-ee58-4904-958e-f2655c1b5c9d  International Genetically Engineered Machine Competition (iGEM)
--   8980e51b-9889-4cb0-a6dc-e11a60a59e51  International Summer School for Young Physicists (ISSYP)
--   9c0e300e-0ebd-4444-a479-01a297473856  Koç University Research Program KUSRP
--   2b09924c-c758-4375-b7b1-215009e50d8e  Lise Kış Tıp Okulu
--   d24e59bd-43b7-4e7e-83ab-aadb02e2a971  New York Times Student Editorial & Essay Contests
--   382cab93-7abd-4d0b-b7f8-d566395c056a  The Juilliard School - Juilliard Pre-College
--   52a60b8e-7ac5-4258-b91f-09a34b9ad35d  Tufts College Experience (For-credit 6 week program)
--   9b013735-8ae8-4175-8861-6022b3aaf9ce  University of Exeter, United Kingdom