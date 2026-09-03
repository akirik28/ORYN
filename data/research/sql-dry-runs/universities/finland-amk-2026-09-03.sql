-- Finland ammattikorkeakoulu (AMK) / university of applied sciences sector
-- Sources (two, cross-corroborated -- see docs/finland-amk-sector-2026-09-03.md):
-- 1) Vipunen (vipunen.fi), the joint statistics portal of OKM (Ministry of
--    Education and Culture) and Opetushallitus (Finnish National Agency for
--    Education) -- authoritative for WHICH 22 institutions exist and that they
--    are administered by OKM (two more, Högskolan på Åland and the Police
--    University College, are administered by other ministries and excluded).
-- 2) UASinfo.fi, the Finnish AMK sector's own joint admissions portal, tied to
--    the national Vallu entrance-exam service -- authoritative for contact
--    details (address/city, admissions email revealing the institution's own
--    domain). Retrieved: 2026-09-03.
--
-- Real count: 22, not the corridor scan's earlier estimate. Every one of the 22
-- website_urls below was live-verified by direct navigation to the institution's
-- own site (not just inferred from an admissions email domain) -- full per-row
-- coverage, unlike the Germany batch (10/192) where the source's own bot
-- protection made that infeasible at scale. Finland's sector is small enough
-- that this was genuinely achievable.
--
-- institution_type intentionally left NULL, same interim as the Netherlands and
-- Germany batches and for the same reason: that column is occupied table-wide by
-- US College-Scorecard-style ownership classification, incompatible with the
-- yliopisto/ammattikorkeakoulu academic-tier axis this data needs. Finland is the
-- THIRD country now waiting on this founder decision.

insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Arcada University of Applied Sciences',
  'Finland',
  'Helsinki',
  'https://www.arcada.fi',
  'Finnish university of applied sciences (ammattikorkeakoulu, AMK sector). Source: Vipunen (OKM/Opetushallitus) + UASinfo.fi, retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Centria University of Applied Sciences',
  'Finland',
  'Kokkola',
  'https://www.centria.fi',
  'Finnish university of applied sciences (ammattikorkeakoulu, AMK sector). multi-campus: Kokkola, Ylivieska, Jakobstad. Source: Vipunen (OKM/Opetushallitus) + UASinfo.fi, retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Diaconia University of Applied Sciences',
  'Finland',
  'Helsinki',
  'https://www.diak.fi',
  'Finnish university of applied sciences (ammattikorkeakoulu, AMK sector). multi-campus: Helsinki, Oulu, Pori, Pieksamaki, Turku. Source: Vipunen (OKM/Opetushallitus) + UASinfo.fi, retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Haaga-Helia University of Applied Sciences',
  'Finland',
  'Helsinki',
  'https://www.haaga-helia.fi',
  'Finnish university of applied sciences (ammattikorkeakoulu, AMK sector). multi-campus: Helsinki, Porvoo, Vierumaki. Source: Vipunen (OKM/Opetushallitus) + UASinfo.fi, retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'HAMK University of Applied Sciences',
  'Finland',
  'Hämeenlinna',
  'https://www.hamk.fi',
  'Finnish university of applied sciences (ammattikorkeakoulu, AMK sector). official long name: Häme University of Applied Sciences. Source: Vipunen (OKM/Opetushallitus) + UASinfo.fi, retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'HUMAK University of Applied Sciences',
  'Finland',
  'Helsinki',
  'https://www.humak.fi',
  'Finnish university of applied sciences (ammattikorkeakoulu, AMK sector). Source: Vipunen (OKM/Opetushallitus) + UASinfo.fi, retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'JAMK University of Applied Sciences',
  'Finland',
  'Jyväskylä',
  'https://www.jamk.fi',
  'Finnish university of applied sciences (ammattikorkeakoulu, AMK sector). multi-campus: Jyvaskyla, Saarijarvi. Source: Vipunen (OKM/Opetushallitus) + UASinfo.fi, retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Kajaani University of Applied Sciences',
  'Finland',
  'Kajaani',
  'https://www.kamk.fi',
  'Finnish university of applied sciences (ammattikorkeakoulu, AMK sector). Source: Vipunen (OKM/Opetushallitus) + UASinfo.fi, retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Karelia University of Applied Sciences',
  'Finland',
  'Joensuu',
  'https://www.karelia.fi',
  'Finnish university of applied sciences (ammattikorkeakoulu, AMK sector). Source: Vipunen (OKM/Opetushallitus) + UASinfo.fi, retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'LAB University of Applied Sciences',
  'Finland',
  'Lappeenranta',
  'https://www.lab.fi',
  'Finnish university of applied sciences (ammattikorkeakoulu, AMK sector). dual-campus: Lappeenranta and Lahti, listed as equal co-headquarters by the institution''s own admissions contact page. Source: Vipunen (OKM/Opetushallitus) + UASinfo.fi, retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Lapland University of Applied Sciences',
  'Finland',
  'Rovaniemi',
  'https://www.lapinamk.fi',
  'Finnish university of applied sciences (ammattikorkeakoulu, AMK sector). Source: Vipunen (OKM/Opetushallitus) + UASinfo.fi, retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Laurea University of Applied Sciences',
  'Finland',
  'Vantaa',
  'https://www.laurea.fi',
  'Finnish university of applied sciences (ammattikorkeakoulu, AMK sector). multi-campus: Vantaa, Espoo, Hyvinkaa, Lohja, Porvoo. Source: Vipunen (OKM/Opetushallitus) + UASinfo.fi, retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Metropolia University of Applied Sciences',
  'Finland',
  'Helsinki',
  'https://www.metropolia.fi',
  'Finnish university of applied sciences (ammattikorkeakoulu, AMK sector). mailing address uses a dedicated organizational postal code (FI-00079 Metropolia), not a literal city name; Helsinki confirmed via the institution''s own visiting-address page. Source: Vipunen (OKM/Opetushallitus) + UASinfo.fi, retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Novia University of Applied Sciences',
  'Finland',
  'Vaasa',
  'https://www.novia.fi',
  'Finnish university of applied sciences (ammattikorkeakoulu, AMK sector). Source: Vipunen (OKM/Opetushallitus) + UASinfo.fi, retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Oulu University of Applied Sciences',
  'Finland',
  'Oulu',
  'https://www.oamk.fi',
  'Finnish university of applied sciences (ammattikorkeakoulu, AMK sector). Source: Vipunen (OKM/Opetushallitus) + UASinfo.fi, retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Satakunta University of Applied Sciences',
  'Finland',
  'Pori',
  'https://www.samk.fi',
  'Finnish university of applied sciences (ammattikorkeakoulu, AMK sector). Source: Vipunen (OKM/Opetushallitus) + UASinfo.fi, retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Savonia University of Applied Sciences',
  'Finland',
  'Kuopio',
  'https://www.savonia.fi',
  'Finnish university of applied sciences (ammattikorkeakoulu, AMK sector). Source: Vipunen (OKM/Opetushallitus) + UASinfo.fi, retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Seinäjoki University of Applied Sciences',
  'Finland',
  'Seinäjoki',
  'https://www.seamk.fi',
  'Finnish university of applied sciences (ammattikorkeakoulu, AMK sector). Source: Vipunen (OKM/Opetushallitus) + UASinfo.fi, retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'South-Eastern Finland University of Applied Sciences',
  'Finland',
  'Kouvola',
  'https://www.xamk.fi',
  'Finnish university of applied sciences (ammattikorkeakoulu, AMK sector). also known as Xamk; multi-campus: Kouvola, Mikkeli, Kotka, Savonlinna. Source: Vipunen (OKM/Opetushallitus) + UASinfo.fi, retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Tampere University of Applied Sciences',
  'Finland',
  'Tampere',
  'https://www.tuni.fi/en/tamk',
  'Finnish university of applied sciences (ammattikorkeakoulu, AMK sector). TAMK has no independent primary domain; operates under the joint Tampere Universities portal (tuni.fi) alongside Tampere University, confirmed live. Source: Vipunen (OKM/Opetushallitus) + UASinfo.fi, retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Turku University of Applied Sciences',
  'Finland',
  'Turku',
  'https://www.turkuamk.fi',
  'Finnish university of applied sciences (ammattikorkeakoulu, AMK sector). Source: Vipunen (OKM/Opetushallitus) + UASinfo.fi, retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
insert into universities (name, country, city, website_url, description, institution_type, data_confidence, data_status, last_checked_at) values (
  'Vaasa University of Applied Sciences',
  'Finland',
  'Vaasa',
  'https://www.vamk.fi',
  'Finnish university of applied sciences (ammattikorkeakoulu, AMK sector). Source: Vipunen (OKM/Opetushallitus) + UASinfo.fi, retrieved 2026-09-03.',
  NULL,
  'high',
  'fresh',
  now()
);
