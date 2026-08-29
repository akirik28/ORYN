#!/usr/bin/env python3
"""Join findings.jsonl to live row ids -> PROPOSALS_dryrun.jsonl.
Matching order: explicit row_id -> alias map -> exact title -> normalised title -> title prefix.
Founder-held rows are never emitted."""
import json,re
rows={}
for l in open("live_summer_corpus.jsonl"):
    r=json.loads(l); rows[r['id']]=r
by_title={r['title']:r for r in rows.values()}
def norm(t): return re.sub(r'[^a-z0-9]+',' ',t.lower()).strip()
norm_map={}
for r in rows.values(): norm_map.setdefault(norm(r['title']),r)
HELD={"Koç University Summer Academy (High School Programs)","Interlochen Arts Camp"}
ALIAS={
 "TechGirls":"TechGirls (w Virginia Tech University) 2026",
 "Summer Discovery":"Summer Discovery Summer 2025 Programs",
 "PROMED Projects 2026 (Premed Projects)":"PROMED Projects 2026",
 "Venture & Tech Summer Program 2026 (VTSP)":"Venture & Tech Summer Program 2026",
 "UCSB Research Mentorship Program (RMP)":"UCSB Research Mentorship Programs",
 "John Locke Institute (JLI) Courses / Summer Schools":"John Locke Institute (JLI) Courses",
 "67th London International Youth Science Forum (LIYSF)":"67th London International Youth Science Forum (LIYSF) - 2026",
 "iStar Class Credit and Research Program (IPERC)":"iStar Class Credit and Research Program",
 "ACU BİLİM YAZ KAMPI PROGRAMI 2026 (Acıbadem Lise Yaz Bilim Kampı)":"ACU BİLİM YAZ KAMPI PROGRAMI 2026",
 "Boğaziçi Üniversitesi — both rows point at things that are not a live high-school summer school":"Boğaziçi Uni Yaz Okulu",
 "UniHive Summer Programmes hosted at the University of Cambridge":"UniHive Summer Programmes hosted at the University of Cambridg",
 "Hong Kong University of Science and Technology (HKUST) — I·ELITE Pre-University Scholars Program":"Hong Kong University of Science and Technology (HKUST)",
 "Research in Biological Sciences (RIBS) — UChicago":"Research in Biological Sciences (RIBS)",
 "Vanderbilt PTY — umbrella confirmed to span K-8 AND high school":"Vanderbilt Programs for Talented Youth (PTY) - Summer Institut",
 "iD Tech Camps — price NOT published on the pages I read":"iD Tech Camps",
 "Phillips Exeter Academy (Exeter Summer) — the rolling-vs-deadline trap, caught":"Phillips Exeter Academy",
 "Northwestern NHSI — an umbrella of five divisions, and a forward date for the calendar":"Northwestern University National High School Institute (NHSI) - \"The Cherubs\"",
 "Idyllwild Arts Summer Program — age band tops out at 17":"Idyllwild Arts Summer Program (High School Intensives)",
 "Sciences Po Summer School - Pre-College Programme — our row is correctly SCOPED":"Sciences Po Summer School - Pre-College Programme",
 "Research Program KUSRP 2026 (Koç University Summer Research Program — high-school projects)":"Research Program KUSRP 2026",
 "Woodstock School: Mussoorie, India — the most extreme currency case in the corpus":"Woodstock School: Mussoorie, India",
 "School of the Art Institute of Chicago (SAIC) — two rows, two real programmes, one marketing-sentence title":"School of the Art Institute of Chicago (SAIC) Chicago, IL",
 "Vesalius College / Brussels School — server error, no conclusion":"Vesalius College: Brussels, Belgium Innovative Entrepreneurshi",
 "Leangap Summer Program":"Leangap",
 # NOT a summer_program row: lives in category='research'. Recorded in findings, no summer proposal.
 "Pioneer Research Institute — EXEMPTION TEST RESULT: EARNED, leave the tier alone":None,
}
props=[];meta=[];unm=[]
for l in open("findings.jsonl"):
    f=json.loads(l); t=f.get("title") or ""
    if t.startswith("[") or (f.get("grade") or "").lower() in ("meta","pattern","correction"):
        meta.append(t); continue
    if t in ALIAS and ALIAS[t] is None: meta.append(t); continue
    row=rows.get(f.get("row_id") or "")
    if row is None:
        cand=ALIAS.get(t,t); base=re.split(r'\s+[—-]\s+',cand)[0]
        row=(by_title.get(cand) or norm_map.get(norm(cand))
             or by_title.get(base) or norm_map.get(norm(base)))
    if row is None:
        # try the title with a trailing parenthetical stripped: "Frontiers Overview (WPI Frontiers)" -> "Frontiers Overview"
        stripped=re.sub(r'\s*\([^)]*\)\s*$','',re.split(r'\s+[—-]\s+',t)[0]).strip()
        row=by_title.get(stripped) or norm_map.get(norm(stripped))
    if row is None:
        n=norm(re.split(r'\s+[—-]\s+',t)[0])[:22]
        c=[r for k,r in norm_map.items() if k.startswith(n)]
        row=c[0] if len(c)==1 else None
    if row is None: unm.append(t); continue
    if row['title'] in HELD: continue
    props.append({"row_id":row['id'],"live_title":row['title'],"finding_title":t,"grade":f.get("grade"),
      "live":{"tier":row['selectivity_tier'],"vstate":row['verification_state'],"cycle":row['cycle_status'],
              "cost":row['cost'],"deadline":row['deadline'],"url":row['official_url']},
      "proposed_selectivity_tier":f.get("proposed_selectivity_tier"),
      "verified":{k:v for k,v in f.items() if k not in ("title","grade","proposed_selectivity_tier","row_id","source_urls","verified_at","retrieval_method")},
      "source_urls":f.get("source_urls") or ([f["source_url"]] if f.get("source_url") else []),
      "verified_at":f.get("verified_at")})
with open("PROPOSALS_dryrun.jsonl","w") as fh:
    for r in props: fh.write(json.dumps(r,ensure_ascii=False)+"\n")
print(f"proposals={len(props)}  corpus_level={len(meta)}  unmatched={len(unm)}")
for u in unm: print("  UNMATCHED:",u[:90])
