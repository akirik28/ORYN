# 05 — Spain: UNEDasiss says 7 July, UC3M and UCM both say 6 July

**Records:** `DL-2026-08-21-0014` (`es_ch_requirements_spain-system_...`, line 14),
`DL-2026-08-21-1015` (`es_ch_requirements_uc3m_...`, line 15),
`DL-2026-08-21-2016` (`es_ch_requirements_ucm_...`, line 16)
**Status:** **Resolved — not a conflict**
**Re-checked:** 2026-08-22

## What was recorded

Three official Spanish sources on the closing date for foreign-education-system applicants'
*preinscripción* for the 2026/27 cycle:

| Source | Figure |
|---|---|
| UNEDasiss (`unedasiss.uned.es/fechas_clave`) | "7 de julio de 2026" |
| UC3M (`uc3m.es/grado/admision/solicitud/preinscripcion`) | "hasta el 6 de julio (hasta las 14:00h)" |
| UCM (`ucm.es/calendario-de-preinscripcion`) | "del 5 de junio a las 9:00h al 6 de julio hasta las 14:00 horas" |

Two universities agreeing with each other and both disagreeing with a national body. The original
researcher offered an unconfirmed hypothesis — that UNEDasiss might be quoting a general national
figure while Madrid runs its own coordinated calendar — and explicitly marked it as speculation
rather than asserting it.

## What I did

Rather than weighing two universities against one national body, asked which body actually *owns*
this calendar. Spanish university admission is not run nationally: each **autonomous community**
sets its own *preinscripción* calendar. UC3M and UCM are both public universities in Madrid.

## The evidence

The **Comunidad de Madrid** — the regional government that sets the Distrito Único calendar —
publishes for the 2026 access cycle, for *sistemas educativos extranjeros*:

> "del 5 de junio al 6 de julio a las 14:00"

That is UC3M's and UCM's figure exactly, **including the 14:00 cut-off**. The general
preinscripción period is given as 5–26 June.

The **Distrito Único de Madrid** admits to six public universities on a single coordinated
application: **Alcalá, Autónoma, Carlos III, Complutense, Politécnica, Rey Juan Carlos**. Both UC3M
(Carlos III) and UCM (Complutense) are members, which is precisely why they state identical
figures — they are not two independent corroborations, they are two restatements of one calendar.

**What UNEDasiss actually is.** UNEDasiss is a credential-accreditation service run by UNED. It
issues the *acreditación* that international applicants use to enter Spanish admission processes.
It does not run, set, or own any autonomous community's admission calendar. Its "7 de julio" is a
general national-level orientation figure, not the binding deadline for any particular district.

## Resolution

**There is no conflict.** The three figures are not three answers to one question:

- **6 July, 14:00** is the binding closing date for applicants to the six Madrid public
  universities, set by the Comunidad de Madrid. This governs anyone applying to UC3M or UCM.
- **7 July** is UNEDasiss's general national-level figure, describing the national landscape rather
  than the Madrid district.

The original researcher's speculation turns out to have been correct — and it is now **sourced**,
from the body that sets the calendar, rather than inferred from the pattern of who agrees with whom.

Note what would have gone wrong under a majority-vote rule: "two universities against one national
body" gets the right answer here for entirely the wrong reason. UC3M and UCM are not independent
witnesses. Had the district been represented by only one university in the corpus, the same rule
would have produced a 1–1 tie and no resolution — or, worse, deferred to the national body on the
theory that a national source outranks an institutional one, which is exactly backwards here.

## Scope caveat worth carrying

This resolution is **specific to Madrid**. Other autonomous communities (Catalonia, Andalusia,
Valencia, etc.) run their own calendars with their own closing dates. A student applying to a
non-Madrid public university is governed by that community's calendar, and neither the 6 July
figure nor UNEDasiss's 7 July should be generalised to them. The corpus's Spain-system record
should say so, since it is filed as a national-level record.

Also worth noting: the 2026/27 cycle these dates belong to has now closed (both dates are in the
past as of 2026-08-22). The records remain correct as historical facts for that cycle, and the
structural finding — who owns the calendar — is what carries forward.

## Corpus action

- `DL-2026-08-21-1015` (UC3M) and `DL-2026-08-21-2016` (UCM): `verification_state` →
  `VERIFIED_HISTORICAL` for `cycle_year` 2026 (the cycle has closed); `retrieved_at` →
  `2026-08-22`; replace the "conflicts with UNEDasiss" limitation with the Comunidad de Madrid
  corroboration.
- `DL-2026-08-21-0014` (Spain system / UNEDasiss): `verification_state` → `VERIFIED_HISTORICAL`;
  re-scope the record so it is not read as *the* national deadline — annotate that UNEDasiss is a
  credential service, that binding calendars are regional, and that Madrid's differs.
- Add the Comunidad de Madrid calendar as a source for the Madrid district.

## Proposed `requirement_source_conflicts` row

```yaml
university: Universidad Carlos III de Madrid  # replicate for Universidad Complutense de Madrid
subject: "Application (preinscripción) deadline for foreign education systems"
status: resolved
resolution_note: >-
  Not a conflict — the figures describe different levels of the system. Spanish university
  admission calendars are set by each autonomous community, not nationally. The Comunidad de Madrid
  publishes, for sistemas educativos extranjeros in the 2026 cycle, "del 5 de junio al 6 de julio a
  las 14:00" — matching UC3M and UCM exactly, including the 14:00 cut-off. Both universities belong
  to the Distrito Único de Madrid (Alcalá, Autónoma, Carlos III, Complutense, Politécnica, Rey Juan
  Carlos), which admits on one coordinated calendar, so they are two restatements of one source
  rather than two independent witnesses. UNEDasiss is a UNED credential-accreditation service and
  owns no region's admission calendar; its "7 de julio" is a general national-level figure. Binding
  date for UC3M and UCM applicants: 6 July, 14:00. This resolution is specific to Madrid — other
  autonomous communities run their own calendars and must not inherit either figure.
resolved_at: 2026-08-22
```
