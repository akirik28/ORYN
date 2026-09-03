-- Netherlands HBO sector (hogescholen / universities of applied sciences)
-- Source: DUO (Dienst Uitvoering Onderwijs) Open Onderwijsdata
-- Dataset: 'Adressen hogescholen en universiteiten' (01.-instellingen-hbo-en-wo.csv)
-- URL: https://duo.nl/open_onderwijsdata/hoger-onderwijs/adressen/adressen-hogescholen-en-universiteiten.jsp
-- Dataset last modified: 2026-09-01 (per DUO page metadata). Retrieved: 2026-09-03.
-- 36 hbo-classified rows out of 54 total (hbo+wo) in the DUO file -- full count, not a sample.
--
-- ORDERING: this file references academic_tier / academic_tier_local_name, added by
-- supabase/migrations/0108_academic_tier.sql (written not applied). Apply 0108 first --
-- running this file before 0108 fails cleanly with 'column does not exist', which is the
-- correct failure; it does not half-apply.
--
-- institution_type intentionally left NULL. See docs/netherlands-hbo-sector-2026-09-03.md
-- for why: that column is occupied table-wide by US College-Scorecard-style ownership
-- classification ('university'/'Public'/'Private not for Profit'/etc, 1000+ rows), which is
-- semantically incompatible with the WO/HBO academic-tier axis this batch needs to express.
-- Writing a tier value into that column would misrepresent it as ownership data downstream.
-- The HBO/DUO-code fact is instead recorded in description, which is unused (NULL) for every
-- existing Netherlands row, so this does not collide with or overload existing data.
--
-- academic_tier = 'applied_sciences' for all 36 (unambiguous -- DUO's own hbo classification).
-- academic_tier_local_name = 'Hogeschool', DUO's own term, the same for all 36 (the two
-- English-named exceptions -- Breda, HZ -- still use 'Hogeschool' here since that is their
-- registered institutional form regardless of the English brand name in the name column).
--
-- Names: DUO's own official (Dutch) institution name, used verbatim, EXCEPT two institutions
-- (Breda, HZ) where DUO's own registry already records an English name -- used as-is, not
-- translated. No other institution name was anglicized/translated in this pass; see findings
-- doc for why that's a deliberate scope boundary, not an oversight.

insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'NHL Stenden Hogeschool',
  'Netherlands',
  'Leeuwarden',
  'https://www.nhl.nl',
  'Dutch university of applied sciences (hogeschool, HBO sector). DUO institution code 31FR. Source: DUO Open Onderwijsdata, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Hogeschool',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'Christelijke Hogeschool Ede',
  'Netherlands',
  'Ede',
  'https://www.che.nl',
  'Dutch university of applied sciences (hogeschool, HBO sector). DUO institution code 25BA. Source: DUO Open Onderwijsdata, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Hogeschool',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'Aeres Hogeschool',
  'Netherlands',
  'Wageningen',
  'https://www.aereshogeschool.nl',
  'Dutch university of applied sciences (hogeschool, HBO sector). DUO institution code 30TX. Source: DUO Open Onderwijsdata, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Hogeschool',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'ArtEZ',
  'Netherlands',
  'Arnhem',
  'https://www.artez.nl',
  'Dutch university of applied sciences (hogeschool, HBO sector). DUO institution code 27NF. Source: DUO Open Onderwijsdata, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Hogeschool',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'Hogeschool Van Hall Larenstein',
  'Netherlands',
  'Velp',
  'https://www.vanhall-larenstein.nl',
  'Dutch university of applied sciences (hogeschool, HBO sector). DUO institution code 30HD. Source: DUO Open Onderwijsdata, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Hogeschool',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'Iselinge Hogeschool',
  'Netherlands',
  'Doetinchem',
  'https://www.iselingehogeschool.nl',
  'Dutch university of applied sciences (hogeschool, HBO sector). DUO institution code 09OT. Source: DUO Open Onderwijsdata, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Hogeschool',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'Hogeschool van Arnhem en Nijmegen',
  'Netherlands',
  'Arnhem',
  'https://www.han.nl',
  'Dutch university of applied sciences (hogeschool, HBO sector). DUO institution code 25KB. Source: DUO Open Onderwijsdata, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Hogeschool',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'Hanzehogeschool Groningen',
  'Netherlands',
  'Groningen',
  'https://www.hanze.nl',
  'Dutch university of applied sciences (hogeschool, HBO sector). DUO institution code 25BE. Source: DUO Open Onderwijsdata, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Hogeschool',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'Zuyd Hogeschool',
  'Netherlands',
  'Heerlen',
  'https://www.hszuyd.nl',
  'Dutch university of applied sciences (hogeschool, HBO sector). DUO institution code 25JX. Source: DUO Open Onderwijsdata, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Hogeschool',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'Avans Hogeschool',
  'Netherlands',
  'Tilburg',
  'https://www.avans.nl',
  'Dutch university of applied sciences (hogeschool, HBO sector). DUO institution code 07GR. Source: DUO Open Onderwijsdata, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Hogeschool',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'Breda University of Applied Sciences',
  'Netherlands',
  'Breda',
  'https://www.buas.nl',
  'Dutch university of applied sciences (hogeschool, HBO sector). DUO institution code 21UI. Source: DUO Open Onderwijsdata, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Hogeschool',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'HAS green academy',
  'Netherlands',
  '''s-Hertogenbosch',
  'https://www.has.nl',
  'Dutch university of applied sciences (hogeschool, HBO sector). DUO institution code 21CW. Source: DUO Open Onderwijsdata, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Hogeschool',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'Fontys Hogeschool',
  'Netherlands',
  'Eindhoven',
  'https://www.fontys.nl',
  'Dutch university of applied sciences (hogeschool, HBO sector). DUO institution code 30GB. Source: DUO Open Onderwijsdata, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Hogeschool',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'Pedagogische Hogeschool De Kempel',
  'Netherlands',
  'Helmond',
  'https://www.kempel.nl',
  'Dutch university of applied sciences (hogeschool, HBO sector). DUO institution code 08OK. Source: DUO Open Onderwijsdata, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Hogeschool',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'Design Academy Eindhoven',
  'Netherlands',
  'Eindhoven',
  'https://www.designacademy.nl',
  'Dutch university of applied sciences (hogeschool, HBO sector). DUO institution code 02NT. Source: DUO Open Onderwijsdata, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Hogeschool',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'Gerrit Rietveld Academie',
  'Netherlands',
  'Amsterdam',
  'https://www.rietveldacademie.nl',
  'Dutch university of applied sciences (hogeschool, HBO sector). DUO institution code 02BY. Source: DUO Open Onderwijsdata, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Hogeschool',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'Amsterdamse Hogeschool voor de Kunsten',
  'Netherlands',
  'Amsterdam',
  'https://www.ahk.nl',
  'Dutch university of applied sciences (hogeschool, HBO sector). DUO institution code 21QA. Source: DUO Open Onderwijsdata, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Hogeschool',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'Hogeschool IPABO Amsterdam Alkmaar',
  'Netherlands',
  'Amsterdam',
  'https://www.hs-ipabo.edu',
  'Dutch university of applied sciences (hogeschool, HBO sector). DUO institution code 21UG. Source: DUO Open Onderwijsdata, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Hogeschool',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'Hogeschool van Amsterdam',
  'Netherlands',
  'Amsterdam',
  'https://www.hva.nl',
  'Dutch university of applied sciences (hogeschool, HBO sector). DUO institution code 28DN. Source: DUO Open Onderwijsdata, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Hogeschool',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'Hogeschool KPZ',
  'Netherlands',
  'Zwolle',
  'https://www.kpz.nl',
  'Dutch university of applied sciences (hogeschool, HBO sector). DUO institution code 00IC. Source: DUO Open Onderwijsdata, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Hogeschool',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'Stichting Hogeschool Viaa',
  'Netherlands',
  'Zwolle',
  'https://www.viaa.nl',
  'Dutch university of applied sciences (hogeschool, HBO sector). DUO institution code 22HH. Source: DUO Open Onderwijsdata, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Hogeschool',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'Saxion Hogeschool',
  'Netherlands',
  'Enschede',
  'https://www.saxion.nl',
  'Dutch university of applied sciences (hogeschool, HBO sector). DUO institution code 23AH. Source: DUO Open Onderwijsdata, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Hogeschool',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'Christelijke Hogeschool Windesheim',
  'Netherlands',
  'Zwolle',
  'https://www.windesheim.nl',
  'Dutch university of applied sciences (hogeschool, HBO sector). DUO institution code 01VU. Source: DUO Open Onderwijsdata, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Hogeschool',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'Hogeschool voor de Kunsten Utrecht',
  'Netherlands',
  'Utrecht',
  'https://www.hku.nl',
  'Dutch university of applied sciences (hogeschool, HBO sector). DUO institution code 00MF. Source: DUO Open Onderwijsdata, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Hogeschool',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'Hogeschool Utrecht',
  'Netherlands',
  'Utrecht',
  'https://www.hu.nl',
  'Dutch university of applied sciences (hogeschool, HBO sector). DUO institution code 25DW. Source: DUO Open Onderwijsdata, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Hogeschool',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'Marnix Academie',
  'Netherlands',
  'Utrecht',
  'https://www.marnixacademie.nl',
  'Dutch university of applied sciences (hogeschool, HBO sector). DUO institution code 10IZ. Source: DUO Open Onderwijsdata, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Hogeschool',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'HZ University of Applied Sciences',
  'Netherlands',
  'Vlissingen',
  'https://www.hz.nl',
  'Dutch university of applied sciences (hogeschool, HBO sector). DUO institution code 21MI. Source: DUO Open Onderwijsdata, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Hogeschool',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'Codarts, Hogeschool voor de Kunsten',
  'Netherlands',
  'Rotterdam',
  'https://www.codarts.nl',
  'Dutch university of applied sciences (hogeschool, HBO sector). DUO institution code 14NI. Source: DUO Open Onderwijsdata, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Hogeschool',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'Hogeschool Leiden',
  'Netherlands',
  'Leiden',
  'https://www.hsleiden.nl',
  'Dutch university of applied sciences (hogeschool, HBO sector). DUO institution code 21RI. Source: DUO Open Onderwijsdata, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Hogeschool',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'Hogeschool Rotterdam',
  'Netherlands',
  'Rotterdam',
  'https://www.hogeschoolrotterdam.nl',
  'Dutch university of applied sciences (hogeschool, HBO sector). DUO institution code 22OJ. Source: DUO Open Onderwijsdata, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Hogeschool',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'Hogeschool der Kunsten Den Haag',
  'Netherlands',
  'The Hague',
  'https://www.koncon.nl',
  'Dutch university of applied sciences (hogeschool, HBO sector). DUO institution code 23KJ. Source: DUO Open Onderwijsdata, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Hogeschool',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'Driestar educatief',
  'Netherlands',
  'Gouda',
  'https://www.driestar-educatief.nl',
  'Dutch university of applied sciences (hogeschool, HBO sector). DUO institution code 15BK. Source: DUO Open Onderwijsdata, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Hogeschool',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'Hogeschool Inholland',
  'Netherlands',
  'Rotterdam',
  'https://www.inholland.nl',
  'Dutch university of applied sciences (hogeschool, HBO sector). DUO institution code 27PZ. Source: DUO Open Onderwijsdata, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Hogeschool',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'De Haagse Hogeschool',
  'Netherlands',
  'The Hague',
  'https://www.dehaagsehogeschool.nl',
  'Dutch university of applied sciences (hogeschool, HBO sector). DUO institution code 27UM. Source: DUO Open Onderwijsdata, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Hogeschool',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'Hogeschool Thomas More',
  'Netherlands',
  'Rotterdam',
  NULL,
  'Dutch university of applied sciences (hogeschool, HBO sector). DUO institution code 30VP. Source: DUO Open Onderwijsdata, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Hogeschool',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'Hotelschool The Hague',
  'Netherlands',
  'The Hague',
  'https://www.hotelschool.nl',
  'Dutch university of applied sciences (hogeschool, HBO sector). DUO institution code 02NR. Source: DUO Open Onderwijsdata, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Hogeschool',
  'high',
  'fresh',
  now()
);
