"""Drive-import batch, stage 1: parse ORYN Drive-corpus spreadsheet exports into clean JSON.

See scripts/drive-import/README.md for the full process. Standard library only (json, re,
csv, io) — no pip install required. Input: the raw `{"fileContent": "..."}` JSON that a
Drive MCP `read_file_content` call returns for each corpus spreadsheet, saved to
scripts/drive-import/raw/<name>.json. Output: scripts/drive-import/parsed/<name>.json.

Row counts are printed against each source file's own README-stated "Verified"/"2026
confirmed" counts — a mismatch means the section markers or ID-regex below no longer match
that batch's export and need adjusting before trusting the output.
"""
import json, re, csv, io, sys, os

HERE = os.path.dirname(os.path.abspath(__file__))
RAW_DIR = os.path.join(HERE, "raw")
PARSED_DIR = os.path.join(HERE, "parsed")

OPP_HEADER = ["opportunity_id", "name", "alternate_names", "category", "subtype", "subjects_school_snapshot",
              "grades_school_snapshot", "official_or_provider_url", "verified_page_title", "identity_verification_status",
              "current_cycle_status", "current_cycle_details", "eligibility_evidence", "cost_or_aid_evidence",
              "verification_note", "last_verified", "school_source_occurrences", "school_source_refs",
              "school_source_summary", "alternate_urls"]

PROGRAM_HEADER = ["program_id", "university_id", "university_name", "country", "school_seed_name", "official_program_name",
                   "degree_level", "official_program_url", "verified_page_title", "verification_status",
                   "current_year_evidence", "availability_note", "language", "duration", "last_verified", "evidence_excerpt"]

REQUIREMENT_HEADER = ["requirement_id", "program_id", "university_id", "university_name", "country", "program_name",
                       "programme_verification_status", "requirement_scope", "academic_subjects_or_diploma",
                       "minimum_grades", "standardized_tests", "english_language", "deadline_or_application_window",
                       "essay_or_personal_statement", "recommendations", "interview", "portfolio_or_supplement",
                       "entrance_exam_or_selection", "international_applicant_notes", "official_program_source",
                       "official_admissions_source", "admissions_page_title", "requirements_verification_status", "last_verified"]

UNIVERSITY_HEADER = ["university_id", "university_name", "country", "city", "latitude", "longitude", "coordinate_status",
                      "institution_type", "official_website", "institution_verification_url", "verification_status",
                      "verification_note", "country_catalog_name", "country_catalog_source", "v1_priority",
                      "verified_active_program_count", "candidate_program_count", "last_verified"]


def unescape(s):
    if not isinstance(s, str):
        return s
    return (s.replace("\\_", "_").replace("\\!", "!").replace("\\&", "&")
             .replace("\\#", "#").replace("\\*", "*").replace('\\"', '"').strip())


def load_filecontent(path):
    d = json.load(open(path, encoding="utf-8"))
    return unescape(d["fileContent"])


def slice_between(text, start_marker, end_markers):
    i = text.find(start_marker)
    if i == -1:
        raise ValueError(f"start marker not found: {start_marker!r} — corpus export format may have changed")
    rest = text[i + len(start_marker):]
    end = len(rest)
    for m in end_markers:
        j = rest.find(m)
        if j != -1:
            end = min(end, j)
    return rest[:end]


def rows_by_id(section_text, id_regex, header):
    """The Drive MCP's text export of a spreadsheet has no real row-delimiting newlines —
    rows run together as one long comma-separated stream. Each row starts with a
    distinctive ID (ORYN-OPP-0058, ORYN-UNI-0031, ...) that never legitimately recurs
    inside another row's free-text fields in this corpus, so splitting right before each
    ID match recovers row boundaries; csv.reader then handles embedded commas/quotes
    correctly within each recovered row."""
    parts = re.split(f"(?={id_regex})", section_text)
    rows = []
    for p in parts:
        p = p.strip().rstrip(",")
        if not re.match(id_regex, p):
            continue
        reader = csv.reader(io.StringIO(p))
        try:
            row = next(reader)
        except Exception as e:
            print(f"  ! csv parse fail: {e} :: {p[:80]!r}", file=sys.stderr)
            continue
        if len(row) < len(header):
            row = row + [""] * (len(header) - len(row))
        elif len(row) > len(header):
            row = row[: len(header) - 1] + [",".join(row[len(header) - 1 :])]
        rows.append({k: unescape(v) for k, v in zip(header, row)})
    return rows


def parse_opportunity_file(path):
    text = load_filecontent(path)
    section = slice_between(text, "opportunity_id,name,alternate_names", ["Current_2026", "Audit_Records"])
    return rows_by_id(section, r"ORYN-OPP-\d{4}", OPP_HEADER)


def parse_programs_file(path):
    text = load_filecontent(path)
    section = slice_between(text, "program_id,university_id,university_name", ["Candidate_Audit"])
    return rows_by_id(section, r"ORYN-PRG-\d{4}", PROGRAM_HEADER)


def parse_requirements_file(path):
    text = load_filecontent(path)
    section = text[text.find("requirement_id,program_id,university_id") :]
    return rows_by_id(section, r"ORYN-REQ-\d{4}", REQUIREMENT_HEADER)


def parse_universities_file(path):
    text = load_filecontent(path)
    section = text[text.find("university_id,university_name,country") :]
    return rows_by_id(section, r"ORYN-UNI-\d{4}", UNIVERSITY_HEADER)


# Maps scripts/drive-import/raw/<key>.json -> (parser, output key). Extend this as new
# category exports are added to raw/ for a future batch.
OPPORTUNITY_CATEGORY_FILES = [
    "Summer_Programs", "Competitions_and_Awards", "Online_Programs_and_Internships",
    "Research_Publications", "Social_Impact_and_Volunteering", "Scholarships_and_Fellowships",
]


def main():
    os.makedirs(PARSED_DIR, exist_ok=True)
    all_opps = []
    for key in OPPORTUNITY_CATEGORY_FILES:
        path = os.path.join(RAW_DIR, f"{key}.json")
        if not os.path.exists(path):
            print(f"skip (not found): {key}")
            continue
        rows = parse_opportunity_file(path)
        print(f"{key}: {len(rows)} verified rows parsed")
        all_opps.extend(rows)
    with open(os.path.join(PARSED_DIR, "opportunities.json"), "w", encoding="utf-8") as f:
        json.dump(all_opps, f, ensure_ascii=False, indent=1)

    for key, fn in [("University_Programs", parse_programs_file), ("Program_Requirements", parse_requirements_file),
                     ("Universities", parse_universities_file)]:
        path = os.path.join(RAW_DIR, f"{key}.json")
        if not os.path.exists(path):
            print(f"skip (not found): {key}")
            continue
        rows = fn(path)
        print(f"{key}: {len(rows)} rows parsed")
        with open(os.path.join(PARSED_DIR, f"{key.lower()}.json"), "w", encoding="utf-8") as f:
            json.dump(rows, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
