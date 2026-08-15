# -*- coding: utf-8 -*-
"""Drive-import batch, stage 2: turn scripts/drive-import/parsed/*.json (produced by
parse.py) into a ready-to-apply Postgres SQL file matching ORYN's real schema.

Usage:
    python3 scripts/drive-import/generate_sql.py supabase/seed_drive_batchN.sql

Never touches the live database itself — the output is a plain .sql file, meant to be
applied by hand via the Supabase SQL editor (or psql/CLI) once available. Requires
migration 0028_program_requirement_dedup_indexes.sql (or a future equivalent) to already
be applied, since the ON CONFLICT targets below depend on those unique indexes existing.

EXISTING_SEED_UNIS below is a hardcoded snapshot of supabase/seed.sql's universities at
the time this script was written (Chat 4, 2026-08-15) — it exists only so a re-run doesn't
re-propose duplicate INSERT rows for institutions already seeded. Update it (or better,
replace it with a live query once SUPABASE_SECRET_KEY is available) before running this
against a future batch if seed.sql has grown since.
"""
import json, re, sys, os

HERE = os.path.dirname(os.path.abspath(__file__))
PARSED_DIR = os.path.join(HERE, "parsed")


def load(name):
    with open(os.path.join(PARSED_DIR, name), encoding="utf-8") as f:
        return json.load(f)


def norm_title(s):
    s = (s or "").lower().strip()
    out = [c for c in s if c.isalnum() or c.isspace()]
    return re.sub(r"\s+", " ", "".join(out)).strip()


def sql_str(v):
    if v is None:
        return "NULL"
    v = str(v).strip()
    if v == "" or v.lower() in ("not populated", "not structured - verify on programme page", "internal error ()", "empty search results"):
        return "NULL"
    v = v.replace("\x00", "")
    return "'" + v.replace("'", "''") + "'"


def clip(s, n):
    if s is None:
        return None
    s = str(s).strip()
    return s if len(s) <= n else s[: n - 1].rstrip() + "…"


# ---------------------------------------------------------------------------
# Universities — see module docstring re: keeping this in sync.
# ---------------------------------------------------------------------------

EXISTING_SEED_UNIS = {
    ("harvard university", "united states"), ("massachusetts institute of technology", "united states"),
    ("stanford university", "united states"), ("university of oxford", "united kingdom"),
    ("university of cambridge", "united kingdom"), ("london school of economics and political science", "united kingdom"),
    ("imperial college london", "united kingdom"), ("university college london", "united kingdom"),
    ("bocconi university", "italy"), ("sciences po", "france"), ("erasmus university rotterdam", "netherlands"),
    ("delft university of technology", "netherlands"), ("university of amsterdam", "netherlands"),
    ("eth zurich", "switzerland"), ("boğaziçi university", "turkey"), ("middle east technical university", "turkey"),
    ("bilkent university", "turkey"), ("koç university", "turkey"), ("sabancı university", "turkey"),
    ("university of toronto", "canada"), ("mcgill university", "canada"),
    # Chat 4 batch 1 additions (this script's own first run) — see supabase/seed_drive_batch1.sql.
    ("école polytechnique", "france"), ("escp business school", "france"), ("essec business school", "france"),
    ("université paris dauphine - psl", "france"), ("constructor university", "germany"),
    ("frankfurt school of finance and management", "germany"), ("humboldt university of berlin", "germany"),
    ("lmu munich", "germany"), ("technical university of munich", "germany"), ("university of mannheim", "germany"),
    ("luiss guido carli", "italy"), ("politecnico di milano", "italy"), ("sapienza university of rome", "italy"),
    ("university of bologna", "italy"), ("eindhoven university of technology", "netherlands"),
    ("tilburg university", "netherlands"), ("university of groningen", "netherlands"), ("epfl", "switzerland"),
    ("university of st. gallen", "switzerland"), ("university of zurich", "switzerland"),
    ("özyeğin university", "turkey"), ("king's college london", "united kingdom"),
    ("university of edinburgh", "united kingdom"), ("university of warwick", "united kingdom"),
    ("university of pennsylvania", "united states"), ("princeton university", "united states"),
    ("yale university", "united states"), ("columbia university", "united states"),
    ("university of chicago", "united states"), ("university of california, berkeley", "united states"),
    ("new york university", "united states"),
}


def normalize_country(c):
    return "Turkey" if c == "Türkiye" else c


def uni_confidence(status):
    return "high" if "accessible" in status else "medium"


def build_universities(unis):
    by_id = {}
    new_rows = []
    for u in unis:
        country = normalize_country(u["country"])
        name = u["university_name"]
        by_id[u["university_id"]] = {"name": name, "country": country}
        if (name.lower(), country.lower()) in EXISTING_SEED_UNIS:
            continue
        new_rows.append({
            "name": name, "country": country, "city": u["city"] or None,
            "institution_type": u["institution_type"] or None,
            "website_url": u["official_website"] or None,
            "data_confidence": uni_confidence(u["verification_status"]),
        })
    return by_id, new_rows


def build_programs(programs, uni_by_id):
    rows = []
    for p in programs:
        uni = uni_by_id.get(p["university_id"])
        if not uni:
            continue
        duration_years = None
        m = re.match(r"^\s*(\d+(?:\.\d+)?)\s*year", p.get("duration") or "", re.I)
        if m:
            duration_years = m.group(1)
        language = p.get("language") or None
        if language and language.lower().startswith("not structured"):
            language = None
        rows.append({
            "university_name": uni["name"], "university_country": uni["country"],
            "name": p["official_program_name"] or p["school_seed_name"],
            "degree_level": p.get("degree_level") or None,
            "duration_years": duration_years,
            "language_of_instruction": language,
            "data_confidence": "high" if "Verified - official" in p.get("verification_status", "") else "medium",
        })
    return rows


REQ_COLUMN_TO_CATEGORY = [
    ("academic_subjects_or_diploma", "required_subject", "Academic subjects / diploma"),
    ("minimum_grades", "minimum_grade", "Minimum grades"),
    ("standardized_tests", "standardized_test", "Standardized tests"),
    ("english_language", "english_proficiency", "English language requirement"),
    ("deadline_or_application_window", "application_deadline", "Application window"),
    ("essay_or_personal_statement", "essay", "Essay / personal statement"),
    ("recommendations", "recommendation", "Recommendations"),
    ("interview", "interview", "Interview"),
    ("portfolio_or_supplement", "portfolio", "Portfolio / supplement"),
    ("entrance_exam_or_selection", "entrance_exam", "Entrance exam / selection"),
    ("international_applicant_notes", "international_requirement", "International applicant notes"),
]


def build_requirements(reqs, uni_by_id):
    rows = []
    for r in reqs:
        if not r["programme_verification_status"].startswith("Verified"):
            continue
        uni = uni_by_id.get(r["university_id"])
        if not uni:
            continue
        program_name = r["program_name"]
        source_url = r.get("official_admissions_source") or r.get("official_program_source") or None
        for col, category, label in REQ_COLUMN_TO_CATEGORY:
            val = (r.get(col) or "").strip()
            if not val:
                continue
            rows.append({
                "university_name": uni["name"], "university_country": uni["country"], "program_name": program_name,
                "requirement_type": category, "title": f"{program_name} — {label}",
                "requirement_detail": clip(val, 4000), "source_url": source_url,
            })
    return rows


CATEGORY_MAP = {
    ("Summer_Programs", None): "summer_program",
    ("Competitions_and_Awards", None): "competition",
    ("Online_Programs_and_Internships", "Online academic program"): "academic_program",
    ("Online_Programs_and_Internships", "Internship / career experience"): "internship",
    ("Research_Publications", None): "research",
    ("Social_Impact_and_Volunteering", None): "volunteering",
    ("Scholarships_and_Fellowships", None): "scholarship",
}
CLOSED_SIGNALS = ["registration closed", "applications closed", "deadline has passed", "closed to new"]


def opp_category(cat, subtype):
    return CATEGORY_MAP.get((cat, subtype)) or CATEGORY_MAP.get((cat, None)) or "student_program"


def opp_status(current_cycle_status, current_cycle_details):
    details_l = (current_cycle_details or "").lower()
    if any(sig in details_l for sig in CLOSED_SIGNALS):
        return "expired"
    if "2026 cycle confirmed" in (current_cycle_status or ""):
        return "active"
    return "under_review"


def opp_confidence(identity_status):
    return "high" if "accessible" in (identity_status or "") else "medium"


def build_opportunities(all_opp_rows):
    seen = set()
    rows = []
    for o in all_opp_rows:
        name = (o.get("name") or "").strip()
        if not name:
            continue
        url = (o.get("official_or_provider_url") or "").strip()
        if not url.lower().startswith("http"):
            url = None
        ntitle = norm_title(name)
        dedup_key = (ntitle, "")
        if dedup_key in seen:
            continue
        seen.add(dedup_key)
        rows.append({
            "title": name, "category": opp_category(o.get("category", ""), o.get("subtype", "")),
            "official_url": url, "status": opp_status(o.get("current_cycle_status"), o.get("current_cycle_details")),
            "source_confidence": opp_confidence(o.get("identity_verification_status", "")),
            "description": clip(o.get("school_source_summary") or o.get("current_cycle_details") or "", 1600),
            "normalized_title": ntitle,
            "raw_excerpt": clip(o.get("current_cycle_details") or o.get("school_source_summary") or "", 500),
        })
    return rows


def emit(out_path, verification_date):
    out = []
    out.append(f"-- Drive corpus import (generated by scripts/drive-import/generate_sql.py, {verification_date}).")
    out.append("-- See scripts/drive-import/README.md for the corpus inventory and methodology.")
    out.append("-- Every row already passed the corpus's own 'Verified' identity gate; Review/Rejected rows")
    out.append("-- are excluded, not silently included. Apply by hand via the Supabase SQL editor or psql —")
    out.append("-- idempotent, safe to re-run. Requires migration 0028 (dedup indexes) applied first.")
    out.append("")

    unis = load("universities.json")
    programs = load("university_programs.json")
    reqs = load("program_requirements.json")
    all_opps = load("opportunities.json")

    uni_by_id, new_unis = build_universities(unis)

    out.append(f"-- ===== Universities: {len(new_unis)} new (of {len(unis)} in this batch). =====")
    if new_unis:
        out.append("insert into public.universities (name, country, city, institution_type, website_url, data_confidence, data_status)")
        out.append("values")
        out.append(",\n".join(
            f"  ({sql_str(u['name'])}, {sql_str(u['country'])}, {sql_str(u['city'])}, {sql_str(u['institution_type'])}, {sql_str(u['website_url'])}, {sql_str(u['data_confidence'])}, 'fresh')"
            for u in new_unis
        ))
        out.append("on conflict (lower(name), country) do nothing;")
        out.append("")
        out.append("insert into public.university_sources (university_id, source_url, source_domain, source_type, confidence, raw_excerpt)")
        out.append("select u.id, u.website_url, regexp_replace(u.website_url, '^https?://(www\\.)?', ''), 'official_institution_website', u.data_confidence::text::data_confidence,")
        out.append(f"  'Institution identity cross-checked against the founder''s school-counselor Drive corpus, {verification_date}. No admissions statistics asserted.'")
        out.append("from public.universities u")
        out.append(f"where (lower(u.name), u.country) in ({', '.join('(' + sql_str(u['name'].lower()) + ', ' + sql_str(u['country']) + ')' for u in new_unis)})")
        out.append("  and not exists (select 1 from public.university_sources s where s.university_id = u.id)")
        out.append("on conflict do nothing;")
        out.append("")

    prog_rows = build_programs(programs, uni_by_id)
    out.append(f"-- ===== University programs: {len(prog_rows)} verified programmes. =====")
    if prog_rows:
        out.append("insert into public.university_programs (university_id, name, degree_level, duration_years, language_of_instruction, data_confidence)")
        out.append("select u.id, v.name, v.degree_level, v.duration_years::numeric, v.language_of_instruction, v.data_confidence::data_confidence")
        out.append("from (values")
        out.append(",\n".join(
            f"  ({sql_str(p['university_name'])}, {sql_str(p['university_country'])}, {sql_str(p['name'])}, {sql_str(p['degree_level'])}, {sql_str(p['duration_years'])}, {sql_str(p['language_of_instruction'])}, {sql_str(p['data_confidence'])})"
            for p in prog_rows
        ))
        out.append(") as v(university_name, university_country, name, degree_level, duration_years, language_of_instruction, data_confidence)")
        out.append("join public.universities u on lower(u.name) = lower(v.university_name) and u.country = v.university_country")
        out.append("on conflict (university_id, lower(name)) do nothing;")
        out.append("")

    req_rows = build_requirements(reqs, uni_by_id)
    out.append(f"-- ===== University requirements: {len(req_rows)} rows (pivoted wide->long; structured_rule left NULL,")
    out.append("-- populated only by admin-reviewed AI structuring per migration 0020, never an unreviewed import). =====")
    if req_rows:
        out.append("insert into public.university_requirements (university_id, program_id, requirement_type, title, requirement_detail, source_url, data_confidence, data_status, retrieved_at, last_checked_at)")
        out.append(f"select u.id, p.id, v.requirement_type::requirement_category, v.title, v.requirement_detail, v.source_url, 'medium'::data_confidence, 'fresh'::data_status, timestamptz '{verification_date}', timestamptz '{verification_date}'")
        out.append("from (values")
        out.append(",\n".join(
            f"  ({sql_str(r['university_name'])}, {sql_str(r['university_country'])}, {sql_str(r['program_name'])}, {sql_str(r['requirement_type'])}, {sql_str(r['title'])}, {sql_str(r['requirement_detail'])}, {sql_str(r['source_url'])})"
            for r in req_rows
        ))
        out.append(") as v(university_name, university_country, program_name, requirement_type, title, requirement_detail, source_url)")
        out.append("join public.universities u on lower(u.name) = lower(v.university_name) and u.country = v.university_country")
        out.append("join public.university_programs p on p.university_id = u.id and lower(p.name) = lower(v.program_name)")
        out.append("on conflict (program_id, requirement_type) do nothing;")
        out.append("")

    opp_rows = build_opportunities(all_opps)
    by_status = {}
    for o in opp_rows:
        by_status[o["status"]] = by_status.get(o["status"], 0) + 1
    out.append(f"-- ===== Opportunities: {len(opp_rows)} verified-identity records ({', '.join(f'{v} {k}' for k, v in by_status.items())}). =====")
    if opp_rows:
        out.append("insert into public.opportunities (title, description, category, official_url, source, source_url, source_confidence, status, last_verified_at, normalized_title)")
        out.append("values")
        out.append(",\n".join(
            f"  ({sql_str(o['title'])}, {sql_str(o['description'])}, {sql_str(o['category'])}, {sql_str(o['official_url'])}, "
            f"'Founder school-counselor Drive corpus, cross-checked against official/provider pages {verification_date}', "
            f"{sql_str(o['official_url'])}, {sql_str(o['source_confidence'])}, {sql_str(o['status'])}, timestamptz '{verification_date}', {sql_str(o['normalized_title'])})"
            for o in opp_rows
        ))
        out.append("on conflict (normalized_title, coalesce(organization, '')) do nothing;")
        out.append("")
        out.append("insert into public.opportunity_sources (opportunity_id, source_url, source_domain, source_type, confidence, raw_excerpt)")
        out.append("select o.id, o.source_url, regexp_replace(o.source_url, '^https?://(www\\.)?', ''), 'school_counselor_document_cross_checked', o.source_confidence, v.raw_excerpt")
        out.append("from (values")
        out.append(",\n".join(f"  ({sql_str(o['normalized_title'])}, {sql_str(o['raw_excerpt'])})" for o in opp_rows if o["official_url"]))
        out.append(") as v(normalized_title, raw_excerpt)")
        out.append("join public.opportunities o on o.normalized_title = v.normalized_title")
        out.append("where o.source_url is not null")
        out.append("  and not exists (select 1 from public.opportunity_sources s where s.opportunity_id = o.id)")
        out.append("on conflict do nothing;")
        out.append("")

    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(out))

    print(f"universities: {len(new_unis)} new / {len(unis)} total")
    print(f"programs: {len(prog_rows)} / {len(programs)} parsed")
    print(f"requirements: {len(req_rows)} pivoted rows / {len(reqs)} programme rows")
    print(f"opportunities: {len(opp_rows)} / {len(all_opps)} candidate rows (after in-batch dedup)")
    print("status breakdown:", by_status)
    print(f"-> {out_path}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("usage: python3 generate_sql.py <output.sql>", file=sys.stderr)
        sys.exit(1)
    import datetime
    emit(sys.argv[1], datetime.date.today().isoformat())
