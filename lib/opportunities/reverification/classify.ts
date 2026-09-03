import type { ReverificationCandidate } from "./types";

/** Design doc §7.2 guard 1: rockefeller.edu returned 0 bytes, a JS-rendered page returns a
 * shell — below this floor, "no closure language found" would silently mean "we read
 * nothing," not "the page says nothing about closing." */
export const CONTENT_LENGTH_FLOOR = 500;

export function passesContentFloor(content: string): boolean {
  return content.trim().length >= CONTENT_LENGTH_FLOOR;
}

/**
 * Design doc §7.2 guard 2: the content must contain a recognisable token from the
 * opportunity's title or organization, or we may have fetched a redirect, a cookie wall, or
 * a 404 rendered with HTTP 200. Deliberately loose (any single meaningful word, not the
 * whole phrase) — the guard exists to catch "this page has nothing to do with the
 * opportunity at all," not to demand an exact-title match a real page is never going to give
 * verbatim.
 *
 * Words under 4 characters are excluded from the candidate set (design doc has no
 * corpus-measured floor for this; 4 is chosen so the check isn't satisfied by an incidental
 * "the"/"and"/"for" match against unrelated content) — a title/organization with no word
 * that long falls through to requiring the full lowercase phrase, which a real page about
 * the opportunity should still contain.
 */
export function passesPageIdentity(content: string, opportunity: Pick<ReverificationCandidate, "title" | "officialUrl">, organization: string | null): boolean {
  const haystack = content.toLowerCase();
  const candidates = [opportunity.title, organization ?? ""]
    .flatMap((s) => s.split(/\s+/))
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((w) => w.length >= 4);

  if (candidates.length === 0) {
    const fullTitle = opportunity.title.trim().toLowerCase();
    return fullTitle.length > 0 && haystack.includes(fullTitle);
  }
  return candidates.some((word) => haystack.includes(word.toLowerCase()));
}

/** Design doc §7.2 guard 3: no date-like token and no application vocabulary anywhere means
 * the page has not answered our question — treat as P2, not "no closure language found". */
const APPLICATION_VOCABULARY = [
  "apply",
  "application",
  "applicant",
  "deadline",
  "eligib",
  "admission",
  "enroll",
  "enrol",
  "registration",
  "register",
];
const DATE_LIKE = /\b\d{4}\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}\b/i;

export function passesApplicationVocabulary(content: string): boolean {
  const haystack = content.toLowerCase();
  return DATE_LIKE.test(content) || APPLICATION_VOCABULARY.some((word) => haystack.includes(word));
}

export type ContentGuardFailure = "content_too_short" | "identity_mismatch" | "no_application_vocabulary";

/** All three §7.2 guards in the order the design doc presents them. Returns the first
 * failure, or null when every guard passes. A 200 that fails any one of these is P2 per
 * §7.2's own framing ("A 200 response is not a successful read"), never parsed further. */
export function checkContentGuards(
  content: string,
  opportunity: Pick<ReverificationCandidate, "title" | "officialUrl">,
  organization: string | null
): ContentGuardFailure | null {
  if (!passesContentFloor(content)) return "content_too_short";
  if (!passesPageIdentity(content, opportunity, organization)) return "identity_mismatch";
  if (!passesApplicationVocabulary(content)) return "no_application_vocabulary";
  return null;
}

// Design doc §5.1's original fixed phrase set, kept as literal substrings — none of these
// were shown to cause a false positive, so none are removed, only extended below.
// "check back" is the one exception, removed as a standalone trigger: the first live dry
// run (2026-09-03, 20 real rows) found it fired 2/2 times on unrelated blog/photo-gallery
// "check back for updates" text, never once on an actual closure. Its one legitimate
// observed use (Interlochen Review: "not open for submissions... Check back in January")
// is still caught below by the more specific NOT_OPEN_FOR_SUBMISSIONS pattern, so nothing
// real is lost by dropping the bare trigger.
const CLOSURE_PHRASES = ["applications are closed", "applications now closed", "no longer accepting", "deadline has passed"];
const OPENING_PHRASES = ["applications open", "apply by", "deadline:"];

/**
 * Evidence-grounded additions, 2026-09-03 (CEO dispatch: "derive the phrase set from real
 * pages instead of from intuition"). The literal phrases above, checked against a 49-page
 * stratified sample (all 12 categories, 6 cycle_status values, spread across countries —
 * not the priority-ranked due-set, which skews toward a narrower slice) found in dry run
 * #1 to produce zero P1 outcomes across 20 rows, missed almost everything real pages
 * actually say. The dominant failure mode was NOT missing vocabulary alone — it was word
 * order and tense: not one real "closed" example in the sample matched the literal phrase
 * "applications now closed" verbatim (real examples: "is now closed" ×3, "Has Officially
 * Concluded", "not open for submissions"), and real "open" language put "now" on either
 * side of "open" depending on the site. A literal-string list would need combinatorial
 * variants to cover this; a handful of short, tolerant regexes covers the same ground
 * without guessing at variants that were never observed.
 *
 * Every pattern below is traceable to a specific fetched page, not invented:
 * - "apply now": Wharton M&TSI ("Apply Now!"), LaunchX ("Apply Now" nav)
 * - "(now open | open now | now opened)": EYP Türkiye ("ARE OPEN NOW", "Officer Calls are
 *   Now Open!"), Özyeğin ("APPLICATIONS FOR 2026 ARE NOW OPENED!")
 * - "application(s) (is|are) (now) open": EYP, Girl Up ("are now open"), Habitat/Geleceği
 *   Eşitle ("Applications are open to young people...")
 * - "registration (is) open": Wall Street 101 ("Registration open for Summer 2026")
 * - "application is available": Coca-Cola Scholars ("The 2027 ... application is available
 *   here!")
 * - "(is|are|has) now closed": JLI ("Registration ... is now closed"), ASSIP ("The 2026
 *   ASSIP Application is now closed"), Girl Up Project Awards ("application is now closed")
 * - "officially concluded": SIP ("SIP 2026 Has Officially Concluded")
 * - "not open for submissions": Interlochen Review — see the note on "check back" above
 *
 * Two things this pass measured but deliberately did NOT try to fix here, because fixing
 * them is a different kind of change than a phrase-set update:
 * - A meaningful share of the sample (Turkish-market rows: İBB Genç Gönüllü, GençBizzTech,
 *   UPSHIFT, Gençlik Merkezleri, Duke of Edinburgh Türkiye) carried no English opening/
 *   closing language at all — an English-only matcher structurally cannot classify these
 *   regardless of how the English list is tuned. Addressed below (TURKISH_OPENING_PATTERNS/
 *   TURKISH_CLOSURE_PATTERNS, 2026-09-03), not here — see that section's own comment for why
 *   it is a genuinely different kind of derivation, not just "translate the English list."
 * - At least one page in the sample (Columbia's course-filter UI: literal text "Status -
 *   Any - Open Closed") shows why a BROADER bare-word match ("open" / "closed" alone,
 *   unanchored) would be actively dangerous — a filter control, not a fact about the
 *   specific stored opportunity. Every pattern below stays anchored to an
 *   application/registration noun or an explicit CTA phrase for exactly this reason.
 */
const OPENING_PATTERNS: RegExp[] = [
  /apply\s+now/,
  /\b(?:now\s+open|open\s+now|now\s+opened)\b/,
  /applications?\s+(?:are|is)\s+(?:now\s+)?open\b/,
  /registration\s+(?:is\s+)?open\b/,
  /application\s+is\s+available\b/,
];

const CLOSURE_PATTERNS: RegExp[] = [/\b(?:is|are|has)\s+now\s+closed\b/, /officially\s+concluded\b/, /not\s+open\s+for\s+submissions?\b/];

/**
 * Turkish patterns, 2026-09-03 (CEO dispatch, following the English pass: "extend the
 * phrase set to Turkish, derived the same way... fetch more [than 5]... mind that Turkish
 * is agglutinative, so a 'tolerant pattern' there means something different than it does in
 * English"). Derived from 21 real Turkish-market opportunity pages (the entire population
 * matching country IN ('Turkey','Türkiye') OR a .tr/.com.tr/.gov.tr/.edu.tr URL in the live
 * corpus — not a further subsample of it), read the same way the English corpus was: in
 * full, by hand, before writing a pattern.
 *
 * THIS IS A GENUINELY DIFFERENT KIND OF DERIVATION THAN THE ENGLISH ONE, not a translation
 * of it. English's failure mode was word ORDER ("now open" vs "open now") — a handful of
 * patterns covers every order because English marks tense/aspect with separate words.
 * Turkish marks the same distinctions with SUFFIXES on a shared root ("kapan-dı" = closed,
 * "kapan-mıştır" = has closed [formal], "kapa-lı" = closed [adjective] — same concept, three
 * different endings, and the third does not even share the "kapan-" substring the other two
 * do). A pattern tolerant of Turkish inflection the way the English patterns are tolerant of
 * word order would need to match on the ROOT alone — and Turkish roots are short enough that
 * this is genuinely more dangerous than in English: "aç" (the 2-letter root of "to open") is
 * a substring of "açıklama" (explanation/statement), "açı" (angle), and "açlık" (hunger),
 * none of which say anything about whether an opportunity is open. English has nothing this
 * short and this ambiguous among the roots this file matches on.
 *
 * The response to that risk, not a workaround for it: every pattern below is a SPECIFIC,
 * whole-phrase, directly-observed construction — never a bare root. This is deliberately
 * NARROWER coverage than a linguist fluent in Turkish morphology could derive (see the
 * honest gaps listed below), traded for not guessing at a conjugation this pass never
 * actually saw on a real page. Each pattern is cited to the specific page that motivated it:
 *
 * - "son başvuru" / "son kayıt" (literally "final application" / "final registration",
 *   functioning as a deadline label exactly like English "deadline:"): Sabancı University
 *   ("Son Başvuru: 1 Ağustos 2026"), İTÜ Lise Yaz Okulu ("SON KAYIT: 16 TEMMUZ"), Istanbul
 *   Bilgi University FAQ ("Son başvuru tarihi 12 Haziran 2025") — three independent real
 *   pages using near-identical phrasing.
 * - "şimdi başvur" / "hemen başvur" ("apply now" / "apply immediately" — two different real
 *   words for "now", not a suffix variant of one): ODTÜ/METU ("Şimdi Başvur"), Sabancı
 *   University and GençBizzTech (both "Hemen Başvur").
 * - "kayıtlar(ımız) kapandı" ("[our] registrations have closed" — the possessive suffix
 *   "-ımız" is matched as the literal, optional form actually observed, not a general
 *   word-character class: JS's `\w` is ASCII-only and does not match "ı" (U+0131), so an
 *   earlier `\w*`-based version of this pattern silently never matched the one real page it
 *   was written for — caught by this file's own test suite, not by the informal check that
 *   shipped it. The closing verb "kapandı" is matched as the literal form seen, not
 *   generalized to "kapanmıştır"/"kapalı", which were not): Bilkent University Summer Camp
 *   ("Kayıtlarımız kapandı.")
 * - "kayıtlar başladı" ("registrations started" — an opening signal): İTÜ Lise Yaz Okulu
 *   ("Kayıtlar Başladı!") — also the sharpest real ambiguity case in the Turkish sample: this
 *   exact banner sits on a page whose own "SON KAYIT: 16 TEMMUZ" deadline had already passed
 *   by the time of this fetch, against a row stored `closed` — stale marketing copy left up
 *   past its own deadline, correctly a disagreement for adjudication to resolve, not an
 *   auto-confirmed reopening. (GençBizzTech's "Hemen Başvur" nav link, sitting beside content
 *   entirely about an already-concluded 2026 final, is the same shape again — an evergreen
 *   CTA is not proof of the current cycle's status, in Turkish exactly as in English.)
 *
 * Honest, explicit gaps — plausible Turkish constructions that were NOT observed in this
 * corpus and are deliberately NOT included, on the same "don't guess" discipline as the
 * English pass: "başvuru(lar) kapandı/kapanmıştır" (application, rather than registration,
 * closing — this corpus's one closure example used "kayıt", never "başvuru", for the closing
 * noun), "açıldı"/"açık" as opening signals (never observed cleanly separated from the
 * dangerous short-root problem above), and any formal/evidential mood ("-mıştır" suffix)
 * variant of any of these. This sample (21 pages) is also smaller than the English one (49),
 * proportionally less evidence per pattern. This is real Turkish-language capability, not
 * independent native-speaker review — given this product's own explicit Turkey-market
 * commitment, that review is worth getting before leaning on this further, and this pass
 * does not substitute for it.
 */
const TURKISH_OPENING_PATTERNS: RegExp[] = [/son\s+(?:başvuru|kayıt)/, /(?:şimdi|hemen)\s+başvur/, /kayıtlar\s+başladı/];
const TURKISH_CLOSURE_PATTERNS: RegExp[] = [/kayıtlar(?:ımız)?\s+kapandı/];

export interface PhraseMatch {
  phrase: string;
  /** The literal substring of `content` surrounding the match, trimmed — always usable
   * directly as `matched_excerpt` (design doc §8.3's excerpt-or-nothing rule; this is
   * mechanically a substring of what was fetched, by construction, not an LLM's summary of
   * one). */
  excerpt: string;
}

function findPhrases(content: string, phrases: string[]): PhraseMatch[] {
  const haystack = content.toLowerCase();
  const matches: PhraseMatch[] = [];
  for (const phrase of phrases) {
    const index = haystack.indexOf(phrase);
    if (index === -1) continue;
    const start = Math.max(0, index - 80);
    const end = Math.min(content.length, index + phrase.length + 80);
    matches.push({ phrase, excerpt: content.slice(start, end).trim() });
  }
  return matches;
}

/** Same excerpt-extraction shape as findPhrases above, for the regex patterns — operates on
 * lowercased content (matching findPhrases' own case-insensitivity approach) so none of the
 * patterns need their own `i` flag. */
function findPatternMatches(content: string, patterns: RegExp[]): PhraseMatch[] {
  const haystack = content.toLowerCase();
  const matches: PhraseMatch[] = [];
  for (const pattern of patterns) {
    const match = pattern.exec(haystack);
    if (!match) continue;
    const start = Math.max(0, match.index - 80);
    const end = Math.min(content.length, match.index + match[0].length + 80);
    matches.push({ phrase: match[0], excerpt: content.slice(start, end).trim() });
  }
  return matches;
}

export function findClosurePhrases(content: string): PhraseMatch[] {
  return [...findPhrases(content, CLOSURE_PHRASES), ...findPatternMatches(content, CLOSURE_PATTERNS), ...findPatternMatches(content, TURKISH_CLOSURE_PATTERNS)];
}

export function findOpeningPhrases(content: string): PhraseMatch[] {
  return [...findPhrases(content, OPENING_PHRASES), ...findPatternMatches(content, OPENING_PATTERNS), ...findPatternMatches(content, TURKISH_OPENING_PATTERNS)];
}

// A conservative, explicit-format-only date extractor — design doc §5.1 step 3 ("regex date
// candidates"), not a general natural-language date parser. Every match is, by construction,
// a literal substring of `content`, so it always satisfies §8.3's excerpt-or-nothing rule
// without further checking.
const ISO_DATE = /\b\d{4}-\d{2}-\d{2}\b/g;
const MONTH_DAY_YEAR = /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}\b/gi;
const DAY_MONTH_YEAR = /\b\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}\b/gi;

export function findDateCandidates(content: string): string[] {
  const found = new Set<string>();
  for (const pattern of [ISO_DATE, MONTH_DAY_YEAR, DAY_MONTH_YEAR]) {
    for (const match of content.matchAll(pattern)) found.add(match[0]);
  }
  return [...found];
}

/**
 * Design doc §8.3's anti-fabrication rule, stated for the exact shape already observed:
 * "three programmes given '2027' dates that were mechanically the real 2026 date plus one."
 * A detected date exactly one year after the stored deadline is rejected UNLESS it appears
 * verbatim in the fetched content — which, per findDateCandidates above, every real
 * detection already does by construction. This function exists as a second, independent
 * check for a value arriving from anywhere else (e.g. an LLM adjudication result, which does
 * not extract by regex and so does not get this guarantee for free).
 */
export function isFabricatedPlusOneYear(storedDeadline: string | null, detectedDeadline: string | null, content: string): boolean {
  if (!storedDeadline || !detectedDeadline) return false;
  const stored = new Date(`${storedDeadline}T00:00:00Z`);
  const detected = new Date(`${detectedDeadline}T00:00:00Z`);
  if (Number.isNaN(stored.getTime()) || Number.isNaN(detected.getTime())) return false;

  const plusOneYear = new Date(Date.UTC(stored.getUTCFullYear() + 1, stored.getUTCMonth(), stored.getUTCDate()));
  const isPlusOneYear = detected.getTime() === plusOneYear.getTime();
  if (!isPlusOneYear) return false;

  return !content.includes(detectedDeadline);
}

/** Design doc §8.3's excerpt-or-nothing rule: any P1 claim must carry a non-empty excerpt
 * that is a literal substring of the fetched content. Checked at the one place a P1 verdict
 * can be produced, not trusted from a caller. */
export function hasValidExcerpt(excerpt: string | null, content: string): boolean {
  return Boolean(excerpt && excerpt.length > 0 && content.includes(excerpt));
}

export type DeterministicVerdict =
  /** Stored state and page content agree — eligible for p1_confirmed once §8.5's remaining
   * preconditions (excerpt, positive support) are also satisfied. */
  | { kind: "agrees"; excerpt: string; detectedDeadline: string | null }
  /** The deterministic pass found signal contradicting stored state — this alone is not a
   * verdict (design doc §5.1: a model adjudicates disagreement, never the common path). The
   * caller routes this to ./adjudicate.ts. */
  | { kind: "disagreement"; excerpt: string; closureFound: boolean; openingFound: boolean; detectedDeadline: string | null }
  /** Content read fine (passed all three guards) but says nothing bearing on whether the
   * cycle is running — design doc §7.6 mechanism 1: an eligibility paragraph, a fee table
   * and a contact address are all liveness-silent. This is P2, not P1, even though the guards
   * passed — ISSYP's exact shape. */
  | { kind: "liveness_silent" };

/**
 * The deterministic classification pass (design doc §5.1 steps 2-4), assuming the three
 * content guards in checkContentGuards already passed — this function does not re-check
 * them. Absence of closure language is never read as evidence of opening (§7.2 guard 3 /
 * §7.6 mechanism 2) — the "agrees" case requires the page to *positively* state something
 * about the stored cycle, not merely fail to contradict it.
 */
/**
 * Design doc §5.1 step 3, scoped to a single matched excerpt rather than the whole page.
 *
 * Found 2026-09-03, live, in the first representative-sample dry run: a full-page scan let
 * Girl Up Project Awards' correct `p1_changed`/closed verdict (excerpt: "...application is
 * now closed for youth in MENA...") carry a `detectedDeadline` of "Dec. 2 2022" — a real,
 * literal substring of the page (satisfying §8.3's excerpt-or-nothing rule), just from an
 * unrelated part of it, nowhere near the closure statement itself. Harmless to live data
 * (run-job.ts's applyDemotion only ever writes `cycle_status`, never `deadline`), but it
 * pollutes exactly the audit trail a human reviews when deciding whether to trust a
 * proposed change — an unrelated date sitting next to a correct verdict reads as evidence
 * the verdict considered, when it didn't.
 */
function deadlineFromExcerpt(excerpt: string): string | null {
  const candidates = findDateCandidates(excerpt);
  return candidates.length > 0 ? candidates[0] : null;
}

export function classifyAgainstStoredState(
  content: string,
  stored: Pick<ReverificationCandidate, "cycleStatus" | "deadline">
): DeterministicVerdict {
  const closureMatches = findClosurePhrases(content);
  const openingMatches = findOpeningPhrases(content);

  const stateImpliesOpen = stored.cycleStatus === "open" || stored.cycleStatus === "upcoming";
  const stateImpliesClosed = stored.cycleStatus === "closed" || stored.cycleStatus === "historical" || stored.cycleStatus === "discontinued";
  // The migration 0041 check constraint's remaining two values — neither implies open nor
  // closed, they assert "not yet known." Exhaustive with the two buckets above over all seven
  // cycle_status values.
  const stateIsUnknown = stored.cycleStatus === "unverified" || stored.cycleStatus === "date_not_announced";

  const closureFound = closureMatches.length > 0;
  const openingFound = openingMatches.length > 0;

  // §7.6's "2026 closed / 2027 announced" ambiguity: closure language coexisting with a
  // positive opening signal is not a stored-vs-page disagreement, it's a cycle transition —
  // treated as agreement with whatever the page's OPENING signal says, since that's the
  // forward-looking, decision-critical fact (design doc §9's demotion envelope separately
  // requires "no future-dated application signal on the same page" before ever demoting).
  if (closureFound && openingFound) {
    const excerpt = openingMatches[0].excerpt;
    return { kind: "agrees", excerpt, detectedDeadline: deadlineFromExcerpt(excerpt) };
  }

  if (closureFound && stateImpliesOpen) {
    const excerpt = closureMatches[0].excerpt;
    return { kind: "disagreement", excerpt, closureFound: true, openingFound: false, detectedDeadline: deadlineFromExcerpt(excerpt) };
  }
  if (openingFound && stateImpliesClosed) {
    const excerpt = openingMatches[0].excerpt;
    return { kind: "disagreement", excerpt, closureFound: false, openingFound: true, detectedDeadline: deadlineFromExcerpt(excerpt) };
  }

  // Found here 2026-09-03, via the Turkish sample, but not Turkish-specific: it silently
  // reproduces with any English match too (this corpus's own EYP Türkiye row hit it on the
  // English pattern "open now"). Before this branch existed, `unverified`/`date_not_announced`
  // rows could never reach anything but liveness_silent, no matter what a page said — the
  // final `stateImpliesOpen`/`stateImpliesClosed` checks below both require a *known* stored
  // side, and an unknown one satisfies neither. That silently caps the largest bucket
  // (`unverified`, 86 rows per §4.2) at zero classification — the population §0's own opening
  // paragraph names as the reason this job exists.
  //
  // Routed to "disagreement", not "agrees": there is no existing claim for the page to
  // *confirm* when the stored state is "not yet known" — "agrees" is the wrong word for that.
  // Reusing the disagreement path costs nothing extra in risk: adjudicateDisagreement's prompt
  // already takes storedCycleStatus as an opaque string ("Oryn's stored cycle status:
  // unverified" is a perfectly answerable question — "does the excerpt state something more
  // specific than unknown?"), and every downstream consumer of a "disagreement" verdict
  // (run-job.ts's p1_changed/p4_contradicted branch, the demotion-eligibility check) already
  // treats the prior stored value as opaque input, never assumes it was "open" or "closed"
  // specifically. So this is the same careful, already-tested gate a real open-vs-closed
  // contradiction goes through — not a new, less-scrutinized write path for a bucket that
  // previously wrote nothing at all.
  if ((closureFound || openingFound) && stateIsUnknown) {
    const excerpt = closureFound ? closureMatches[0].excerpt : openingMatches[0].excerpt;
    return { kind: "disagreement", excerpt, closureFound, openingFound, detectedDeadline: deadlineFromExcerpt(excerpt) };
  }

  if (closureFound && stateImpliesClosed) {
    const excerpt = closureMatches[0].excerpt;
    return { kind: "agrees", excerpt, detectedDeadline: deadlineFromExcerpt(excerpt) };
  }
  if (openingFound && stateImpliesOpen) {
    const excerpt = openingMatches[0].excerpt;
    return { kind: "agrees", excerpt, detectedDeadline: deadlineFromExcerpt(excerpt) };
  }

  // Neither phrase set matched anything. The page passed every content guard (it is about
  // this opportunity and has application-shaped vocabulary somewhere), but says nothing this
  // pass can positively read as confirming the stored cycle state — design doc §7.6's ISSYP
  // shape exactly: perfectly readable, liveness-silent.
  return { kind: "liveness_silent" };
}
