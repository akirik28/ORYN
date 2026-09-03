-- Austria Fachhochschule (FH) sector (universities of applied sciences)
-- Sources (three, cross-corroborated -- see docs/austria-fh-sector-2026-09-03.md):
-- 1) BMFWF (Bundesministerium für Frauen, Wissenschaft und Forschung -- the
--    Austrian federal ministry), its own official 'Liste Fachhochschulen'.
-- 2) FHK (Österreichische Fachhochschul-Konferenz), the FH sector's own
--    self-governance body -- its member-representative list.
-- 3) fachhochschulen.ac.at, FHK's public study-guide portal.
-- All three name the same 21 institutions (fachhochschulen.ac.at's public list
-- shows 22 entries, but the 22nd -- Schloss Hofen Weiterbildungszentrum FH
-- Vorarlberg -- is FHV Vorarlberg's own continuing-education branch, not a
-- separate institution, confirmed via its own page's description; excluded).
-- Retrieved: 2026-09-03.
--
-- ORDERING: this file references academic_tier / academic_tier_local_name, added by
-- supabase/migrations/0108_academic_tier.sql (written not applied). Apply 0108 first --
-- running this file before 0108 fails cleanly with 'column does not exist', which is
-- the correct failure; it does not half-apply.
--
-- All 21 website_urls live-verified by direct navigation to the institution's
-- own site (full per-row coverage, matching the Finland batch, not the Germany
-- one). City was straightforward for single-campus institutions; several are
-- genuinely multi-campus with no single confirmed HQ page -- those use the most
-- commonly cited primary city with the rest recorded in description, flagged
-- per-row below rather than presented as equally certain as the single-campus
-- rows.
--
-- institution_type intentionally left NULL, same interim as the Netherlands,
-- Germany, and Finland batches and for the same reason. Austria is the FOURTH
-- country now waiting on this founder decision.
--
-- academic_tier = 'applied_sciences' for all 21 (unambiguous -- BMFWF+FHK+
-- fachhochschulen.ac.at's own Fachhochschule listing). academic_tier_local_name =
-- 'Fachhochschule', the Austrian legal/registry term -- the same word Germany's
-- batch also uses correctly, since it is the same institutional form (though the
-- two countries' FH systems are governed separately; academic_tier_local_name
-- deliberately does not re-encode country, which the country column already gives).

insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'UAS for Business & Society BFI Vienna',
  'Austria',
  'Vienna',
  'https://www.fh-vie.ac.at',
  'Austrian university of applied sciences (Fachhochschule, FH sector). Source: BMFWF + FHK + fachhochschulen.ac.at, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Fachhochschule',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'University of Applied Sciences Technikum Vienna',
  'Austria',
  'Vienna',
  'https://www.technikum-wien.at',
  'Austrian university of applied sciences (Fachhochschule, FH sector). Source: BMFWF + FHK + fachhochschulen.ac.at, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Fachhochschule',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'Hochschule Campus Wien',
  'Austria',
  'Vienna',
  'https://www.hcw.ac.at',
  'Austrian university of applied sciences (Fachhochschule, FH sector). Source: BMFWF + FHK + fachhochschulen.ac.at, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Fachhochschule',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'FHV - Vorarlberg University of Applied Sciences',
  'Austria',
  'Dornbirn',
  'https://www.fhv.at',
  'Austrian university of applied sciences (Fachhochschule, FH sector). Source: BMFWF + FHK + fachhochschulen.ac.at, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Fachhochschule',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'FH Kärnten',
  'Austria',
  'Villach',
  'https://www.fh-kaernten.at',
  'Austrian university of applied sciences (Fachhochschule, FH sector). multi-campus: Villach, Feldkirchen, Klagenfurt, Spittal/Drau (Villach used as primary per Wikipedia''s own infobox photo/emphasis, not a single confirmed HQ page). Source: BMFWF + FHK + fachhochschulen.ac.at, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Fachhochschule',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'University of Applied Sciences Wiener Neustadt',
  'Austria',
  'Wiener Neustadt',
  'https://www.fhwn.ac.at',
  'Austrian university of applied sciences (Fachhochschule, FH sector). multi-campus: also Wieselburg, Tulln. Source: BMFWF + FHK + fachhochschulen.ac.at, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Fachhochschule',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'USTP – University of Applied Sciences St. Pölten',
  'Austria',
  'St. Pölten',
  'https://www.ustp.at',
  'Austrian university of applied sciences (Fachhochschule, FH sector). Source: BMFWF + FHK + fachhochschulen.ac.at, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Fachhochschule',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'IMC Krems University of Applied Sciences',
  'Austria',
  'Krems',
  'https://www.imc.ac.at',
  'Austrian university of applied sciences (Fachhochschule, FH sector). Source: BMFWF + FHK + fachhochschulen.ac.at, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Fachhochschule',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'FH Salzburg',
  'Austria',
  'Puch bei Hallein',
  'https://www.fh-salzburg.ac.at',
  'Austrian university of applied sciences (Fachhochschule, FH sector). multi-campus: main Urstein campus in Puch bei Hallein (near Salzburg city), also Salzburg city, Schwarzach im Pongau, Kuchl. Source: BMFWF + FHK + fachhochschulen.ac.at, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Fachhochschule',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'HOK | University of Applied Sciences Kufstein Tirol',
  'Austria',
  'Kufstein',
  'https://www.hok.ac.at',
  'Austrian university of applied sciences (Fachhochschule, FH sector). Source: BMFWF + FHK + fachhochschulen.ac.at, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Fachhochschule',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'FH Campus 02',
  'Austria',
  'Graz',
  'https://www.campus02.at',
  'Austrian university of applied sciences (Fachhochschule, FH sector). Source: BMFWF + FHK + fachhochschulen.ac.at, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Fachhochschule',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'FH JOANNEUM',
  'Austria',
  'Graz',
  'https://www.fh-joanneum.at',
  'Austrian university of applied sciences (Fachhochschule, FH sector). multi-campus: also Kapfenberg, Bad Gleichenberg. Source: BMFWF + FHK + fachhochschulen.ac.at, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Fachhochschule',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'FH Upper Austria',
  'Austria',
  'Wels',
  'https://www.fh-ooe.at',
  'Austrian university of applied sciences (Fachhochschule, FH sector). multi-campus, 4 co-equal locations: Wels, Hagenberg, Linz, Steyr; Wels used as most commonly cited primary, not a single confirmed HQ page. Source: BMFWF + FHK + fachhochschulen.ac.at, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Fachhochschule',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'University of Applied Sciences Burgenland',
  'Austria',
  'Eisenstadt',
  'https://www.hochschule-burgenland.at',
  'Austrian university of applied sciences (Fachhochschule, FH sector). multi-campus: also Pinkafeld. Source: BMFWF + FHK + fachhochschulen.ac.at, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Fachhochschule',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'MCI | The Entrepreneurial School',
  'Austria',
  'Innsbruck',
  'https://www.mci.edu',
  'Austrian university of applied sciences (Fachhochschule, FH sector). Source: BMFWF + FHK + fachhochschulen.ac.at, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Fachhochschule',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'FHWien der WKW',
  'Austria',
  'Vienna',
  'https://www.fh-wien.ac.at',
  'Austrian university of applied sciences (Fachhochschule, FH sector). Source: BMFWF + FHK + fachhochschulen.ac.at, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Fachhochschule',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'Lauder Business School',
  'Austria',
  'Vienna',
  'https://www.lbs.ac.at',
  'Austrian university of applied sciences (Fachhochschule, FH sector). Source: BMFWF + FHK + fachhochschulen.ac.at, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Fachhochschule',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'fh gesundheit',
  'Austria',
  'Innsbruck',
  'https://www.fhg-tirol.ac.at',
  'Austrian university of applied sciences (Fachhochschule, FH sector). official long name: fhg - Zentrum für Gesundheitsberufe Tirol. Source: BMFWF + FHK + fachhochschulen.ac.at, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Fachhochschule',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'Ferdinand Porsche FernFH',
  'Austria',
  'Wiener Neustadt',
  'https://www.fernfh.ac.at',
  'Austrian university of applied sciences (Fachhochschule, FH sector). distance-learning institution; city is the registered legal seat (Handelsgericht Wiener Neustadt registration), not a single physical campus students attend. Source: BMFWF + FHK + fachhochschulen.ac.at, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Fachhochschule',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'Fachhochschule für angewandte Militärwissenschaften',
  'Austria',
  'Wiener Neustadt',
  'https://www.milak.at',
  'Austrian university of applied sciences (Fachhochschule, FH sector). a Fachhochschule Bachelor''s programme (Militärische Führung) housed at the Theresian Military Academy (Theresianische Militärakademie), part of the Austrian Armed Forces (Bundesheer); open to civilian applicants per its own description, but structurally unlike the other 20 -- flagged, not silently treated the same. Source: BMFWF + FHK + fachhochschulen.ac.at, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Fachhochschule',
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, academic_tier, academic_tier_local_name, data_confidence, data_status, last_checked_at) values (
  'FH Gesundheitsberufe OÖ',
  'Austria',
  'Linz',
  'https://www.fh-gesundheitsberufe.at',
  'Austrian university of applied sciences (Fachhochschule, FH sector). multi-campus: also Ried, Steyr, Vöcklabruck, Wels. Source: BMFWF + FHK + fachhochschulen.ac.at, retrieved 2026-09-03.',
  NULL,
  'applied_sciences',
  'Fachhochschule',
  'high',
  'fresh',
  now()
);
