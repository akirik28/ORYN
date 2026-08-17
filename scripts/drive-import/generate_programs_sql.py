# -*- coding: utf-8 -*-
"""Drive-import batch: turn scripts/drive-import/parsed/university_programs.json into
ready-to-apply SQL for the enriched public.university_programs schema (migration 0042),
plus a full public.program_research_queue audit trail for every row in the batch —
accepted, rejected, or unresolved. Standard library only.

Strict entity linking: a program is only ever inserted when its university_name (+
country, with a small alias table for known label mismatches like Turkey/Türkiye)
resolves to exactly one row in scripts/drive-import/raw/live_universities.json, a
snapshot of the live `universities` table. No fuzzy/partial matching — an unresolved
name is logged to program_research_queue as unresolved_university and never inserted
into university_programs, per this product's own "false linkage is worse than missing
data" rule.

Verification gate: only rows whose corpus verification_status indicates a confirmed
official page ("Verified - official ... page") are promoted as verification_state =
'verified_current'. Rows whose evidence is a blocked page fetch behind an otherwise
official search result ("page retrieval blocked") are NOT promoted — a search result is
not confirmed page content — they're logged to the queue as insufficient_evidence so
they're auditable rather than silently dropped, available for a future pass that
re-fetches the page directly.

Usage:
    python3 scripts/drive-import/generate_programs_sql.py supabase/seed_programs_batch1.sql

Neither this script nor parse.py talks to Supabase directly. Requires migration 0042
applied first (the ON CONFLICT clause below depends on its dedup unique index).
"""
import json, re, sys, os
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
PARSED_DIR = os.path.join(HERE, "parsed")
RAW_DIR = os.path.join(HERE, "raw")

BATCH_ID = "drive_programs_batch1_2026-08-17"

COUNTRY_ALIASES = {
    "türkiye": "turkey",
    "turkiye": "turkey",
    "united states of america": "united states",
    "usa": "united states",
    "uk": "united kingdom",
    "great britain": "united kingdom",
    "south korea": "republic of korea",
    "hong kong sar": "hong kong",
}

# Unambiguous corpus-name -> live-universities.id overrides, confirmed by hand against
# live_universities.json (2026-08-17) for well-known abbreviations/short forms the exact
# normalized-name match can't bridge on its own. Every one of these was independently
# verified as the single correct institution, not a fuzzy guess — e.g. "University of
# Edinburgh" resolves to "The University of Edinburgh", explicitly NOT "Edinburgh Napier
# University" (a different, unrelated institution that also matched an ILIKE search).
# Keyed by (normalized corpus university_name, normalized corpus country).
MANUAL_ALIAS_OVERRIDES = {
    ("epfl", "switzerland"): "846029e2-39bd-40f1-8c00-bc263edbaaca",  # EPFL – École polytechnique fédérale de Lausanne
    ("humboldt university of berlin", "germany"): "84925a17-9a73-43a0-982c-2a9b846a545d",  # Humboldt-Universität zu Berlin
    ("new york university", "united states"): "86e9bca7-e10e-45ca-8f3c-3782ca3dba83",  # New York University (NYU)
    ("university of bologna", "italy"): "3acf2e36-46ab-4bbb-a379-8323789f5f8f",  # Alma Mater Studiorum - Università di Bologna
    ("university of california, berkeley", "united states"): "0c1c454c-52c2-44af-8892-c024b9dfdb0b",  # University of California, Berkeley (UCB)
    ("university of edinburgh", "united kingdom"): "e2feb81c-1bda-4889-8aa9-37783b720901",  # The University of Edinburgh, NOT Edinburgh Napier
    ("university of mannheim", "germany"): "3c48effe-f883-4907-bb0b-5911eb39e021",  # Universität Mannheim
}

# Ordered: first match wins as the primary tag; any further matches become secondary
# tags. Deliberately simple/transparent keyword matching, not a model — this is
# explicitly allowed ("schema decisions") and every classification is inspectable.
SUBJECT_KEYWORDS = [
    ("computer_science", ["computer science", "computing", "informatics", "software engineering"]),
    ("artificial_intelligence", ["artificial intelligence", "machine learning", "data science"]),
    ("economics", ["economic"]),
    ("finance", ["finance", "financial"]),
    ("business", ["business", "management"]),
    ("entrepreneurship", ["entrepreneur"]),
    ("engineering", ["engineering"]),
    ("medicine", ["medicine", "medical"]),
    ("law", [" law", "laws", "legal studies"]),
    ("psychology", ["psycholog"]),
    ("international_relations", ["international relations"]),
    ("political_science", ["political science", "politics", "government"]),
    ("mathematics", ["mathematic"]),
    ("physics", ["physics"]),
    ("architecture", ["architecture"]),
    ("design", ["design"]),
]


def classify_subjects(name):
    lname = f" {name.lower()} "
    matches = []
    for tag, keywords in SUBJECT_KEYWORDS:
        if any(kw in lname for kw in keywords):
            matches.append(tag)
    if not matches:
        return "other", []
    return matches[0], matches[1:]


def norm_country(c):
    key = (c or "").strip().lower()
    return COUNTRY_ALIASES.get(key, key)


def norm_name(s):
    s = (s or "").strip().lower()
    s = re.sub(r"\s+", " ", s)
    return s


def norm_program_name(s):
    s = (s or "").strip().lower()
    s = re.sub(r"[^\w\s]", "", s, flags=re.UNICODE)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def sql_str(v):
    if v is None:
        return "NULL"
    v = str(v).strip()
    if v == "" or v.lower().startswith("not structured") or v.lower().startswith("not populated"):
        return "NULL"
    v = v.replace("\x00", "")
    return "'" + v.replace("'", "''") + "'"


def sql_arr(items):
    if not items:
        return "'{}'"
    escaped = [x.replace("'", "''").replace(",", "\\,") for x in items]
    return "'{" + ",".join(f'"{x}"' for x in escaped) + "}'"


def clip(s, n):
    if s is None:
        return None
    s = str(s).strip()
    return s if len(s) <= n else s[: n - 1].rstrip() + "…"


def parse_duration_years(duration_text):
    m = re.match(r"^\s*(\d+(?:\.\d+)?)\s*year", duration_text or "", re.I)
    return m.group(1) if m else None


def main():
    if len(sys.argv) != 2:
        print("Usage: python3 generate_programs_sql.py <output.sql>", file=sys.stderr)
        sys.exit(1)
    out_path = sys.argv[1]
    base, ext = os.path.splitext(out_path)
    programs_path = f"{base}_programs{ext}"
    queue_path = f"{base}_queue{ext}"

    with open(os.path.join(PARSED_DIR, "university_programs.json"), encoding="utf-8") as f:
        programs = json.load(f)
    with open(os.path.join(RAW_DIR, "live_universities.json"), encoding="utf-8") as f:
        live_unis = json.load(f)

    # name -> list of (id, country) — a name can collide across countries (rare but
    # possible), so resolution checks country too rather than taking the first hit.
    by_name = {}
    for u in live_unis:
        by_name.setdefault(norm_name(u["name"]), []).append((u["id"], u["country"]))

    outcomes = Counter()
    program_inserts = []
    queue_inserts = []
    seen_program_keys = set()  # (university_id, normalized_program_name, degree_level) within this batch

    for p in programs:
        uni_name_key = norm_name(p["university_name"])
        target_country = norm_country(p["country"])
        candidates = by_name.get(uni_name_key, [])
        resolved_id = None
        if len(candidates) == 1:
            resolved_id = candidates[0][0]
        elif len(candidates) > 1:
            matches = [c for c in candidates if norm_country(c[1]) == target_country]
            if len(matches) == 1:
                resolved_id = matches[0][0]
        if resolved_id is None:
            resolved_id = MANUAL_ALIAS_OVERRIDES.get((uni_name_key, target_country))

        program_name = p["official_program_name"] or p["school_seed_name"]
        degree_level = p.get("degree_level") or None
        norm_pname = norm_program_name(program_name)

        # Trimmed payload for the audit trail — full evidence_excerpt already lives in
        # the Drive corpus itself (source_url + program_id above point back to it), so
        # the queue only needs enough to spot-check a decision, not the full citation.
        trimmed_payload = {**p, "evidence_excerpt": clip(p.get("evidence_excerpt"), 300)}
        common_queue_fields = {
            "batch_id": BATCH_ID,
            "research_program_id": p["program_id"],
            "university_id": resolved_id,
            "university_name_input": p["university_name"],
            "university_country_input": p["country"],
            "program_name_input": program_name,
            "degree_level_input": degree_level,
            "official_program_url_input": p["official_program_url"],
            "source_url_input": p["official_program_url"],
            "source_type_input": "official_primary",
            "verification_status_input": p["verification_status"],
            "raw_payload": trimmed_payload,
        }

        if resolved_id is None:
            outcomes["unresolved_university"] += 1
            queue_inserts.append({**common_queue_fields, "outcome": "unresolved_university",
                                   "outcome_detail": f"No confident match for \"{p['university_name']}\" / {p['country']} in live universities table."})
            continue

        if not (p.get("official_program_url") or "").strip():
            outcomes["insufficient_evidence"] += 1
            queue_inserts.append({**common_queue_fields, "outcome": "insufficient_evidence",
                                   "outcome_detail": "No official_program_url."})
            continue

        dedup_key = (resolved_id, norm_pname, degree_level or "")
        if dedup_key in seen_program_keys:
            outcomes["duplicate"] += 1
            queue_inserts.append({**common_queue_fields, "outcome": "duplicate",
                                   "outcome_detail": "Same university + normalized program name + degree level already accepted earlier in this batch."})
            continue

        confirmed_page = p["verification_status"].startswith("Verified - official") and "blocked" not in p["verification_status"]
        if not confirmed_page:
            outcomes["insufficient_evidence"] += 1
            queue_inserts.append({**common_queue_fields, "outcome": "insufficient_evidence",
                                   "outcome_detail": f"Verification status is \"{p['verification_status']}\" — an official search result, not a confirmed fetched page. Needs a direct re-fetch before promotion."})
            continue

        seen_program_keys.add(dedup_key)
        subject, secondary = classify_subjects(program_name)
        language = p.get("language") or None
        if language and language.lower().startswith("not structured"):
            language = None

        program_inserts.append({
            "university_id": resolved_id,
            "name": program_name,
            "normalized_name": norm_pname,
            "degree_level": degree_level,
            "field": subject if subject != "other" else None,
            "subject_taxonomy": subject,
            "secondary_subject_tags": secondary,
            "duration_years": parse_duration_years(p.get("duration")),
            "language_of_instruction": language,
            "official_program_url": p["official_program_url"],
            "source_url": p["official_program_url"],
            "source_type": "official_primary",
            "verification_state": "verified_current",
            "notes": f"Drive corpus batch {BATCH_ID}, program_id {p['program_id']}, last_verified {p.get('last_verified')}.",
            "data_confidence": "high",
        })
        outcomes["accepted"] += 1
        queue_inserts[len(queue_inserts):] = []  # no-op, keeps structure symmetric
        queue_inserts.append({**common_queue_fields, "outcome": "accepted", "outcome_detail": None})

    # ---- Emit SQL (two files: the release-table insert, and the larger audit-trail
    # insert, kept separate so each can be applied/reviewed independently) -----------
    header = [
        f"-- Generated by scripts/drive-import/generate_programs_sql.py from the founder's Drive corpus.",
        f"-- Batch: {BATCH_ID}. {len(programs)} candidate rows -> {outcomes['accepted']} accepted, "
        f"{outcomes['duplicate']} duplicate, {outcomes['unresolved_university']} unresolved_university, "
        f"{outcomes['insufficient_evidence']} insufficient_evidence.",
        "-- Read before applying — see scripts/drive-import/README.md.\n",
    ]

    out = list(header)
    out.append("insert into public.university_programs")
    out.append("  (university_id, name, normalized_name, degree_level, field, subject_taxonomy, secondary_subject_tags,")
    out.append("   duration_years, language_of_instruction, official_program_url, source_url, source_type,")
    out.append("   verification_state, verified_at, notes, data_confidence)")
    out.append("values")
    rows_sql = []
    for r in program_inserts:
        rows_sql.append(
            "  (" + ", ".join([
                sql_str(r["university_id"]), sql_str(r["name"]), sql_str(r["normalized_name"]),
                sql_str(r["degree_level"]), sql_str(r["field"]), sql_str(r["subject_taxonomy"]),
                sql_arr(r["secondary_subject_tags"]), sql_str(r["duration_years"]),
                sql_str(r["language_of_instruction"]), sql_str(r["official_program_url"]),
                sql_str(r["source_url"]), sql_str(r["source_type"]), sql_str(r["verification_state"]),
                "now()", sql_str(clip(r["notes"], 500)), sql_str(r["data_confidence"]),
            ]) + ")"
        )
    out.append(",\n".join(rows_sql) + "\n")
    out.append("on conflict (university_id, normalized_name, coalesce(degree_level, '')) do nothing;\n")
    with open(programs_path, "w", encoding="utf-8") as f:
        f.write("\n".join(out))

    out = list(header)
    out.append("insert into public.program_research_queue")
    out.append("  (batch_id, research_program_id, university_id, university_name_input, university_country_input,")
    out.append("   program_name_input, degree_level_input, official_program_url_input, source_url_input,")
    out.append("   source_type_input, verification_status_input, raw_payload, outcome, outcome_detail)")
    out.append("values")
    q_rows_sql = []
    for q in queue_inserts:
        raw_json = json.dumps(q["raw_payload"], ensure_ascii=False).replace("'", "''")
        q_rows_sql.append(
            "  (" + ", ".join([
                sql_str(q["batch_id"]), sql_str(q["research_program_id"]), sql_str(q["university_id"]),
                sql_str(q["university_name_input"]), sql_str(q["university_country_input"]),
                sql_str(q["program_name_input"]), sql_str(q["degree_level_input"]),
                sql_str(q["official_program_url_input"]), sql_str(q["source_url_input"]),
                sql_str(q["source_type_input"]), sql_str(q["verification_status_input"]),
                f"'{raw_json}'::jsonb", sql_str(q["outcome"]), sql_str(clip(q["outcome_detail"], 1000)),
            ]) + ")"
        )
    out.append(",\n".join(q_rows_sql) + ";\n")
    with open(queue_path, "w", encoding="utf-8") as f:
        f.write("\n".join(out))

    print(f"Wrote {programs_path} and {queue_path}")
    print(f"Outcomes: {dict(outcomes)}")
    print(f"Distinct universities touched: {len(set(r['university_id'] for r in program_inserts))}")
    subj_counts = Counter(r["subject_taxonomy"] for r in program_inserts)
    print(f"Subject breakdown: {dict(subj_counts)}")


if __name__ == "__main__":
    main()
