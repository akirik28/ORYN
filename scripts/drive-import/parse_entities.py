"""Drive-import, entity batch: parses the "10 ORYN Canonical App Data Pack — Verified
2026-08-15" Google Sheet export (a single large merged-tabs markdown-table export, a
different format from parse.py's older per-category CSV-in-cells exports — one physical
line per row here, pipe-delimited, header row always exactly one line above the first
data row — verified by hand against 5 different tables in this export before writing
this parser) into the specific structured tables the Canonical Entity Autocomplete
System needs: verified organizations (PROV), verified Turkish schools (TRSCH) with
their explicit aliases (ALIA), globally-ranked universities (GUNI), and the small set of
explicit opportunity name aliases (the ALIAS merge table) plus the 16-row
"official-current" canonical opportunity master (for name matching only, not full
re-import).

Every other table in this 2572-line export (evidence, eligibility, cost, sessions,
requirements, changelog, media-kit index, embedded-file index, gap-analysis "DS-"
rows, ...) is deliberately NOT parsed here — out of scope for entity linking
specifically (see docs/entity-canonicalization-audit.md), not overlooked.

Row counts are printed for validation against what a human skim of the source found —
58 TRSCH, 126 ALIA, 19 PROV, 98 GUNI, 16 "official-current" canonical opportunities, 7
opportunity aliases. A mismatch means the export changed shape and the assumptions below
need rechecking before the output can be trusted.
"""

import json, re, os

HERE = os.path.dirname(os.path.abspath(__file__))
RAW_PATH = os.path.join(HERE, "raw", "canonical_app_data_pack.json")
PARSED_DIR = os.path.join(HERE, "parsed")


def unescape(s: str) -> str:
    return (
        s.replace("\\_", "_").replace("\\!", "!").replace("\\&", "&").replace("\\#", "#")
        .replace("\\*", "*").replace('\\"', '"').replace("\\-", "-").replace("\\.", ".")
        .strip()
    )


def load_lines():
    with open(RAW_PATH, encoding="utf-8") as f:
        content = json.load(f)["fileContent"]
    return content.split("\n")


def split_row(line: str) -> list[str]:
    cells = line.split("|")
    # A well-formed `| a | b | c |` line has an empty first and last element from the
    # leading/trailing pipe — drop them; a malformed line (no leading/trailing pipe)
    # keeps everything, which the caller's header-length check will catch.
    if cells and cells[0].strip() == "":
        cells = cells[1:]
    if cells and cells[-1].strip() == "":
        cells = cells[:-1]
    return [unescape(c) for c in cells]


def rows_from_block(lines, header, first, last):
    rows = []
    for i in range(first, last + 1):
        cells = split_row(lines[i])
        if len(cells) < len(header):
            cells = cells + [""] * (len(header) - len(cells))
        rows.append({h: v for h, v in zip(header, cells)})
    return rows


def parse_table(lines, id_prefix, header_cell_count=None):
    """Finds the contiguous block of `| PREFIX-NNNN | ... |` rows. The header row is
    always exactly one line above the first data row in this export (confirmed by hand
    for PROV, TRSCH, ALIA, GUNI, and the opportunity master table — a blank placeholder
    row and a `:-:` separator row sit two and three lines above instead, never adjacent
    to the data)."""
    id_re = re.compile(r"^\|\s*" + re.escape(id_prefix) + r"-\d+\s*\|")
    first = last = None
    for i, l in enumerate(lines):
        if id_re.match(l):
            if first is None:
                first = i
            last = i
        elif first is not None and l.strip() == "":
            break  # contiguous block ended
    if first is None:
        raise ValueError(f"no rows found for prefix {id_prefix!r} — export format may have changed")

    header = split_row(lines[first - 1])
    if header_cell_count and len(header) != header_cell_count:
        raise ValueError(f"{id_prefix}: expected {header_cell_count} header cells, got {len(header)}: {header}")

    return rows_from_block(lines, header, first, last)


def parse_prov(lines):
    return parse_table(lines, "PROV")


def parse_trsch(lines):
    return parse_table(lines, "TRSCH")


def parse_alia(lines):
    return parse_table(lines, "ALIA")


def parse_guni(lines):
    return parse_table(lines, "GUNI")


def parse_opportunity_master(lines):
    """The 16-row denormalized "official-current" canonical opportunity table (wide
    header starting "Canonical ID | Opportunity | Type | ..."), distinct from a second,
    normalized ORYN-CAN/provider_id table further down that shares the same id prefix —
    disambiguated by requiring the header's second cell to read "Opportunity" (the
    normalized table's second column is "name", not "Opportunity")."""
    id_re = re.compile(r"^\|\s*ORYN-CAN-\d+\s*\|")
    for i, l in enumerate(lines):
        if id_re.match(l):
            header = split_row(lines[i - 1])
            if len(header) > 1 and header[1] == "Opportunity":
                first, last = i, i
                j = i + 1
                while id_re.match(lines[j]):
                    last = j
                    j += 1
                return rows_from_block(lines, header, first, last)
    raise ValueError("official-current canonical opportunity master table not found")


def parse_opportunity_aliases(lines):
    return parse_table(lines, "ALIAS")


def main():
    os.makedirs(PARSED_DIR, exist_ok=True)
    lines = load_lines()

    tables = {
        "providers": parse_prov(lines),
        "turkish_schools": parse_trsch(lines),
        "school_aliases": parse_alia(lines),
        "global_universities": parse_guni(lines),
        "canonical_opportunities": parse_opportunity_master(lines),
        "opportunity_aliases": parse_opportunity_aliases(lines),
    }

    for name, rows in tables.items():
        print(f"{name}: {len(rows)} rows parsed")
        with open(os.path.join(PARSED_DIR, f"{name}.json"), "w", encoding="utf-8") as f:
            json.dump(rows, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
