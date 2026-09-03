-- Germany Fachhochschule/HAW sector (universities of applied sciences)
-- Source: Hochschulkompass, run by HRK (Hochschulrektorenkonferenz -- German
-- Rectors' Conference, the universities' own national self-governance body).
-- URL: https://www.hochschulkompass.de/hochschulen/hochschulsuche.html
-- (Hochschultyp filter = Fachhochschulen / HAW). Retrieved: 2026-09-03.
-- 192 institutions -- the live, precise count from this filter, not the
-- corridor-scan doc's unlinked '243' (DAAD's own current page says only
-- 'more than 200', consistent with 192; '243' could not be traced to any
-- DAAD primary source). See docs/germany-haw-sector-2026-09-03.md.
--
-- institution_type intentionally left NULL, same interim as the Netherlands
-- hogescholen batch (data/research/sql-dry-runs/universities/
-- netherlands-hbo-2026-09-03.sql) and for the same reason: that column is
-- occupied table-wide by US College-Scorecard-style ownership classification,
-- incompatible with the WO/HBO-equivalent academic-tier axis this data needs.
-- Germany is now the SECOND country waiting on a founder decision for a real
-- dedicated column -- no longer a Netherlands-only question.
--
-- website_url: verified via live spot-check (real browser navigation, one at a
-- time -- NOT bulk-fetched; Hochschulkompass's Enodia bot-protection blocked a
-- concurrent-fetch attempt, and that block was respected, not routed around)
-- for 11 institutions spanning different states and sponsorship types. The
-- other 181 have website_url left NULL -- not guessed, not bulk-scraped -- per
-- this session's explicit verified-vs-trusted-vs-unavailable framing. See the
-- findings doc for the full spot-check list and what it validated.

insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Fachhochschule Aachen',
  'Germany',
  'Aachen',
  'https://www.fh-aachen.de',
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Nordrhein-Westfalen. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Aalen - Technik, Wirtschaft und Gesundheit',
  'Germany',
  'Aalen',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Baden-Württemberg. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Ostbayerische Technische Hochschule Amberg-Weiden',
  'Germany',
  'Amberg',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Bayern. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule für angewandte Wissenschaften Ansbach',
  'Germany',
  'Ansbach',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Bayern. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Technische Hochschule Aschaffenburg',
  'Germany',
  'Aschaffenburg',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Bayern. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Technische Hochschule Augsburg',
  'Germany',
  'Augsburg',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Bayern. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'EHIP – Europäische Hochschule für Innovation und Perspektive',
  'Germany',
  'Backnang',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Baden-Württemberg. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'accadis Hochschule Bad Homburg',
  'Germany',
  'Bad Homburg',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Hessen. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Internationale Hochschule Liebenzell (IHL)',
  'Germany',
  'Bad Liebenzell',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Baden-Württemberg. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'DIPLOMA Hochschule - Private Fachhochschule Nordhessen',
  'Germany',
  'Bad Sooden-Allendorf',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Hessen. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Akkon-Hochschule',
  'Germany',
  'Berlin',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Berlin. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Alice Salomon Hochschule Berlin',
  'Germany',
  'Berlin',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Berlin. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'bbw Hochschule',
  'Germany',
  'Berlin',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Berlin. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Berliner Hochschule für Technik',
  'Germany',
  'Berlin',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Berlin. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'BSP Business and Law School - Hochschule für Management und Recht',
  'Germany',
  'Berlin',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Berlin. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'CODE University of Applied Sciences',
  'Germany',
  'Berlin',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Berlin. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'DHGS Deutsche Hochschule für Gesundheit und Sport',
  'Germany',
  'Berlin',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Berlin. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Digital Business University of Applied Sciences',
  'Germany',
  'Berlin',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Berlin. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Evangelische Hochschule Berlin',
  'Germany',
  'Berlin',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Berlin. Trägerschaft: church-sponsored, state-recognized (kirchlich, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Health Innovation University of Applied Sciences',
  'Germany',
  'Berlin',
  'https://www.hi-university.de',
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Berlin. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule für Soziale Arbeit und Pädagogik (HSAP) gemeinnützige Betriebsgesellschaft mbH',
  'Germany',
  'Berlin',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Berlin. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule für Technik und Wirtschaft Berlin',
  'Germany',
  'Berlin',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Berlin. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule für Wirtschaft und Recht Berlin',
  'Germany',
  'Berlin',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Berlin. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Katholische Hochschule für Sozialwesen Berlin (KHSB) - Staatlich anerkannte Fachhochschule für Sozialwesen',
  'Germany',
  'Berlin',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Berlin. Trägerschaft: church-sponsored, state-recognized (kirchlich, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Mediadesign Hochschule für Design und Informatik',
  'Germany',
  'Berlin',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Berlin. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Medical School Berlin - Hochschule für Gesundheit und Medizin (MSB)',
  'Germany',
  'Berlin',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Berlin. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'MU Media University of Applied Sciences',
  'Germany',
  'Berlin',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Berlin. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Whitecliffe University of Applied Sciences',
  'Germany',
  'Berlin',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Berlin. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Biberach - Architektur und Bauwesen, Betriebswirtschaft und Biotechnologie',
  'Germany',
  'Biberach',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Baden-Württemberg. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Fachhochschule der Diakonie - Diaconia - University of Applied Sciences',
  'Germany',
  'Bielefeld',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Nordrhein-Westfalen. Trägerschaft: church-sponsored, state-recognized (kirchlich, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Fachhochschule des Mittelstands (FHM)',
  'Germany',
  'Bielefeld',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Nordrhein-Westfalen. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Bielefeld – University of Applied Sciences and Arts (HSBI)',
  'Germany',
  'Bielefeld',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Nordrhein-Westfalen. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Technische Hochschule Bingen',
  'Germany',
  'Bingen',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Rheinland-Pfalz. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Evangelische Hochschule Rheinland-Westfalen-Lippe',
  'Germany',
  'Bochum',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Nordrhein-Westfalen. Trägerschaft: church-sponsored, state-recognized (kirchlich, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Bochum',
  'Germany',
  'Bochum',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Nordrhein-Westfalen. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Technische Hochschule Georg Agricola',
  'Germany',
  'Bochum',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Nordrhein-Westfalen. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule für Finanzwirtschaft & Management',
  'Germany',
  'Bonn',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Nordrhein-Westfalen. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Technische Hochschule Brandenburg',
  'Germany',
  'Brandenburg',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Brandenburg. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'APOLLON Hochschule der Gesundheitswirtschaft',
  'Germany',
  'Bremen',
  'https://www.apollon-hochschule.de',
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Bremen. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Bremen',
  'Germany',
  'Bremen',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Bremen. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Bremerhaven',
  'Germany',
  'Bremerhaven',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Bremen. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'hochschule 21',
  'Germany',
  'Buxtehude',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Niedersachsen. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule für angewandte Wissenschaften Coburg',
  'Germany',
  'Coburg',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Bayern. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Evangelische Hochschule Hessen',
  'Germany',
  'Darmstadt',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Hessen. Trägerschaft: church-sponsored, state-recognized (kirchlich, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Darmstadt',
  'Germany',
  'Darmstadt',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Hessen. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Wilhelm Büchner Hochschule',
  'Germany',
  'Darmstadt',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Hessen. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Technische Hochschule Deggendorf',
  'Germany',
  'Deggendorf',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Bayern. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Theologische Hochschule Ewersbach',
  'Germany',
  'Dietzhölztal-Ewersbach',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Hessen. Trägerschaft: church-sponsored, state-recognized (kirchlich, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Fachhochschule Dortmund',
  'Germany',
  'Dortmund',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Nordrhein-Westfalen. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'International School of Management',
  'Germany',
  'Dortmund',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Nordrhein-Westfalen. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Evangelische Hochschule Dresden',
  'Germany',
  'Dresden',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Sachsen. Trägerschaft: church-sponsored, state-recognized (kirchlich, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Fachhochschule Dresden',
  'Germany',
  'Dresden',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Sachsen. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule für Technik und Wirtschaft Dresden – University of Applied Sciences',
  'Germany',
  'Dresden',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Sachsen. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Fliedner Fachhochschule Düsseldorf',
  'Germany',
  'Düsseldorf',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Nordrhein-Westfalen. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Düsseldorf',
  'Germany',
  'Düsseldorf',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Nordrhein-Westfalen. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'IST-Hochschule für Management',
  'Germany',
  'Düsseldorf',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Nordrhein-Westfalen. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule für Gesundheitsfachberufe Eberswalde',
  'Germany',
  'Eberswalde',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Brandenburg. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule für nachhaltige Entwicklung Eberswalde',
  'Germany',
  'Eberswalde',
  'https://www.hnee.de',
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Brandenburg. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'NORDAKADEMIE Hochschule der Wirtschaft',
  'Germany',
  'Elmshorn',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Schleswig-Holstein. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Theologische Hochschule Elstal',
  'Germany',
  'Elstal',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Brandenburg. Trägerschaft: church-sponsored, state-recognized (kirchlich, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Emden/Leer',
  'Germany',
  'Emden',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Niedersachsen. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Fachhochschule Erfurt',
  'Germany',
  'Erfurt',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Thüringen. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'IU Internationale Hochschule',
  'Germany',
  'Erfurt',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Thüringen. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'FOM Hochschule für Oekonomie & Management - University of Applied Sciences',
  'Germany',
  'Essen',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Nordrhein-Westfalen. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Esslingen',
  'Germany',
  'Esslingen',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Baden-Württemberg. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Flensburg',
  'Germany',
  'Flensburg',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Schleswig-Holstein. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Frankfurt University of Applied Sciences',
  'Germany',
  'Frankfurt am Main',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Hessen. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Tomorrow University of Applied Sciences',
  'Germany',
  'Frankfurt am Main',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Hessen. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'University of Labour',
  'Germany',
  'Frankfurt am Main',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Hessen. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Evangelische Hochschule Freiburg, staatlich anerkannte Hochschule der Evangelischen Landeskirche in Baden',
  'Germany',
  'Freiburg',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Baden-Württemberg. Trägerschaft: church-sponsored, state-recognized (kirchlich, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Katholische Hochschule Freiburg, staatlich anerkannte Hochschule - Catholic University of Applied Sciences',
  'Germany',
  'Freiburg',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Baden-Württemberg. Trägerschaft: church-sponsored, state-recognized (kirchlich, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule für angewandte Wissenschaften Weihenstephan-Triesdorf',
  'Germany',
  'Freising',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Bayern. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Fulda - University of Applied Sciences',
  'Germany',
  'Fulda',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Hessen. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Furtwangen - Informatik, Technik, Wirtschaft, Medien, Gesundheit',
  'Germany',
  'Furtwangen',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Baden-Württemberg. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Westfälische Hochschule Gelsenkirchen, Bocholt, Recklinghausen',
  'Germany',
  'Gelsenkirchen',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Nordrhein-Westfalen. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Technische Hochschule Mittelhessen - THM',
  'Germany',
  'Gießen',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Hessen. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'PFH - Private Hochschule Göttingen',
  'Germany',
  'Göttingen',
  'https://www.pfh.de',
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Niedersachsen. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Brand University of Applied Sciences',
  'Germany',
  'Hamburg',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Hamburg. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Europäische Fernhochschule Hamburg',
  'Germany',
  'Hamburg',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Hamburg. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Evangelische Hochschule für Soziale Arbeit & Diakonie',
  'Germany',
  'Hamburg',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Hamburg. Trägerschaft: church-sponsored, state-recognized (kirchlich, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hamburger Fern-Hochschule, gemeinnützige GmbH',
  'Germany',
  'Hamburg',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Hamburg. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule für Angewandte Wissenschaften Hamburg',
  'Germany',
  'Hamburg',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Hamburg. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'HSBA Hamburg School of Business Administration',
  'Germany',
  'Hamburg',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Hamburg. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'NBS Northern Business School  University of Applied Sciences',
  'Germany',
  'Hamburg',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Hamburg. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Weserbergland',
  'Germany',
  'Hameln',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Niedersachsen. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Hamm-Lippstadt',
  'Germany',
  'Hamm',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Nordrhein-Westfalen. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Fachhochschule für die Wirtschaft Hannover',
  'Germany',
  'Hannover',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Niedersachsen. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Hannover',
  'Germany',
  'Hannover',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Niedersachsen. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Leibniz-Fachhochschule',
  'Germany',
  'Hannover',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Niedersachsen. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Fachhochschule Westküste, Hochschule für Wirtschaft und Technik',
  'Germany',
  'Heide',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Schleswig-Holstein. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Fresenius Heidelberg  staatlich anerkannte Hochschule der Hochschule Fresenius für Internationales Management GmbH',
  'Germany',
  'Heidelberg',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Baden-Württemberg. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'SRH University of Applied Sciences Heidelberg',
  'Germany',
  'Heidelberg',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Baden-Württemberg. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Heilbronn, Technik, Wirtschaft, Informatik',
  'Germany',
  'Heilbronn',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Baden-Württemberg. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'HAWK Hochschule für angewandte Wissenschaft und Kunst Hildesheim/Holzminden/Göttingen',
  'Germany',
  'Hildesheim',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Niedersachsen. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule für angewandte Wissenschaften Hof',
  'Germany',
  'Hof',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Bayern. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Fresenius',
  'Germany',
  'Idstein',
  'https://www.hs-fresenius.de',
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Hessen. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Technische Hochschule Ingolstadt',
  'Germany',
  'Ingolstadt',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Bayern. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Fachhochschule Südwestfalen',
  'Germany',
  'Iserlohn',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Nordrhein-Westfalen. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Ernst-Abbe-Hochschule Jena',
  'Germany',
  'Jena',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Thüringen. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Kaiserslautern (University of Applied Sciences)',
  'Germany',
  'Kaiserslautern',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Rheinland-Pfalz. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Karlsruhe - Technik und Wirtschaft',
  'Germany',
  'Karlsruhe',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Baden-Württemberg. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Karlshochschule International University - staatlich anerkannte Hochschule der Karlshochschule gemeinnützige GmbH Karlsruhe',
  'Germany',
  'Karlsruhe',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Baden-Württemberg. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule für angewandte Wissenschaften Kempten',
  'Germany',
  'Kempten',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Bayern. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Duale Hochschule Schleswig-Holstein - staatlich anerkannte Hochschule für angewandte Wissenschaften in Trägerschaft der Wirtschaftsakademie Schleswig-Holstein',
  'Germany',
  'Kiel',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Schleswig-Holstein. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule für Angewandte Wissenschaften Kiel',
  'Germany',
  'Kiel',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Schleswig-Holstein. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Rhein-Waal - University of Applied Sciences',
  'Germany',
  'Kleve',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Nordrhein-Westfalen. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Koblenz',
  'Germany',
  'Koblenz',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Rheinland-Pfalz. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'CBS University of Applied Sciences',
  'Germany',
  'Köln',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Nordrhein-Westfalen. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'INU - Innovative University of Applied Sciences',
  'Germany',
  'Köln',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Nordrhein-Westfalen. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Katholische Hochschule Nordrhein-Westfalen - Catholic University of Applied Sciences',
  'Germany',
  'Köln',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Nordrhein-Westfalen. Trägerschaft: church-sponsored, state-recognized (kirchlich, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Kolping Hochschule',
  'Germany',
  'Köln',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Nordrhein-Westfalen. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Rheinische Hochschule Köln',
  'Germany',
  'Köln',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Nordrhein-Westfalen. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Technische Hochschule Köln',
  'Germany',
  'Köln',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Nordrhein-Westfalen. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Allensbach Hochschule Konstanz, staatlich anerkannte Hochschule der European Education Group GmbH',
  'Germany',
  'Konstanz',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Baden-Württemberg. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Konstanz Technik, Wirtschaft und Gestaltung',
  'Germany',
  'Konstanz',
  'https://www.htwg-konstanz.de',
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Baden-Württemberg. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Anhalt - Anhalt University of Applied Sciences',
  'Germany',
  'Köthen',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Sachsen-Anhalt. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Niederrhein',
  'Germany',
  'Krefeld',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Nordrhein-Westfalen. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Landshut - Hochschule für angewandte Wissenschaften',
  'Germany',
  'Landshut',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Bayern. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule für Technik, Wirtschaft und Kultur Leipzig',
  'Germany',
  'Leipzig',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Sachsen. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Technische Hochschule Ostwestfalen-Lippe',
  'Germany',
  'Lemgo',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Nordrhein-Westfalen. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Technische Hochschule Lübeck',
  'Germany',
  'Lübeck',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Schleswig-Holstein. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Evangelische Hochschule Ludwigsburg - staatlich anerkannte Hochschule für Angewandte Wissenschaften der Evangelischen Landeskirche Württemberg',
  'Germany',
  'Ludwigsburg',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Baden-Württemberg. Trägerschaft: church-sponsored, state-recognized (kirchlich, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule für Wirtschaft und Gesellschaft Ludwigshafen',
  'Germany',
  'Ludwigshafen',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Rheinland-Pfalz. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Magdeburg-Stendal',
  'Germany',
  'Magdeburg',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Sachsen-Anhalt. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Steinbeis Hochschule',
  'Germany',
  'Magdeburg',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Sachsen-Anhalt. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Mainz',
  'Germany',
  'Mainz',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Rheinland-Pfalz. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Katholische Hochschule Mainz Catholic University of Applied Sciences',
  'Germany',
  'Mainz',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Rheinland-Pfalz. Trägerschaft: church-sponsored, state-recognized (kirchlich, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule der Wirtschaft für Management',
  'Germany',
  'Mannheim',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Baden-Württemberg. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Technische Hochschule Mannheim',
  'Germany',
  'Mannheim',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Baden-Württemberg. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Evangelische Hochschule Tabor',
  'Germany',
  'Marburg',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Hessen. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Merseburg',
  'Germany',
  'Merseburg',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Sachsen-Anhalt. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Mittweida, University of Applied Sciences',
  'Germany',
  'Mittweida',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Sachsen. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Ruhr West- University of Applied Sciences',
  'Germany',
  'Mülheim an der Ruhr',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Nordrhein-Westfalen. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule der Bayerischen Wirtschaft für angewandte Wissenschaften - HDBW',
  'Germany',
  'München',
  'https://www.hdbw-hochschule.de',
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Bayern. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule für angewandte Wissenschaften München',
  'Germany',
  'München',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Bayern. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Internationale Hochschule SDI München - Hochschule für angewandte Wissenschaften',
  'Germany',
  'München',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Bayern. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Katholische Stiftungshochschule für angewandte Wissenschaften München - Hochschule der Kirchlichen Stiftung des öffentlichen Rechts "Katholische Bildungsstätten für Sozialberufe in Bayern"',
  'Germany',
  'München',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Bayern. Trägerschaft: church-sponsored, state-recognized (kirchlich, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Munich Business School - Staatlich anerkannte private Fachhochschule',
  'Germany',
  'München',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Bayern. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Munich University of Digital Technologies & Applied Sciences',
  'Germany',
  'München',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Bayern. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'FH Münster - University of Applied Sciences',
  'Germany',
  'Münster',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Nordrhein-Westfalen. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Neubrandenburg - University of Applied Sciences',
  'Germany',
  'Neubrandenburg',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Mecklenburg-Vorpommern. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule für angewandte Wissenschaften Neu-Ulm',
  'Germany',
  'Neu-Ulm',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Bayern. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Nordhausen',
  'Germany',
  'Nordhausen',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Thüringen. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Evangelische Hochschule für angewandte Wissenschaften - Evangelische Fachhochschule Nürnberg',
  'Germany',
  'Nürnberg',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Bayern. Trägerschaft: church-sponsored, state-recognized (kirchlich, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Technische Hochschule Nürnberg Georg Simon Ohm',
  'Germany',
  'Nürnberg',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Bayern. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule für Wirtschaft und Umwelt Nürtingen-Geislingen',
  'Germany',
  'Nürtingen',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Baden-Württemberg. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule für Technik, Wirtschaft und Medien Offenburg',
  'Germany',
  'Offenburg',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Baden-Württemberg. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Osnabrück',
  'Germany',
  'Osnabrück',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Niedersachsen. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule für Künste im Sozialen, Ottersberg',
  'Germany',
  'Ottersberg',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Niedersachsen. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Fachhochschule der Wirtschaft',
  'Germany',
  'Paderborn',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Nordrhein-Westfalen. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Pforzheim - Gestaltung, Technik, Wirtschaft und Recht',
  'Germany',
  'Pforzheim',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Baden-Württemberg. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Deutsche Hochschule für Angewandte Wissenschaften - German University of Applied Sciences',
  'Germany',
  'Potsdam',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Brandenburg. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Fachhochschule für Sport und Management Potsdam',
  'Germany',
  'Potsdam',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Brandenburg. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Fachhochschule Potsdam',
  'Germany',
  'Potsdam',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Brandenburg. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Gisma University of Applied Sciences',
  'Germany',
  'Potsdam',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Brandenburg. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'HSD Hochschule Döpfer',
  'Germany',
  'Potsdam',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Brandenburg. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Macromedia University of Applied Sciences',
  'Germany',
  'Potsdam',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Brandenburg. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'University of Europe for Applied Sciences',
  'Germany',
  'Potsdam',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Brandenburg. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'XU Exponential University of Applied Sciences',
  'Germany',
  'Potsdam',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Brandenburg. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Ostbayerische Technische Hochschule Regensburg',
  'Germany',
  'Regensburg',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Bayern. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Reutlingen, Hochschule für Technik- Wirtschaft-Informatik-Design',
  'Germany',
  'Reutlingen',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Baden-Württemberg. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Theologische Hochschule Reutlingen - staatlich anerkannte Fachhochschule der Evangelisch-methodistischen Kirche',
  'Germany',
  'Reutlingen',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Baden-Württemberg. Trägerschaft: church-sponsored, state-recognized (kirchlich, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'SRH Fernhochschule - The Mobile University',
  'Germany',
  'Riedlingen',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Baden-Württemberg. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Technische Hochschule Rosenheim',
  'Germany',
  'Rosenheim',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Bayern. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule für Forstwirtschaft Rottenburg',
  'Germany',
  'Rottenburg',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Baden-Württemberg. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Deutsche Hochschule für Prävention und Gesundheitsmanagement GmbH',
  'Germany',
  'Saarbrücken',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Saarland. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule für Technik und Wirtschaft des Saarlandes',
  'Germany',
  'Saarbrücken',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Saarland. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Bonn-Rhein-Sieg, University of Applied Sciences',
  'Germany',
  'Sankt Augustin',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Nordrhein-Westfalen. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Schmalkalden',
  'Germany',
  'Schmalkalden',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Thüringen. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule für Gestaltung Schwäbisch Gmünd',
  'Germany',
  'Schwäbisch Gmünd',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Baden-Württemberg. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Albstadt-Sigmaringen',
  'Germany',
  'Sigmaringen',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Baden-Württemberg. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Stralsund',
  'Germany',
  'Stralsund',
  'https://www.hochschule-stralsund.de',
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Mecklenburg-Vorpommern. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'AKAD Hochschule Stuttgart – staatlich anerkannt',
  'Germany',
  'Stuttgart',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Baden-Württemberg. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule der Medien Stuttgart',
  'Germany',
  'Stuttgart',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Baden-Württemberg. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule für Technik Stuttgart',
  'Germany',
  'Stuttgart',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Baden-Württemberg. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Merz Akademie Hochschule für Gestaltung, Kunst und Medien, Stuttgart - Staatlich anerkannt',
  'Germany',
  'Stuttgart',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Baden-Württemberg. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule für angewandtes Management',
  'Germany',
  'Teltow',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Brandenburg. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Trier - Trier University of Applied Sciences',
  'Germany',
  'Trier',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Rheinland-Pfalz. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Technische Hochschule Ulm',
  'Germany',
  'Ulm',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Baden-Württemberg. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Private Hochschule für Wirtschaft und Technik Vechta/Diepholz',
  'Germany',
  'Vechta',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Niedersachsen. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Fachhochschule Wedel',
  'Germany',
  'Wedel',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Schleswig-Holstein. Trägerschaft: private, state-recognized (privat, staatlich anerkannt). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Ravensburg-Weingarten',
  'Germany',
  'Weingarten',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Baden-Württemberg. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Harz, Hochschule für angewandte Wissenschaften (FH)',
  'Germany',
  'Wernigerode',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Sachsen-Anhalt. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule RheinMain',
  'Germany',
  'Wiesbaden',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Hessen. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Technische Hochschule Wildau',
  'Germany',
  'Wildau',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Brandenburg. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Jade Hochschule - Wilhelmshaven/Oldenburg/Elsfleth',
  'Germany',
  'Wilhelmshaven',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Niedersachsen. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Wismar - University of Applied Sciences: Technology, Business and Design',
  'Germany',
  'Wismar',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Mecklenburg-Vorpommern. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Braunschweig/Wolfenbüttel, Ostfalia Hochschule für angewandte Wissenschaften',
  'Germany',
  'Wolfenbüttel',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Niedersachsen. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Worms, University of Applied Sciences',
  'Germany',
  'Worms',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Rheinland-Pfalz. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Technische Hochschule Würzburg-Schweinfurt',
  'Germany',
  'Würzburg',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Bayern. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Hochschule Zittau/Görlitz',
  'Germany',
  'Zittau',
  NULL,
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Sachsen. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Westsächsische Hochschule Zwickau',
  'Germany',
  'Zwickau',
  'https://www.whz.de',
  'German university of applied sciences (Fachhochschule/HAW sector). Bundesland: Sachsen. Trägerschaft: public (öffentlich-rechtlich). Source: Hochschulkompass (HRK), retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
