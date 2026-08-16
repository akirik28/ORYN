"""Drive-import, entity batch, stage 2: turns scripts/drive-import/parsed/*.json (from
parse_entities.py) into a ready-to-apply SQL file for the Canonical Entity Autocomplete
System (migration 0038's `institutions` table, plus `universities.aliases` and
`opportunities.aliases`).

Respects the corpus's own release/verification gates rather than importing everything
found:
- Turkish schools (TRSCH) whose release_state starts with HOLD_ are excluded entirely
  (not inserted even as unverified) — the corpus explicitly marked these not yet safe
  to surface in the app.
- School aliases (ALIA) are only included when verified=TRUE (all 126 are, as of this
  batch, but the check stays in case a future export includes an unverified one).
- Opportunity aliases (the ALIAS merge table) are only included when their
  canonical_opportunity_id appears in the 16-row "official-current" opportunity master —
  two of the seven rows reference ORYN-CAN-0013, which is not part of that current set,
  and are excluded.
- Universities (GUNI): matched against a snapshot of supabase/seed.sql +
  seed_drive_batch1.sql's existing rows (see scripts/drive-import/parsed/
  existing_universities.json, produced alongside the parsed tables) by normalized name.
  An exact match is enriched with an alias only (via UPDATE ... WHERE lower(name) =
  ... AND country = ...) — never re-inserted, so the existing canonical university id
  stays the untouched source of truth. No match means a genuinely new row.

Idempotent throughout: every INSERT uses ON CONFLICT DO NOTHING against the same unique
indexes migration 0038 (institutions) and 0006 (universities) already define; every
alias UPDATE only appends an alias not already present in the array.
"""

import json, os, re
from typing import Optional

HERE = os.path.dirname(os.path.abspath(__file__))
PARSED_DIR = os.path.join(HERE, "parsed")

COUNTRY_NAME = {"US": "United States", "GB": "United Kingdom", "TR": "Turkey", "CH": "Switzerland"}

SOURCE_NOTE = "ORYN Canonical App Data Pack — Verified 2026-08-15"


def load(name):
    with open(os.path.join(PARSED_DIR, f"{name}.json"), encoding="utf-8") as f:
        return json.load(f)


def sql_str(value) -> str:
    """NULL for empty/blank, a properly escaped single-quoted literal otherwise."""
    if value is None or (isinstance(value, str) and value.strip() == ""):
        return "null"
    return "'" + str(value).replace("'", "''") + "'"


def sql_array(values) -> str:
    if not values:
        return "'{}'"
    escaped = ", ".join('"' + v.replace('"', '\\"').replace("'", "''") + '"' for v in values)
    return "array[" + ", ".join(sql_str(v) for v in values) + "]" if values else "'{}'"


def normalize_name(name: str) -> str:
    # Strips a trailing "(ABBR)" parenthetical and lowercases, for existing-university
    # matching only — display names are never derived from this.
    return re.sub(r"\s*\([^)]*\)\s*$", "", name).strip().lower()


def extract_parenthetical_alias(name: str) -> Optional[str]:
    """"Massachusetts Institute of Technology (MIT)" -> "MIT" — an explicit
    abbreviation the source itself wrote in parentheses, not an inferred one."""
    m = re.search(r"\(([A-Z][A-Za-z0-9&.\- ]{1,20})\)\s*$", name)
    return m.group(1).strip() if m else None


def build_organizations_sql(providers):
    lines = [
        "-- ---------- Organizations (PROV, 19 rows, all release_state=VERIFIED) ----------",
        "insert into public.institutions (category, canonical_name, institution_type, country, city, website_url, aliases, status, source)",
        "values",
    ]
    values = []
    for p in providers:
        country = COUNTRY_NAME.get(p["country_code"], p["country_code"])
        website = f"https://{p['official_domain']}" if p["official_domain"] else None
        source = f"{SOURCE_NOTE} ({p['provider_id']})" + (f" — {p['notes']}" if p["notes"] else "")
        # A handful of provider_name values carry their own explicit "(ABBR)" suffix
        # (e.g. "Harvard-MIT Mathematics Tournament (HMMT)") — split it into a proper
        # alias rather than baking it into the display name, same treatment as GUNI
        # universities below.
        alias = extract_parenthetical_alias(p["provider_name"])
        display_name = re.sub(r"\s*\([^)]*\)\s*$", "", p["provider_name"]).strip() if alias else p["provider_name"]
        aliases = [alias] if alias else []
        values.append(
            f"  ('organization', {sql_str(display_name)}, {sql_str(p['organization_type'].lower())}, "
            f"{sql_str(country)}, null, {sql_str(website)}, {sql_array(aliases)}, 'verified', {sql_str(source)})"
        )
    lines.append(",\n".join(values) + "")
    lines.append(
        "on conflict (category, lower(canonical_name), coalesce(country, ''), coalesce(city, '')) do nothing;"
    )
    return "\n".join(lines) + "\n"


def build_schools_sql(schools, aliases):
    aliases_by_seed = {}
    for a in aliases:
        if a["verified"] != "TRUE":
            continue
        aliases_by_seed.setdefault(a["seed_id"], []).append(a["alias"])

    included = [s for s in schools if not s["release_state"].startswith("HOLD_")]
    excluded = [s for s in schools if s["release_state"].startswith("HOLD_")]

    lines = [
        f"-- ---------- Schools (TRSCH, {len(included)} of {len(schools)} rows — "
        f"{len(excluded)} excluded: release_state starts with HOLD_, not yet safe to surface) ----------",
        "insert into public.institutions (category, canonical_name, institution_type, country, city, website_url, aliases, status, source)",
        "values",
    ]
    values = []
    for s in included:
        status = "verified" if s["verification_state"] in ("OFFICIAL_VERIFIED", "SOURCE_VERIFIED") else "unverified"
        source = f"{SOURCE_NOTE} ({s['seed_id']}) — {s['primary_identity_source']}"
        row_aliases = aliases_by_seed.get(s["seed_id"], [])
        values.append(
            f"  ('school', {sql_str(s['canonical_name'])}, 'high_school', {sql_str(s['country_code'] and COUNTRY_NAME.get(s['country_code'], s['country_code']))}, "
            f"{sql_str(s['city'])}, {sql_str(s['official_url'])}, {sql_array(row_aliases)}, {sql_str(status)}, {sql_str(source)})"
        )
    lines.append(",\n".join(values) + "")
    lines.append(
        "on conflict (category, lower(canonical_name), coalesce(country, ''), coalesce(city, '')) do nothing;"
    )
    return "\n".join(lines) + "\n", excluded


def build_universities_sql(guni_rows, existing):
    existing_by_key = {(normalize_name(e["name"]), e["country"]): e for e in existing}

    new_rows = []
    enrich_rows = []
    for u in guni_rows:
        key = (normalize_name(u["institution"]), u["country_name"])
        alias = extract_parenthetical_alias(u["institution"])
        if key in existing_by_key:
            if alias:
                enrich_rows.append((existing_by_key[key]["name"], existing_by_key[key]["country"], alias))
            continue
        new_rows.append(u)

    lines = [
        f"-- ---------- Universities (GUNI, QS 2027 ranking — {len(new_rows)} new of {len(guni_rows)}, "
        f"{len(guni_rows) - len(new_rows)} already exist in supabase/seed.sql + seed_drive_batch1.sql by name+country match) ----------",
    ]
    if new_rows:
        lines.append("insert into public.universities (name, country, city, institution_type, website_url, aliases, data_confidence, data_status)")
        lines.append("values")
        values = []
        for u in new_rows:
            alias = extract_parenthetical_alias(u["institution"])
            display_name = re.sub(r"\s*\([^)]*\)\s*$", "", u["institution"]).strip()
            aliases = [alias] if alias else []
            values.append(
                f"  ({sql_str(display_name)}, {sql_str(u['country_name'])}, {sql_str(u['city'])}, "
                f"'University', {sql_str(u['official_website'])}, {sql_array(aliases)}, 'high', 'fresh')"
            )
        lines.append(",\n".join(values) + "")
        lines.append("on conflict (lower(name), country) do nothing;")
    else:
        lines.append("-- (none — every GUNI row matched an existing university by name+country)")

    lines.append("")
    lines.append(f"-- Alias enrichment for {len(enrich_rows)} already-existing universities (explicit parenthetical abbreviation in the source, e.g. \"(MIT)\")")
    for name, country, alias in enrich_rows:
        lines.append(
            f"update public.universities set aliases = array_append(aliases, {sql_str(alias)}) "
            f"where lower(name) = lower({sql_str(name)}) and country = {sql_str(country)} "
            f"and not ({sql_str(alias)} = any(aliases));"
        )
    return "\n".join(lines) + "\n"


def build_opportunity_aliases_sql(opp_master, opp_aliases):
    current_ids = {o["Canonical ID"] for o in opp_master}
    name_by_id = {o["Canonical ID"]: o["Opportunity"] for o in opp_master}

    usable = [a for a in opp_aliases if a["canonical_opportunity_id"] in current_ids and a["safe_to_use"] == "TRUE"]
    excluded = [a for a in opp_aliases if a not in usable]

    lines = [
        f"-- ---------- Opportunity aliases ({len(usable)} of {len(opp_aliases)} usable — "
        f"{len(excluded)} excluded: canonical_opportunity_id not in the 16-row official-current set) ----------",
        "-- Matched by exact title — a safe no-op if this batch's existing `opportunities` rows",
        "-- use a differently-worded title than this corpus's own canonical name; never guesses.",
    ]
    for a in usable:
        name = name_by_id[a["canonical_opportunity_id"]]
        lines.append(
            f"update public.opportunities set aliases = array_append(aliases, {sql_str(a['alias_name'])}) "
            f"where title = {sql_str(name)} and not ({sql_str(a['alias_name'])} = any(aliases));"
        )
    return "\n".join(lines) + "\n"


def main():
    providers = load("providers")
    schools = load("turkish_schools")
    school_aliases = load("school_aliases")
    guni = load("global_universities")
    opp_master = load("canonical_opportunities")
    opp_aliases = load("opportunity_aliases")
    existing_universities = load("existing_universities")

    org_sql = build_organizations_sql(providers)
    school_sql, excluded_schools = build_schools_sql(schools, school_aliases)
    uni_sql = build_universities_sql(guni, existing_universities)
    opp_alias_sql = build_opportunity_aliases_sql(opp_master, opp_aliases)

    header = f"""-- Canonical Entity Autocomplete System — Drive corpus import (entity batch 1).
-- Source: "{SOURCE_NOTE}" (Google Sheet, ORYN Database Drive folder) —
-- the current, non-superseded canonical data pack. Generated by
-- scripts/drive-import/parse_entities.py + generate_entities_sql.py; see
-- scripts/drive-import/README.md for the process and docs/entity-canonicalization-audit.md
-- for what this batch does and does not attempt.
--
-- Requires supabase/migrations/0038_canonical_institutions.sql applied first (this
-- file's ON CONFLICT clauses depend on its unique indexes). Not applied to any live
-- database this session — see docs/founder-blocked-backlog.md item 17.
--
-- Idempotent: every insert/update is safe to re-run.

"""

    with open(os.path.join(HERE, "..", "..", "supabase", "seed_entities_drive_batch1.sql"), "w", encoding="utf-8") as f:
        f.write(header)
        f.write(org_sql)
        f.write("\n")
        f.write(school_sql)
        f.write("\n")
        f.write(uni_sql)
        f.write("\n")
        f.write(opp_alias_sql)

    print(f"organizations: {len(providers)} rows")
    print(f"schools: {len(schools) - len(excluded_schools)} included, {len(excluded_schools)} excluded (HOLD_ release state)")
    for s in excluded_schools:
        print(f"  excluded: {s['seed_id']} {s['canonical_name']} ({s['release_state']})")
    print(f"universities: {len(guni)} GUNI rows processed")
    print("Wrote supabase/seed_entities_drive_batch1.sql")


if __name__ == "__main__":
    main()
